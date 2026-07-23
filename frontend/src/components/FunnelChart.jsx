import React from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  LabelList, ResponsiveContainer,
} from 'recharts';

/**
 * FunnelChart — horizontal bar visualization of the conversion funnel.
 * Pageviews → Clicks → Signups → Purchases with drop-off % labels.
 */
export default function FunnelChart({ funnel, overallConversion }) {
  if (!funnel || funnel.length === 0) return null;

  const maxCount = funnel[0]?.count || 1;
  const COLORS   = ['#0ce8d0', '#a78bfa', '#f59e0b', '#10b981'];

  // Normalize bars as percent of total for even proportional display
  const data = funnel.map((step, idx) => ({
    ...step,
    percentage: parseFloat(((step.count / maxCount) * 100).toFixed(1)),
    color: COLORS[idx] || '#6b7280',
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div style={{
        background: '#111620', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem',
      }}>
        <div style={{ fontWeight: 700, color: '#f3f4f6', marginBottom: '4px' }}>{d.step}</div>
        <div style={{ color: '#9ca3af' }}>Count: <span style={{ color: d.color, fontWeight: 700 }}>{d.count.toLocaleString()}</span></div>
        {d.dropPct !== null && (
          <div style={{ color: '#9ca3af' }}>Drop-off: <span style={{ color: '#ef4444', fontWeight: 700 }}>{d.dropPct}%</span></div>
        )}
      </div>
    );
  };

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div>
          <h3 className="widget-title">🔻 Conversion Funnel</h3>
          <p className="widget-sub">Pageviews to Purchase — end-to-end conversion</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--positive)' }}>
            {overallConversion}%
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Overall CVR</div>
        </div>
      </div>

      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 0, right: 80, left: 10, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="step"
              width={90}
              tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} fillOpacity={0.85} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                formatter={(v) => v.toLocaleString()}
                style={{ fontSize: '0.78rem', fontWeight: 700, fill: '#f3f4f6', fontFamily: 'JetBrains Mono, monospace' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Drop-off summary row */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
        {data.map((step, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: step.color, display: 'inline-block' }} />
            <span style={{ color: 'var(--text-secondary)' }}>{step.step}</span>
            {step.dropPct !== null && (
              <span style={{ color: '#ef4444', fontWeight: 700 }}>−{step.dropPct}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
