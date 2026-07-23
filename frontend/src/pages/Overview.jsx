import React from 'react';
import KPICards from '../components/KPICards';
import Charts from '../components/Charts';
import PagesTable from '../components/PagesTable';
import DonutChart from '../components/DonutChart';
import GeoTable from '../components/GeoTable';
import RealtimeWidget from '../components/RealtimeWidget';
import Playground from '../components/Playground';
import FunnelChart from '../components/FunnelChart';

export default function Overview({ stats, timeseries, breakdowns, realtime, apiUrl, refresh, sparklines, funnel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top 6 KPI Cards — now with real sparklines from /api/sparklines */}
      {stats && <KPICards kpis={stats.kpis} sparklines={sparklines} />}

      {/* Main Analytics Timeseries Chart */}
      <Charts data={timeseries} />

      {/* Conversion Funnel — powered by /api/funnel */}
      {funnel?.funnel?.length > 0 && (
        <FunnelChart funnel={funnel.funnel} overallConversion={funnel.overallConversion} />
      )}

      {/* Breakdown Grid Layout */}
      <div className="grid-2col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {breakdowns && <PagesTable pages={breakdowns.pages} />}
          {breakdowns && <GeoTable countries={breakdowns.countries} />}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <RealtimeWidget activeUsers={realtime.activeUsers} recentEvents={realtime.recentEvents} eventsPerMinute={realtime.eventsPerMinute} />

          {breakdowns && <DonutChart title="Devices Share"       data={breakdowns.devices} />}
          {breakdowns && <DonutChart title="Browser Distribution" data={breakdowns.browsers} />}
          {breakdowns?.utmSources?.length > 0 && (
            <DonutChart title="UTM Sources" data={breakdowns.utmSources} />
          )}

          <Playground apiUrl={apiUrl} onEventSent={refresh} />
        </div>
      </div>
    </div>
  );
}
