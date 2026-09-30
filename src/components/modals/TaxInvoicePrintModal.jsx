import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { Printer, X, FileText, Download, MessageSquare, QrCode, CheckCircle2, Truck, Sparkles, Receipt } from 'lucide-react';
import { handleSendWhatsApp } from '../../utils/whatsapp';
import QRCode from 'qrcode';

export const TaxInvoicePrintModal = ({ order, isOpen, onClose }) => {
  const { companyProfile, activeUser, trackWhatsAppSent } = useERP();

  // Active Bill Format: 'standard_a4' | 'modern_a4' | 'thermal_80mm' | 'delivery_challan'
  const [billFormat, setBillFormat] = useState(() => {
    return localStorage.getItem('stitch_bill_format') || companyProfile?.defaultBillFormat || 'standard_a4';
  });

  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Generate real dynamic UPI Payment QR Code
  useEffect(() => {
    if (order && companyProfile) {
      const upiId = companyProfile?.bankDetails?.upiId || companyProfile?.upiId || 'screenarts@upi';
      const payeeName = companyProfile?.name || 'ScreenArts Digital';
      const amount = order?.balanceAmount > 0 ? order.balanceAmount : (order?.grandTotal || 0);
      const note = `Order-${order?.id || 'Bill'}`;
      
      const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

      QRCode.toDataURL(upiString, { width: 140, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.warn('QR Code generation error:', err));
    }
  }, [order, companyProfile]);

  // Persist format preference
  const handleSelectFormat = (fmt) => {
    setBillFormat(fmt);
    localStorage.setItem('stitch_bill_format', fmt);
  };

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
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

  const isInterstate = order.customerState && !order.customerState.includes('Maharashtra') && !order.customerState.includes('Kerala');
  const hasMobile = Boolean(order.customerMobile && order.customerMobile.trim());
  const isB2B = Boolean(
    order.invoiceType === 'B2B' ||
    (order.customerGstin && order.customerGstin.trim().length >= 10 && !['URP', 'N/A', 'NONE', 'UNREGISTERED'].includes(order.customerGstin.trim().toUpperCase()))
  );
  const invoiceTypeBadge = isB2B ? 'B2B' : 'B2C';
  const invoicePrefix = companyProfile?.invoicePrefix || 'INV-';
  const invoiceNo = `${invoicePrefix}${order.id.replace('SO-', '')}`;

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: billFormat === 'thermal_80mm' ? '560px' : '960px',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'max-width 0.25s ease'
        }}
      >
        {/* Dynamic Print Styles for thermal roll vs standard A4 */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .printable-bill-area, .printable-bill-area * {
              visibility: visible;
            }
            .printable-bill-area {
              position: absolute;
              left: 0;
              top: 0;
              width: ${billFormat === 'thermal_80mm' ? '80mm' : '100%'} !important;
              margin: 0;
              padding: ${billFormat === 'thermal_80mm' ? '4mm' : '12mm'} !important;
              background: #fff !important;
              color: #000 !important;
            }
            .no-print {
              display: none !important;
            }
            @page {
              size: ${billFormat === 'thermal_80mm' ? '80mm auto' : 'A4 portrait'};
              margin: ${billFormat === 'thermal_80mm' ? '2mm' : '8mm'};
            }
          }
        `}</style>

        {/* Modal Top Control Bar */}
        <div className="modal-header no-print" style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="#2563eb" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Invoice & Bill Preview — {order.id}
              </h3>
              <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, background: isB2B ? '#1e40af' : '#059669', color: '#fff' }}>
                {invoiceTypeBadge}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Choose print format layout below: Standard GST, Modern Sleek, Thermal POS Roll, or Delivery Slip.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* WhatsApp */}
            <button
              onClick={onWhatsAppClick}
              disabled={!hasMobile}
              title={hasMobile ? "Open WhatsApp Click-to-Chat & Download PDF" : "Customer mobile number is missing."}
              className="btn"
              style={{
                background: hasMobile ? '#25D366' : '#cbd5e1',
                color: '#ffffff',
                fontWeight: 700,
                border: 'none',
                cursor: hasMobile ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.38rem 0.75rem',
                fontSize: '0.82rem'
              }}
            >
              <MessageSquare size={14} color="#fff" /> WhatsApp
            </button>

            {/* Print */}
            <button onClick={handlePrint} className="btn btn-primary" style={{ fontWeight: 700, fontSize: '0.82rem', padding: '0.38rem 0.75rem' }}>
              <Printer size={14} /> Print Bill
            </button>

            {/* Close */}
            <button onClick={onClose} className="btn-secondary btn-icon" style={{ border: 'none', padding: '0.35rem' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Bill Format Switcher Tabs */}
        <div className="no-print" style={{ padding: '0.65rem 1.25rem', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', display: 'flex', gap: '0.5rem', alignItems: 'center', overflowX: 'auto' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginRight: '0.25rem' }}>
            Bill Format:
          </span>

          <button
            type="button"
            onClick={() => handleSelectFormat('standard_a4')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: billFormat === 'standard_a4' ? 800 : 600,
              cursor: 'pointer',
              border: `1px solid ${billFormat === 'standard_a4' ? '#2563eb' : '#cbd5e1'}`,
              background: billFormat === 'standard_a4' ? '#2563eb' : '#fff',
              color: billFormat === 'standard_a4' ? '#fff' : '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <FileText size={14} /> Standard GST (A4)
          </button>

          <button
            type="button"
            onClick={() => handleSelectFormat('modern_a4')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: billFormat === 'modern_a4' ? 800 : 600,
              cursor: 'pointer',
              border: `1px solid ${billFormat === 'modern_a4' ? '#059669' : '#cbd5e1'}`,
              background: billFormat === 'modern_a4' ? '#059669' : '#fff',
              color: billFormat === 'modern_a4' ? '#fff' : '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Sparkles size={14} /> Modern Sleek (A4)
          </button>

          <button
            type="button"
            onClick={() => handleSelectFormat('thermal_80mm')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: billFormat === 'thermal_80mm' ? 800 : 600,
              cursor: 'pointer',
              border: `1px solid ${billFormat === 'thermal_80mm' ? '#d97706' : '#cbd5e1'}`,
              background: billFormat === 'thermal_80mm' ? '#d97706' : '#fff',
              color: billFormat === 'thermal_80mm' ? '#fff' : '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Receipt size={14} /> 80mm Thermal POS
          </button>

          <button
            type="button"
            onClick={() => handleSelectFormat('delivery_challan')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: billFormat === 'delivery_challan' ? 800 : 600,
              cursor: 'pointer',
              border: `1px solid ${billFormat === 'delivery_challan' ? '#4f46e5' : '#cbd5e1'}`,
              background: billFormat === 'delivery_challan' ? '#4f46e5' : '#fff',
              color: billFormat === 'delivery_challan' ? '#fff' : '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Truck size={14} /> Delivery Challan Slip
          </button>
        </div>

        {/* Scrollable Printable Bill Container */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#cbd5e1', padding: '1.25rem', display: 'flex', justifyContent: 'center' }}>
          
          {/* ========================================================================= */}
          {/* FORMAT 1: STANDARD GST A4 TAX INVOICE */}
          {/* ========================================================================= */}
          {billFormat === 'standard_a4' && (
            <div className="printable-bill-area" style={{ width: '100%', maxWidth: '850px', background: '#fff', padding: '2rem', borderRadius: '6px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', fontSize: '0.85rem', color: '#0f172a' }}>
              {/* Header */}
              <div style={{ borderBottom: '2px solid #000', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1e3a8a', margin: 0 }}>
                    {companyProfile?.name}
                  </h2>
                  <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '2px' }}>{companyProfile?.address}</div>
                  <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                    GSTIN: <strong>{companyProfile?.gstin}</strong> | State Code: <strong>{companyProfile?.stateCode || '32'} ({companyProfile?.state || 'Kerala'})</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                    Phone: {companyProfile?.phone} | Email: {companyProfile?.email}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', border: '2px solid #059669', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 900, textTransform: 'uppercase', color: '#059669' }}>
                      TAX INVOICE
                    </span>
                    <span style={{ background: isB2B ? '#1e40af' : '#059669', color: '#ffffff', fontWeight: 800, fontSize: '0.75rem', padding: '0.15rem 0.45rem', borderRadius: '3px' }}>
                      {invoiceTypeBadge}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>
                    Invoice No: <strong>{invoiceNo}</strong>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', border: '1px solid #000', padding: '0.85rem', borderRadius: '4px', marginBottom: '1.25rem', backgroundColor: '#fafafa' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.2rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
                      BILLED TO (BUYER DETAILS)
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.35rem', borderRadius: '3px', background: isB2B ? '#dbeafe' : '#f1f5f9', color: isB2B ? '#1e40af' : '#475569', border: `1px solid ${isB2B ? '#93c5fd' : '#cbd5e1'}` }}>
                      {invoiceTypeBadge}
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{order.customerName}</div>
                  <div style={{ color: '#334155' }}>
                    GSTIN: {isB2B ? <strong style={{ color: '#1e40af', fontSize: '0.88rem' }}>{order.customerGstin}</strong> : <strong style={{ color: '#64748b' }}>Non-GST (B2C / URP)</strong>}
                  </div>
                  <div style={{ color: '#334155' }}>Mobile: {order.customerMobile || 'N/A'}</div>
                  <div style={{ color: '#334155' }}>State Code: {order.customerState || 'Kerala (32)'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.2rem', marginBottom: '0.4rem' }}>
                    SHIPPING & STAFF DETAILS
                  </div>
                  <div>Billed By: <strong style={{ color: '#1e40af' }}>{order.billedByStaff || 'N/A'}</strong></div>
                  <div>Sales Person: <strong>{order.salesPersonName || 'Direct'}</strong></div>
                  <div>Care Of: <strong>{order.careOfName || '—'}</strong></div>
                  <div>Delivery Mode: <strong>{order.deliveryMode || 'Self Pickup'}</strong></div>
                  <div>Reference / PO: <strong>{order.referenceNo || 'N/A'}</strong></div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="erp-table" style={{ border: '2px solid #000', marginBottom: '1.25rem', width: '100%' }}>
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
                          <div style={{ fontWeight: 700 }}>
                            {item.productName}
                            {(item.specName || item.material) && (
                              <span style={{ color: '#1e40af', fontWeight: 600, marginLeft: '6px' }}>
                                — {item.specName || item.material}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                            {item.width && item.height ? `Size: ${item.width} × ${item.height} ${item.unit} (${item.totalSqFt} sqft)` : `Unit: ${item.unit}`}
                            {item.description && <span style={{ marginLeft: '6px', fontStyle: 'italic' }}>({item.description})</span>}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{item.hsnCode || '9989'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.qty}</td>
                        <td style={{ textAlign: 'right' }}>{Number(item?.sellingRate ?? 0).toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{Number(item?.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        {isInterstate ? (
                          <td style={{ textAlign: 'right' }}>{Number(igstLine ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        ) : (
                          <>
                            <td style={{ textAlign: 'right' }}>{Number(cgstLine ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td style={{ textAlign: 'right' }}>{Number(sgstLine ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </>
                        )}
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>{Number(lineTotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
                  <div>Bank: <strong>{companyProfile?.bankDetails?.bankName || 'HDFC Bank'}</strong></div>
                  <div>Account Name: <strong>{companyProfile?.bankDetails?.accountName || companyProfile?.name}</strong></div>
                  <div>Account No: <strong style={{ fontFamily: 'var(--font-mono)' }}>{companyProfile?.bankDetails?.accountNo || '50200012345678'}</strong></div>
                  <div>IFSC Code: <strong style={{ fontFamily: 'var(--font-mono)' }}>{companyProfile?.bankDetails?.ifsc || 'HDFC0001234'}</strong></div>
                  <div>Branch: <strong>{companyProfile?.bankDetails?.branch || 'Main Branch'}</strong></div>
                  <div style={{ marginTop: '0.4rem', color: '#059669', fontWeight: 700 }}>
                    UPI ID: {companyProfile?.bankDetails?.upiId || 'screenarts@upi'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                    <span>Subtotal (Taxable Amount):</span>
                    <strong>₹{Number(order?.subtotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                  </div>
                  {isInterstate ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: '#475569' }}>
                      <span>IGST (18%):</span>
                      <span>₹{Number(order?.igst ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: '#475569' }}>
                        <span>CGST (9%):</span>
                        <span>₹{Number(order?.cgst ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: '#475569' }}>
                        <span>SGST (9%):</span>
                        <span>₹{Number(order?.sgst ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: '#64748b' }}>
                    <span>Round Off:</span>
                    <span>₹{order?.roundOff ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '2px solid #000', borderBottom: '2px solid #000', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                    <span>Grand Total:</span>
                    <span>₹{Number(order?.grandTotal ?? 0).toLocaleString()}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: '#059669', fontWeight: 700 }}>
                    <span>Advance Paid ({order?.paymentMethod || 'UPI'}):</span>
                    <span>₹{Number(order?.advanceAmount ?? 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: (order?.balanceAmount || 0) > 0 ? '#e11d48' : '#059669', fontWeight: 800 }}>
                    <span>Balance Due:</span>
                    <span>₹{Number(order?.balanceAmount ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Signatures & Terms */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', borderTop: '1px solid #cbd5e1', paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  <strong>Terms & Conditions:</strong>
                  <div style={{ whiteSpace: 'pre-line', marginTop: '0.2rem' }}>
                    {companyProfile?.termsAndConditions || companyProfile?.terms || '1. 50% Advance mandatory.\n2. Goods once delivered cannot be returned.'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    For {companyProfile?.name}
                  </div>
                  <div style={{ height: '40px' }}></div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, borderTop: '1px dashed #000', paddingTop: '0.25rem' }}>
                    Authorized Signatory
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FORMAT 2: MODERN SLEEK A4 INVOICE */}
          {/* ========================================================================= */}
          {billFormat === 'modern_a4' && (
            <div className="printable-bill-area" style={{ width: '100%', maxWidth: '850px', background: '#fff', padding: '2.5rem', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '0.88rem', color: '#1e293b' }}>
              {/* Modern Header Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: '#fff', padding: '0.35rem 0.85rem', borderRadius: '6px', fontWeight: 900, letterSpacing: '1px', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    {companyProfile?.name?.toUpperCase()}
                  </div>
                  <p style={{ margin: '0 0 0.25rem 0', color: '#64748b', fontSize: '0.82rem', maxWidth: '360px' }}>{companyProfile?.address}</p>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569' }}>
                    GSTIN: <strong style={{ color: '#0f172a' }}>{companyProfile?.gstin}</strong> | State: <strong>{companyProfile?.state}</strong>
                  </p>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569' }}>
                    Tel: {companyProfile?.phone} | Web: {companyProfile?.website || 'www.screenarts.in'}
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.25rem 0', letterSpacing: '-0.5px' }}>
                    INVOICE
                  </h1>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                    {invoiceNo}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Date: <strong>{order.orderDate}</strong>
                  </div>
                  <div style={{ marginTop: '0.4rem' }}>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800, background: (order?.balanceAmount || 0) <= 0 ? '#dcfce7' : '#fee2e2', color: (order?.balanceAmount || 0) <= 0 ? '#15803d' : '#b91c1c' }}>
                      {(order?.balanceAmount || 0) <= 0 ? 'PAID IN FULL' : `BALANCE DUE: ₹${Number(order?.balanceAmount || 0).toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Client & Shipping Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2563eb', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Invoiced To</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{order.customerName}</div>
                  <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '0.25rem' }}>
                    GSTIN: <strong>{order.customerGstin || 'Unregistered / B2C'}</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#475569' }}>Phone: {order.customerMobile || '—'}</div>
                  <div style={{ fontSize: '0.82rem', color: '#475569' }}>Place of Supply: {order.customerState || 'Intra-State'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Order & Logistics</span>
                  <div style={{ fontSize: '0.85rem', color: '#1e293b', marginTop: '0.35rem' }}>Order Reference: <strong>{order.id}</strong></div>
                  <div style={{ fontSize: '0.85rem', color: '#1e293b' }}>Billed By: <strong style={{ color: '#2563eb' }}>{order.billedByStaff || 'Billing Team'}</strong></div>
                  <div style={{ fontSize: '0.85rem', color: '#1e293b' }}>Delivery Mode: <strong>{order.deliveryMode || 'Pickup'}</strong></div>
                  <div style={{ fontSize: '0.85rem', color: '#1e293b' }}>Sales Executive: <strong>{order.salesPersonName || 'Direct'}</strong></div>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: '#fff', textAlign: 'left', fontSize: '0.82rem' }}>
                    <th style={{ padding: '0.75rem', borderRadius: '6px 0 0 0' }}>Description</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>HSN</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Rate</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', borderRadius: '0 6px 0 0' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.productName}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {item.width && item.height ? `${item.width} × ${item.height} ${item.unit} (${item.totalSqFt} sqft)` : item.unit}
                          {item.material && ` • ${item.material}`}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontFamily: 'monospace' }}>{item.hsnCode || '9989'}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700 }}>{item.qty}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{Number(item.sellingRate || 0).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 800 }}>₹{Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Modern Payment & Totals Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* QR Code Scan & Pay Card */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {qrCodeUrl && (
                    <img src={qrCodeUrl} alt="UPI QR Code" style={{ width: '100px', height: '100px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>Scan & Pay via UPI</div>
                    <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, margin: '2px 0' }}>
                      {companyProfile?.bankDetails?.upiId || 'screenarts@hdfcbank'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Bank: {companyProfile?.bankDetails?.bankName} • A/C: {companyProfile?.bankDetails?.accountNo} • IFSC: {companyProfile?.bankDetails?.ifsc}
                    </div>
                  </div>
                </div>

                {/* Calculation Totals */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Taxable Subtotal:</span>
                    <span>₹{Number(order?.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>GST (18%):</span>
                    <span>₹{Number((order?.cgst || 0) + (order?.sgst || 0) + (order?.igst || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a', fontWeight: 900, fontSize: '1.15rem', color: '#0f172a' }}>
                    <span>Invoice Total:</span>
                    <span>₹{Number(order?.grandTotal || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700 }}>
                    <span>Paid Advance:</span>
                    <span>₹{Number(order?.advanceAmount || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: (order?.balanceAmount || 0) > 0 ? '#dc2626' : '#16a34a', fontWeight: 800 }}>
                    <span>Balance Outstanding:</span>
                    <span>₹{Number(order?.balanceAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Modern Footer */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                <div>{companyProfile?.invoiceFooterNote || 'Thank you for choosing ScreenArts! We appreciate your business.'}</div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>Authorized Signatory — {companyProfile?.name}</div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FORMAT 3: 80MM THERMAL POS RECEIPT */}
          {/* ========================================================================= */}
          {billFormat === 'thermal_80mm' && (
            <div className="printable-bill-area" style={{ width: '80mm', maxWidth: '320px', background: '#fff', padding: '1rem 0.8rem', borderRadius: '4px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontFamily: '"Courier New", Courier, monospace', fontSize: '11px', color: '#000', lineHeight: 1.35 }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase' }}>
                  {companyProfile?.name}
                </div>
                <div>{companyProfile?.address}</div>
                <div>GSTIN: {companyProfile?.gstin}</div>
                <div>Tel: {companyProfile?.phone}</div>
                <div style={{ margin: '4px 0', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '2px 0', fontWeight: 700 }}>
                  *** TAX INVOICE ***
                </div>
              </div>

              {/* Order Info */}
              <div style={{ marginBottom: '0.5rem' }}>
                <div>Inv No: <strong>{invoiceNo}</strong></div>
                <div>Date  : {order.orderDate}</div>
                <div>Cust  : <strong>{order.customerName}</strong></div>
                <div>Phone : {order.customerMobile || 'N/A'}</div>
                <div>Billed: {order.billedByStaff || 'Cashier'}</div>
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px dashed #000', textAlign: 'left' }}>
                    <th style={{ padding: '2px 0' }}>ITEM</th>
                    <th style={{ textAlign: 'center', padding: '2px 0' }}>QTY</th>
                    <th style={{ textAlign: 'right', padding: '2px 0' }}>AMT</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '3px 0' }}>
                        <div><strong>{it.productName}</strong></div>
                        <div style={{ fontSize: '10px' }}>{it.width && it.height ? `${it.width}x${it.height} ${it.unit}` : it.unit}</div>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'top', padding: '3px 0' }}>{it.qty}</td>
                      <td style={{ textAlign: 'right', verticalAlign: 'top', padding: '3px 0' }}>{Number(it.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

              {/* Totals */}
              <div style={{ fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>₹{Number(order?.subtotal || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>GST (18%):</span>
                  <span>₹{Number((order?.cgst || 0) + (order?.sgst || 0) + (order?.igst || 0)).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '13px', margin: '4px 0', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 0' }}>
                  <span>TOTAL:</span>
                  <span>₹{Number(order?.grandTotal || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Paid:</span>
                  <span>₹{Number(order?.advanceAmount || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>BALANCE:</span>
                  <span>₹{Number(order?.balanceAmount || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Mini UPI QR Code */}
              {qrCodeUrl && (order?.balanceAmount || 0) > 0 && (
                <div style={{ textAlign: 'center', marginTop: '0.6rem' }}>
                  <img src={qrCodeUrl} alt="UPI QR" style={{ width: '85px', height: '85px' }} />
                  <div style={{ fontSize: '9px', fontWeight: 700 }}>Scan with PhonePe / GPay</div>
                  <div style={{ fontSize: '9px' }}>{companyProfile?.bankDetails?.upiId || 'screenarts@upi'}</div>
                </div>
              )}

              {/* Footer */}
              <div style={{ textAlign: 'center', marginTop: '0.6rem', borderTop: '1px dashed #000', paddingTop: '4px', fontSize: '10px' }}>
                <div>Thank you for your visit!</div>
                <div>Goods once delivered cannot be returned</div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FORMAT 4: DELIVERY CHALLAN & DISPATCH SLIP */}
          {/* ========================================================================= */}
          {billFormat === 'delivery_challan' && (
            <div className="printable-bill-area" style={{ width: '100%', maxWidth: '850px', background: '#fff', padding: '2rem', borderRadius: '6px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', fontSize: '0.85rem', color: '#0f172a' }}>
              <div style={{ borderBottom: '2px solid #1e3a8a', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e3a8a', margin: 0 }}>
                    {companyProfile?.name}
                  </h2>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>{companyProfile?.address}</div>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>Phone: {companyProfile?.phone}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ background: '#1e3a8a', color: '#fff', padding: '0.35rem 0.85rem', borderRadius: '4px', fontWeight: 900, fontSize: '1rem', letterSpacing: '0.5px' }}>
                    DELIVERY CHALLAN
                  </div>
                  <div style={{ marginTop: '0.3rem', fontSize: '0.85rem' }}>
                    Challan No: <strong>DC-{order.id.replace('SO-', '')}</strong>
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    Dispatch Date: <strong>{order.deliveryDate || order.orderDate}</strong>
                  </div>
                </div>
              </div>

              {/* Destination & Transport Box */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', border: '1px solid #cbd5e1', padding: '0.85rem', borderRadius: '6px', marginBottom: '1.5rem', background: '#f8fafc' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Consignee / Deliver To:</span>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', marginTop: '2px' }}>{order.customerName}</div>
                  <div style={{ color: '#475569' }}>Contact: {order.customerMobile || 'N/A'}</div>
                  <div style={{ color: '#475569' }}>Destination: {order.customerState || 'Local Dispatch'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Logistics / Dispatch Details:</span>
                  <div>Order Reference: <strong>{order.id}</strong></div>
                  <div>Delivery Mode: <strong style={{ color: '#2563eb' }}>{order.deliveryMode || 'Vehicle Dispatch'}</strong></div>
                  <div>Dispatched By: <strong>{order.billedByStaff || 'Store Manager'}</strong></div>
                </div>
              </div>

              {/* Items Checklist Table (No Prices) */}
              <table className="erp-table" style={{ border: '2px solid #0f172a', marginBottom: '2rem', width: '100%' }}>
                <thead>
                  <tr style={{ background: '#1e3a8a', color: '#fff' }}>
                    <th style={{ color: '#fff', width: '40px' }}>#</th>
                    <th style={{ color: '#fff' }}>Description of Printed Goods & Material</th>
                    <th style={{ color: '#fff', textAlign: 'center' }}>Dimensions / Size</th>
                    <th style={{ color: '#fff', textAlign: 'center' }}>Unit</th>
                    <th style={{ color: '#fff', textAlign: 'center', width: '80px' }}>Quantity</th>
                    <th style={{ color: '#fff', textAlign: 'center', width: '90px' }}>Verified ✓</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td style={{ fontWeight: 700 }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{it.productName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{it.specName || it.material || 'Standard Fabrication'}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {it.width && it.height ? `${it.width} × ${it.height} ${it.unit} (${it.totalSqFt} sqft)` : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>{it.unit}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: '#1e3a8a' }}>{it.qty}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', width: '18px', height: '18px', border: '1.5px solid #000', borderRadius: '3px' }}></span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Delivery Receipt Signatures */}
              <div style={{ border: '1px solid #cbd5e1', padding: '1.25rem', borderRadius: '6px', background: '#f8fafc' }}>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.78rem', color: '#475569', fontStyle: 'italic' }}>
                  "Received the above mentioned goods in good condition, complete quantity, and satisfactory quality."
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', textAlign: 'center', paddingTop: '2.5rem' }}>
                  <div style={{ borderTop: '1px dashed #000', paddingTop: '0.4rem', fontWeight: 700, fontSize: '0.8rem' }}>
                    Prepared / Dispatched By
                  </div>
                  <div style={{ borderTop: '1px dashed #000', paddingTop: '0.4rem', fontWeight: 700, fontSize: '0.8rem' }}>
                    Delivery Driver / Transporter
                  </div>
                  <div style={{ borderTop: '1px dashed #000', paddingTop: '0.4rem', fontWeight: 700, fontSize: '0.8rem' }}>
                    Customer / Receiver Signature & Stamp
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
