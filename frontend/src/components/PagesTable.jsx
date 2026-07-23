import React, { useState } from 'react';

export default function PagesTable({ pages }) {
  const [sortField, setSortField] = useState('views');
  const [sortAsc, setSortAsc] = useState(false);

  if (!pages || pages.length === 0) return null;

  const maxViews = Math.max(...pages.map((p) => p.views), 1);
  const totalViews = pages.reduce((acc, curr) => acc + curr.views, 0);

  const sortedPages = [...pages].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="widget-card" style={{ padding: 0 }}>
      <div className="widget-header" style={{ padding: '20px 24px', margin: 0, borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <h3 className="widget-title">📄 Top Performing Pages</h3>
          <p className="widget-sub">Most viewed URLs & visitor retention</p>
        </div>
        <span className="chip-pct pos">{pages.length} Active Routes</span>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('page')} style={{ cursor: 'pointer' }}>
                PAGE URL {sortField === 'page' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('views')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                PAGE VIEWS {sortField === 'views' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('visitors')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                VISITORS {sortField === 'visitors' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th style={{ textAlign: 'right' }}>TRAFFIC SHARE</th>
            </tr>
          </thead>
          <tbody>
            {sortedPages.map((row) => {
              const sharePct = totalViews > 0 ? ((row.views / totalViews) * 100).toFixed(1) : 0;
              const barWidth = (row.views / maxViews) * 100;

              return (
                <tr key={row.page}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {row.page}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>
                    {row.views.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {row.visitors.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600 }}>{sharePct}%</span>
                      <div style={{ width: '60px', height: '5px', backgroundColor: 'var(--bg-surface)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${barWidth}%`, height: '100%', backgroundColor: 'var(--accent)', borderRadius: '3px' }} />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
