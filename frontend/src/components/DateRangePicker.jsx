import React, { useState } from 'react';
import styles from './DateRangePicker.module.css';

export default function DateRangePicker({ from, to, onChange, onClose }) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Parsing initial dates
  const [startDate, setStartDate] = useState(from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(to ? new Date(to) : new Date());
  const [hoveredDate, setHoveredDate] = useState(null);

  // View months: left month = current selected or previous month, right month = left + 1
  const [leftMonth, setLeftMonth] = useState(() => {
    const base = to ? new Date(to) : new Date();
    return new Date(base.getFullYear(), base.getMonth() - 1, 1);
  });

  const rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1);

  // Formatting date string YYYY-MM-DD
  const formatDateStr = (d) => {
    if (!d) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Format header display label
  const formatHeaderLabel = (d) => {
    if (!d) return 'Select Date';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Handle shortcuts
  const handleShortcut = (shortcutKey) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (shortcutKey) {
      case 'today':
        start = new Date(now);
        end = new Date(now);
        break;
      case 'yesterday':
        start = new Date(now);
        start.setDate(now.getDate() - 1);
        end = new Date(start);
        break;
      case 'this_week': {
        const dayOfWeek = now.getDay();
        start = new Date(now);
        start.setDate(now.getDate() - dayOfWeek);
        end = new Date(now);
        break;
      }
      case 'last_week': {
        const dayOfWeek = now.getDay();
        end = new Date(now);
        end.setDate(now.getDate() - dayOfWeek - 1);
        start = new Date(end);
        start.setDate(end.getDate() - 6);
        break;
      }
      case '7d':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        end = new Date(now);
        break;
      case 'mtd':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case '30d':
        start = new Date(now);
        start.setDate(now.getDate() - 30);
        end = new Date(now);
        break;
      case '90d':
        start = new Date(now);
        start.setDate(now.getDate() - 90);
        end = new Date(now);
        break;
      default:
        break;
    }

    setStartDate(start);
    setEndDate(end);
    onChange(formatDateStr(start), formatDateStr(end));
    onClose();
  };

  // Helper: check if two dates are same day
  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  // Helper: check if date is between start and end
  const isBetween = (date) => {
    if (!startDate) return false;
    if (endDate) {
      return date > startDate && date < endDate;
    }
    if (hoveredDate) {
      return (
        (date > startDate && date < hoveredDate) ||
        (date < startDate && date > hoveredDate)
      );
    }
    return false;
  };

  const isFutureDate = (date) => {
    if (!date) return false;
    const check = new Date(date);
    check.setHours(0, 0, 0, 0);
    const todayZero = new Date();
    todayZero.setHours(0, 0, 0, 0);
    return check > todayZero;
  };

  // Month navigation
  const prevMonth = () => {
    setLeftMonth(new Date(leftMonth.getFullYear(), leftMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    // Prevent navigating into future months
    const nextLeft = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1);
    if (nextLeft <= new Date()) {
      setLeftMonth(nextLeft);
    }
  };

  const renderCalendarMonth = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let day = 1; day <= totalDays; day++) {
      days.push(new Date(year, month, day));
    }

    const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
      <div className={styles.monthCol}>
        <div className={styles.monthTitle}>
          {monthNames[month]} {year}
        </div>
        <div className={styles.weekdays}>
          {daysOfWeek.map((d) => (
            <span key={d} className={styles.weekday}>{d}</span>
          ))}
        </div>
        <div className={styles.daysGrid}>
          {days.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className={styles.dayEmpty} />;

            const disabled = isFutureDate(date);
            const isStart = isSameDay(date, startDate);
            const isEnd = isSameDay(date, endDate);
            const isSelected = isStart || isEnd;
            const inRange = isBetween(date);
            const isToday = isSameDay(date, new Date());

            let cellClass = styles.dayCell;
            if (disabled) cellClass += ` ${styles.disabled}`;
            else if (isSelected) cellClass += ` ${styles.selected}`;
            else if (inRange) cellClass += ` ${styles.inRange}`;
            if (isToday && !isSelected) cellClass += ` ${styles.today}`;

            return (
              <button
                key={date.toISOString()}
                disabled={disabled}
                onClick={() => !disabled && handleDayClick(date)}
                onMouseEnter={() => !disabled && startDate && !endDate && setHoveredDate(date)}
                onMouseLeave={() => setHoveredDate(null)}
                className={cellClass}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleDayClick = (date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (date < startDate) {
        setStartDate(date);
        setEndDate(startDate);
      } else {
        setEndDate(date);
      }
    }
  };

  const handleApply = () => {
    if (startDate && endDate) {
      onChange(formatDateStr(startDate), formatDateStr(endDate));
    } else if (startDate) {
      onChange(formatDateStr(startDate), formatDateStr(startDate));
    }
    onClose();
  };

  return (
    <div className={styles.popover}>
      {/* Sidebar Shortcuts */}
      <div className={styles.shortcuts}>
        <h4 className={styles.shortcutsTitle}>Shortcuts</h4>
        <button onClick={() => handleShortcut('today')} className={styles.shortcutBtn}>Today</button>
        <button onClick={() => handleShortcut('yesterday')} className={styles.shortcutBtn}>Yesterday</button>
        <button onClick={() => handleShortcut('this_week')} className={styles.shortcutBtn}>This week (Sun - Today)</button>
        <button onClick={() => handleShortcut('last_week')} className={styles.shortcutBtn}>Last week (Sun - Sat)</button>
        <button onClick={() => handleShortcut('7d')} className={styles.shortcutBtn}>Last 7 days</button>
        <button onClick={() => handleShortcut('mtd')} className={styles.shortcutBtn}>Month to date</button>
        <button onClick={() => handleShortcut('last_month')} className={styles.shortcutBtn}>Last month</button>
        <button onClick={() => handleShortcut('30d')} className={styles.shortcutBtn}>Last 30 days</button>
        <button onClick={() => handleShortcut('90d')} className={styles.shortcutBtn}>Last 3 months</button>
      </div>

      {/* Main Dual Month Calendar */}
      <div className={styles.calendarContainer}>
        {/* Selected Range Display Header */}
        <div className={styles.rangeHeader}>
          <span className={styles.rangeBadge}>
            {formatHeaderLabel(startDate)} – {formatHeaderLabel(endDate || startDate)}
          </span>
          <div className={styles.navControls}>
            <button onClick={prevMonth} className={styles.navBtn}>&larr;</button>
            <button onClick={nextMonth} className={styles.navBtn}>&rarr;</button>
          </div>
        </div>

        {/* Dual Month View */}
        <div className={styles.dualMonths}>
          {renderCalendarMonth(leftMonth)}
          {renderCalendarMonth(rightMonth)}
        </div>

        {/* Footer Actions */}
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
          <button onClick={handleApply} className={styles.applyBtn}>Apply Range</button>
        </div>
      </div>
    </div>
  );
}
