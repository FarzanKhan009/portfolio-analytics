import React, { useState, useEffect } from 'react';
import styles from './DateRangePicker.module.css';

export default function DateRangePicker({ from, to, onChange, onClose }) {
  // Parsing initial dates
  const [startDate, setStartDate] = useState(new Date(from));
  const [endDate, setEndDate] = useState(new Date(to));
  const [hoveredDate, setHoveredDate] = useState(null);

  // Calendar view state (which month we are displaying)
  const [currentMonth, setCurrentMonth] = useState(new Date(to));

  // Handle shortcuts selection
  const handleShortcut = (days) => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - days);
    
    setStartDate(start);
    setEndDate(today);
    setCurrentMonth(today);
    
    onChange(
      start.toISOString().split('T')[0],
      today.toISOString().split('T')[0]
    );
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
      // If start is chosen, hover creates simulated range
      return (
        (date > startDate && date < hoveredDate) ||
        (date < startDate && date > hoveredDate)
      );
    }
    return false;
  };

  // Month navigation helpers
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Generate calendar days
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of month index
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];

    // Empty cells for previous month padding
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    // Days list
    for (let day = 1; day <= totalDays; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const handleDayClick = (date) => {
    if (!date) return;

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
      onChange(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
    } else if (startDate) {
      onChange(
        startDate.toISOString().split('T')[0],
        startDate.toISOString().split('T')[0]
      );
    }
    onClose();
  };

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const calendarDays = getCalendarDays();

  return (
    <div className={styles.popover}>
      {/* Sidebar shortcuts */}
      <div className={styles.shortcuts}>
        <h4 className={styles.shortcutsTitle}>Shortcuts</h4>
        <button onClick={() => handleShortcut(0)} className={styles.shortcutBtn}>Today</button>
        <button onClick={() => handleShortcut(1)} className={styles.shortcutBtn}>Yesterday</button>
        <button onClick={() => handleShortcut(7)} className={styles.shortcutBtn}>Last 7 Days</button>
        <button onClick={() => handleShortcut(30)} className={styles.shortcutBtn}>Last 30 Days</button>
        <button onClick={() => handleShortcut(90)} className={styles.shortcutBtn}>Last 90 Days</button>
      </div>

      {/* Main Calendar Picker */}
      <div className={styles.calendar}>
        <div className={styles.header}>
          <button onClick={prevMonth} className={styles.navBtn}>&larr;</button>
          <span className={styles.monthLabel}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button onClick={nextMonth} className={styles.navBtn}>&rarr;</button>
        </div>

        {/* Days of Week Header */}
        <div className={styles.weekdays}>
          {daysOfWeek.map((d) => (
            <span key={d} className={styles.weekday}>{d}</span>
          ))}
        </div>

        {/* Days grid */}
        <div className={styles.daysGrid}>
          {calendarDays.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className={styles.dayEmpty} />;

            const isStart = isSameDay(date, startDate);
            const isEnd = isSameDay(date, endDate);
            const isSelected = isStart || isEnd;
            const inRange = isBetween(date);
            const isToday = isSameDay(date, new Date());

            let cellClass = styles.dayCell;
            if (isSelected) cellClass += ` ${styles.selected}`;
            else if (inRange) cellClass += ` ${styles.inRange}`;
            if (isToday) cellClass += ` ${styles.today}`;

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDayClick(date)}
                onMouseEnter={() => startDate && !endDate && setHoveredDate(date)}
                onMouseLeave={() => setHoveredDate(null)}
                className={cellClass}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
          <button onClick={handleApply} className={styles.applyBtn}>Apply Range</button>
        </div>
      </div>
    </div>
  );
}
