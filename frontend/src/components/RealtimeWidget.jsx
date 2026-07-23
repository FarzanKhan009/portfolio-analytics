import React from 'react';

export default function RealtimeWidget({ activeUsers, recentEvents }) {
  return (
    <div className="widget-card">
      <div className="widget-header">
        <div>
          <h3 className="widget-title">
            <span className="pulse-dot" /> Realtime Telemetry
          </h3>
          <p className="widget-sub">Live visitors in 5 min window</p>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--positive)',
          }}
        >
          {activeUsers || 0}
        </span>
      </div>

      <div style={{ marginTop: '14px' }}>
        <h4 style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
          Live Event Stream (Last 10)
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
          {recentEvents && recentEvents.length > 0 ? (
            recentEvents.map((evt, idx) => {
              const timeStr = evt.timestamp
                ? new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : 'Just now';

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyConstraint: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.78rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background:
                          evt.eventType === 'purchase'
                            ? 'var(--positive-dim)'
                            : evt.eventType === 'click'
                            ? 'var(--accent-purple-dim)'
                            : 'var(--accent-dim)',
                        color:
                          evt.eventType === 'purchase'
                            ? 'var(--positive)'
                            : evt.eventType === 'click'
                            ? 'var(--accent-purple)'
                            : 'var(--accent)',
                      }}
                    >
                      {evt.eventType || 'pageview'}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {evt.page || '/'}
                    </span>
                  </div>

                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {timeStr}
                  </span>
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
              Waiting for live telemetry events...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
