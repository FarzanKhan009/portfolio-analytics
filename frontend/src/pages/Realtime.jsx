import React from 'react';
import RealtimeWidget from '../components/RealtimeWidget';
import Playground from '../components/Playground';

export default function Realtime({ realtime, apiUrl, refresh }) {
  const { activeUsers = 0, eventsPerMinute = 0, recentEvents = [] } = realtime;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Live Visitors Banner */}
      <div
        className="widget-card"
        style={{
          background: 'linear-gradient(135deg, rgba(12, 232, 208, 0.05), rgba(167, 139, 250, 0.05))',
          border: '1px solid var(--accent-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '28px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="pulse-dot" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Active User Telemetry</h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Real-time sliding window (5-minute active sessions via Redis)
            {typeof EventSource !== 'undefined' && import.meta.env.VITE_USE_SSE !== 'false' && (
              <span style={{ marginLeft: '8px', fontSize: '0.7rem', color: 'var(--positive)', fontWeight: 700 }}>• SSE LIVE</span>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
          {/* EPM counter */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', lineHeight: 1 }}>
              {eventsPerMinute}
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Events / Min
            </span>
          </div>

          {/* Active users counter */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--positive)', lineHeight: 1 }}>
              {activeUsers}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Right Now
            </span>
          </div>
        </div>
      </div>

      {/* Full Realtime Stream + Simulator */}
      <div className="grid-2col">
        <RealtimeWidget
          activeUsers={activeUsers}
          recentEvents={recentEvents}
          eventsPerMinute={eventsPerMinute}
        />
        <Playground apiUrl={apiUrl} onEventSent={refresh} />
      </div>
    </div>
  );
}
