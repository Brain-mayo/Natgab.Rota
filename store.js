'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const ROTA_FILE = path.join(DATA_DIR, 'rota.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

let cache = null;

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Load the stored rota. Returns null when nothing has been uploaded yet.
 * Cached in memory so lookups don't touch disk on every request.
 */
function load() {
  if (cache) return cache;

  ensureDirs();
  if (!fs.existsSync(ROTA_FILE)) return null;

  try {
    cache = JSON.parse(fs.readFileSync(ROTA_FILE, 'utf8'));
    return cache;
  } catch (err) {
    console.error('[store] Stored rota file is unreadable:', err.message);
    return null;
  }
}

/**
 * Write a new dataset, keeping a timestamped backup of the previous one.
 * Writes to a temp file first so a crash mid-write can't corrupt the live file.
 */
function save(dataset) {
  ensureDirs();

  if (fs.existsSync(ROTA_FILE)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(ROTA_FILE, path.join(BACKUP_DIR, `rota-${stamp}.json`));
    pruneBackups();
  }

  const tmpFile = `${ROTA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(dataset), 'utf8');
  fs.renameSync(tmpFile, ROTA_FILE);

  cache = dataset;
  return dataset;
}

/** Keep only the 10 most recent backups so the disk doesn't fill up. */
function pruneBackups(keep = 10) {
  try {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('rota-') && f.endsWith('.json'))
      .sort()
      .reverse();

    for (const stale of files.slice(keep)) {
      fs.unlinkSync(path.join(BACKUP_DIR, stale));
    }
  } catch (err) {
    console.error('[store] Could not prune backups:', err.message);
  }
}

function clearCache() {
  cache = null;
}

function status() {
  const dataset = load();
  if (!dataset) return { loaded: false };

  return {
    loaded: true,
    year: dataset.year,
    parsedAt: dataset.parsedAt,
    staffCount: dataset.staff.length,
    monthsCovered: dataset.months.map((m) => m.sheetName),
    daysWithData: Object.keys(dataset.shifts).length
  };
}

module.exports = { load, save, clearCache, status, DATA_DIR, ROTA_FILE };