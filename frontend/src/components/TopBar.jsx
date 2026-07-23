import React, { useState } from 'react';
import DateRangePicker from './DateRangePicker';

export default function TopBar({
  activeTab,
  timeRange,
  setTimeRange,
  customFrom,
  customTo,
  onCustomRange,
  onRefresh,
  loading,
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getPageInfo = () => {
    switch (activeTab) {
      case 'matrix':
        return { title: 'KPI Matrix Dashboard', sub: 'Cross-period performance breakdown' };
      case 'traffic':
        return { title: 'Traffic & Audience Deep-Dive', sub: 'Top pages, channels & geography' };
      case 'realtime':
        return { title: 'Real-Time Telemetry Stream', sub: 'Live visitor activity & events' };
      default:
        return { title: 'Analytics Overview', sub: 'High level key performance metrics' };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <header className="topbar">
      <div className="topbar-title-area">
        <div>
          <h1 className="page-title">{pageInfo.title}</h1>
          <p className="page-subtitle">{pageInfo.sub}</p>
        </div>
      </div>

      <div className="topbar-actions">
        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="btn-secondary"
          title="Refresh ClickHouse Partition Query"
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          <span style={{ display: 'inline-block', transform: loading ? 'rotate(360deg)' : 'none', transition: 'transform 800ms linear' }}>
            🔄
          </span>
          {loading ? 'Querying...' : 'Refresh'}
        </button>

        {/* Quick Range Presets */}
        {['7d', '30d', '90d'].map((range) => (
          <button
            key={range}
            onClick={() => {
              setTimeRange(range);
              setShowDatePicker(false);
            }}
            className={`time-btn ${timeRange === range ? 'active' : ''}`}
          >
            {range.toUpperCase()}
          </button>
        ))}

        {/* Custom Date Range Trigger */}
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={`time-btn ${timeRange === 'custom' ? 'active' : ''}`}
        >
          📅 {timeRange === 'custom' ? `${customFrom} to ${customTo}` : 'Custom Range'}
        </button>

        {/* Calendar Picker Dropdown */}
        {showDatePicker && (
          <DateRangePicker
            from={customFrom}
            to={customTo}
            onChange={(start, end) => {
              onCustomRange(start, end);
              setShowDatePicker(false);
            }}
            onClose={() => setShowDatePicker(false)}
          />
        )}
      </div>
    </header>
  );
}
