import React, { useState, useEffect, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import {
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Palette,
  Eye,
  Send,
  Save,
  RefreshCw,
  Sliders,
  ExternalLink,
  ChevronRight,
  Filter,
  Users,
  Check,
  X,
  Building2,
  Calendar
} from 'lucide-react';
import { api } from '../utils/api';

export const SalesPricingQueueView = ({ onNavigate }) => {
  const {
    salesOrders,
    customers,
    activeUser,
    activeRole,
    updateItemPrice
  } = useERP();

  const [queueItems, setQueueItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING'); // 'PENDING' | 'COMPLETE' | 'ALL'
  const [designerFilter, setDesignerFilter] = useState('ALL');
  const [editingRates, setEditingRates] = useState({}); // { [itemId]: rate }
  const [editingDiscounts, setEditingDiscounts] = useState({});
  const [savingItemId, setSavingItemId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Fetch queue items from dedicated endpoint
  const loadQueue = async () => {
    try {
      setLoading(true);
      const res = await api.fetchSalesPricingQueue();
      if (res && res.queue) {
        setQueueItems(res.queue);
        // Initialize editing rates
        const rates = {};
        const discounts = {};
        res.queue.forEach(item => {
          rates[item.item_id] = item.selling_rate || '';
          discounts[item.item_id] = 0;
        });
        setEditingRates(rates);
        setEditingDiscounts(discounts);
      }
    } catch (err) {
      console.error("Failed to load sales pricing queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  // Designers list from items
  const uniqueDesigners = useMemo(() => {
    const set = new Set();
    queueItems.forEach(i => {
      if (i.item_added_by_name) set.add(i.item_added_by_name);
      if (i.designer_name) set.add(i.designer_name);
    });
    return Array.from(set);
  }, [queueItems]);

  // Filtered queue items
  const filteredQueue = useMemo(() => {
    return queueItems.filter(item => {
      if (statusFilter === 'PENDING' && item.pricing_status === 'COMPLETE') return false;
      if (statusFilter === 'COMPLETE' && item.pricing_status !== 'COMPLETE') return false;

      if (designerFilter !== 'ALL') {
        const dName = item.item_added_by_name || item.designer_name;
        if (dName !== designerFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          (item.order_number && item.order_number.toLowerCase().includes(q)) ||
          (item.customer_name && item.customer_name.toLowerCase().includes(q)) ||
          (item.product_name && item.product_name.toLowerCase().includes(q)) ||
          (item.spec_name && item.spec_name.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [queueItems, statusFilter, designerFilter, searchQuery]);

  // Save Item Price Handlers
  const handleSavePrice = async (item) => {
    const rate = parseFloat(editingRates[item.item_id]);
    if (isNaN(rate) || rate < 0) {
      alert('Please enter a valid selling rate');
      return;
    }

    try {
      setSavingItemId(item.item_id);
      await updateItemPrice(item.sales_order_id, item.item_id, {
        sellingRate: rate,
        discount: Number(editingDiscounts[item.item_id] || 0),
        gstRate: item.gst_rate || 18,
        approve: true
      });
      await loadQueue();
    } catch (err) {
      console.error("Failed to save price:", err);
      alert('Failed to save rate: ' + err.message);
    } finally {
      setSavingItemId(null);
    }
  };

  // Group pending orders summary
  const orderSummaryStats = useMemo(() => {
    const pendingItemsCount = queueItems.filter(i => i.pricing_status === 'PENDING').length;
    const pendingOrdersSet = new Set(queueItems.filter(i => i.pricing_status === 'PENDING').map(i => i.sales_order_id));
    const completedOrdersSet = new Set(queueItems.filter(i => i.pricing_status === 'COMPLETE').map(i => i.sales_order_id));

    return {
      pendingItemsCount,
      pendingOrdersCount: pendingOrdersSet.size,
      completedOrdersCount: completedOrdersSet.size
    };
  }, [queueItems]);

  return (
    <div style={{ padding: '1.25rem', color: '#f8fafc', minHeight: '90vh' }}>
      {/* ------------------------------------------------------------- */}
      {/* HEADER & STATS CARDS                                          */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '1rem 1.25rem',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '12px',
        border: '1px solid #334155',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <FileText size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
              Sales Pricing Queue
            </h1>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Review design sessions & set commercial selling rates for customer orders
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={loadQueue}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              borderRadius: '7px',
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#38bdf8',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Queue
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{
          background: '#1e293b',
          borderRadius: '10px',
          padding: '1rem',
          border: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f59e0b' }}>
              {orderSummaryStats.pendingItemsCount}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600 }}>
              Items Pending Rate
            </div>
          </div>
        </div>

        <div style={{
          background: '#1e293b',
          borderRadius: '10px',
          padding: '1rem',
          border: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '8px',
            background: 'rgba(139, 92, 246, 0.15)',
            color: '#c084fc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#c084fc' }}>
              {orderSummaryStats.pendingOrdersCount}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600 }}>
              Orders Awaiting Final Rate
            </div>
          </div>
        </div>

        <div style={{
          background: '#1e293b',
          borderRadius: '10px',
          padding: '1rem',
          border: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#10b981' }}>
              {orderSummaryStats.completedOrdersCount}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600 }}>
              Priced & Ready Orders
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FILTER CONTROLS                                               */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        padding: '0.85rem 1.25rem',
        background: '#1e293b',
        borderRadius: '10px',
        border: '1px solid #334155',
        marginBottom: '1.25rem'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            placeholder="Search order, customer, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.8rem 0.5rem 2.2rem',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.82rem'
            }}
          />
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '0.65rem', color: '#64748b' }} />
        </div>

        {/* Status Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.76rem', color: '#94a3b8', marginRight: '0.2rem' }}>Status:</span>
          {[
            { id: 'PENDING', label: 'Pending Price' },
            { id: 'COMPLETE', label: 'Priced' },
            { id: 'ALL', label: 'All Items' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: statusFilter === tab.id ? '#3b82f6' : '#0f172a',
                color: statusFilter === tab.id ? '#fff' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Designer Filter */}
        {uniqueDesigners.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Added By:</span>
            <select
              value={designerFilter}
              onChange={(e) => setDesignerFilter(e.target.value)}
              style={{
                padding: '0.4rem 0.6rem',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.8rem'
              }}
            >
              <option value="ALL">All Staff</option>
              {uniqueDesigners.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PRICING QUEUE TABLE                                           */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        border: '1px solid #334155',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '0.75rem 0.8rem' }}>Order Details</th>
                <th style={{ padding: '0.75rem 0.8rem' }}>Customer</th>
                <th style={{ padding: '0.75rem 0.8rem' }}>Product & Material</th>
                <th style={{ padding: '0.75rem 0.6rem' }}>Dimensions & Qty</th>
                <th style={{ padding: '0.75rem 0.6rem' }}>Design Preview</th>
                <th style={{ padding: '0.75rem 0.6rem' }}>Added By</th>
                <th style={{ padding: '0.75rem 0.6rem' }}>Selling Rate (₹)</th>
                <th style={{ padding: '0.75rem 0.6rem' }}>Total Amount</th>
                <th style={{ padding: '0.75rem 0.8rem', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 0.75rem auto', display: 'block' }} />
                    <strong style={{ color: '#e2e8f0', fontSize: '1rem' }}>Pricing Queue is Clear!</strong>
                    <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                      All designer items have verified commercial selling rates.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQueue.map(item => {
                  const width = Number(item.width || 0);
                  const height = Number(item.height || 0);
                  const qty = Number(item.qty || 1);
                  const unit = (item.unit || 'Sq.Ft').toLowerCase();
                  const area = (unit === 'sq.ft' && width > 0 && height > 0) ? (width * height * qty) : qty;
                  const currentRate = parseFloat(editingRates[item.item_id] ?? item.selling_rate ?? 0) || 0;
                  const lineTotal = Math.round(currentRate * area * (1 + (item.gst_rate || 18) / 100));

                  return (
                    <tr
                      key={item.item_id}
                      style={{
                        borderBottom: '1px solid #334155',
                        background: item.pricing_status === 'PENDING' ? 'rgba(245, 158, 11, 0.04)' : 'transparent'
                      }}
                    >
                      {/* Order Details */}
                      <td style={{ padding: '0.75rem 0.8rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong
                            onClick={() => onNavigate && onNavigate('sales-orders', { selectId: item.sales_order_id })}
                            style={{ color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            #{item.order_number}
                            <ExternalLink size={12} />
                          </strong>
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                            {item.order_date}
                          </span>
                          {item.is_amendment ? (
                            <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 700 }}>Amendment Item</span>
                          ) : null}
                        </div>
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '0.75rem 0.8rem' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{item.customer_name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{item.customer_mobile || 'No Phone'}</div>
                      </td>

                      {/* Product & Material */}
                      <td style={{ padding: '0.75rem 0.8rem' }}>
                        <strong style={{ color: '#e2e8f0', display: 'block' }}>{item.product_name}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.spec_name || item.material || 'Standard Media'}</span>
                        {item.design_notes && (
                          <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontStyle: 'italic', marginTop: '0.2rem' }}>
                            Note: {item.design_notes}
                          </div>
                        )}
                      </td>

                      {/* Dimensions & Qty */}
                      <td style={{ padding: '0.75rem 0.6rem' }}>
                        {width > 0 && height > 0 ? (
                          <div>
                            <div>{width} × {height} {item.unit}</div>
                            <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>{area} Total {item.unit}</span>
                          </div>
                        ) : (
                          <div>{qty} {item.unit}</div>
                        )}
                      </td>

                      {/* Design Preview */}
                      <td style={{ padding: '0.75rem 0.6rem' }}>
                        {item.artwork_url ? (
                          <div
                            onClick={() => setPreviewImage(item.artwork_url)}
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border: '1px solid #38bdf8',
                              cursor: 'pointer',
                              background: '#0f172a'
                            }}
                          >
                            <img src={item.artwork_url} alt="Artwork" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>No Artwork</span>
                        )}
                      </td>

                      {/* Added By Designer */}
                      <td style={{ padding: '0.75rem 0.6rem' }}>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                          {item.item_added_by_name || item.designer_name || 'Designer'}
                        </div>
                        <span style={{
                          fontSize: '0.68rem',
                          background: 'rgba(56, 189, 248, 0.1)',
                          color: '#38bdf8',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '3px'
                        }}>
                          {item.pricing_responsibility || 'SALES'}
                        </span>
                      </td>

                      {/* Editable Selling Rate */}
                      <td style={{ padding: '0.75rem 0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span style={{ color: '#64748b' }}>₹</span>
                          <input
                            type="number"
                            step="any"
                            placeholder="0.00"
                            value={editingRates[item.item_id] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingRates(prev => ({ ...prev, [item.item_id]: val }));
                            }}
                            style={{
                              width: '85px',
                              padding: '0.4rem 0.5rem',
                              background: '#0f172a',
                              border: item.pricing_status === 'PENDING' ? '1px solid #f59e0b' : '1px solid #334155',
                              borderRadius: '5px',
                              color: '#fff',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              textAlign: 'right'
                            }}
                          />
                        </div>
                      </td>

                      {/* Line Total */}
                      <td style={{ padding: '0.75rem 0.6rem', fontWeight: 700, color: '#f8fafc' }}>
                        {lineTotal > 0 ? `₹${lineTotal.toLocaleString()}` : <span style={{ color: '#64748b' }}>—</span>}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.75rem 0.8rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleSavePrice(item)}
                          disabled={savingItemId === item.item_id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.45rem 0.85rem',
                            borderRadius: '6px',
                            background: item.pricing_status === 'PENDING' ? '#10b981' : '#334155',
                            color: '#fff',
                            border: 'none',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                          }}
                        >
                          {savingItemId === item.item_id ? (
                            <RefreshCw size={13} className="animate-spin" />
                          ) : (
                            <Save size={13} />
                          )}
                          {item.pricing_status === 'PENDING' ? 'Set Rate' : 'Update'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Large Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 110,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '85vw', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Artwork" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px' }} />
            <button
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPricingQueueView;
