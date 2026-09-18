/**
 * SCREENARTS / PRINTFLOW ERP - MATERIAL MOVEMENT & CONSUMPTION LEDGER ENGINE
 * 
 * Provides robust inventory management:
 * - Append-only transaction ledger with immutable audit records
 * - Product-to-Material Bill of Materials (BOM) resolution
 * - Unit-aware substrate consumption (Sq.Ft, Sheets, Rolls, Pcs)
 * - Strict idempotent deduction preventing duplicate consumption
 * - Wastage tracking with cause attribution
 * - Material issue to outsource vendors vs in-house jobs
 */

export const TRANSACTION_TYPES = {
  PURCHASE_IN: 'PURCHASE_IN',
  PRODUCTION_CONSUMPTION: 'PRODUCTION_CONSUMPTION',
  WASTAGE: 'WASTAGE',
  ADJUSTMENT: 'ADJUSTMENT',
  RETURN: 'RETURN',
  VENDOR_ISSUE: 'VENDOR_ISSUE'
};

/**
 * Record a transaction in the inventory ledger and adjust current stock atomically
 */
export function recordInventoryTransaction(db, {
  materialId,
  quantity,
  unit,
  transactionType,
  referenceType = 'MANUAL',
  referenceId = null,
  plannedConsumption = 0,
  actualConsumption = 0,
  wastageQty = 0,
  wastageReason = '',
  materialBatch = 'DEFAULT',
  employeeId = null,
  employeeName = 'System',
  machineId = null,
  machineName = '',
  remarks = ''
}) {
  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0) {
    throw new Error('Valid positive quantity is required for inventory transaction');
  }

  const material = db.prepare('SELECT * FROM inventory WHERE id = ? OR name = ?').get(materialId, materialId);
  if (!material) {
    throw new Error(`Inventory item not found: ${materialId}`);
  }

  const txId = `ITX-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  let stockDelta = 0;

  const tx = db.transaction(() => {
    // 1. Insert into append-only ledger
    db.prepare(`
      INSERT INTO inventory_transactions (
        id, material_id, material_name, quantity, unit, transaction_type,
        reference_type, reference_id, planned_consumption, actual_consumption,
        wastage_qty, wastage_reason, material_batch, employee_id, employee_name,
        machine_id, machine_name, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      txId, material.id, material.name, qty, unit || material.unit, transactionType,
      referenceType, referenceId, Number(plannedConsumption || qty), Number(actualConsumption || qty),
      Number(wastageQty || 0), wastageReason, materialBatch, employeeId, employeeName,
      machineId, machineName, remarks
    );

    // 2. Adjust current_stock in inventory master
    if (transactionType === TRANSACTION_TYPES.PURCHASE_IN || transactionType === TRANSACTION_TYPES.RETURN) {
      stockDelta = qty;
    } else if (
      transactionType === TRANSACTION_TYPES.PRODUCTION_CONSUMPTION ||
      transactionType === TRANSACTION_TYPES.WASTAGE ||
      transactionType === TRANSACTION_TYPES.VENDOR_ISSUE
    ) {
      stockDelta = -qty;
    } else if (transactionType === TRANSACTION_TYPES.ADJUSTMENT) {
      // Adjustment: quantity directly specifies signed delta in remarks, or passed as delta
      stockDelta = qty;
    }

    db.prepare(`
      UPDATE inventory
      SET current_stock = MAX(0, current_stock + ?),
          version = COALESCE(version, 1) + 1
      WHERE id = ?
    `).run(stockDelta, material.id);
  });

  tx();
  return { success: true, transactionId: txId, materialId: material.id, stockDelta };
}

/**
 * Deduct inventory for an order item safely with BOM lookup and double-deduction guard
 */
export function consumeInventoryForItem(db, orderItem, actor = 'System') {
  if (!orderItem) return { skipped: true, reason: 'No item provided' };

  // 1. Check if this item is outsourced and does not consume company materials
  if (orderItem.outsource && !orderItem.company_material_issued) {
    return { skipped: true, reason: 'Outsourced item using vendor materials' };
  }

  // 2. Prevent duplicate consumption
  const existing = db.prepare(`
    SELECT id FROM inventory_transactions
    WHERE reference_id = ? AND transaction_type = 'PRODUCTION_CONSUMPTION'
  `).get(orderItem.id);

  if (existing) {
    return { skipped: true, reason: 'Item already consumed', existingTxId: existing.id };
  }

  // 3. Look up BOM mapping
  let bom = null;
  if (orderItem.product_id) {
    bom = db.prepare('SELECT * FROM material_boms WHERE product_id = ?').get(orderItem.product_id);
  }

  let targetMaterial = null;
  let deductQty = 0;
  let deductUnit = 'Sq.Ft';
  let wastageQty = 0;

  if (bom) {
    targetMaterial = db.prepare('SELECT * FROM inventory WHERE id = ?').get(bom.inventory_material_id);
    const itemAreaOrQty = Number(orderItem.width || 1) * Number(orderItem.height || 1) * Number(orderItem.qty || 1);
    const planned = itemAreaOrQty * Number(bom.consumption_ratio || 1);
    const wastageFactor = 1 + (Number(bom.wastage_pct || 4) / 100);
    deductQty = Number((planned * wastageFactor).toFixed(4));
    wastageQty = Number((deductQty - planned).toFixed(4));
    deductUnit = bom.consumption_unit || targetMaterial?.unit || 'Sq.Ft';
  } else {
    // Heuristic lookup by material / product name in inventory
    const searchTerms = [orderItem.material, orderItem.product_name_snapshot].filter(Boolean);
    for (const term of searchTerms) {
      const found = db.prepare(`
        SELECT * FROM inventory
        WHERE name LIKE ? OR category LIKE ?
        LIMIT 1
      `).get(`%${term}%`, `%${term}%`);
      if (found) {
        targetMaterial = found;
        break;
      }
    }

    if (!targetMaterial) {
      // Fallback: match by generic category
      targetMaterial = db.prepare("SELECT * FROM inventory WHERE category = 'Media Roll' OR category = 'Sheet Media' LIMIT 1").get();
    }

    if (!targetMaterial) {
      return { skipped: true, reason: 'No matching inventory material found' };
    }

    // Determine quantity based on unit
    const unitLower = (orderItem.unit || '').toLowerCase();
    if (unitLower.includes('sq.ft') || unitLower.includes('sqft')) {
      const area = Number(orderItem.width || 1) * Number(orderItem.height || 1) * Number(orderItem.qty || 1);
      if (targetMaterial.unit === 'Sheets') {
        deductQty = Number((area / 32).toFixed(2)); // Standard 8x4 sheet is 32 sq.ft
      } else if (targetMaterial.unit === 'Rolls') {
        deductQty = Number((area / 1000).toFixed(4)); // Fractional roll
      } else {
        deductQty = area;
      }
    } else {
      deductQty = Number(orderItem.qty || 1);
    }
    deductUnit = targetMaterial.unit;
    wastageQty = Number((deductQty * 0.04).toFixed(4));
  }

  if (deductQty <= 0) deductQty = 1;

  return recordInventoryTransaction(db, {
    materialId: targetMaterial.id,
    quantity: deductQty,
    unit: deductUnit,
    transactionType: TRANSACTION_TYPES.PRODUCTION_CONSUMPTION,
    referenceType: 'SALES_ORDER_ITEM',
    referenceId: orderItem.id,
    plannedConsumption: deductQty - wastageQty,
    actualConsumption: deductQty,
    wastageQty,
    wastageReason: 'Standard production edge trim allowance',
    employeeName: actor,
    remarks: `Production consumption for ${orderItem.product_name_snapshot} (${orderItem.job_card_id || orderItem.id})`
  });
}
