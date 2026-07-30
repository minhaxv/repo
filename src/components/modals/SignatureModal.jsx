import React, { useRef, useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { PenTool, Check, RotateCcw, X, Truck } from 'lucide-react';

export const SignatureModal = ({ order, isOpen, onClose }) => {
  const { saveDeliverySignature, activeUser } = useERP();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [deliveredBy, setDeliveredBy] = useState(activeUser?.name || 'Delivery Executive');
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSave = () => {
    if (!hasSignature) {
      alert('Please provide customer signature before completing delivery.');
      return;
    }
    const canvas = canvasRef.current;
    const signatureUrl = canvas.toDataURL('image/png');
    saveDeliverySignature(order.id, signatureUrl, deliveredBy);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Truck size={20} color="#2563eb" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Customer Delivery Sign-Off</h3>
          </div>
          <button onClick={onClose} className="btn-secondary btn-icon" style={{ border: 'none' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
            <div>Order: <strong>{order.id}</strong> ({order.customerName})</div>
            <div>Delivery Mode: <strong>{order.deliveryMode}</strong></div>
          </div>

          <div className="form-group">
            <label className="form-label">Delivered By (Executive Name)</label>
            <input
              type="text"
              className="form-control"
              value={deliveredBy}
              onChange={(e) => setDeliveredBy(e.target.value)}
              placeholder="Driver / Executive Name"
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label" style={{ margin: 0 }}>
                <PenTool size={14} /> Customer Electronic Signature
              </label>
              <button onClick={clearCanvas} type="button" className="btn btn-sm btn-secondary" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}>
                <RotateCcw size={12} /> Clear Canvas
              </button>
            </div>

            <div style={{ border: '2px dashed #3b82f6', borderRadius: '8px', overflow: 'hidden', background: '#ffffff' }}>
              <canvas
                ref={canvasRef}
                width={480}
                height={160}
                style={{ width: '100%', height: '160px', cursor: 'crosshair', touchAction: 'none' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', display: 'block', marginTop: '0.25rem' }}>
              Sign above using mouse or touch screen
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn btn-success">
            <Check size={16} /> Confirm Delivery & Save Signature
          </button>
        </div>
      </div>
    </div>
  );
};
