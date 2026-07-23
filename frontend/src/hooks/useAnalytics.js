import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Build filter query string from activeFilters object
function buildFilterQs(filters) {
  const params = new URLSearchParams();
  if (filters.country)  params.set('country', filters.country);
  if (filters.device)   params.set('device',  filters.device);
  if (filters.browser)  params.set('browser',  filters.browser);
  if (filters.referrer) params.set('referrer', filters.referrer);
  if (filters.page)     params.set('page',     filters.page);
  const qs = params.toString();
  return qs ? `&${qs}` : '';
}

export function useAnalytics() {
  const [timeRange, setTimeRange] = useState('7d');

  const todayStr       = new Date().toISOString().split('T')[0];
  const defaultFromStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [customFrom, setCustomFrom] = useState(defaultFromStr);
  const [customTo,   setCustomTo]   = useState(todayStr);

  // Active segmentation filters — shared across all 4 pages
  const [activeFilters, setActiveFilters] = useState({
    country: '', device: '', browser: '', referrer: '', page: '',
  });

  // Core dashboard data
  const [stats,      setStats]      = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [breakdowns, setBreakdowns] = useState(null);

  // New data streams
  const [matrixData,  setMatrixData]  = useState(null);
  const [sparklines,  setSparklines]  = useState(null);
  const [funnel,      setFunnel]      = useState(null);
  const [realtime,    setRealtime]    = useState({ activeUsers: 0, eventsPerMinute: 0, recentEvents: [] });

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // SSE ref for cleanup
  const sseRef = useRef(null);

  // ── Date Range Helpers ────────────────────────────────────────────────────
  const getDateRange = useCallback(() => {
    if (timeRange === 'custom') return { from: customFrom, to: customTo };

    const to = new Date().toISOString().split('T')[0];
    let fromDate;

    switch (timeRange) {
      case 'today':
        fromDate = new Date();
        break;
      case 'yesterday':
        fromDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
        return {
          from: fromDate.toISOString().split('T')[0],
          to:   fromDate.toISOString().split('T')[0],
        };
      case '30d':
        fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'mtd': {
        const now = new Date();
        fromDate  = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
      default: // '7d'
        fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }
    return { from: fromDate.toISOString().split('T')[0], to };
  }, [timeRange, customFrom, customTo]);

  // ── Core Analytics Fetch (filterable) ────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { from, to } = getDateRange();
    const filterQs = buildFilterQs(activeFilters);

    try {
      const [statsRes, timeseriesRes, breakdownsRes, funnelRes] = await Promise.all([
        fetch(`${API_URL}/api/stats?from=${from}&to=${to}${filterQs}`),
        fetch(`${API_URL}/api/timeseries?from=${from}&to=${to}&granularity=day${filterQs}`),
        fetch(`${API_URL}/api/breakdowns?from=${from}&to=${to}${filterQs}`),
        fetch(`${API_URL}/api/funnel?from=${from}&to=${to}`),
      ]);

      if (!statsRes.ok || !timeseriesRes.ok || !breakdownsRes.ok) {
        throw new Error('Failed to fetch analytics data from server.');
      }

      const [statsData, timeseriesData, breakdownsData, funnelData] = await Promise.all([
        statsRes.json(),
        timeseriesRes.json(),
        breakdownsRes.json(),
        funnelRes.ok ? funnelRes.json() : { funnel: [] },
      ]);

      setStats(statsData);
      setTimeseries(timeseriesData.timeseries || []);
      setBreakdowns(breakdownsData);
      setFunnel(funnelData);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not connect to the analytics database.');
    } finally {
      setLoading(false);
    }
  }, [getDateRange, activeFilters]);

  // ── Matrix Fetch (not filtered — always calendar-aligned) ─────────────────
  const fetchMatrix = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/matrix`);
      if (res.ok) {
        const data = await res.json();
        setMatrixData(data);
      }
    } catch (err) {
      console.error('Matrix fetch error:', err);
    }
  }, []);

  // ── Sparklines Fetch (always last 7 days, not filtered) ──────────────────
  const fetchSparklines = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/sparklines`);
      if (res.ok) {
        const data = await res.json();
        setSparklines(data.sparklines || null);
      }
    } catch (err) {
      console.error('Sparklines fetch error:', err);
    }
  }, []);

  // ── Realtime: SSE stream (preferred) with polling fallback ────────────────
  const startRealtimeSSE = useCallback(() => {
    // Clean up any existing SSE connection
    if (sseRef.current) sseRef.current.close();

    const useSSE = import.meta.env.VITE_USE_SSE !== 'false';

    if (useSSE && typeof EventSource !== 'undefined') {
      const es = new EventSource(`${API_URL}/api/realtime/stream`);
      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          setRealtime(data);
        } catch (e) {
          console.error('SSE parse error:', e);
        }
      };
      es.onerror = () => {
        // SSE failed — fall back to polling
        es.close();
        sseRef.current = null;
        startPollingFallback();
      };
      sseRef.current = es;
    } else {
      startPollingFallback();
    }
  }, []);

  const startPollingFallback = useCallback(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/realtime`);
        if (res.ok) setRealtime(await res.json());
      } catch (e) {
        console.error('Realtime poll error:', e);
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    // Store cleanup function
    sseRef.current = { close: () => clearInterval(interval) };
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchMatrix();
    fetchSparklines();
  }, []); // Once on mount — matrix/sparklines don't depend on date range

  useEffect(() => {
    startRealtimeSSE();
    return () => {
      if (sseRef.current) sseRef.current.close();
    };
  }, [startRealtimeSSE]);

  // ── Filter Helpers ────────────────────────────────────────────────────────
  const setFilter = useCallback((key, value) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilter = useCallback((key) => {
    setActiveFilters((prev) => ({ ...prev, [key]: '' }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters({ country: '', device: '', browser: '', referrer: '', page: '' });
  }, []);

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);

  const handleCustomRange = (start, end) => {
    setCustomFrom(start);
    setCustomTo(end);
    setTimeRange('custom');
  };

  return {
    // Date range
    timeRange, setTimeRange,
    customFrom, customTo,
    handleCustomRange,
    // Data
    stats, timeseries, breakdowns,
    matrixData, sparklines, funnel,
    realtime,
    // Filters
    activeFilters, setFilter, clearFilter, clearAllFilters, hasActiveFilters,
    // Status
    loading, error,
    refresh: fetchAnalytics,
    apiUrl:  API_URL,
  };
}
