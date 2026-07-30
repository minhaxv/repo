import React, { useState } from 'react';
import { Layers, Grid, SlidersHorizontal } from 'lucide-react';
import { buildPivotMatrix, formatINR } from '../../utils/reportEngine';

export const PivotReportView = ({ orders = [] }) => {
  const [rowDim, setRowDim] = useState('CUSTOMER');
  const [colDim, setColDim] = useState('MONTH');
  const [valMeasure, setValMeasure] = useState('grandTotal');

  const { rows, cols, matrix } = buildPivotMatrix(orders, rowDim, colDim, valMeasure);

  // Column Totals
  const colTotals = {};
  cols.forEach((c) => {
    colTotals[c] = rows.reduce((acc, r) => acc + (matrix[r]?.[c] || 0), 0);
  });

  const grandTotalAll = Object.values(colTotals).reduce((a, b) => a + b, 0);

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      {/* Pivot Controls Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Grid size={20} color="#2563eb" /> Multi-Dimensional Pivot Matrix Report
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Cross-tabulate high-volume sales orders by Row & Column dimensions
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <SlidersHorizontal size={16} color="#64748b" />

          {/* Row Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Rows:</span>
            <select
              value={rowDim}
              onChange={(e) => setRowDim(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.78rem', height: '32px', fontWeight: 700 }}
            >
              <option value="CUSTOMER">Customer Name</option>
              <option value="SALESPERSON">Sales Person</option>
              <option value="CAREOF">Care Of Coordinator</option>
              <option value="STATUS">Production Status</option>
              <option value="SOURCE">Order Source</option>
            </select>
          </div>

          {/* Column Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Columns:</span>
            <select
              value={colDim}
              onChange={(e) => setColDim(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.78rem', height: '32px', fontWeight: 700 }}
            >
              <option value="MONTH">Order Month</option>
              <option value="STATUS">Production Status</option>
              <option value="PAYMENT_STATUS">Payment Status</option>
              <option value="PAYMENT_METHOD">Payment Method</option>
            </select>
          </div>

          {/* Measure Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Values:</span>
            <select
              value={valMeasure}
              onChange={(e) => setValMeasure(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.78rem', height: '32px', fontWeight: 700 }}
            >
              <option value="grandTotal">Grand Total Revenue (₹)</option>
              <option value="grossProfit">Gross Profit (₹)</option>
              <option value="subtotal">Taxable Subtotal (₹)</option>
              <option value="count">Order Count (Qty)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pivot Matrix Table */}
      <div className="table-responsive" style={{ maxHeight: '550px', overflowY: 'auto' }}>
        <table className="erp-table">
          <thead>
            <tr>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9' }}>{rowDim} \ {colDim}</th>
              {cols.map((col) => (
                <th key={col} style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9', textAlign: 'right' }}>{col}</th>
              ))}
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#e2e8f0', textAlign: 'right', fontWeight: 800 }}>ROW TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((rowKey) => {
              let rowSum = 0;
              return (
                <tr key={rowKey}>
                  <td style={{ fontWeight: 800, color: '#0f172a' }}>{rowKey}</td>
                  {cols.map((colKey) => {
                    const val = matrix[rowKey]?.[colKey] || 0;
                    rowSum += val;
                    return (
                      <td key={colKey} style={{ textAlign: 'right', fontWeight: val > 0 ? 700 : 400, color: val > 0 ? '#1e40af' : '#94a3b8' }}>
                        {valMeasure === 'count' ? val : formatINR(val)}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669', background: '#f8fafc' }}>
                    {valMeasure === 'count' ? rowSum : formatINR(rowSum)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#e2e8f0', fontWeight: 800 }}>
              <td>GRAND TOTAL</td>
              {cols.map((colKey) => (
                <td key={colKey} style={{ textAlign: 'right', color: '#1e40af' }}>
                  {valMeasure === 'count' ? colTotals[colKey] : formatINR(colTotals[colKey])}
                </td>
              ))}
              <td style={{ textAlign: 'right', color: '#059669', fontSize: '0.95rem' }}>
                {valMeasure === 'count' ? grandTotalAll : formatINR(grandTotalAll)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
