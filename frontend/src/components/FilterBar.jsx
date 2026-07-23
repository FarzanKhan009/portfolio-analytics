import React from 'react';

/**
 * FilterBar — persistent segmentation filter row.
 * Appears below the TopBar. Shows active filter chips with X to remove.
 * "Add filter" button opens a dropdown to add new segment filters.
 */

const FILTER_OPTIONS = [
  { key: 'country',  label: 'Country',  placeholder: 'US, GB, DE...' },
  { key: 'device',   label: 'Device',   placeholder: 'desktop, mobile, tablet' },
  { key: 'browser',  label: 'Browser',  placeholder: 'Chrome, Safari...' },
  { key: 'referrer', label: 'Referrer', placeholder: 'google.com...' },
  { key: 'page',     label: 'Page',     placeholder: '/pricing' },
];

export default function FilterBar({ activeFilters, setFilter, clearFilter, clearAllFilters, hasActiveFilters }) {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [editKey,      setEditKey]      = React.useState(null);
  const [editValue,    setEditValue]    = React.useState('');

  const activeChips = FILTER_OPTIONS.filter((f) => activeFilters[f.key]);

  const handleAddFilter = (key) => {
    setEditKey(key);
    setEditValue(activeFilters[key] || '');
    setShowDropdown(false);
  };

  const handleApply = () => {
    if (editKey && editValue.trim()) {
      setFilter(editKey, editValue.trim());
    }
    setEditKey(null);
    setEditValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleApply();
    if (e.key === 'Escape') { setEditKey(null); setEditValue(''); }
  };

  if (!hasActiveFilters && !showDropdown && !editKey) {
    return (
      <div style={{
        height: '38px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>SEGMENT:</span>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px',
              borderRadius: '4px', border: '1px dashed var(--border-strong)',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px',
              transition: 'all 200ms ease',
            }}
          >
            + Add Filter
          </button>
          {showDropdown && <FilterDropdown options={FILTER_OPTIONS} activeFilters={activeFilters} onSelect={handleAddFilter} onClose={() => setShowDropdown(false)} />}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '38px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)',
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>SEGMENT:</span>

      {/* Active filter chips */}
      {activeChips.map((f) => (
        <div
          key={f.key}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
            borderRadius: '4px', padding: '2px 8px', fontSize: '0.72rem',
          }}
        >
          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{f.label}:</span>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{activeFilters[f.key]}</span>
          <button
            onClick={() => clearFilter(f.key)}
            style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1, marginLeft: '2px' }}
            title={`Remove ${f.label} filter`}
          >
            ×
          </button>
        </div>
      ))}

      {/* Inline edit input */}
      {editKey && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {FILTER_OPTIONS.find((f) => f.key === editKey)?.label}:
          </span>
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={FILTER_OPTIONS.find((f) => f.key === editKey)?.placeholder || '...'}
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--accent-border)',
              borderRadius: '4px', padding: '2px 8px', fontSize: '0.78rem',
              color: 'var(--text-primary)', outline: 'none', width: '140px',
            }}
          />
          <button onClick={handleApply} className="btn-primary" style={{ padding: '2px 10px', fontSize: '0.72rem' }}>
            Apply
          </button>
          <button onClick={() => { setEditKey(null); setEditValue(''); }} style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            Cancel
          </button>
        </div>
      )}

      {/* Add filter button */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px',
            borderRadius: '4px', border: '1px dashed var(--border-strong)',
            color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          + Add Filter
        </button>
        {showDropdown && <FilterDropdown options={FILTER_OPTIONS} activeFilters={activeFilters} onSelect={handleAddFilter} onClose={() => setShowDropdown(false)} />}
      </div>

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          style={{ fontSize: '0.72rem', color: 'var(--negative)', fontWeight: 700, marginLeft: '4px' }}
        >
          ✕ Clear All
        </button>
      )}
    </div>
  );
}

function FilterDropdown({ options, activeFilters, onSelect, onClose }) {
  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
        background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
        borderRadius: '8px', padding: '8px', minWidth: '160px',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onSelect(opt.key)}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '7px 12px', borderRadius: '4px', fontSize: '0.78rem',
            fontWeight: 600, color: activeFilters[opt.key] ? 'var(--accent)' : 'var(--text-secondary)',
          }}
        >
          {opt.label}
          {activeFilters[opt.key] && (
            <span style={{ marginLeft: '6px', fontSize: '0.65rem', color: 'var(--accent)' }}>
              ✓ {activeFilters[opt.key]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
