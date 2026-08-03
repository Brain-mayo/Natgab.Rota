'use strict';

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');

const { parseRotaWorkbook, CODES } = require('./parser');
const store = require('./store');
const q = require('./queries');

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.API_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY;

if (!API_KEY || !ADMIN_KEY) {
  console.error('\n[fatal] API_KEY and ADMIN_KEY must both be set as environment variables.');
  console.error('        This API serves staff phone numbers and sickness/leave records —');
  console.error('        it must not run unauthenticated.\n');
  process.exit(1);
}

app.use(express.json());
app.disable('x-powered-by');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB ceiling
  fileFilter: (req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.xlsx')) return cb(null, true);
    cb(new Error('Only .xlsx files are accepted.'));
  }
});

// ---------------------------------------------------------------- auth

/** Constant-time comparison so key checks don't leak length or content by timing. */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function extractKey(req) {
  const header = req.get('authorization') || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return req.get('x-api-key') || '';
}

function requireKey(expectedKey, roleName) {
  return (req, res, next) => {
    const provided = extractKey(req);
    if (!provided || !safeEqual(provided, expectedKey)) {
      return res.status(401).json({ error: `Unauthorized. A valid ${roleName} key is required.` });
    }
    next();
  };
}

const requireRead = requireKey(API_KEY, 'API');
const requireAdmin = requireKey(ADMIN_KEY, 'admin');

/** Loads the dataset or returns a clear 503 if nothing has been uploaded yet. */
function withDataset(req, res, next) {
  const dataset = store.load();
  if (!dataset) {
    return res.status(503).json({
      error: 'No rota loaded yet. Upload a workbook to POST /api/upload first.'
    });
  }
  req.dataset = dataset;
  next();
}

// ---------------------------------------------------------------- public

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ---------------------------------------------------------------- admin

app.post('/api/upload', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file received. Send the workbook as form field "file".' });
  }

  try {
    const dataset = parseRotaWorkbook(req.file.buffer, {
      year: req.body.year ? Number(req.body.year) : undefined
    });
    store.save(dataset);

    res.json({
      message: 'Rota updated.',
      year: dataset.year,
      staffCount: dataset.staff.length,
      months: dataset.months.map((m) => m.sheetName),
      daysWithData: Object.keys(dataset.shifts).length,
      parsedAt: dataset.parsedAt
    });
  } catch (err) {
    res.status(422).json({ error: `Could not parse that workbook: ${err.message}` });
  }
});

app.get('/api/status', requireRead, (req, res) => {
  res.json(store.status());
});

// ---------------------------------------------------------------- lookups

app.get('/api/codes', requireRead, (req, res) => {
  res.json({ codes: CODES });
});

app.get('/api/day/:date', requireRead, withDataset, (req, res) => {
  const { date } = req.params;
  if (!q.isValidDate(date)) {
    return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format.' });
  }

  const group = req.query.group;
  const validGroups = ['work', 'off', 'leave', 'sick', 'other'];
  if (group && !validGroups.includes(group)) {
    return res.status(400).json({ error: `group must be one of: ${validGroups.join(', ')}` });
  }

  res.json(q.getDay(req.dataset, date, { group }));
});

app.get('/api/staff', requireRead, withDataset, (req, res) => {
  const results = q.searchStaff(req.dataset, req.query.search);
  res.json({ count: results.length, staff: results });
});

app.get('/api/staff/:id', requireRead, withDataset, (req, res) => {
  const { from, to } = req.query;

  for (const [name, value] of Object.entries({ from, to })) {
    if (value && !q.isValidDate(value)) {
      return res.status(400).json({ error: `${name} must be in YYYY-MM-DD format.` });
    }
  }

  const result = q.getStaffSchedule(req.dataset, req.params.id, { from, to });
  if (!result) {
    return res.status(404).json({ error: 'No staff member with that id.' });
  }

  res.json(result);
});

app.get('/api/coverage', requireRead, withDataset, (req, res) => {
  const { from, to } = req.query;

  for (const [name, value] of Object.entries({ from, to })) {
    if (value && !q.isValidDate(value)) {
      return res.status(400).json({ error: `${name} must be in YYYY-MM-DD format.` });
    }
  }

  let minStaff;
  if (req.query.minStaff !== undefined) {
    minStaff = Number(req.query.minStaff);
    if (!Number.isFinite(minStaff) || minStaff < 0) {
      return res.status(400).json({ error: 'minStaff must be a non-negative number.' });
    }
  }

  res.json(q.getCoverage(req.dataset, { from, to, minStaff }));
});

// ---------------------------------------------------------------- errors

app.use((req, res) => {
  res.status(404).json({ error: 'No such endpoint.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload rejected: ${err.message}` });
  }
  console.error('[error]', err);
  res.status(500).json({ error: 'Something went wrong handling that request.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`NATGAB rota API listening on port ${PORT}`);
    const current = store.status();
    console.log(
      current.loaded
        ? `Rota loaded: ${current.staffCount} staff, ${current.daysWithData} days, year ${current.year}`
        : 'No rota loaded yet — POST a workbook to /api/upload.'
    );
  });
}

module.exports = app;