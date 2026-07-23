import React from 'react';
import KpiMatrixTable from '../components/KpiMatrixTable';
import MiniSparkline from '../components/MiniSparkline';

export default function KpiMatrix({ matrixData, stats }) {
  const metrics = matrixData?.metrics;

  // Top summary banner — pulls from matrix today values when available
  const revToday    = metrics?.revenue?.today?.rawValue || 0;
  const matchToday  = metrics?.matchRate?.today?.rawValue || 0;
  const viewToday   = metrics?.bounceRate?.today?.rawValue || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Highlight Banner — 3 summary metrics */}
      <div className="grid-3col">
        <div className="widget-card">
          <div className="widget-header">
            <span className="widget-title">Revenue Today</span>
            <span className={`chip-pct ${(metrics?.revenue?.today?.cmpPct || 0) >= 0 ? 'pos' : 'neg'}`}>
              {(metrics?.revenue?.today?.cmpPct || 0) >= 0 ? '+' : ''}{(metrics?.revenue?.today?.cmpPct || 0).toFixed(1)}% vs yday
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {metrics?.revenue?.today?.value || '$0.00'}
              </div>
              <span className="widget-sub">MTD: {metrics?.revenue?.mtd?.value || '—'}</span>
            </div>
            <MiniSparkline color="#0ce8d0" data={[10, 25, 45, 60, 80, 95, 100]} />
          </div>
        </div>

        <div className="widget-card">
          <div className="widget-header">
            <span className="widget-title">Ad Match Rate</span>
            <span className={`chip-pct ${(metrics?.matchRate?.today?.cmpPct || 0) >= 0 ? 'pos' : 'neg'}`}>
              {(metrics?.matchRate?.today?.cmpPct || 0) >= 0 ? '+' : ''}{(metrics?.matchRate?.today?.cmpPct || 0).toFixed(1)}% vs yday
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {metrics?.matchRate?.today?.value || '0%'}
              </div>
              <span className="widget-sub">7-Day Avg: {metrics?.matchRate?.d7?.value || '—'}</span>
            </div>
            <MiniSparkline color="#a78bfa" data={[60, 70, 65, 80, 75, 85, 90]} />
          </div>
        </div>

        <div className="widget-card">
          <div className="widget-header">
            <span className="widget-title">Bounce Rate</span>
            <span className={`chip-pct ${(metrics?.bounceRate?.today?.cmpPct || 0) <= 0 ? 'pos' : 'neg'}`}>
              {(metrics?.bounceRate?.today?.cmpPct || 0) >= 0 ? '+' : ''}{(metrics?.bounceRate?.today?.cmpPct || 0).toFixed(1)}% vs yday
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {metrics?.bounceRate?.today?.value || '0%'}
              </div>
              <span className="widget-sub">MTD: {metrics?.bounceRate?.mtd?.value || '—'}</span>
            </div>
            <MiniSparkline color="#10b981" data={[50, 47, 45, 44, 43, 42, 41]} />
          </div>
        </div>
      </div>

      {/* Main KPI Matrix Table — live from /api/matrix */}
      <KpiMatrixTable matrixData={matrixData} stats={stats} />
    </div>
  );
}
