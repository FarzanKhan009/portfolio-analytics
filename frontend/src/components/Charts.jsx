import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function Charts({ data }) {
  const [selectedMetric, setSelectedMetric] = useState('pageviews');
  const [chartType, setChartType] = useState('area'); // 'area', 'line', 'bar'

  if (!data || data.length === 0) return null;

  const metricConfig = {
    pageviews: { label: 'Page Views', color: '#0ce8d0', format: (v) => v.toLocaleString() },
    uniqueUsers: { label: 'Unique Visitors', color: '#a78bfa', format: (v) => v.toLocaleString() },
    revenue: { label: 'Revenue ($)', color: '#f59e0b', format: (v) => `$${v.toFixed(2)}` },
    purchases: { label: 'Purchases', color: '#10b981', format: (v) => v.toLocaleString() },
  };

  const active = metricConfig[selectedMetric];

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="timestamp" stroke="var(--text-muted)" fontSize={11} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={active.format} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111620',
                borderColor: 'rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.8rem',
              }}
              formatter={(v) => [active.format(v), active.label]}
            />
            <Line type="monotone" dataKey={selectedMetric} stroke={active.color} strokeWidth={3} dot={false} />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="timestamp" stroke="var(--text-muted)" fontSize={11} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={active.format} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111620',
                borderColor: 'rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.8rem',
              }}
              formatter={(v) => [active.format(v), active.label]}
            />
            <Bar dataKey={selectedMetric} fill={active.color} radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      default: // 'area'
        return (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={active.color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={active.color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="timestamp" stroke="var(--text-muted)" fontSize={11} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={active.format} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111620',
                borderColor: 'rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.8rem',
              }}
              formatter={(v) => [active.format(v), active.label]}
            />
            <Area type="monotone" dataKey={selectedMetric} stroke={active.color} strokeWidth={2.5} fillOpacity={1} fill="url(#chartGradient)" />
          </AreaChart>
        );
    }
  };

  return (
    <div className="widget-card">
      <div className="widget-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 className="widget-title">📈 Analytics Timeseries</h3>
          <p className="widget-sub">Daily trend metrics breakdown</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Metric Selector */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '3px', borderRadius: '6px' }}>
            {Object.keys(metricConfig).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedMetric(key)}
                className={`time-btn ${selectedMetric === key ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                {metricConfig[key].label}
              </button>
            ))}
          </div>

          {/* Chart Type Selector */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '3px', borderRadius: '6px' }}>
            {['area', 'line', 'bar'].map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`time-btn ${chartType === type ? 'active' : ''}`}
                style={{ padding: '4px 8px', fontSize: '0.75rem', textTransform: 'capitalize' }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
