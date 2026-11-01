import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../server/db.js';
import { generateToken } from '../server/auth.js';
import { resolveItemPricingAndCost, calculateProductionYield, calculateBOMCost } from '../server/pricingEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 3097;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

console.log('=============================================================================');
console.log('  TEST SUITE: Advanced Printing Shop Catalogue, Pricing Engine & Job Costing');
console.log('=============================================================================');

let serverProcess = null;

async function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['server/index.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, PORT: String(TEST_PORT) },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdoutData = '';
    serverProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
      if (stdoutData.includes(`Persistent SQLite ERP Server running on http://localhost:${TEST_PORT}`)) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const msg = data.toString();
      if (!msg.includes('ExperimentalWarning')) {
        console.error('Server Stderr:', msg);
      }
    });

    serverProcess.on('error', reject);

    setTimeout(() => {
      if (!stdoutData.includes('Persistent SQLite ERP Server')) {
        reject(new Error(`Server startup timed out. Output: ${stdoutData}`));
      }
    }, 10000);
  });
}

function stopServer() {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (e) {}
  }
}

async function runTests() {
  try {
    await startServer();
    console.log('✔ Test server started on port', TEST_PORT);

    // Auth tokens for API calls
    const adminToken = generateToken({ id: 'USR-ADMIN-1', username: 'admin', role: 'Admin', name: 'Admin Test' });
    const authHeaders = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };

    // -------------------------------------------------------------------------
    // TEST 1: Product Master Extensions (SKU, Barcode, UOM, Variants, Settings)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Product Master Extensions ---');
    const mugProduct = db.prepare("SELECT * FROM products WHERE id = 'PROD-MUG-01'").get();
    assert.ok(mugProduct, 'PROD-MUG-01 should exist in products');
    assert.equal(mugProduct.sku, 'MUG-WHT-11OZ', 'SKU must match');
    assert.ok(mugProduct.pricing_method === 'SLAB' || mugProduct.pricing_method === 'SLABS', 'Pricing method must be SLAB');
    assert.equal(mugProduct.unit, 'Pcs', 'UOM must be Pcs');
    assert.equal(mugProduct.gst_rate, 18, 'GST rate must be 18');
    assert.equal(mugProduct.min_order_qty, 1, 'MOQ must be 1');
    assert.ok(mugProduct.variants_json.includes('Magic Black'), 'Variants must be persisted');
    assert.ok(mugProduct.production_settings_json.includes('Sublimation Heat Press'), 'Production settings must be persisted');
    console.log('✔ Mug product master validated with SKU, pricing_method, UOM, variants, and settings');

    // Create a new product via API with variants and production settings
    const canvasProdId = `PRD-CANV-${Date.now()}`;
    const canvasSku = `CANV-${Date.now()}`;
    const testProdRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        id: canvasProdId,
        code: canvasProdId,
        name: 'Fine Art Canvas Print 380gsm',
        sku: canvasSku,
        barcode: '8901234567890',
        category: 'Canvas',
        unit: 'sq.ft',
        defaultRate: 45.00,
        estimatedCost: 22.00,
        gstRate: 18,
        hsnCode: '4911',
        minOrderQty: 1,
        pricingMethod: 'DIMENSION',
        taxInclusive: false,
        variants: [
          { name: 'Stretching', options: ['Gallery Wrap 1.5in', 'Framed', 'Rolled Canvas'] }
        ],
        productionSettings: {
          printer: 'Canon Colorado 1650',
          inkType: 'UV Gel 357',
          cutting: 'Hand Trimmed'
        }
      })
    });
    const testProdData = await testProdRes.json();
    assert.ok(testProdData.success, 'New product creation should succeed');

    const createdProd = db.prepare("SELECT * FROM products WHERE id = ?").get(canvasProdId);
    assert.equal(createdProd.sku, canvasSku);
    assert.equal(createdProd.pricing_method, 'DIMENSION');
    assert.ok(createdProd.variants_json.includes('Gallery Wrap'), 'Variants JSON must contain options');
    console.log('✔ Product creation with variants and production settings verified');

    // -------------------------------------------------------------------------
    // TEST 2: Five Pricing Methods via Pricing Engine
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Five Pricing Methods Engine ---');

    // Method 1: Fixed Unit Price (PROD-01)
    const fixedEvalRes = await fetch(`${BASE_URL}/api/pricing/evaluate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        productId: 'PROD-01',
        qty: 1
      })
    });
    const fixedEvalData = await fixedEvalRes.json();
    assert.ok(fixedEvalData.success);
    assert.equal(fixedEvalData.pricing.unitRate, 15.00);
    console.log('✔ Method 1 (Fixed Catalogue Pricing) evaluated: ₹15.00');

    // Method 2: Quantity Slab Pricing - Mug Printing
    // Slabs: 1 = 500, 2-9 = 400, 10-99 = 380, 100-999 = 300, 1000+ = 100
    const mugEval1 = await fetch(`${BASE_URL}/api/pricing/evaluate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ productId: 'PROD-MUG-01', qty: 1 })
    }).then(r => r.json());
    assert.equal(mugEval1.pricing.unitRate, 500, 'Mug qty 1 should be ₹500');

    const mugEval5 = await fetch(`${BASE_URL}/api/pricing/evaluate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ productId: 'PROD-MUG-01', qty: 5 })
    }).then(r => r.json());
    assert.equal(mugEval5.pricing.unitRate, 400, 'Mug qty 5 should be ₹400');

    const mugEval50 = await fetch(`${BASE_URL}/api/pricing/evaluate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ productId: 'PROD-MUG-01', qty: 50 })
    }).then(r => r.json());
    assert.equal(mugEval50.pricing.unitRate, 380, 'Mug qty 50 should be ₹380');

    const mugEval250 = await fetch(`${BASE_URL}/api/pricing/evaluate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ productId: 'PROD-MUG-01', qty: 250 })
    }).then(r => r.json());
    assert.equal(mugEval250.pricing.unitRate, 300, 'Mug qty 250 should be ₹300');

    const mugEval1500 = await fetch(`${BASE_URL}/api/pricing/evaluate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ productId: 'PROD-MUG-01', qty: 1500 })
    }).then(r => r.json());
    assert.equal(mugEval1500.pricing.unitRate, 100, 'Mug qty 1500 should be ₹100');
    console.log('✔ Method 2 (Mug quantity slab pricing) verified: 1=500, 5=400, 50=380, 250=300, 1500=100');

    // Method 2: Quantity Slab Pricing - Balloon Printing
    // Slabs: 100 = 10, 200 = 8
    const balloonEval100 = await fetch(`${BASE_URL}/api/pricing/evaluate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ productId: 'PROD-BLN-01', qty: 100 })
    }).then(r => r.json());
    assert.equal(balloonEval100.pricing.unitRate, 10, 'Balloon qty 100 should be ₹10');

    const balloonEval200 = await fetch(`${BASE_URL}/api/pricing/evaluate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ productId: 'PROD-BLN-01', qty: 200 })
    }).then(r => r.json());
    assert.equal(balloonEval200.pricing.unitRate, 8, 'Balloon qty 200 should be ₹8');
    console.log('✔ Method 2 (Balloon quantity slab pricing) verified: 100=₹10, 200=₹8');

    // Method 3: Custom Quotation Pricing (with manual quote price)
    const quoteEval = await fetch(`${BASE_URL}/api/pricing/evaluate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        productId: 'PROD-MUG-01',
        qty: 50,
        customPrice: 340.00
      })
    }).then(r => r.json());
    assert.equal(quoteEval.pricing.unitRate, 340.00, 'Custom quote rate must override standard slab');
    assert.equal(quoteEval.pricing.isOverridden, true, 'isOverridden flag must be true');
    console.log('✔ Method 3 (Custom quotation pricing override) verified: Quoted ₹340 vs Slab ₹380');

    // Method 4: Material & Dimension-Based Pricing (Sq.Ft)
    // PROD-01 @ default rate ₹15/sq.ft. Width 10ft, Height 4ft = 40 sq.ft -> Total = 40 * 15 = ₹600
    const bannerEval = await fetch(`${BASE_URL}/api/pricing/evaluate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        productId: 'PROD-01',
        qty: 1,
        width: 10,
        height: 4
      })
    }).then(r => r.json());
    assert.equal(bannerEval.pricing.totalSqFt, 40, 'Total sq.ft should be 40');
    assert.equal(bannerEval.pricing.amount, 600, '40 sq.ft @ ₹15 = ₹600');
    console.log('✔ Method 4 (Material and dimension-based Sq.Ft) calculation verified: 40 sq.ft @ ₹15 = ₹600');

    // Method 5: Customer-Specific Negotiated Pricing
    // Apex Advertising (CUST-101) has contract rate ₹12/sq.ft for Star Flex
    const apexEval = await fetch(`${BASE_URL}/api/pricing/evaluate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        productId: 'PROD-01',
        customerId: 'CUST-101',
        qty: 10,
        width: 10,
        height: 4
      })
    }).then(r => r.json());
    assert.equal(apexEval.pricing.unitRate, 12.00, 'Apex Advertising negotiated rate must be ₹12/sq.ft');
    assert.equal(apexEval.pricing.appliedPricingRule, 'CUSTOMER_NEGOTIATED');
    console.log('✔ Method 5 (Customer-specific contract rate pricing: Apex ₹12/sq.ft) verified');

    // Metropolis Signages (CUST-102) has 15% discount on Flex & Banner category
    const metroEval = await fetch(`${BASE_URL}/api/pricing/evaluate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        productId: 'PROD-01',
        customerId: 'CUST-102',
        qty: 1,
        width: 10,
        height: 4
      })
    }).then(r => r.json());
    assert.equal(metroEval.pricing.discountPct, 15, 'Metropolis 15% discount applied');
    assert.equal(metroEval.pricing.unitRate, 12.75, '₹15 - 15% = ₹12.75');
    assert.equal(metroEval.pricing.amount, 510.00, '40 sq.ft @ ₹12.75 = ₹510');
    console.log('✔ Method 5 (Customer-specific tier discount: Metropolis 15%) verified');

    // -------------------------------------------------------------------------
    // TEST 3: Business Card Production Yield Calculator
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Business Card Production Calculator ---');
    const yieldConfig = {
      sheetName: '12x18 Digital Sheet',
      sheetWidthIn: 12,
      sheetHeightIn: 18,
      cardsPerSheet: 30,
      paperSheetCost: 6.50,
      printingCostPerSheet: 8.00,
      inkCostPerSheet: 1.50,
      laminationCostPerSheet: 4.00,
      cuttingCostPerSheet: 1.50,
      wastagePct: 5.0,
      overheadPerSheet: 0.50
    };

    const yieldRes = await fetch(`${BASE_URL}/api/pricing/calculate-yield`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        orderQty: 1000,
        yieldConfig
      })
    });
    const yieldData = await yieldRes.json();
    assert.ok(yieldData.success);
    const y = yieldData.yield;

    // CEILING(1000 / 30) = 34 base sheets
    assert.equal(y.baseSheets, 34, 'Base sheets for 1000 cards / 30 per sheet must be 34');
    // CEILING(34 * 1.05) = 36 actual sheets
    assert.equal(y.actualSheets, 36, 'Actual production sheets with 5% wastage must be 36');

    // Cost Breakdown check
    // Cost per sheet = 6.50 + 8.00 + 1.50 + 4.00 + 1.50 + 0.50 = ₹22.00
    assert.equal(y.costPerSheet, 22.00, 'Total cost per sheet must be ₹22.00');
    // Total production cost = 36 * 22 = ₹792.00
    assert.equal(y.totalProductionCost, 792.00, 'Total production cost must be ₹792.00');
    // Cost per card = 792 / 1000 = ₹0.792
    assert.equal(y.costPerCard, 0.792, 'Cost per business card must be ₹0.792');
    console.log('✔ Business card yield calculator verified: 30 cards/sheet, 34 base -> 36 actual sheets @ ₹0.792/card');

    // -------------------------------------------------------------------------
    // TEST 4: Bill of Materials (BOM) Management
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Bill of Materials (BOM) ---');
    const mugBOMRes = await fetch(`${BASE_URL}/api/products/PROD-MUG-01/bom`, {
      headers: authHeaders
    });
    const mugBOMData = await mugBOMRes.json();
    assert.ok(mugBOMData.success);
    assert.ok(mugBOMData.boms.length > 0, 'Mug BOM should exist');
    const defaultBOM = mugBOMData.boms.find(b => b.isDefault);
    assert.ok(defaultBOM, 'Default BOM must be defined');
    assert.equal(defaultBOM.totalEstimatedUnitCost, 68.52, 'Mug BOM rollup unit cost must be ₹68.52');
    console.log('✔ BOM retrieval and cost rollup validated: ₹68.52 unit cost');

    // Create a custom BOM for Canvas Print
    const canvasBOMRes = await fetch(`${BASE_URL}/api/products/${canvasProdId}/bom`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        bomName: 'Gallery Canvas Standard BOM',
        outputQty: 1,
        outputUnit: 'Sq.Ft',
        isDefault: true,
        rawMaterials: [
          { itemName: 'Canvas Fabric 380gsm', qty: 1.1, unit: 'Sq.Ft', unitCost: 12.00, wastagePct: 10, totalCost: 14.52 },
          { itemName: 'UV Pigment Inks', qty: 0.05, unit: 'ml', unitCost: 40.00, wastagePct: 0, totalCost: 2.00 }
        ],
        machineCost: 4.00,
        labourCost: 3.50,
        electricityCost: 1.00,
        finishingCost: 2.00,
        packagingCost: 1.50,
        totalEstimatedUnitCost: 28.52
      })
    });
    const canvasBOMData = await canvasBOMRes.json();
    assert.ok(canvasBOMData.success);
    console.log('✔ New BOM created and persisted successfully');

    // -------------------------------------------------------------------------
    // TEST 5: Sales Order Costing Snapshot & Gross Margin Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Sales Order Costing Snapshot & Persistence ---');
    const orderPayload = {
      orderNumber: `SO-TEST-${Date.now()}`,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: new Date().toISOString().split('T')[0],
      customerId: 'CUST-101',
      customerName: 'Apex Advertising Co',
      paymentMode: 'Bank Transfer',
      gstType: 'CGST_SGST',
      productionStatus: 'Confirmed',
      creditLimitOverride: true,
      items: [
        {
          productId: 'PROD-MUG-01',
          productName: 'Custom Ceramic Mug Sublimation Printing',
          category: 'Promotional Items',
          qty: 50,
          unit: 'Pcs',
          rate: 380.00,
          originalSellingPrice: 380.00,
          appliedPricingRule: 'QUANTITY_SLAB',
          pricingRuleDetails: { slab: '10-99 @ ₹380' },
          estimatedMaterialCost: 47.52,
          estimatedLabourCost: 8.00,
          estimatedMachineCost: 7.00,
          estimatedOverheadCost: 6.00,
          actualCost: 68.52,
          isRateOverridden: false,
          amount: 19000.00
        },
        {
          productId: 'PROD-01',
          productName: 'Star Flex Banner Printing (240gsm Frontlit)',
          category: 'Flex & Banner',
          qty: 2,
          unit: 'sq.ft',
          width: 10,
          height: 5,
          totalSqFt: 100,
          rate: 11.50, // Manual override from negotiated ₹12.00 to ₹11.50
          originalSellingPrice: 12.00,
          appliedPricingRule: 'CUSTOMER_NEGOTIATED',
          isRateOverridden: true,
          overrideReason: 'Bulk commercial discount authorized by Manager',
          estimatedMaterialCost: 6.00,
          estimatedLabourCost: 1.50,
          estimatedMachineCost: 1.00,
          estimatedOverheadCost: 0.50,
          actualCost: 8.50,
          amount: 1150.00
        }
      ]
    };

    const orderRes = await fetch(`${BASE_URL}/api/sales-orders`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(orderPayload)
    });
    const orderData = await orderRes.json();
    if (!orderData.success) {
      console.error('FAILED orderData:', JSON.stringify(orderData, null, 2));
    }
    assert.ok(orderData.success, 'Sales order creation should succeed');
    const orderId = orderData.orderId || orderData.order?.id;

    // Verify persisted snapshot in database
    const savedItems = db.prepare('SELECT * FROM sales_order_items WHERE sales_order_id = ?').all(orderId);
    assert.equal(savedItems.length, 2, '2 order items must be saved');

    const mugItem = savedItems.find(it => it.product_id === 'PROD-MUG-01');
    assert.ok(mugItem, 'Mug item must be present');
    assert.equal(mugItem.original_selling_price, 380.00);
    assert.equal(mugItem.applied_pricing_rule, 'QUANTITY_SLAB');
    assert.equal(mugItem.estimated_material_cost, 47.52);
    assert.equal(mugItem.estimated_labour_cost, 8.00);
    assert.equal(mugItem.estimated_machine_cost, 7.00);
    assert.equal(mugItem.estimated_overhead_cost, 6.00);
    assert.equal(mugItem.is_rate_overridden, 0);
    // Gross profit = (380 - 68.52) * 50 = ₹15,574.00
    assert.equal(mugItem.gross_profit, 15574.00);
    // Gross profit margin = (15574 / 19000) * 100 = 81.97%
    assert.equal(mugItem.gross_profit_margin, 81.97);

    const bannerItem = savedItems.find(it => it.product_id === 'PROD-01');
    assert.ok(bannerItem, 'Banner item must be present');
    assert.equal(bannerItem.original_selling_price, 12.00);
    assert.equal(bannerItem.is_rate_overridden, 1);
    assert.equal(bannerItem.override_reason, 'Bulk commercial discount authorized by Manager');
    console.log('✔ Sales order costing snapshot, gross profit and margins successfully persisted');

    // Verify pricing override log insertion
    const overrideLog = db.prepare('SELECT * FROM pricing_overrides_log WHERE order_id = ?').all(orderId);
    assert.ok(overrideLog.length > 0, 'Pricing override must be recorded in pricing_overrides_log');
    assert.equal(overrideLog[0].original_rate, 12.00);
    assert.equal(overrideLog[0].overridden_rate, 11.50);
    console.log('✔ Pricing override audit log recorded in database');

    // -------------------------------------------------------------------------
    // TEST 6: Historical Order Snapshot Immutability
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Historical Snapshot Immutability ---');
    // Modify the product master price and slab prices for PROD-MUG-01
    db.prepare("UPDATE products SET default_rate = 999.00 WHERE id = 'PROD-MUG-01'").run();
    db.prepare("UPDATE product_pricing_slabs SET rate = 888.00 WHERE product_id = 'PROD-MUG-01'").run();

    // Re-verify the historical order item
    const immutableItem = db.prepare('SELECT * FROM sales_order_items WHERE id = ?').get(mugItem.id);
    assert.equal(immutableItem.selling_rate, 380.00, 'Historical selling rate must NOT change when master price changes');
    assert.equal(immutableItem.original_selling_price, 380.00, 'Original snapshot must be preserved');
    assert.equal(immutableItem.gross_profit, 15574.00, 'Gross profit snapshot must be immutable');
    console.log('✔ Historical order price and margin snapshots are 100% immutable');

    // Restore test values
    db.prepare("UPDATE products SET default_rate = 500.00 WHERE id = 'PROD-MUG-01'").run();
    db.prepare("UPDATE product_pricing_slabs SET rate = 500.00 WHERE product_id = 'PROD-MUG-01' AND min_qty = 1").run();
    db.prepare("UPDATE product_pricing_slabs SET rate = 400.00 WHERE product_id = 'PROD-MUG-01' AND min_qty = 2").run();
    db.prepare("UPDATE product_pricing_slabs SET rate = 380.00 WHERE product_id = 'PROD-MUG-01' AND min_qty = 10").run();
    db.prepare("UPDATE product_pricing_slabs SET rate = 300.00 WHERE product_id = 'PROD-MUG-01' AND min_qty = 100").run();
    db.prepare("UPDATE product_pricing_slabs SET rate = 100.00 WHERE product_id = 'PROD-MUG-01' AND min_qty = 1000").run();

    // -------------------------------------------------------------------------
    // TEST 7: Costing & Profitability Reports API Endpoints
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Advanced Profitability & Costing Reports ---');

    // 1. Product-wise Profitability
    const repProdRes = await fetch(`${BASE_URL}/api/reports/profitability-product`, { headers: authHeaders });
    const repProdData = await repProdRes.json();
    console.log('DEBUG repProdData:', repProdData);
    assert.ok(repProdData.success, 'Profitability Product report must succeed');
    assert.ok(Array.isArray(repProdData.report), 'Report must be an array');
    const mugReport = repProdData.report.find(r => r.productId === 'PROD-MUG-01');
    assert.ok(mugReport, 'Mug product must appear in profitability report');
    assert.ok(mugReport.grossProfit > 0, 'Gross profit must be positive');
    console.log('✔ Report 1: Product-wise profitability verified');

    // 2. Customer-wise Profitability
    const repCustRes = await fetch(`${BASE_URL}/api/reports/profitability-customer`, { headers: authHeaders });
    const repCustData = await repCustRes.json();
    assert.ok(repCustData.success);
    const apexReport = repCustData.report.find(r => r.customerId === 'CUST-101');
    assert.ok(apexReport, 'Apex customer must appear in customer profitability report');
    console.log('✔ Report 2: Customer-wise profitability verified');

    // 3. Estimated vs Actual Production Cost Variance
    const repVarRes = await fetch(`${BASE_URL}/api/reports/cost-variance`, { headers: authHeaders });
    const repVarData = await repVarRes.json();
    assert.ok(repVarData.success);
    assert.ok(Array.isArray(repVarData.report));
    console.log('✔ Report 3: Estimated vs actual cost variance report verified');

    // 4. Material Consumption Report
    const repMatRes = await fetch(`${BASE_URL}/api/reports/material-consumption`, { headers: authHeaders });
    const repMatData = await repMatRes.json();
    assert.ok(repMatData.success);
    assert.ok(Array.isArray(repMatData.report));
    console.log('✔ Report 4: Material consumption report verified');

    // 5. Wastage & Scrap Report
    const repWasteRes = await fetch(`${BASE_URL}/api/reports/wastage`, { headers: authHeaders });
    const repWasteData = await repWasteRes.json();
    assert.ok(repWasteData.success);
    assert.ok(Array.isArray(repWasteData.report));
    console.log('✔ Report 5: Wastage and scrap report verified');

    // 6. Pricing Override Audit Report
    const repOverRes = await fetch(`${BASE_URL}/api/reports/pricing-overrides`, { headers: authHeaders });
    const repOverData = await repOverRes.json();
    assert.ok(repOverData.success);
    assert.ok(repOverData.report.length > 0, 'Override report must list recorded overrides');
    console.log('✔ Report 6: Pricing overrides audit log report verified');

    // 7. Low-Margin Sales Report (< 15%)
    const repLowRes = await fetch(`${BASE_URL}/api/reports/low-margin?threshold=15`, { headers: authHeaders });
    const repLowData = await repLowRes.json();
    assert.ok(repLowData.success);
    assert.ok(Array.isArray(repLowData.report));
    console.log('✔ Report 7: Low-margin sales report verified');

    // Cleanup test artifacts
    db.prepare('DELETE FROM sales_orders WHERE id = ?').run(orderId);
    db.prepare('DELETE FROM sales_order_items WHERE sales_order_id = ?').run(orderId);
    db.prepare("DELETE FROM products WHERE id = ?").run(canvasProdId);
    db.prepare("DELETE FROM product_bom WHERE product_id = ?").run(canvasProdId);

    console.log('\n=============================================================================');
    console.log('  ALL ADVANCED PRICING & JOB COSTING TESTS PASSED (100%)');
    console.log('=============================================================================');

    stopServer();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    stopServer();
    process.exit(1);
  }
}

runTests();
