import React from 'react';
import PagesTable from '../components/PagesTable';
import GeoTable from '../components/GeoTable';
import DonutChart from '../components/DonutChart';

export default function Traffic({ breakdowns }) {
  if (!breakdowns) {
    return (
      <div className="widget-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        Loading traffic analytics...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Pages + Geo */}
      <div className="grid-2col">
        <PagesTable pages={breakdowns.pages} />
        <GeoTable countries={breakdowns.countries} />
      </div>

      {/* Device / Browser / OS Donuts + UTM Breakdown */}
      <div className="grid-3col">
        <DonutChart title="Device Types"        data={breakdowns.devices} />
        <DonutChart title="Browser Shares"      data={breakdowns.browsers} />
        <DonutChart title="Operating Systems"   data={breakdowns.os} />
      </div>

      {/* Traffic Channels Row */}
      <div className="grid-2col">
        {/* Referral Sources Table */}
        <div className="widget-card">
          <div className="widget-header">
            <h3 className="widget-title">🔗 Referral Channels</h3>
            <span className="widget-sub">{breakdowns.referrers?.length || 0} Sources</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {breakdowns.referrers?.map((ref) => (
              <div
                key={ref.name}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', borderRadius: '6px', background: 'var(--bg-surface)',
                  fontSize: '0.8rem',
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ref.name}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>
                  {ref.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* UTM Attribution */}
        <div className="widget-card">
          <div className="widget-header">
            <h3 className="widget-title">📣 UTM Attribution</h3>
            <span className="widget-sub">Campaign Source Breakdown</span>
          </div>

          {breakdowns.utmSources?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sources</h4>
              {breakdowns.utmSources.map((item) => (
                <div
                  key={item.name}
                  style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '6px 10px', background: 'var(--bg-surface)', borderRadius: '6px',
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', fontWeight: 700 }}>{item.value.toLocaleString()}</span>
                </div>
              ))}

              {breakdowns.utmMediums?.length > 0 && (
                <>
                  <h4 style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '8px' }}>Mediums</h4>
                  {breakdowns.utmMediums.map((item) => (
                    <div
                      key={item.name}
                      style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '6px 10px', background: 'var(--bg-surface)', borderRadius: '6px',
                        fontSize: '0.8rem',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)', fontWeight: 700 }}>{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>
              No UTM-tagged traffic in this period.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
