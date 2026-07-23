import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed }) {
  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: '⚡' },
    { id: 'matrix', label: 'KPI Matrix', icon: '📊', badge: 'NEW' },
    { id: 'traffic', label: 'Traffic & Geo', icon: '🌐' },
    { id: 'realtime', label: 'Realtime Feed', icon: '📡', pulse: true },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div>
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="brand-icon">A</div>
          {!collapsed && (
            <div className="sidebar-brand">
              Advergic Analytics
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && (
                <span style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', width: '100%' }}>
                  {item.label}
                  {item.badge && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        background: 'var(--accent-gold-dim)',
                        color: 'var(--accent-gold)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.pulse && (
                    <span className="pulse-dot" style={{ marginLeft: 'auto' }} />
                  )}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Collapse Toggle Footer */}
      <div className="sidebar-footer">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="collapse-btn"
        >
          <span>{collapsed ? '👉' : '👈'}</span>
          {!collapsed && <span>Collapse Sidebar</span>}
        </button>
      </div>
    </aside>
  );
}
