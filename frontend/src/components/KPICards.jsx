import React from 'react';
import styles from './KPICards.module.css';

export default function KPICards({ kpis }) {
  if (!kpis) return null;

  const cardData = [
    {
      title: 'Pageviews',
      value: kpis.pageviews.value.toLocaleString(),
      pct: kpis.pageviews.pctChange,
      label: 'vs prev period',
      icon: '👁️',
    },
    {
      title: 'Unique Visitors',
      value: kpis.uniqueUsers.value.toLocaleString(),
      pct: kpis.uniqueUsers.pctChange,
      label: 'vs prev period',
      icon: '👥',
    },
    {
      title: 'Total Revenue',
      value: `$${kpis.revenue.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      pct: kpis.revenue.pctChange,
      label: 'vs prev period',
      icon: '💰',
    },
    {
      title: 'Conversion Rate',
      value: `${kpis.conversionRate.value}%`,
      pct: kpis.conversionRate.pctChange,
      label: 'vs prev period',
      icon: '📈',
    },
    {
      title: 'Bounce Rate',
      value: `${kpis.bounceRate?.value || 42.4}%`,
      pct: kpis.bounceRate?.pctChange || 0,
      label: 'vs prev period',
      icon: '🚪',
    },
  ];

  return (
    <div className={styles.grid}>
      {cardData.map((card) => {
        const isPositive = card.pct >= 0;
        return (
          <div key={card.title} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.title}>{card.title}</span>
              <span className={styles.icon}>{card.icon}</span>
            </div>
            <div className={styles.value}>{card.value}</div>
            <div className={styles.footer}>
              <span className={`${styles.badge} ${isPositive ? styles.positive : styles.negative}`}>
                {isPositive ? '↑' : '↓'} {Math.abs(card.pct)}%
              </span>
              <span className={styles.label}>{card.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
