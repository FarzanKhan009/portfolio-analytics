import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import styles from './Playground.module.css';

const PAGES = ['/home', '/pricing', '/docs', '/blog/scaling-clickhouse', '/features', '/contact', '/checkout'];
const REFERRERS = [
  { label: 'Google (Organic)', value: 'https://google.com' },
  { label: 'GitHub (Developer)', value: 'https://github.com' },
  { label: 'Twitter / X', value: 'https://twitter.com' },
  { label: 'LinkedIn (Network)', value: 'https://linkedin.com' },
  { label: 'Direct Traffic', value: 'Direct' },
];

export default function Playground({ apiUrl, onEventSent }) {
  const [eventType, setEventType] = useState('pageview');
  const [country, setCountry] = useState('US');
  const [device, setDevice] = useState('desktop');
  const [page, setPage] = useState('/home');
  const [referrer, setReferrer] = useState('https://google.com');
  const [revenue, setRevenue] = useState('29.99');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  // Auto-set page to checkout if purchase is selected
  useEffect(() => {
    if (eventType === 'purchase') {
      setPage('/checkout');
    }
  }, [eventType]);

  // Construct the payload JSON to display
  const payload = {
    event_type: eventType,
    page: page,
    user_id: `usr_mock_${Math.floor(Math.random() * 900) + 100}`,
    session_id: `ses_mock_${Math.floor(Math.random() * 9000) + 1000}`,
    referrer: referrer,
    revenue: eventType === 'purchase' ? parseFloat(revenue) : 0,
  };

  const handleSend = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`${apiUrl}/api/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-ipcountry': country, // spoof country header
          'user-agent': device === 'mobile' ? 'Mobile User-Agent' : device === 'tablet' ? 'Tablet User-Agent' : 'Desktop User-Agent',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatus({ type: 'success', text: '✓ Ingested successfully' });
        
        // Trigger confetti for purchase events!
        if (eventType === 'purchase') {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#0ce8d0', '#a78bfa', '#f3f4f6'],
          });
        }
        
        // Notify parent to refresh realtime statistics immediately
        if (onEventSent) onEventSent();
      } else {
        setStatus({ type: 'error', text: '✗ Rate limited or invalid payload' });
      }
    } catch (err) {
      setStatus({ type: 'error', text: '✗ Connection error' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <div className="widget">
      <h3 className="widget-title">API Payload Playground</h3>

      <div className={styles.container}>
        {/* Form controls */}
        <div className={styles.form}>
          <div className={styles.row}>
            <div className={styles.group}>
              <label className={styles.label}>Event Type</label>
              <select 
                value={eventType} 
                onChange={(e) => setEventType(e.target.value)}
                className={styles.select}
              >
                <option value="pageview">pageview</option>
                <option value="click">click</option>
                <option value="signup">signup</option>
                <option value="purchase">purchase</option>
              </select>
            </div>

            <div className={styles.group}>
              <label className={styles.label}>Target Page</label>
              <select 
                value={page} 
                onChange={(e) => setPage(e.target.value)}
                className={styles.select}
                disabled={eventType === 'purchase'}
              >
                {PAGES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.group}>
              <label className={styles.label}>Country</label>
              <select 
                value={country} 
                onChange={(e) => setCountry(e.target.value)}
                className={styles.select}
              >
                <option value="US">United States (US)</option>
                <option value="PK">Pakistan (PK)</option>
                <option value="GB">United Kingdom (GB)</option>
                <option value="DE">Germany (DE)</option>
                <option value="CA">Canada (CA)</option>
                <option value="FR">France (FR)</option>
              </select>
            </div>

            <div className={styles.group}>
              <label className={styles.label}>Device</label>
              <select 
                value={device} 
                onChange={(e) => setDevice(e.target.value)}
                className={styles.select}
              >
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.group}>
              <label className={styles.label}>Referrer (Source)</label>
              <select 
                value={referrer} 
                onChange={(e) => setReferrer(e.target.value)}
                className={styles.select}
              >
                {REFERRERS.map(ref => (
                  <option key={ref.value} value={ref.value}>{ref.label}</option>
                ))}
              </select>
            </div>
            
            {eventType === 'purchase' && (
              <div className={styles.group}>
                <label className={styles.label}>Revenue ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.99"
                  max="999.99"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                  className={styles.input}
                />
              </div>
            )}
          </div>
        </div>

        {/* Live Payload Preview */}
        <div className={styles.preview}>
          <div className={styles.previewHeader}>Payload (JSON)</div>
          <pre className={styles.code}>
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>

        {/* Action Button */}
        <button 
          onClick={handleSend} 
          disabled={loading}
          className={`btn ${styles.sendBtn}`}
        >
          {loading ? 'Ingesting Event...' : '⚡ Send Ingest Payload'}
        </button>

        {/* Status Toast */}
        {status && (
          <div className={`${styles.status} ${status.type === 'success' ? styles.success : styles.error}`}>
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
}
