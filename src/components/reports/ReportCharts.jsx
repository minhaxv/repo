import React from 'react';
import { TrendingUp, PieChart as PieIcon, BarChart2 } from 'lucide-react';
import { formatINR } from '../../utils/reportEngine';

// Bar Chart Widget (Revenue & Profit by Category / Entity)
export const BarChartWidget = ({ title, items = [] }) => {
  if (!items || items.length === 0) return null;

  const maxVal = Math.max(...items.map((it) => it.value || 0), 1);

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <BarChart2 size={18} color="#2563eb" /> {title}
        </h4>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {items.slice(0, 7).map((item, idx) => {
          const pct = Math.min(100, Math.round(((item.value || 0) / maxVal) * 100));
          return (
            <div key={idx} style={{ fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>{item.label}</span>
                <span style={{ fontWeight: 800, color: item.color || '#1e40af' }}>
                  {typeof item.value === 'number' && item.isCurrency !== false ? formatINR(item.value) : item.value}
                </span>
              </div>
              <div style={{ width: '100%', background: '#e2e8f0', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    background: item.color || 'linear-gradient(90deg, #2563eb, #3b82f6)',
                    height: '100%',
                    borderRadius: '5px',
                    transition: 'width 0.5s ease'
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Donut / Pie Breakdown Chart Widget
export const DonutChartWidget = ({ title, items = [] }) => {
  if (!items || items.length === 0) return null;

  const totalVal = items.reduce((sum, i) => sum + (i.value || 0), 0);
  const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <PieIcon size={18} color="#10b981" /> {title}
        </h4>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Total: {totalVal}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {items.map((item, idx) => {
          const color = item.color || colors[idx % colors.length];
          const pct = totalVal > 0 ? Math.round(((item.value || 0) / totalVal) * 100) : 0;

          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.4rem 0.6rem', background: '#f8fafc', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, display: 'inline-block' }}></span>
                <span style={{ fontWeight: 600, color: '#334155' }}>{item.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{item.value}</span>
                <span className="badge badge-slate" style={{ fontSize: '0.7rem' }}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Trend Line Widget (Sales vs Cost Graph)
export const TrendLineWidget = ({ title, months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'], salesData = [120000, 185000, 210000, 245000, 290000, 310000, 385000], profitData = [65000, 95000, 110000, 130000, 155000, 168000, 210000] }) => {
  const maxVal = Math.max(...salesData, 1);
  const height = 140;

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <TrendingUp size={18} color="#7c3aed" /> {title}
        </h4>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', fontWeight: 700 }}>
          <span style={{ color: '#2563eb' }}>● Sales Revenue</span>
          <span style={{ color: '#10b981' }}>● Gross Profit</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', height: `${height}px`, gap: '1rem', borderBottom: '2px solid #cbd5e1', paddingBottom: '0.5rem' }}>
        {months.map((m, idx) => {
          const sVal = salesData[idx] || 0;
          const pVal = profitData[idx] || 0;
          const sPct = Math.round((sVal / maxVal) * 100);
          const pPct = Math.round((pVal / maxVal) * 100);

          return (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', width: '100%', justifyContent: 'center', height: '100%' }}>
                {/* Sales Bar */}
                <div
                  title={`Sales: ${formatINR(sVal)}`}
                  style={{
                    width: '12px',
                    height: `${sPct}%`,
                    background: 'linear-gradient(180deg, #3b82f6, #1d4ed8)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.5s'
                  }}
                ></div>
                {/* Profit Bar */}
                <div
                  title={`Profit: ${formatINR(pVal)}`}
                  style={{
                    width: '12px',
                    height: `${pPct}%`,
                    background: 'linear-gradient(180deg, #34d399, #059669)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.5s'
                  }}
                ></div>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>{m}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
