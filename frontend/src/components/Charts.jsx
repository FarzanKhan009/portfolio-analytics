import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import styles from './Charts.module.css';

export default function Charts({ data }) {
  const [activeChart, setActiveChart] = useState('traffic'); // 'traffic' or 'revenue'

  if (!data || data.length === 0) {
    return <div className="loading-overlay">No timeseries data available</div>;
  }

  // Format date labels nicely
  const formatDate = (str) => {
    const d = new Date(str);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Custom tooltips for nice styling
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipLabel}>{formatDate(label)}</p>
          {payload.map((p) => (
            <p key={p.name} className={styles.tooltipValue} style={{ color: p.color }}>
              {p.name}: {p.name === 'Revenue' ? `$${p.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : p.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="widget">
      <div className="widget-title">
        <span>Analytics Over Time</span>
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeChart === 'traffic' ? styles.active : ''}`}
            onClick={() => setActiveChart('traffic')}
          >
            Traffic
          </button>
          <button
            className={`${styles.tabBtn} ${activeChart === 'revenue' ? styles.active : ''}`}
            onClick={() => setActiveChart('revenue')}
          >
            Revenue
          </button>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={320}>
          {activeChart === 'traffic' ? (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPageviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-2)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--accent-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatDate}
                stroke="var(--text-muted)"
                fontSize={10}
                tickLine={false}
              />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                name="Pageviews"
                type="monotone"
                dataKey="pageviews"
                stroke="var(--accent)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPageviews)"
              />
              <Area
                name="Visitors"
                type="monotone"
                dataKey="uniqueUsers"
                stroke="var(--accent-2)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVisitors)"
              />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatDate}
                stroke="var(--text-muted)"
                fontSize={10}
                tickLine={false}
              />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                name="Revenue"
                dataKey="revenue"
                fill="var(--accent)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
