/**
 * High-Performance Reporting & Analytics Engine for Printflow Cloud ERP
 * Inspired by ERPNext, Odoo, and SAP Business One.
 */

// Helper to format currency in INR (₹)
export const formatINR = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

// Date Presets Helper
export const getDatePresetRange = (preset) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  switch (preset) {
    case 'TODAY':
      return { start: todayStr, end: todayStr };

    case 'YESTERDAY': {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      const s = d.toISOString().split('T')[0];
      return { start: s, end: s };
    }

    case 'THIS_WEEK': {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff)).toISOString().split('T')[0];
      return { start: monday, end: todayStr };
    }

    case 'THIS_MONTH': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      return { start, end: todayStr };
    }

    case 'LAST_MONTH': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      return { start, end };
    }

    case 'THIS_QUARTER': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth, 1).toISOString().split('T')[0];
      return { start, end: todayStr };
    }

    case 'THIS_YEAR': {
      const start = `${now.getFullYear()}-01-01`;
      return { start, end: todayStr };
    }

    case 'ALL':
    default:
      return { start: '', end: '' };
  }
};

// Universal Order Filtering Function
export const filterSalesOrders = (orders, filters) => {
  if (!orders) return [];

  const {
    datePreset = 'ALL',
    startDate = '',
    endDate = '',
    customerId = '',
    salesPersonId = '',
    careOfId = '',
    vendorId = '',
    productId = '',
    productionStatus = '',
    paymentStatus = '',
    gstType = '',
    searchQuery = ''
  } = filters || {};

  let { start, end } = getDatePresetRange(datePreset);
  if (datePreset === 'CUSTOM') {
    start = startDate;
    end = endDate;
  }

  const query = searchQuery.trim().toLowerCase();

  return orders.filter((o) => {
    const oDate = o.orderDate || o.createdAt?.split('T')[0] || '';

    // Date filtering
    if (start && oDate < start) return false;
    if (end && oDate > end) return false;

    // Direct filters
    if (customerId && o.customerId !== customerId) return false;
    if (salesPersonId && o.salesPersonId !== salesPersonId) return false;
    if (careOfId && o.careOfId !== careOfId) return false;
    if (productionStatus && o.productionStatus !== productionStatus) return false;
    if (paymentStatus && o.paymentStatus !== paymentStatus) return false;

    // Order Workflow Filter (Direct Sales Order vs Quotation vs Quotation Converted)
    const { orderWorkflow = '' } = filters || {};
    if (orderWorkflow === 'DIRECT' && (o.orderType === 'Quotation' || o.convertedFromQuotation)) return false;
    if (orderWorkflow === 'QUOTATION' && o.orderType !== 'Quotation') return false;
    if (orderWorkflow === 'CONVERTED' && !o.convertedFromQuotation && o.quotationStatus !== 'Converted') return false;

    // Item-level filters (Vendor, Product, GST Type)
    if (vendorId || productId || gstType) {
      const hasItemMatch = o.items?.some((item) => {
        if (vendorId && item.vendorId !== vendorId) return false;
        if (productId && item.productId !== productId && item.productName !== productId) return false;
        if (gstType && !item.taxType?.toLowerCase().includes(gstType.toLowerCase())) return false;
        return true;
      });
      if (!hasItemMatch) return false;
    }

    // Live search query
    if (query) {
      const matchId = o.id?.toLowerCase().includes(query);
      const matchCust = o.customerName?.toLowerCase().includes(query);
      const matchSP = o.salesPersonName?.toLowerCase().includes(query);
      const matchCO = o.careOfName?.toLowerCase().includes(query);
      const matchRef = o.referenceNo?.toLowerCase().includes(query);
      const matchItem = o.items?.some((it) => it.productName?.toLowerCase().includes(query));

      if (!matchId && !matchCust && !matchSP && !matchCO && !matchRef && !matchItem) {
        return false;
      }
    }

    return true;
  });
};

// Group By Aggregator
export const groupOrdersBy = (orders, groupByField) => {
  const groups = {};

  orders.forEach((o) => {
    let key = 'Other';
    if (groupByField === 'CUSTOMER') key = o.customerName || 'Unknown Customer';
    else if (groupByField === 'SALESPERSON') key = o.salesPersonName || 'Unassigned';
    else if (groupByField === 'CAREOF') key = o.careOfName || 'Unassigned';
    else if (groupByField === 'STATUS') key = o.productionStatus || 'New';
    else if (groupByField === 'PAYMENT_STATUS') key = o.paymentStatus || 'Pending';
    else if (groupByField === 'PAYMENT_METHOD') key = o.paymentMethod || 'Cash';
    else if (groupByField === 'BRANCH') key = o.branch || 'Main Branch';
    else if (groupByField === 'SOURCE') key = o.orderSource || 'Direct';
    else if (groupByField === 'MONTH') {
      const d = o.orderDate || o.createdAt?.split('T')[0] || '';
      key = d ? d.substring(0, 7) : 'Unknown Month';
    }

    if (!groups[key]) {
      groups[key] = {
        key,
        count: 0,
        subtotal: 0,
        grandTotal: 0,
        actualCost: 0,
        grossProfit: 0,
        advance: 0,
        balance: 0,
        orders: []
      };
    }

    groups[key].count += 1;
    groups[key].subtotal += o.subtotal || 0;
    groups[key].grandTotal += o.grandTotal || 0;
    groups[key].actualCost += o.totalActualCost || 0;
    groups[key].grossProfit += o.grossProfit || 0;
    groups[key].advance += o.advanceAmount || 0;
    groups[key].balance += o.balanceAmount || 0;
    groups[key].orders.push(o);
  });

  return Object.values(groups).map((g) => {
    const marginPct = g.subtotal > 0 ? parseFloat(((g.grossProfit / g.subtotal) * 100).toFixed(1)) : 0;
    return { ...g, marginPct };
  });
};

// Dynamic Pivot Table Matrix Construction
export const buildPivotMatrix = (orders, rowDim, colDim, valMeasure = 'grandTotal') => {
  const rowKeys = new Set();
  const colKeys = new Set();
  const matrix = {};

  orders.forEach((o) => {
    // Determine Row Key
    let rKey = 'Other';
    if (rowDim === 'CUSTOMER') rKey = o.customerName || 'Unknown';
    else if (rowDim === 'SALESPERSON') rKey = o.salesPersonName || 'Unassigned';
    else if (rowDim === 'CAREOF') rKey = o.careOfName || 'Unassigned';
    else if (rowDim === 'STATUS') rKey = o.productionStatus || 'New';
    else if (rowDim === 'SOURCE') rKey = o.orderSource || 'Direct';

    // Determine Col Key
    let cKey = 'Other';
    if (colDim === 'MONTH') {
      const d = o.orderDate || o.createdAt?.split('T')[0] || '';
      cKey = d ? d.substring(0, 7) : 'Unknown';
    } else if (colDim === 'STATUS') cKey = o.productionStatus || 'New';
    else if (colDim === 'PAYMENT_STATUS') cKey = o.paymentStatus || 'Pending';
    else if (colDim === 'PAYMENT_METHOD') cKey = o.paymentMethod || 'Cash';

    rowKeys.add(rKey);
    colKeys.add(cKey);

    if (!matrix[rKey]) matrix[rKey] = {};
    if (!matrix[rKey][cKey]) matrix[rKey][cKey] = 0;

    let val = 0;
    if (valMeasure === 'grandTotal') val = o.grandTotal || 0;
    else if (valMeasure === 'grossProfit') val = o.grossProfit || 0;
    else if (valMeasure === 'subtotal') val = o.subtotal || 0;
    else if (valMeasure === 'count') val = 1;

    matrix[rKey][cKey] += val;
  });

  const sortedRows = Array.from(rowKeys).sort();
  const sortedCols = Array.from(colKeys).sort();

  return { rows: sortedRows, cols: sortedCols, matrix };
};

// Export Table Dataset to Downloadable CSV
export const exportToCSV = (filename, columns, dataRows) => {
  if (!dataRows || !dataRows.length) {
    alert('No data available to export.');
    return;
  }

  const headers = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',');
  const rowStrings = dataRows.map((row) =>
    columns
      .map((col) => {
        let val = col.accessor ? col.accessor(row) : row[col.key];
        if (val === undefined || val === null) val = '';
        const cleanVal = String(val).replace(/"/g, '""');
        return `"${cleanVal}"`;
      })
      .join(',')
  );

  const csvContent = '\uFEFF' + [headers, ...rowStrings].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Print PDF Layout Generator
export const printReportPDF = (title, subtitle, companyProfile, columns, dataRows, totalsRow) => {
  const printWindow = window.open('', '_blank', 'width=1100,height=850');
  if (!printWindow) {
    alert('Pop-up blocked! Please allow pop-ups to print PDF reports.');
    return;
  }

  const tableHeaderHtml = columns.map((col) => `<th style="border: 1px solid #cbd5e1; padding: 8px 10px; background: #f1f5f9; text-align: ${col.align || 'left'}; font-size: 11px; font-weight: 800;">${col.label}</th>`).join('');

  const tableBodyHtml = dataRows
    .map(
      (row) =>
        `<tr>` +
        columns
          .map((col) => {
            const val = col.accessor ? col.accessor(row) : row[col.key];
            return `<td style="border: 1px solid #e2e8f0; padding: 7px 10px; text-align: ${col.align || 'left'}; font-size: 11px;">${val ?? ''}</td>`;
          })
          .join('') +
        `</tr>`
    )
    .join('');

  let tableFooterHtml = '';
  if (totalsRow) {
    tableFooterHtml =
      `<tr style="background: #e2e8f0; font-weight: 800;">` +
      columns
        .map((col, idx) => {
          const val = totalsRow[col.key] !== undefined ? totalsRow[col.key] : idx === 0 ? 'TOTAL' : '';
          return `<td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: ${col.align || 'left'}; font-size: 11px;">${val}</td>`;
        })
        .join('') +
      `</tr>`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - ${companyProfile?.name || 'ScreenArts ERP'}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; margin: 20px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 15px; }
          .title-area h1 { margin: 0; font-size: 18px; color: #1e40af; }
          .title-area p { margin: 3px 0 0 0; font-size: 11px; color: #64748b; }
          .company-info { text-align: right; font-size: 10px; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .footer { margin-top: 20px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          @media print {
            body { margin: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="margin-bottom: 10px;">
          <button onclick="window.print()" style="background: #2563eb; color: #fff; border: none; padding: 8px 16px; font-weight: bold; border-radius: 4px; cursor: pointer;">
            Print / Save to PDF
          </button>
        </div>

        <div class="header">
          <div class="title-area">
            <h1>${title}</h1>
            <p>${subtitle || 'Executive Intelligence & Analytical Ledger'}</p>
            <p>Generated on: ${new Date().toLocaleString('en-IN')}</p>
          </div>
          <div class="company-info">
            <strong style="font-size: 12px; color: #0f172a;">${companyProfile?.name || ''}</strong><br/>
            ${companyProfile?.address || ''}<br/>
            GSTIN: ${companyProfile?.gstin || ''} | Phone: ${companyProfile?.phone || ''}
          </div>
        </div>

        <table>
          <thead><tr>${tableHeaderHtml}</tr></thead>
          <tbody>${tableBodyHtml}</tbody>
          <tfoot>${tableFooterHtml}</tfoot>
        </table>

        <div class="footer">
          Printflow Cloud ERP System • ScreenArts Digital & Signage India Pvt Ltd • Page 1 of 1
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
