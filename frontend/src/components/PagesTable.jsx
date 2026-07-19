import React from 'react';
import styles from './PagesTable.module.css';

export default function PagesTable({ pages }) {
  if (!pages || pages.length === 0) {
    return <div className="loading-overlay">No page metrics available</div>;
  }

  // Find max views to scale sparkline bars
  const maxViews = Math.max(...pages.map((p) => p.views));

  return (
    <div className="widget">
      <h3 className="widget-title">Top Viewed Pages</h3>
      
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th align="left">Page URL</th>
              <th align="right">Views</th>
              <th align="right">Visitors</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p, idx) => {
              const widthPercentage = maxViews > 0 ? (p.views / maxViews) * 100 : 0;
              return (
                <tr key={p.page}>
                  <td className={styles.pageCell}>
                    <span className={styles.rank}>{idx + 1}</span>
                    <div className={styles.pageInfo}>
                      <span className={styles.url}>{p.page}</span>
                      {/* Sparkline background bar */}
                      <div className={styles.sparkbarWrap}>
                        <div 
                          className={styles.sparkbar} 
                          style={{ width: `${widthPercentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td align="right" className={styles.valueCell}>{p.views.toLocaleString()}</td>
                  <td align="right" className={styles.valueCell}>{p.visitors.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
