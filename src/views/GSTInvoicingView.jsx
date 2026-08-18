import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { TaxInvoicePrintModal } from '../components/modals/TaxInvoicePrintModal';
import { FileText, Printer, Search, CheckCircle2, ShieldCheck, Building, MessageSquare } from 'lucide-react';
import { handleSendWhatsApp } from '../utils/whatsapp';

export const GSTInvoicingView = () => {
  const { salesOrders, companyProfile, activeUser, trackWhatsAppSent } = useERP();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInvoices = salesOrders.filter((o) =>
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.customerGstin && o.customerGstin.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Compute total tax collected
  const totalTaxable = salesOrders.reduce((acc, o) => acc + (Number(o?.subtotal ?? 0) || 0), 0);
  const totalCGST = salesOrders.reduce((acc, o) => acc + (Number(o?.cgst ?? 0) || 0), 0);
  const totalSGST = salesOrders.reduce((acc, o) => acc + (Number(o?.sgst ?? 0) || 0), 0);
  const totalIGST = salesOrders.reduce((acc, o) => acc + (Number(o?.igst ?? 0) || 0), 0);

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={24} color="#059669" /> GST Tax Invoicing & GSTR-1 Hub
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Compliant with Indian GST Regulations • ETR, ITR & NTR Support • HSN 9989 / 4911
          </span>
        </div>
      </div>

      {/* Tax Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>TOTAL TAXABLE SALES</span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            ₹{totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>CGST (9%) + SGST (9%)</span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e40af', margin: '0.2rem 0' }}>
            ₹{(totalCGST + totalSGST).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>IGST (18% INTERSTATE)</span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#7c3aed', margin: '0.2rem 0' }}>
            ₹{totalIGST.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '280px', position: 'relative' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px' }}
              placeholder="Search Tax Invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Invoice Date</th>
                <th>Buyer Name</th>
                <th>Buyer GSTIN</th>
                <th>State Code</th>
                <th>Taxable Amount</th>
                <th>CGST (9%)</th>
                <th>SGST (9%)</th>
                <th>IGST (18%)</th>
                <th>Grand Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 800, color: '#059669' }}>INV-{order.id.replace('SO-', '')}</td>
                  <td>{order.orderDate}</td>
                  <td style={{ fontWeight: 700 }}>{order.customerName}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{order.customerGstin || 'URP'}</td>
                  <td>{order.customerState}</td>
                  <td>₹{Number(order?.subtotal ?? 0).toLocaleString()}</td>
                  <td>₹{Number(order?.cgst ?? 0).toLocaleString()}</td>
                  <td>₹{Number(order?.sgst ?? 0).toLocaleString()}</td>
                  <td>₹{Number(order?.igst ?? 0).toLocaleString()}</td>
                  <td style={{ fontWeight: 800 }}>₹{Number(order?.grandTotal ?? 0).toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => setSelectedInvoice(order)}
                        className="btn btn-sm btn-primary"
                      >
                        <Printer size={14} /> Print
                      </button>
                      <button
                        onClick={() =>
                          handleSendWhatsApp({
                            order,
                            companyProfile,
                            activeUser,
                            trackWhatsAppSent,
                            onDownloadPdf: () => setSelectedInvoice(order)
                          })
                        }
                        disabled={!order.customerMobile}
                        className="btn btn-sm"
                        style={{
                          background: order.customerMobile ? '#25D366' : '#cbd5e1',
                          color: '#ffffff',
                          fontWeight: 800,
                          border: 'none',
                          cursor: order.customerMobile ? 'pointer' : 'not-allowed'
                        }}
                        title={order.customerMobile ? "Send WhatsApp Invoice" : "Customer mobile number is missing."}
                      >
                        <MessageSquare size={14} color="#fff" /> 📱 WhatsApp
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TaxInvoicePrintModal
        order={selectedInvoice}
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
};
