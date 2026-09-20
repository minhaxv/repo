import React, { useMemo } from 'react';
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
  BarChart2,
  Printer,
  Scissors,
  CheckSquare,
  Cpu,
  Flame,
  ArrowRight,
  Eye,
  Sliders
} from 'lucide-react';
import { formatINR } from '../utils/reportEngine';

export const DashboardView = ({ onNavigate }) => {
  const { salesOrders, customers, payments, machines, employees, products, vendors, activeUser, activeRole } = useERP();
  const isAdminOrManager = (activeUser?.role === 'Admin' || activeUser?.role === 'Manager') || activeRole === 'Admin' || activeRole === 'Manager';

  const todayStr = new Date().toISOString().split('T')[0];

  // Flatten all items into rich job cards
  const allJobs = useMemo(() => {
    const list = [];
    (salesOrders || []).forEach((o) => {
      (o.items || []).forEach((it, idx) => {
        const jcId = it.jobCardId || `JC-${o.id.split('-').pop()}-${idx + 1}`;
        let itemStatus = it.productionStatus || o.productionStatus || 'New';
        if (itemStatus === 'New') itemStatus = it.designerRequired === 'YES' ? 'Designing' : 'Printing';
        if (itemStatus === 'Design') itemStatus = 'Designing';
        if (itemStatus === 'Ready') itemStatus = 'Ready for Delivery';

        const itemDeliveryDate = it.deliveryDate || o.deliveryDate;
        const isPastDue = itemDeliveryDate && new Date(itemDeliveryDate) < new Date(todayStr) && itemStatus !== 'Delivered';

        const estCost = Number(it.estimatedCost || 0);
        const actCost = Number(it.actualCost || estCost);
        const sellPrice = Number(it.amount || (it.sellingRate * (it.qty || 1)) || 0);
        const grossProfit = sellPrice - actCost;

        list.push({
          id: it.id || `JOB-${idx + 1}`,
          jobCardId: jcId,
          orderId: o.id,
          orderDate: o.orderDate || o.createdAt?.split('T')[0],
          deliveryDate: itemDeliveryDate,
          isDelayed: isPastDue,
          customerName: o.customerName,
          customerMobile: o.customerMobile,
          productName: it.customTitle ? `${it.productName} — (${it.customTitle})` : it.productName,
          qty: it.qty || 1,
          unit: it.unit || 'Sq.Ft',
          productionStatus: itemStatus,
          jobPriority: it.jobPriority || 'Normal',
          assignedOperator: it.assignedOperatorName || it.printerName || '',
          assignedMachine: it.assignedMachineName || '',
          sellingPrice: sellPrice,
          actualCost: actCost,
          grossProfit: grossProfit
        });
      });
    });
    return list;
  }, [salesOrders, todayStr]);

  // Today Orders & Sales
  const todayOrders = (salesOrders || []).filter((o) => o.orderDate === todayStr || o.createdAt?.startsWith(todayStr));
  const todaySalesVal = todayOrders.reduce((acc, o) => acc + (Number(o.grandTotal) || 0), 0);
  const todayProfitVal = todayOrders.reduce((acc, o) => acc + (Number(o.grossProfit) || 0), 0);

  // Operational Printing Stages Counts
  const designPendingJobs = allJobs.filter((j) => j.productionStatus === 'Designing');
  const printingPendingJobs = allJobs.filter((j) => j.productionStatus === 'Printing');
  const finishingPendingJobs = allJobs.filter((j) => j.productionStatus === 'Finishing');
  const readyForDeliveryJobs = allJobs.filter((j) => j.productionStatus === 'Ready for Delivery');
  const deliveredJobs = allJobs.filter((j) => j.productionStatus === 'Delivered');

  // Urgent and Delayed Jobs
  const urgentJobs = allJobs.filter((j) => (j.jobPriority === 'Urgent' || j.jobPriority === 'High') && j.productionStatus !== 'Delivered');
  const delayedJobs = allJobs.filter((j) => j.isDelayed);

  // Financial Metrics
  const totalOutstanding = (customers || []).reduce((acc, c) => acc + (Number(c.outstanding ?? c.outstandingAmount) || 0), 0);

  // Machine Workloads
  const machineWorkloadList = (machines || []).map((mch) => {
    const runningJobsCount = allJobs.filter((j) => j.assignedMachine === mch.name && j.productionStatus === 'Printing').length;
    return {
      ...mch,
      runningJobsCount
    };
  });

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="view-container">
      {/* Hero Command Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 10px 25px -5px rgba(30, 58, 138, 0.3)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#93c5fd', fontWeight: 700 }}>
              {timeGreeting}, ScreenArts Production Master
            </span>
            <span className="badge badge-emerald" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
              ● Live Floor Active
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Printing Shop-Floor Command Center
          </h1>
          <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
            Real-time operations • {allJobs.length} Total Jobs • {machines.length} Machines Active • {urgentJobs.length} Urgent Queue
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigate ? onNavigate('sales-orders', { create: true }) : window.dispatchEvent(new CustomEvent('ERP_NAVIGATE_ORDER_CREATE', { detail: {} }))}
            className="btn btn-primary"
            style={{ background: '#ffffff', color: '#1e3a8a', fontWeight: 800 }}
          >
            <Plus size={16} /> + New Job Order
          </button>
          <button
            onClick={() => onNavigate ? onNavigate('production') : window.dispatchEvent(new CustomEvent('ERP_NAVIGATE_PRODUCTION'))}
            className="btn btn-secondary"
            style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.3)', fontWeight: 700 }}
          >
            <Factory size={16} /> Live Production Board
          </button>
        </div>
      </div>

      {/* Primary 8-Metric Printing Industry Executive Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {/* Metric 1: Today's Orders */}
        <div className="card" style={{ padding: '0.85rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Today's Orders</span>
            <ShoppingBag size={14} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {todayOrders.length}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#3b82f6', fontWeight: 700 }}>Orders Created</span>
        </div>

        {/* Metric 2: Designing Pending */}
        <div
          className="card"
          onClick={() => onNavigate ? onNavigate('production', { initialStageFilter: 'Designing' }) : null}
          style={{ padding: '0.85rem', borderLeft: '4px solid #8b5cf6', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Design Pending</span>
            <Palette size={14} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#7c3aed', margin: '0.2rem 0' }}>
            {designPendingJobs.length}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Art Queue</span>
        </div>

        {/* Metric 3: Printing Pending */}
        <div
          className="card"
          onClick={() => onNavigate ? onNavigate('production', { initialStageFilter: 'Printing' }) : null}
          style={{ padding: '0.85rem', borderLeft: '4px solid #2563eb', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Printing Floor</span>
            <Printer size={14} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1d4ed8', margin: '0.2rem 0' }}>
            {printingPendingJobs.length}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 700 }}>On Press</span>
        </div>

        {/* Metric 4: Finishing Pending */}
        <div
          className="card"
          onClick={() => onNavigate ? onNavigate('production', { initialStageFilter: 'Finishing' }) : null}
          style={{ padding: '0.85rem', borderLeft: '4px solid #d97706', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Finishing</span>
            <Scissors size={14} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#d97706', margin: '0.2rem 0' }}>
            {finishingPendingJobs.length}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Cut/Lam/Bind</span>
        </div>

        {/* Metric 5: Ready for Delivery */}
        <div
          className="card"
          onClick={() => onNavigate ? onNavigate('production', { initialStageFilter: 'Ready for Delivery' }) : null}
          style={{ padding: '0.85rem', borderLeft: '4px solid #059669', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Ready / QC</span>
            <CheckCircle2 size={14} color="#059669" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669', margin: '0.2rem 0' }}>
            {readyForDeliveryJobs.length}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700 }}>Awaiting Dispatch</span>
        </div>

        {/* Metric 6: Today's Sales */}
        <div className="card" style={{ padding: '0.85rem', borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Today's Sales</span>
            <TrendingUp size={14} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {formatINR(todaySalesVal)}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#0284c7', fontWeight: 700 }}>Billed Value</span>
        </div>

        {/* Metric 7: Outstanding Payment */}
        <div className="card" style={{ padding: '0.85rem', borderLeft: '4px solid #dc2626' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 800, textTransform: 'uppercase' }}>Outstanding</span>
            <CreditCard size={14} color="#dc2626" />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626', margin: '0.2rem 0' }}>
            {formatINR(totalOutstanding)}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#dc2626' }}>Customer Dues</span>
        </div>

        {/* Metric 8: Today's Profit (Admin & Manager Only) */}
        {isAdminOrManager && (
          <div className="card" style={{ padding: '0.85rem', borderLeft: '4px solid #16a34a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Today's Profit</span>
              <DollarSign size={14} color="#16a34a" />
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669', margin: '0.2rem 0' }}>
              {formatINR(todayProfitVal)}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>Gross Margin</span>
          </div>
        )}
      </div>

      {/* Production Board Live Mini Widget */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Factory size={18} color="#2563eb" /> Live Production Floor Pipeline Monitor
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Interactive shop-floor stage tracker across all orders and customer jobs.
            </span>
          </div>

          <button
            onClick={() => onNavigate ? onNavigate('production') : null}
            className="btn btn-sm btn-secondary"
            style={{ fontSize: '0.78rem', fontWeight: 700 }}
          >
            Open Full Production Board <ArrowRight size={14} />
          </button>
        </div>

        {/* Visual Pipeline Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
          {[
            { stage: 'Designing', label: '1. Designing', count: designPendingJobs.length, icon: Palette, color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
            { stage: 'Printing', label: '2. Printing Floor', count: printingPendingJobs.length, icon: Printer, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { stage: 'Finishing', label: '3. Finishing', count: finishingPendingJobs.length, icon: Scissors, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
            { stage: 'Quality Check', label: '4. Quality Check', count: allJobs.filter(j => j.productionStatus === 'Quality Check').length, icon: CheckSquare, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
            { stage: 'Ready for Delivery', label: '5. Ready', count: readyForDeliveryJobs.length, icon: CheckCircle2, color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
            { stage: 'Delivered', label: '6. Delivered', count: deliveredJobs.length, icon: Truck, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }
          ].map((col) => {
            const Icon = col.icon;
            return (
              <div
                key={col.stage}
                onClick={() => onNavigate ? onNavigate('production', { initialStageFilter: col.stage }) : null}
                style={{
                  background: col.bg,
                  border: `1.5px solid ${col.border}`,
                  borderRadius: '10px',
                  padding: '0.85rem',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <Icon size={16} color={col.color} />
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: col.color }}>
                    {col.count}
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>
                  {col.label}
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {col.count === 1 ? '1 active job' : `${col.count} active jobs`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Section: Urgent/Delayed Jobs & Machine Workload */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Section 1: Urgent & Overdue Action Center */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Flame size={18} color="#dc2626" /> Urgent & Delayed Jobs Priority Center
            </h3>
            <span className="badge badge-rose" style={{ fontSize: '0.7rem' }}>
              {urgentJobs.length + delayedJobs.length} Attention Needed
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto' }}>
            {urgentJobs.length === 0 && delayedJobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.82rem' }}>
                🎉 All jobs on track! No urgent or delayed bottlenecks.
              </div>
            ) : (
              [...urgentJobs, ...delayedJobs.filter(d => !urgentJobs.some(u => u.jobCardId === d.jobCardId))].slice(0, 6).map((job) => (
                <div
                  key={`${job.orderId}-${job.jobCardId}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem 0.75rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    fontSize: '0.8rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>
                      {job.jobCardId} • {job.productName}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      👤 {job.customerName} • <strong>{job.qty} {job.unit}</strong>
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${job.isDelayed ? 'badge-rose' : 'badge-amber'}`} style={{ fontSize: '0.66rem' }}>
                      {job.isDelayed ? 'Delayed' : job.jobPriority}
                    </span>
                    <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700, marginTop: '2px' }}>
                      Due: {job.deliveryDate || 'ASAP'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 2: Machine Workload & Status */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Cpu size={18} color="#2563eb" /> Machinery Floor Workload & Health
            </h3>
            <button
              onClick={() => onNavigate ? onNavigate('machines') : null}
              className="btn btn-sm btn-secondary"
              style={{ fontSize: '0.75rem' }}
            >
              Machines Master
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto' }}>
            {machineWorkloadList.slice(0, 5).map((mch) => {
              const isRunning = mch.status === 'Running';
              const isIdle = mch.status === 'Idle';

              return (
                <div
                  key={mch.id}
                  style={{
                    padding: '0.6rem 0.75rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>
                      {mch.name}
                    </div>
                    <span className={`badge ${isRunning ? 'badge-emerald' : isIdle ? 'badge-amber' : 'badge-rose'}`} style={{ fontSize: '0.66rem' }}>
                      {mch.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                    <span>Type: {mch.type}</span>
                    <span>Rate: ₹{mch.hourlyCost}/hr</span>
                  </div>

                  {/* Workload bar */}
                  <div style={{ width: '100%', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginTop: '2px' }}>
                    <div style={{ width: `${Math.min(100, (mch.activeJobCount || mch.runningJobsCount || 1) * 25)}%`, height: '100%', backgroundColor: '#2563eb' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
