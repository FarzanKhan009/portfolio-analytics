import React, { useState, useEffect } from 'react';
import KPICards from './components/KPICards';
import Charts from './components/Charts';
import PagesTable from './components/PagesTable';
import RealtimeWidget from './components/RealtimeWidget';
import Playground from './components/Playground';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function App() {
  const [timeRange, setTimeRange] = useState('7d');
  const [stats, setStats] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [breakdowns, setBreakdowns] = useState(null);
  const [realtime, setRealtime] = useState({ activeUsers: 0, recentEvents: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper to compute date strings from range select
  const getDateRange = (range) => {
    const to = new Date().toISOString().split('T')[0];
    let fromDate;
    
    switch (range) {
      case '30d':
        fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default: // '7d'
        fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }
    const from = fromDate.toISOString().split('T')[0];
    return { from, to };
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    const { from, to } = getDateRange(timeRange);

    try {
      // Parallel fetches for speed
      const [statsRes, timeseriesRes, breakdownsRes] = await Promise.all([
        fetch(`${API_URL}/api/stats?from=${from}&to=${to}`),
        fetch(`${API_URL}/api/timeseries?from=${from}&to=${to}&granularity=day`),
        fetch(`${API_URL}/api/breakdowns?from=${from}&to=${to}`),
      ]);

      if (!statsRes.ok || !timeseriesRes.ok || !breakdownsRes.ok) {
        throw new Error('Failed to fetch analytics metrics');
      }

      const statsData = await statsRes.json();
      const timeseriesData = await timeseriesRes.json();
      const breakdownsData = await breakdownsRes.json();

      setStats(statsData);
      setTimeseries(timeseriesData.timeseries);
      setBreakdowns(breakdownsData);
    } catch (err) {
      console.error(err);
      setError('Could not connect to ClickHouse analytics backend.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtimeData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/realtime`);
      if (res.ok) {
        const data = await res.json();
        setRealtime(data);
      }
    } catch (err) {
      console.error('Error fetching real-time telemetry:', err);
    }
  };

  // Fetch base stats when range updates
  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  // Set up polling for real-time telemetry (every 3 seconds)
  useEffect(() => {
    fetchRealtimeData();
    const interval = setInterval(fetchRealtimeData, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container">
      {/* Header bar */}
      <header className="dashboard-header">
        <div className="logo-section">
          <h1 className="logo">
            <span className="logo-accent">⚡</span> ClickHouse Analytics
          </h1>
          <span className="logo-badge">Live Demo</span>
        </div>

        <div className="controls">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`time-btn ${timeRange === range ? 'active' : ''}`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="loading-overlay" style={{ color: '#ef4444', flexDirection: 'column', gap: '12px' }}>
          <span>⚠️ {error}</span>
          <button className="time-btn" onClick={fetchDashboardData} style={{ marginTop: '8px' }}>
            Retry Connection
          </button>
        </div>
      )}

      {loading && !stats ? (
        <div className="loading-overlay">
          <div className="spinner" />
          Querying ClickHouse columnar partitions...
        </div>
      ) : (
        <main className="dashboard-content">
          {/* Left / main widgets */}
          <div className="main-column">
            {stats && <KPICards kpis={stats.kpis} />}
            <Charts data={timeseries} />
            {breakdowns && <PagesTable pages={breakdowns.pages} />}
          </div>

          {/* Right / sidebar widgets */}
          <div className="sidebar-column">
            <RealtimeWidget 
              activeUsers={realtime.activeUsers} 
              recentEvents={realtime.recentEvents} 
            />
            
            <Playground 
              apiUrl={API_URL} 
              onEventSent={fetchRealtimeData} 
            />
            
            {/* Quick performance showcase card */}
            <div className="widget">
              <h3 className="widget-title">Performance Spec</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span>Aggregated Events</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>1,000,000+</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span>Query Exec Time</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>&lt; 5ms</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span>Telemetry Cache TTL</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>60s (Redis)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Storage Engine</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>MergeTree</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
