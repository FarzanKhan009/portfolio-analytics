import React from 'react';

export default function MiniSparkline({ color = '#0ce8d0', data }) {
  // Fallback 7 micro bars if no data passed
  const bars = data || [40, 65, 30, 85, 60, 95, 75];
  const max = Math.max(...bars, 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '24px' }}>
      {bars.map((val, idx) => {
        const heightPct = Math.max(15, (val / max) * 100);
        return (
          <div
            key={idx}
            style={{
              width: '4px',
              height: `${heightPct}%`,
              backgroundColor: color,
              borderRadius: '2px',
              opacity: idx === bars.length - 1 ? 1 : 0.4 + (idx * 0.08),
              transition: 'height 300ms ease',
            }}
          />
        );
      })}
    </div>
  );
}
