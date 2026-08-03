'use strict';

const { codeInfo, GROUP_ORDER } = require('./parser');

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(`${dateStr}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

function weekdayFor(dateStr) {
  return WEEKDAYS[new Date(`${dateStr}T00:00:00Z`).getUTCDay()];
}

function emptyCounts() {
  return { work: 0, off: 0, leave: 0, sick: 0, other: 0 };
}

/**
 * Everyone's status on a single date.
 * `group` optionally filters to one of: work | off | leave | sick | other
 */
function getDay(dataset, dateStr, { group } = {}) {
  const dayShifts = dataset.shifts[dateStr] || {};
  const staffById = new Map(dataset.staff.map((s) => [s.id, s]));

  const entries = [];
  const counts = emptyCounts();
  let unrecorded = 0;

  for (const staff of dataset.staff) {
    const code = dayShifts[staff.id];
    if (!code) {
      unrecorded++;
      continue;
    }

    const info = codeInfo(code);
    counts[info.group]++;

    entries.push({
      staffId: staff.id,
      name: staff.name,
      designation: staff.designation,
      team: staff.team,
      code,
      label: info.label,
      group: info.group
    });
  }

  const filtered = group ? entries.filter((e) => e.group === group) : entries;

  filtered.sort((a, b) => {
    if (a.group !== b.group) return GROUP_ORDER[a.group] - GROUP_ORDER[b.group];
    return a.name.localeCompare(b.name);
  });

  return {
    date: dateStr,
    weekday: weekdayFor(dateStr),
    counts,
    totalStaff: dataset.staff.length,
    recorded: dataset.staff.length - unrecorded,
    unrecorded,
    entries: filtered
  };
}

/** Search staff by name or designation. */
function searchStaff(dataset, query) {
  if (!query) return dataset.staff;

  const q = query.toLowerCase();
  return dataset.staff.filter(
    (s) => s.name.toLowerCase().includes(q) || (s.designation || '').toLowerCase().includes(q)
  );
}

/**
 * One person's full schedule, optionally narrowed to a date range.
 * Returns their day-by-day codes plus totals by group.
 */
function getStaffSchedule(dataset, staffId, { from, to } = {}) {
  const staff = dataset.staff.find((s) => s.id === staffId);
  if (!staff) return null;

  const counts = emptyCounts();
  const schedule = [];

  const dates = Object.keys(dataset.shifts).sort();
  for (const date of dates) {
    if (from && date < from) continue;
    if (to && date > to) continue;

    const code = dataset.shifts[date][staffId];
    if (!code) continue;

    const info = codeInfo(code);
    counts[info.group]++;

    schedule.push({
      date,
      weekday: weekdayFor(date),
      code,
      label: info.label,
      group: info.group
    });
  }

  return { staff, counts, daysRecorded: schedule.length, schedule };
}

/**
 * Headcount per day across a range — the basis for spotting coverage gaps.
 * `minStaff` flags any day where the working headcount falls below the threshold.
 */
function getCoverage(dataset, { from, to, minStaff } = {}) {
  const dates = Object.keys(dataset.shifts)
    .filter((d) => (!from || d >= from) && (!to || d <= to))
    .sort();

  const days = dates.map((date) => {
    const counts = emptyCounts();
    const dayShifts = dataset.shifts[date];

    for (const code of Object.values(dayShifts)) {
      counts[codeInfo(code).group]++;
    }

    const entry = {
      date,
      weekday: weekdayFor(date),
      counts,
      working: counts.work
    };

    if (typeof minStaff === 'number') {
      entry.belowThreshold = counts.work < minStaff;
    }

    return entry;
  });

  const workingTotals = days.map((d) => d.working);

  return {
    from: dates[0] || null,
    to: dates[dates.length - 1] || null,
    dayCount: days.length,
    minStaff: typeof minStaff === 'number' ? minStaff : null,
    flaggedDays: typeof minStaff === 'number' ? days.filter((d) => d.belowThreshold).length : null,
    averageWorking: workingTotals.length
      ? Math.round((workingTotals.reduce((a, b) => a + b, 0) / workingTotals.length) * 10) / 10
      : 0,
    days
  };
}

module.exports = { getDay, searchStaff, getStaffSchedule, getCoverage, isValidDate, weekdayFor };