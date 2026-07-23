import React from 'react';
import MiniSparkline from './MiniSparkline';

export default function KPICards({ kpis, sparklines }) {
  if (!kpis) return null;

  // Fallback placeholder bars if sparklines API hasn't responded yet
  const sp = sparklines || {};

  const cardList = [
    {
      key: 'pageviews',
      label: 'Page Views',
      value: kpis.pageviews?.value?.toLocaleString() || '0',
      pct: kpis.pageviews?.pctChange || 0,
      sparkColor: '#0ce8d0',
      bars: sp.pageviews   || [30, 45, 60, 50, 75, 90, 85],
    },
    {
      key: 'uniqueUsers',
      label: 'Unique Visitors',
      value: kpis.uniqueUsers?.value?.toLocaleString() || '0',
      pct: kpis.uniqueUsers?.pctChange || 0,
      sparkColor: '#a78bfa',
      bars: sp.uniqueUsers || [25, 40, 55, 48, 70, 82, 79],
    },
    {
      key: 'revenue',
      label: 'Total Revenue',
      value: `$${kpis.revenue?.value?.toLocaleString() || '0.00'}`,
      pct: kpis.revenue?.pctChange || 0,
      sparkColor: '#f59e0b',
      bars: sp.revenue     || [40, 30, 70, 60, 90, 85, 95],
    },
    {
      key: 'conversionRate',
      label: 'Conversion Rate',
      value: `${kpis.conversionRate?.value || 0}%`,
      pct: kpis.conversionRate?.pctChange || 0,
      sparkColor: '#10b981',
      bars: sp.purchases   || [4, 5, 3, 7, 5, 8, 6],
    },
    {
      key: 'bounceRate',
      label: 'Bounce Rate',
      value: `${kpis.bounceRate?.value || 0}%`,
      pct: kpis.bounceRate?.pctChange || 0,
      sparkColor: '#ef4444',
      inverse: true, // Lower is better
      bars: sp.bounceRate  || [48, 46, 45, 43, 44, 42, 41],
    },
    {
      key: 'avgSessionDuration',
      label: 'Avg Duration',
      value: kpis.avgSessionDuration?.value || '0m 0s',
      pct: kpis.avgSessionDuration?.pctChange || 0,
      sparkColor: '#3b82f6',
      bars: sp.sessions    || [140, 160, 155, 170, 180, 175, 184],
    },
  ];

  return (
    <div className="grid-6col">
      {cardList.map((card) => {
        const isPos = card.inverse ? card.pct < 0 : card.pct >= 0;

        return (
          <div key={card.key} className="widget-card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {card.label}
              </span>
              <MiniSparkline color={card.sparkColor} data={card.bars} />
            </div>

            <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {card.value}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem' }}>
              <span className={`chip-pct ${isPos ? 'pos' : 'neg'}`}>
                {card.pct >= 0 ? `▲ +${card.pct}%` : `▼ ${card.pct}%`}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>vs prev period</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
