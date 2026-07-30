import React from 'react';
import { useERP } from '../../context/ERPContext';
import { Printer, X, FileText, Download, MessageSquare, CheckCircle2 } from 'lucide-react';
import { handleSendWhatsApp } from '../../utils/whatsapp';

export const TaxInvoicePrintModal = ({ order, isOpen, onClose }) => {
  const { companyProfile, activeUser, trackWhatsAppSent } = useERP();

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    // Trigger browser print to PDF
    window.print();
  };

  const onWhatsAppClick = () => {
    handleSendWhatsApp({
      order,
      companyProfile,
      activeUser,
      trackWhatsAppSent,
      onDownloadPdf: handleDownloadPdf
    });
  };

  const isInterstate = order.customerState && !order.customerState.includes('Maharashtra');
  const hasMobile = Boolean(order.customerMobile && order.customerMobile.trim());

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', maxHeight: '95vh' }}
      >
        <div className="modal-header no-print" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="#059669" />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>GST Tax Invoice — {order.id}</h3>
              {order.whatsAppOpened === 'Yes' && (
                <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700 }}>
                  ● WhatsApp Opened by {order.whatsAppSentBy || 'Staff'} on {order.lastWhatsAppDate} {order.lastWhatsAppTime}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* Green WhatsApp Click-to-Chat Button */}
            <button
              onClick={onWhatsAppClick}
              disabled={!hasMobile}
              title={hasMobile ? "Open WhatsApp Click-to-Chat & Download PDF" : "Customer mobile number is missing."}
              className="btn"
              style={{
                background: hasMobile ? '#25D366' : '#cbd5e1',
                color: '#ffffff',
                fontWeight: 800,
                border: 'none',
                cursor: hasMobile ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem'
              }}
            >
              <MessageSquare size={16} color="#fff" /> 📱 Send WhatsApp
            </button>

            {/* Download PDF Button */}
            <button onClick={handleDownloadPdf} className="btn btn-secondary" style={{ fontWeight: 700 }}>
              <Download size={15} /> PDF
            </button>

            {/* Print Button */}
            <button onClick={handlePrint} className="btn btn-primary" style={{ fontWeight: 700 }}>
              <Printer size={15} /> Print
            </button>

            <button onClick={onClose} className="btn-secondary btn-icon" style={{ border: 'none' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-body printable-area" style={{ padding: '2rem', background: '#fff', fontSize: '0.85rem' }}>
          {/* Header */}
          <div style={{ borderBottom: '2px solid #000', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e3a8a', margin: 0 }}>
                {companyProfile.name}
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#334155' }}>{companyProfile.address}</div>
              <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                GSTIN: <strong>{companyProfile.gstin}</strong> | State Code: <strong>27 (Maharashtra)</strong>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                Phone: {companyProfile.phone} | Email: {companyProfile.email}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', color: '#059669', border: '2px solid #059669', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                TAX INVOICE
              </div>
              <div style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>
                Invoice No: <strong>INV-{order.id.replace('SO-', '')}</strong>
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                Order Ref: <strong>{order.id}</strong>
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                Invoice Date: <strong>{order.orderDate}</strong>
              </div>
            </div>
          </div>

          {/* Billed To / Shipped To Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', border: '1px solid #000', padding: '0.85rem', borderRadius: '4px', marginBottom: '1.25rem', backgroundColor: '#fafafa' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.2rem', marginBottom: '0.4rem' }}>
                BILLED TO (BUYER DETAILS)
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{order.customerName}</div>
              <div style={{ color: '#334155' }}>GSTIN: <strong style={{ color: '#1e40af' }}>{order.customerGstin || 'URP (Unregistered)'}</strong></div>
              <div style={{ color: '#334155' }}>Mobile: {order.customerMobile}</div>
              <div style={{ color: '#334155' }}>State Code: {order.customerState || 'Maharashtra (27)'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.2rem', marginBottom: '0.4rem' }}>
                SHIPPING & STAFF DETAILS
              </div>
              <div>Sales Person: <strong>{order.salesPersonName}</strong></div>
              <div>Care Of Person: <strong>{order.careOfName}</strong></div>
              <div>Delivery Mode: <strong>{order.deliveryMode}</strong></div>
              <div>Reference / PO: <strong>{order.referenceNo || 'N/A'}</strong></div>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="erp-table" style={{ border: '2px solid #000', marginBottom: '1.25rem' }}>
            <thead>
              <tr style={{ background: '#1e293b', color: '#fff' }}>
                <th style={{ color: '#fff', width: '35px' }}>#</th>
                <th style={{ color: '#fff' }}>Item & Specification</th>
                <th style={{ color: '#fff', textAlign: 'center' }}>HSN</th>
                <th style={{ color: '#fff', textAlign: 'center' }}>Qty</th>
                <th style={{ color: '#fff', textAlign: 'right' }}>Rate (₹)</th>
                <th style={{ color: '#fff', textAlign: 'right' }}>Taxable Amt (₹)</th>
                {isInterstate ? (
                  <th style={{ color: '#fff', textAlign: 'right' }}>IGST 18%</th>
                ) : (
                  <>
                    <th style={{ color: '#fff', textAlign: 'right' }}>CGST 9%</th>
                    <th style={{ color: '#fff', textAlign: 'right' }}>SGST 9%</th>
                  </>
                )}
                <th style={{ color: '#fff', textAlign: 'right' }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => {
                const taxAmt = (item.amount * 0.18);
                const cgstLine = isInterstate ? 0 : taxAmt / 2;
                const sgstLine = isInterstate ? 0 : taxAmt / 2;
                const igstLine = isInterstate ? taxAmt : 0;
                const lineTotal = item.amount + taxAmt;

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ fontWeight: 700 }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{item.productName}</div>
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        {item.width && item.height ? `Size: ${item.width} × ${item.height} ${item.unit} (${item.totalSqFt} sqft)` : `Unit: ${item.unit}`}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>9989</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.qty}</td>
                    <td style={{ textAlign: 'right' }}>{item.sellingRate.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    {isInterstate ? (
                      <td style={{ textAlign: 'right' }}>{igstLine.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    ) : (
                      <>
                        <td style={{ textAlign: 'right' }}>{cgstLine.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'right' }}>{sgstLine.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </>
                    )}
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Tax Breakdown & Settlement */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ border: '1px solid #cbd5e1', padding: '0.85rem', borderRadius: '4px', backgroundColor: '#f8fafc', fontSize: '0.78rem' }}>
              <div style={{ fontWeight: 800, color: '#1e3a8a', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Bank Account Details for Payment
              </div>
              <div>Bank: <strong>{companyProfile.bankDetails.bankName}</strong></div>
              <div>Account Name: <strong>{companyProfile.bankDetails.accountName}</strong></div>
              <div>Account No: <strong style={{ fontFamily: 'var(--font-mono)' }}>{companyProfile.bankDetails.accountNo}</strong></div>
              <div>IFSC Code: <strong style={{ fontFamily: 'var(--font-mono)' }}>{companyProfile.bankDetails.ifsc}</strong></div>
              <div>Branch: <strong>{companyProfile.bankDetails.branch}</strong></div>
              <div style={{ marginTop: '0.4rem', color: '#059669', fontWeight: 700 }}>
                UPI ID: {companyProfile.bankDetails.upiId}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                <span>Subtotal (Taxable Amount):</span>
                <strong>₹{order.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              </div>
              {isInterstate ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: '#475569' }}>
                  <span>IGST (18%):</span>
                  <span>₹{order.igst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: '#475569' }}>
                    <span>CGST (9%):</span>
                    <span>₹{order.cgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: '#475569' }}>
                    <span>SGST (9%):</span>
                    <span>₹{order.sgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: '#64748b' }}>
                <span>Round Off:</span>
                <span>₹{order.roundOff}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '2px solid #000', borderBottom: '2px solid #000', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                <span>Grand Total:</span>
                <span>₹{order.grandTotal.toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: '#059669', fontWeight: 700 }}>
                <span>Advance Paid ({order.paymentMethod}):</span>
                <span>₹{order.advanceAmount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: order.balanceAmount > 0 ? '#e11d48' : '#059669', fontWeight: 800 }}>
                <span>Balance Due:</span>
                <span>₹{order.balanceAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Signatures & Terms */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', borderTop: '1px solid #cbd5e1', paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              <strong>Terms & Conditions:</strong>
              <div style={{ whiteSpace: 'pre-line', marginTop: '0.2rem' }}>{companyProfile.terms}</div>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                For {companyProfile.name}
              </div>
              <div style={{ height: '40px' }}></div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, borderTop: '1px dashed #000', paddingTop: '0.25rem' }}>
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
