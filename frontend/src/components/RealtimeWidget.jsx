import React from 'react';
import styles from './RealtimeWidget.module.css';

export default function RealtimeWidget({ activeUsers, recentEvents }) {
  // Format event timestamps
  const formatTime = (str) => {
    const d = new Date(str);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getEventBadgeClass = (type) => {
    switch (type) {
      case 'purchase': return `${styles.badge} ${styles.badgePurchase}`;
      case 'signup': return `${styles.badge} ${styles.badgeSignup}`;
      case 'click': return `${styles.badge} ${styles.badgeClick}`;
      default: return `${styles.badge} ${styles.badgeView}`;
    }
  };

  return (
    <div className="widget">
      <div className="widget-title">
        <span>Real-Time Telemetry</span>
        <div className={styles.pulseContainer}>
          <span className={styles.pulseDot} />
          <span className={styles.pulseText}>LIVE</span>
        </div>
      </div>

      {/* Active users display */}
      <div className={styles.activeUsersSection}>
        <div className={styles.activeUsersNumber}>
          {activeUsers !== undefined ? activeUsers.toLocaleString() : '0'}
        </div>
        <div className={styles.activeUsersLabel}>Active visitors (last 5 min)</div>
      </div>

      {/* Real-time event ticker */}
      <div className={styles.tickerSection}>
        <h4 className={styles.tickerTitle}>Incoming Activity Log</h4>
        
        {(!recentEvents || recentEvents.length === 0) ? (
          <div className={styles.emptyLog}>Waiting for telemetry stream...</div>
        ) : (
          <div className={styles.logList}>
            {recentEvents.map((event, idx) => (
              <div key={idx} className={styles.logItem}>
                <div className={styles.logTop}>
                  <span className={getEventBadgeClass(event.eventType)}>
                    {event.eventType}
                  </span>
                  <span className={styles.time}>{formatTime(event.timestamp)}</span>
                </div>
                <div className={styles.logBottom}>
                  <span className={styles.page}>{event.page}</span>
                  <span className={styles.meta}>
                    {event.device} · {event.country}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
