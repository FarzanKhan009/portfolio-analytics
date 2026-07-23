import React from 'react';

function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🏳️';
  }
}

export default function GeoTable({ countries }) {
  if (!countries || countries.length === 0) return null;

  const maxVal = Math.max(...countries.map((c) => c.value), 1);
  const total = countries.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div>
          <h3 className="widget-title">🌍 Geographic Breakdown</h3>
          <p className="widget-sub">Top visitor countries by volume</p>
        </div>
        <span className="chip-pct pos">{countries.length} Regions</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {countries.map((item) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
          const barWidth = (item.value / maxVal) * 100;

          return (
            <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.1rem' }}>{getFlagEmoji(item.name)}</span> {item.name}
                </span>
                <div style={{ display: 'flex', gap: '12px', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.value.toLocaleString()}</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{pct}%</span>
                </div>
              </div>

              {/* Progress bar track */}
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-surface)', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--accent), var(--accent-purple))',
                    borderRadius: '3px',
                    transition: 'width 400ms ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
