import React from 'react';
import { useERP } from '../../context/ERPContext';
import { Printer, X, CheckSquare, Factory, UserCheck, Scissors, AlertCircle } from 'lucide-react';

export const JobCardPrintModal = ({ order, selectedItemCard, isOpen, onClose }) => {
  const { companyProfile } = useERP();

  if (!isOpen || (!order && !selectedItemCard)) return null;

  const activeOrder = order || {
    id: selectedItemCard?.orderId,
    orderDate: selectedItemCard?.orderDate,
    deliveryDate: selectedItemCard?.deliveryDate,
    customerName: selectedItemCard?.customerName,
    customerMobile: selectedItemCard?.customerMobile,
    careOfName: selectedItemCard?.careOfName,
    salesPersonName: selectedItemCard?.salesPersonName,
    deliveryMode: 'Local Express Delivery',
    remarks: selectedItemCard?.orderRemarks
  };

  const itemsToPrint = selectedItemCard ? [selectedItemCard.item] : activeOrder.items;
  const displayJobCardCode = selectedItemCard ? selectedItemCard.jobCardId : activeOrder.id;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '850px', maxHeight: '95vh' }}
      >
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Factory size={20} color="#2563eb" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              Shop-Floor Job Card — {displayJobCardCode}
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handlePrint} className="btn btn-primary">
              <Printer size={16} /> Print Job Card
            </button>
            <button onClick={onClose} className="btn-secondary btn-icon" style={{ border: 'none' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-body printable-area" style={{ padding: '1.5rem', background: '#fff' }}>
          {/* Header */}
          <div style={{ borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>
                {companyProfile?.name || 'Stitch & PrintFlow ERP'}
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#333' }}>
                PRODUCTION & SHOP FLOOR JOB CARD
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e40af', background: '#eff6ff', padding: '0.2rem 0.6rem', border: '1px solid #bfdbfe', borderRadius: '4px' }}>
                JOB CARD #: {displayJobCardCode}
              </div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                SO #: <strong>{activeOrder.id}</strong> | Delivery: <strong style={{ color: '#d97706' }}>{selectedItemCard?.deliveryDate || activeOrder.deliveryDate}</strong>
              </div>
            </div>
          </div>

          {/* Customer & Staff Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', fontWeight: 700 }}>CUSTOMER NAME</span>
              <strong>{activeOrder.customerName}</strong>
              <div style={{ fontSize: '0.78rem', color: '#475569' }}>Mob: {activeOrder.customerMobile}</div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', fontWeight: 700 }}>CARE OF PERSON</span>
              <strong>{activeOrder.careOfName || 'N/A'}</strong>
              <div style={{ fontSize: '0.78rem', color: '#475569' }}>Sales: {activeOrder.salesPersonName}</div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', fontWeight: 700 }}>ITEM STATUS</span>
              <strong style={{ color: '#2563eb' }}>{selectedItemCard ? selectedItemCard.productionStatus : activeOrder.productionStatus}</strong>
              <div style={{ fontSize: '0.78rem', color: '#475569' }}>Method: {activeOrder.deliveryMode}</div>
            </div>
          </div>

          {/* Job Items Specs Table */}
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Scissors size={16} /> Production Specifications
          </h4>
          <table className="erp-table" style={{ border: '2px solid #000', marginBottom: '1.25rem' }}>
            <thead>
              <tr style={{ background: '#000', color: '#fff' }}>
                <th style={{ color: '#fff', width: '50px' }}>#</th>
                <th style={{ color: '#fff' }}>Product & Material Specs</th>
                <th style={{ color: '#fff', textAlign: 'center' }}>Size (W × H)</th>
                <th style={{ color: '#fff', textAlign: 'center' }}>Area (Sq.Ft)</th>
                <th style={{ color: '#fff', textAlign: 'center' }}>Qty</th>
                <th style={{ color: '#fff', textAlign: 'center' }}>Artwork</th>
                <th style={{ color: '#fff', textAlign: 'center' }}>Outsource</th>
              </tr>
            </thead>
            <tbody>
              {itemsToPrint.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #000' }}>
                  <td style={{ fontWeight: 800 }}>{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{item.productName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#334155' }}>Material: <strong>{item.material}</strong></div>
                    {item.description && (
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', marginTop: '0.2rem' }}>
                        Note: {item.description}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 800 }}>
                    {item.width && item.height ? `${item.width} × ${item.height} ${item.unit}` : `N/A (${item.unit})`}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                    {item.totalSqFt ? `${item.totalSqFt} sqft` : '—'}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.05rem' }}>
                    {item.qty}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${item.artworkStatus === 'Approved' ? 'badge-emerald' : 'badge-amber'}`}>
                      {item.artworkStatus || 'Pending'}
                    </span>
                    {item.designerName && (
                      <div style={{ fontSize: '0.7rem', color: '#475569' }}>{item.designerName}</div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {item.outsource ? (
                      <div>
                        <span className="badge badge-violet">YES</span>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#5b21b6' }}>{item.vendorName}</div>
                      </div>
                    ) : (
                      <span className="badge badge-slate">In-House</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Shop Floor Checklist Sign-offs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '2px dashed #cbd5e1' }}>
            <div style={{ border: '1px solid #cbd5e1', padding: '0.75rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>1. DESIGN & RIP OPERATOR</div>
              <div style={{ height: '35px', marginTop: '0.5rem', borderBottom: '1px solid #000' }}></div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>Sign & Date</div>
            </div>
            <div style={{ border: '1px solid #cbd5e1', padding: '0.75rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>2. PRINTING & FINISHING TECH</div>
              <div style={{ height: '35px', marginTop: '0.5rem', borderBottom: '1px solid #000' }}></div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>Sign & Date</div>
            </div>
            <div style={{ border: '1px solid #cbd5e1', padding: '0.75rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>3. QUALITY CHECK & DISPATCH</div>
              <div style={{ height: '35px', marginTop: '0.5rem', borderBottom: '1px solid #000' }}></div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>Sign & Date</div>
            </div>
          </div>

          {/* Remarks */}
          {activeOrder.remarks && (
            <div style={{ marginTop: '1rem', padding: '0.6rem 0.85rem', background: '#fffbeb', border: '1px solid #fef08a', borderRadius: '6px', fontSize: '0.8rem', color: '#854d0e' }}>
              <strong>Special Instructions / Remarks:</strong> {activeOrder.remarks}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
