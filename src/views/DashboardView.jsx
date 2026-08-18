import React from 'react';
import { useERP } from '../context/ERPContext';
import {
  TrendingUp,
  DollarSign,
  Clock,
  Factory,
  Truck,
  AlertTriangle,
  Award,
  Users,
  Plus,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
  Palette,
  CreditCard,
  Building2,
  Package,
  CheckCircle2,
  BarChart2
} from 'lucide-react';
import { formatINR } from '../utils/reportEngine';
import { BarChartWidget, DonutChartWidget, TrendLineWidget } from '../components/reports/ReportCharts';

export const DashboardView = ({ onNavigate }) => {
  const { salesOrders, customers, payments, salesPersons, careOfPersons, vendors, products, designers } = useERP();

  const todayStr = new Date().toISOString().split('T')[0];

  // Today KPI Metrics
  const todayOrders = (salesOrders || []).filter((o) => o.orderDate === todayStr || o.createdAt?.startsWith(todayStr));
  const todaySalesVal = todayOrders.reduce((acc, o) => acc + (Number(o.grandTotal) || 0), 0);
  const todayProfitVal = todayOrders.reduce((acc, o) => acc + (Number(o.grossProfit) || 0), 0);

  const todayCollections = (payments || [])
    .filter((p) => p.date === todayStr)
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  // Operational Queues
  const productionQueue = (salesOrders || []).filter((o) =>
    ['New', 'Design', 'Printing', 'Outsource', 'Finishing', 'Quality Check'].includes(o.productionStatus)
  );

  const pendingDesign = (salesOrders || []).filter((o) => o.productionStatus === 'Design' || (o.items || []).some((i) => i.artworkStatus === 'In Design'));
  const pendingDelivery = (salesOrders || []).filter((o) => o.productionStatus === 'Ready for Delivery');
  const pendingPayments = (salesOrders || []).filter((o) => (Number(o.balanceAmount) || 0) > 0);

  const totalOutstanding = (customers || []).reduce((acc, c) => acc + (Number(c.outstanding ?? c.outstandingAmount) || 0), 0);

  // Monthly Metrics
  const monthlySales = (salesOrders || []).reduce((acc, o) => acc + (Number(o.grandTotal) || 0), 0);
  const monthlyProfit = (salesOrders || []).reduce((acc, o) => acc + (Number(o.grossProfit) || 0), 0);
  const overallMarginPct = monthlySales > 0 ? ((monthlyProfit / monthlySales) * 100).toFixed(1) : 0;

  // Direct Orders vs Quotation Intelligence Metrics
  const directOrders = (salesOrders || []).filter((o) => (o.orderType === 'Direct' || !o.orderType) && !o.convertedFromQuotation);
  const directOrdersCount = directOrders.length;
  const directOrdersVal = directOrders.reduce((acc, o) => acc + (Number(o.grandTotal) || 0), 0);

  const quotationDocs = (salesOrders || []).filter((o) => o.orderType === 'Quotation' || o.id?.startsWith('QT-'));
  const totalQuotationsCount = quotationDocs.length;
  const totalQuotationsVal = quotationDocs.reduce((acc, o) => acc + (Number(o.grandTotal) || 0), 0);

  const convertedOrders = (salesOrders || []).filter((o) => o.convertedFromQuotation || o.quotationStatus === 'Converted');
  const convertedQuotationsCount = convertedOrders.length;
  const quotationConversionRate = totalQuotationsCount > 0 ? ((convertedQuotationsCount / totalQuotationsCount) * 100).toFixed(1) : 0;

  const quoteDraftCount = quotationDocs.filter((q) => !q.quotationStatus || q.quotationStatus === 'Draft').length;
  const quoteSentCount = quotationDocs.filter((q) => q.quotationStatus === 'Sent to Customer').length;
  const quoteApprovedCount = quotationDocs.filter((q) => q.quotationStatus === 'Customer Approved').length;

  // Leaderboard computations
  const topCustomers = [...(customers || [])].sort((a, b) => (Number(b.outstanding ?? b.outstandingAmount) || 0) - (Number(a.outstanding ?? a.outstandingAmount) || 0)).slice(0, 5);
  const topProducts = [...(products || [])].slice(0, 5);
  const topVendors = [...(vendors || [])].sort((a, b) => (Number(b.pendingPayment) || 0) - (Number(a.pendingPayment) || 0)).slice(0, 5);

  return (
    <div className="view-container">
      {/* Hero Command Center Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem 1.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 10px 25px -5px rgba(30, 58, 138, 0.3)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <Sparkles size={20} color="#fde047" />
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#93c5fd', fontWeight: 800 }}>
              ERPNext Command & Analytics Center
            </span>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Printflow Cloud ERP Executive Dashboard
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#cbd5e1', marginTop: '0.25rem' }}>
            Live Sales • Collections • Production Queues • Designer Productivity • GST Intelligence
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => onNavigate('reports')}
            className="btn btn-lg"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', fontWeight: 700 }}
          >
            <BarChart2 size={18} /> View All 80+ Reports
          </button>
          <button
            onClick={() => onNavigate('sales-orders', { create: true })}
            className="btn btn-lg"
            style={{ background: '#ffffff', color: '#1e40af', fontWeight: 800, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
          >
            <Plus size={18} /> + New Sales Order
          </button>
        </div>
      </div>

      {/* Row 1: Today's High-Level KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* Today's Sales */}
        <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800 }}>TODAY'S SALES</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
                {formatINR(todaySalesVal)}
              </h3>
            </div>
            <div style={{ background: '#dbeafe', padding: '0.5rem', borderRadius: '8px', color: '#1d4ed8' }}>
              <TrendingUp size={22} />
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>
            {todayOrders.length} Orders Logged Today
          </span>
        </div>

        {/* Today's Collections */}
        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800 }}>TODAY'S COLLECTIONS</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', margin: '0.2rem 0' }}>
                {formatINR(todayCollections)}
              </h3>
            </div>
            <div style={{ background: '#d1fae5', padding: '0.5rem', borderRadius: '8px', color: '#047857' }}>
              <DollarSign size={22} />
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Verified Bank/UPI receipts</span>
        </div>

        {/* Today's Profit */}
        <div className="card" style={{ borderLeft: '4px solid #059669' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800 }}>TODAY'S PROFIT</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857', margin: '0.2rem 0' }}>
                {formatINR(todayProfitVal)}
              </h3>
            </div>
            <div style={{ background: '#d1fae5', padding: '0.5rem', borderRadius: '8px', color: '#047857' }}>
              <Sparkles size={22} />
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>Est Gross Profit</span>
        </div>

        {/* Orders Today */}
        <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800 }}>ORDERS TODAY</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6d28d9', margin: '0.2rem 0' }}>
                {todayOrders.length} Orders
              </h3>
            </div>
            <div style={{ background: '#ede9fe', padding: '0.5rem', borderRadius: '8px', color: '#6d28d9' }}>
              <ShoppingBag size={22} />
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#6d28d9', fontWeight: 600 }}>Active Print Jobs</span>
        </div>
      </div>

      {/* QUOTATIONS & DIRECT SALES WORKFLOW DASHBOARD ROW */}
      <div className="card" style={{ marginBottom: '1.25rem', borderTop: '4px solid #2563eb', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingBag size={20} color="#2563eb" /> Dual Sales Workflows & Quotation Analytics
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Track Direct Sales Orders vs Optional Quotation Conversion Pipeline
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => onNavigate('sales-orders', { create: true, initialType: 'Direct' })} className="btn btn-sm btn-primary">
              + Direct Order
            </button>
            <button onClick={() => onNavigate('sales-orders', { create: true, initialType: 'Quotation' })} className="btn btn-sm" style={{ background: '#f59e0b', color: '#fff', fontWeight: 700 }}>
              + Optional Quote
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {/* Direct Sales Orders Card */}
          <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
            <span style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase' }}>DIRECT SALES ORDERS</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a8a', margin: '0.2rem 0' }}>
              {directOrdersCount} Orders
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1d4ed8' }}>
              {formatINR(directOrdersVal)} (Direct SO)
            </span>
          </div>

          {/* Total Quotations Card */}
          <div style={{ background: '#fffbeb', padding: '1rem', borderRadius: '10px', border: '1px solid #fde68a' }}>
            <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 800, textTransform: 'uppercase' }}>TOTAL QUOTATIONS</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#92400e', margin: '0.2rem 0' }}>
              {totalQuotationsCount} Quotes
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309' }}>
              {formatINR(totalQuotationsVal)} Total Pipeline
            </span>
          </div>

          {/* Quotation Conversion Rate Card */}
          <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
            <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 800, textTransform: 'uppercase' }}>QUOTATION CONVERSION RATE</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#065f46', margin: '0.2rem 0' }}>
              {quotationConversionRate}%
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#047857' }}>
              {convertedQuotationsCount} Converted to Active SO
            </span>
          </div>

          {/* Quotation Pipeline Breakdown */}
          <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.3rem' }}>QUOTE PIPELINE BREAKDOWN</span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
              <span className="badge badge-amber">Draft: {quoteDraftCount}</span>
              <span className="badge badge-blue">Sent: {quoteSentCount}</span>
              <span className="badge badge-emerald">Approved: {quoteApprovedCount}</span>
              <span className="badge badge-purple">Converted: {convertedQuotationsCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Operational Queues Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" onClick={() => onNavigate('production')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>PRODUCTION QUEUE</span>
            <Factory size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e40af', margin: '0.2rem 0' }}>
            {productionQueue.length} Jobs
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Active in factory</span>
        </div>

        <div className="card" onClick={() => onNavigate('designers')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>PENDING DESIGN</span>
            <Palette size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309', margin: '0.2rem 0' }}>
            {pendingDesign.length} Jobs
          </div>
          <span style={{ fontSize: '0.72rem', color: '#b45309' }}>Awaiting proofing</span>
        </div>

        <div className="card" onClick={() => onNavigate('delivery')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>PENDING DELIVERY</span>
            <Truck size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', margin: '0.2rem 0' }}>
            {pendingDelivery.length} Orders
          </div>
          <span style={{ fontSize: '0.72rem', color: '#059669' }}>Ready for dispatch</span>
        </div>

        <div className="card" onClick={() => onNavigate('payments')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>PENDING PAYMENTS</span>
            <CreditCard size={18} color="#e11d48" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#e11d48', margin: '0.2rem 0' }}>
            {pendingPayments.length} Orders
          </div>
          <span style={{ fontSize: '0.72rem', color: '#e11d48' }}>Outstanding balance</span>
        </div>
      </div>

      {/* Row 3: Interactive Graphs & Visual Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <TrendLineWidget title="Monthly Sales vs Gross Profit Graph" />
        <BarChartWidget
          title="Monthly Product Category Sales"
          items={products.map((p) => ({ label: p.name, value: p.defaultRate * 150 }))}
        />
        <DonutChartWidget
          title="Payment Status Distribution"
          items={[
            { label: 'Fully Paid', value: salesOrders.filter((o) => o.paymentStatus === 'Paid').length, color: '#10b981' },
            { label: 'Partial Advance', value: salesOrders.filter((o) => o.paymentStatus === 'Partial').length, color: '#f59e0b' },
            { label: 'Credit Account', value: salesOrders.filter((o) => o.paymentStatus === 'Credit').length, color: '#3b82f6' },
            { label: 'Unpaid Pending', value: salesOrders.filter((o) => o.paymentStatus === 'Pending').length, color: '#e11d48' }
          ]}
        />
      </div>

      {/* Row 4: Performance Leaderboards & Top Performance Lists */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {/* Top Sales Person Leaderboard */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Award size={18} color="#d97706" /> Top Sales Persons
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {salesPersons.map((sp) => {
              const pct = Math.min(100, Math.round((sp.achieved / sp.target) * 100));
              return (
                <div key={sp.id} style={{ fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <strong style={{ color: '#0f172a' }}>{sp.name}</strong>
                    <span style={{ fontWeight: 800, color: '#059669' }}>{formatINR(sp.achieved)}</span>
                  </div>
                  <div style={{ width: '100%', background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, background: '#2563eb', height: '100%' }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                    <span>Target: {formatINR(sp.target)}</span>
                    <span>Comm: {sp.commissionRate}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Care Of Persons */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Users size={18} color="#059669" /> Top Care Of Persons
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {careOfPersons.map((co) => (
              <div key={co.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{co.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{co.role}</div>
                </div>
                <span className="badge badge-blue">{co.activeOrders} Active Jobs</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Vendors */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Building2 size={18} color="#7c3aed" /> Top Outsource Vendors
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {topVendors.map((v) => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{v.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{v.category}</div>
                </div>
                <span className={`badge ${v.pendingPayment > 0 ? 'badge-amber' : 'badge-emerald'}`}>
                  {formatINR(v.pendingPayment)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
