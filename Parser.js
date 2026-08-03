'use strict';

const XLSX = require('xlsx');

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

// Status codes taken directly from the legend block at the bottom of each rota sheet.
const CODES = {
  I:  { label: 'In (Working)',                    group: 'work'  },
  N:  { label: 'Night Shift',                     group: 'work'  },
  LI: { label: 'Live-In',                         group: 'work'  },
  H:  { label: 'Working From Home',               group: 'work'  },
  O:  { label: 'Office',                          group: 'work'  },
  TS: { label: 'Training / Shadowing',            group: 'work'  },
  T:  { label: 'Training',                        group: 'work'  },
  C:  { label: 'College',                         group: 'work'  },
  M:  { label: 'Meeting',                         group: 'work'  },
  AP: { label: 'Appointment',                     group: 'work'  },
  X:  { label: 'Day Off / Weekend / Bank Holiday', group: 'off'   },
  AL: { label: 'Annual Leave',                    group: 'leave' },
  EL: { label: 'Emergency Leave',                 group: 'leave' },
  ML: { label: 'Maternity Leave',                 group: 'leave' },
  S:  { label: 'Sick',                            group: 'sick'  }
};

const GROUP_ORDER = { work: 0, other: 1, leave: 2, sick: 3, off: 4 };

function codeInfo(code) {
  return CODES[code] || { label: code, group: 'other' };
}

/**
 * Build a stable id for a staff member so the same person keeps the same id
 * across months and across re-uploads of the workbook.
 */
function makeStaffId(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Parse a rota workbook buffer into a normalized dataset.
 *
 * Returns:
 * {
 *   year: 2026,
 *   months: [{ index, name, sheetName, dayCount }],
 *   staff:  [{ id, name, designation, phone, team }],
 *   shifts: { 'YYYY-MM-DD': { staffId: 'CODE', ... } },
 *   codes:  { CODE: { label, group } },
 *   parsedAt: ISO string
 * }
 */
function parseRotaWorkbook(buffer, { year } = {}) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const staffById = new Map();
  const shifts = {};
  const months = [];
  let detectedYear = year || null;

  for (const sheetName of workbook.SheetNames) {
    const upper = sheetName.toUpperCase();

    const monthIndex = MONTH_NAMES.findIndex((m) => upper.includes(m));
    if (monthIndex === -1) continue;

    // Pull a 4-digit year out of the sheet name if we weren't given one.
    if (!detectedYear) {
      const yearMatch = upper.match(/\b(20\d{2})\b/);
      if (yearMatch) detectedYear = Number(yearMatch[1]);
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
    const headerRow = rows[0] || [];

    // Day-number columns start at column H (index 7) and run until the numbers stop.
    const dayColumns = [];
    for (let col = 7; col < headerRow.length; col++) {
      const value = headerRow[col];
      if (typeof value === 'number' && value >= 1 && value <= 31) {
        dayColumns.push({ dayNum: value, colIndex: col });
      } else {
        break;
      }
    }
    if (dayColumns.length === 0) continue;

    months.push({
      index: monthIndex,
      name: MONTH_NAMES[monthIndex],
      sheetName: sheetName.trim(),
      dayCount: dayColumns.length
    });

    // Track duplicate rows within this sheet (the workbook repeats some people).
    const seenInSheet = new Set();

    for (let r = 2; r < rows.length; r++) {
      const row = rows[r] || [];
      const nameCell = row[0];

      // The legend block marks the end of the staff list.
      if (nameCell && String(nameCell).trim().toUpperCase() === 'CODES') break;
      if (!nameCell || String(nameCell).trim() === '') continue;

      const name = String(nameCell).trim();
      const designation = row[3] ? String(row[3]).trim() : '';
      const phone = row[2] ? String(row[2]).trim() : '';
      const team = row[5] ? String(row[5]).trim() : '';

      const dedupeKey = `${name.toLowerCase()}|${designation.toLowerCase()}|${phone}`;
      if (seenInSheet.has(dedupeKey)) continue;
      seenInSheet.add(dedupeKey);

      const staffId = makeStaffId(name);

      // Keep the richest record we've seen for this person across all months.
      const existing = staffById.get(staffId);
      if (!existing) {
        staffById.set(staffId, { id: staffId, name, designation, phone, team });
      } else {
        if (!existing.designation && designation) existing.designation = designation;
        if (!existing.phone && phone) existing.phone = phone;
        if (!existing.team && team) existing.team = team;
      }

      for (const { dayNum, colIndex } of dayColumns) {
        const raw = row[colIndex];
        if (raw === null || raw === undefined || String(raw).trim() === '') continue;

        const code = String(raw).trim().toUpperCase();
        const dateKey = `${detectedYear || 'UNKNOWN'}-${pad2(monthIndex + 1)}-${pad2(dayNum)}`;

        if (!shifts[dateKey]) shifts[dateKey] = {};
        shifts[dateKey][staffId] = code;
      }
    }
  }

  if (months.length === 0) {
    throw new Error('No recognizable month sheets found in that workbook.');
  }

  // If the year was only detected after some dates were written, rewrite the keys.
  if (detectedYear) {
    for (const key of Object.keys(shifts)) {
      if (key.startsWith('UNKNOWN-')) {
        const fixed = key.replace('UNKNOWN-', `${detectedYear}-`);
        shifts[fixed] = { ...(shifts[fixed] || {}), ...shifts[key] };
        delete shifts[key];
      }
    }
  }

  months.sort((a, b) => a.index - b.index);

  return {
    year: detectedYear,
    months,
    staff: Array.from(staffById.values()).sort((a, b) => a.name.localeCompare(b.name)),
    shifts,
    codes: CODES,
    parsedAt: new Date().toISOString()
  };
}

module.exports = { parseRotaWorkbook, codeInfo, CODES, GROUP_ORDER, MONTH_NAMES, makeStaffId };