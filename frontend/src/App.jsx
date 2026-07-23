import React, { useState } from 'react';
import { useAnalytics } from './hooks/useAnalytics';

import Sidebar   from './components/Sidebar';
import TopBar    from './components/TopBar';
import FilterBar from './components/FilterBar';

import Overview  from './pages/Overview';
import KpiMatrix from './pages/KpiMatrix';
import Traffic   from './pages/Traffic';
import Realtime  from './pages/Realtime';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);

  const {
    timeRange, setTimeRange,
    customFrom, customTo, handleCustomRange,
    stats, timeseries, breakdowns,
    matrixData, sparklines, funnel,
    realtime,
    activeFilters, setFilter, clearFilter, clearAllFilters, hasActiveFilters,
    loading, error,
    refresh, apiUrl,
  } = useAnalytics();

  const renderActivePage = () => {
    switch (activeTab) {
      case 'matrix':
        return <KpiMatrix matrixData={matrixData} stats={stats} />;
      case 'traffic':
        return <Traffic breakdowns={breakdowns} />;
      case 'realtime':
        return <Realtime realtime={realtime} apiUrl={apiUrl} refresh={refresh} />;
      default:
        return (
          <Overview
            stats={stats}
            timeseries={timeseries}
            breakdowns={breakdowns}
            realtime={realtime}
            apiUrl={apiUrl}
            refresh={refresh}
            sparklines={sparklines}
            funnel={funnel}
          />
        );
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Viewport */}
      <div className="main-viewport">
        {/* TopBar Header */}
        <TopBar
          activeTab={activeTab}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          customFrom={customFrom}
          customTo={customTo}
          onCustomRange={handleCustomRange}
          onRefresh={refresh}
          loading={loading}
        />

        {/* FilterBar — persistent across all pages */}
        <FilterBar
          activeFilters={activeFilters}
          setFilter={setFilter}
          clearFilter={clearFilter}
          clearAllFilters={clearAllFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Page Content */}
        <main className="page-container">
          {error && (
            <div className="widget-card" style={{ border: '1px solid var(--negative)', color: 'var(--negative)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>⚠️ {error}</span>
              <button className="btn-secondary" onClick={refresh}>
                Retry Connection
              </button>
            </div>
          )}

          {loading && !stats ? (
            <div className="widget-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '14px' }}>
              <div className="spinner" />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Querying ClickHouse columnar partitions...
              </span>
            </div>
          ) : (
            renderActivePage()
          )}
        </main>
      </div>
    </div>
  );
}
