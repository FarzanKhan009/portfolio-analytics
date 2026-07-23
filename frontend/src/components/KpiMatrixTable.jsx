import React from 'react';

/**
 * KpiMatrixTable — wired to live /api/matrix data.
 * Falls back to derived estimates from stats when matrixData is not yet loaded.
 */

function PeriodCell({ cell }) {
  if (!cell) return <td><div className="matrix-value-cell"><span className="matrix-val">—</span></div></td>;
  return (
    <td>
      <div className="matrix-value-cell">
        <span className="matrix-val">{cell.value}</span>
        <span
          className="matrix-cmp"
          style={{ color: cell.isPositive ? 'var(--positive)' : 'var(--negative)' }}
        >
          {cell.cmpPct >= 0 ? '+' : ''}{cell.cmpPct?.toFixed(2)}% {cell.cmpLabel}
        </span>
      </div>
    </td>
  );
}

const METRIC_DEFS = [
  { key: 'revenue',    label: 'REVENUE',     sub: 'Net Earnings' },
  { key: 'pageviews',  label: 'PAGE VIEWS',  sub: 'Total Loads' },
  { key: 'impressions',label: 'IMPRESSIONS', sub: 'Ad Renders Delivered' },
  { key: 'adRequests', label: 'AD REQUESTS', sub: 'Auction Opportunities' },
  { key: 'cpm',        label: 'CPM',         sub: 'Cost Per Mille' },
  { key: 'ctr',        label: 'CTR',         sub: 'Click-Through Rate' },
  { key: 'matchRate',  label: 'MATCH RATE',  sub: 'Demand Coverage' },
  { key: 'bounceRate', label: 'BOUNCE RATE', sub: 'Single-Page Sessions' },
  { key: 'sessions',   label: 'USER SESSIONS', sub: 'Unique Session Runs' },
  { key: 'avgDuration',label: 'AVG DURATION',  sub: 'Session Length' },
];

export default function KpiMatrixTable({ matrixData, stats }) {
  const metrics = matrixData?.metrics;

  // Fallback skeleton when data is loading
  if (!metrics) {
    return (
      <div className="widget-card" style={{ padding: 0 }}>
        <div className="widget-header" style={{ padding: '20px 24px', margin: 0, borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h3 className="widget-title">⚡ Multi-Period KPI Matrix</h3>
            <p className="widget-sub">Loading ClickHouse cross-period aggregation...</p>
          </div>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          Querying all calendar periods in a single ClickHouse CTE...
        </div>
      </div>
    );
  }

  return (
    <div className="widget-card" style={{ padding: 0 }}>
      <div className="widget-header" style={{ padding: '20px 24px', margin: 0, borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <h3 className="widget-title">⚡ Multi-Period KPI Matrix</h3>
          <p className="widget-sub">
            Comparative analytics performance — generated at {new Date(matrixData.generatedAt).toLocaleTimeString()}
          </p>
        </div>
        <span className="logo-badge" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
          Live Matrix
        </span>
      </div>

      <div className="data-table-container">
        <table className="kpi-matrix-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', minWidth: '180px' }}>METRIC</th>
              <th>TODAY</th>
              <th>YESTERDAY</th>
              <th>7 DAYS</th>
              <th>MTD</th>
              <th>QTD</th>
            </tr>
          </thead>
          <tbody>
            {METRIC_DEFS.map((def) => {
              const row = metrics[def.key];
              return (
                <tr key={def.key}>
                  <td>
                    <div className="metric-label-cell">
                      <span>{def.label}</span>
                      <span className="metric-sub">{def.sub}</span>
                    </div>
                  </td>
                  <PeriodCell cell={row?.today}     />
                  <PeriodCell cell={row?.yesterday} />
                  <PeriodCell cell={row?.d7}        />
                  <PeriodCell cell={row?.mtd}       />
                  <PeriodCell cell={row?.qtd}       />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
