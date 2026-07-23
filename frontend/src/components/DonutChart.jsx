import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#0ce8d0', '#a78bfa', '#f59e0b', '#3b82f6', '#ec4899', '#10b981'];

export default function DonutChart({ title, data }) {
  if (!data || data.length === 0) return null;

  const formattedData = data.map((d) => ({
    name: d.name || d.device || d.browser || 'Other',
    value: d.value || d.count || 0,
  }));

  const total = formattedData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <h3 className="widget-title">{title}</h3>
        <span className="widget-sub">Total: {total.toLocaleString()}</span>
      </div>

      <div style={{ width: '100%', height: 220, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={formattedData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#111620',
                borderColor: 'rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.8rem',
              }}
              formatter={(val) => [val.toLocaleString(), 'Count']}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Donut Center text */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {formattedData.length}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Types</div>
        </div>
      </div>

      {/* Legend list */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', marginTop: '12px' }}>
        {formattedData.map((item, idx) => (
          <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: COLORS[idx % COLORS.length],
              }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {total > 0 ? `${((item.value / total) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
