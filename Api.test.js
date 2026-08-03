'use strict';

/**
 * End-to-end test against the real rota workbook.
 * Run with: API_KEY=... ADMIN_KEY=... node test/api.test.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

process.env.API_KEY = process.env.API_KEY || 'test-read-key';
process.env.ADMIN_KEY = process.env.ADMIN_KEY || 'test-admin-key';
process.env.DATA_DIR = path.join(__dirname, '..', 'data-test');

const app = require('../src/server');

const ROTA_PATH = process.env.ROTA_PATH || '/home/claude/rota.xlsx';
const READ_KEY = process.env.API_KEY;
const ADMIN = process.env.ADMIN_KEY;

let server;
let baseUrl;
let passed = 0;
let failed = 0;

function check(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  PASS  ${name}`);
    })
    .catch((err) => {
      failed++;
      console.log(`  FAIL  ${name}`);
      console.log(`        ${err.message}`);
    });
}

async function api(pathname, { key = READ_KEY, method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), ...headers },
    body
  });
  let json = null;
  try {
    json = await res.json();
  } catch (_) {
    /* non-JSON response */
  }
  return { status: res.status, body: json };
}

async function run() {
  fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  console.log('\nAUTH');

  await check('health endpoint needs no key', async () => {
    const r = await api('/health', { key: null });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.status, 'ok');
  });

  await check('reads rejected without a key', async () => {
    const r = await api('/api/status', { key: null });
    assert.strictEqual(r.status, 401);
  });

  await check('reads rejected with a wrong key', async () => {
    const r = await api('/api/status', { key: 'nope' });
    assert.strictEqual(r.status, 401);
  });

  await check('read key cannot upload', async () => {
    const r = await api('/api/upload', { key: READ_KEY, method: 'POST' });
    assert.strictEqual(r.status, 401);
  });

  console.log('\nEMPTY STATE');

  await check('lookups return 503 before any upload', async () => {
    const r = await api('/api/day/2026-01-28');
    assert.strictEqual(r.status, 503);
    assert.ok(r.body.error.includes('No rota loaded'));
  });

  console.log('\nUPLOAD');

  await check('admin can upload the workbook', async () => {
    const buffer = fs.readFileSync(ROTA_PATH);
    const form = new FormData();
    form.append('file', new Blob([buffer]), 'rota.xlsx');

    const res = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN}` },
      body: form
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200, JSON.stringify(json));
    assert.strictEqual(json.year, 2026);
    assert.strictEqual(json.months.length, 12);
    assert.strictEqual(json.daysWithData, 365);
    assert.ok(json.staffCount > 100, `expected >100 staff, got ${json.staffCount}`);
  });

  await check('non-xlsx upload is rejected', async () => {
    const form = new FormData();
    form.append('file', new Blob(['not a spreadsheet']), 'notes.txt');

    const res = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN}` },
      body: form
    });
    assert.ok(res.status >= 400, `expected an error status, got ${res.status}`);
  });

  await check('status reflects the uploaded rota', async () => {
    const r = await api('/api/status');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.loaded, true);
    assert.strictEqual(r.body.year, 2026);
    assert.strictEqual(r.body.monthsCovered.length, 12);
  });

  console.log('\nDAY LOOKUP');

  await check('known statuses match the spreadsheet (Jan 28)', async () => {
    const r = await api('/api/day/2026-01-28');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.weekday, 'Wednesday');

    const byName = Object.fromEntries(r.body.entries.map((e) => [e.name, e.code]));
    assert.strictEqual(byName['Kezia Etornam Kwawudade'], 'I');
    assert.strictEqual(byName['Eric Asante'], 'O');
    assert.strictEqual(byName['Gabrielle Anoquah'], 'H');
    assert.strictEqual(byName['Gerard Abradu'], 'X');
  });

  await check('day counts add up to recorded staff', async () => {
    const r = await api('/api/day/2026-01-28');
    const total = Object.values(r.body.counts).reduce((a, b) => a + b, 0);
    assert.strictEqual(total, r.body.recorded);
    assert.strictEqual(r.body.recorded + r.body.unrecorded, r.body.totalStaff);
  });

  await check('group filter returns only that group', async () => {
    const r = await api('/api/day/2026-01-28?group=sick');
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.entries.every((e) => e.group === 'sick'));
    assert.strictEqual(r.body.entries.length, r.body.counts.sick);
  });

  await check('filtered counts still report the full day', async () => {
    const all = await api('/api/day/2026-01-28');
    const filtered = await api('/api/day/2026-01-28?group=work');
    assert.deepStrictEqual(filtered.body.counts, all.body.counts);
  });

  await check('weekend cover is staffed (Jan 3, a Saturday)', async () => {
    // This is a care service, so weekends are worked. Only office-hours roles
    // sit out — the test asserts cover exists, not that most staff are off.
    const r = await api('/api/day/2026-01-03');
    assert.strictEqual(r.body.weekday, 'Saturday');
    assert.ok(r.body.counts.work > 0, 'expected weekend cover to be staffed');
    assert.ok(r.body.counts.off > 0, 'expected some office roles to be off at the weekend');
  });

  await check('bad date format is rejected', async () => {
    const r = await api('/api/day/28-01-2026');
    assert.strictEqual(r.status, 400);
  });

  await check('invalid group is rejected', async () => {
    const r = await api('/api/day/2026-01-28?group=holiday');
    assert.strictEqual(r.status, 400);
  });

  await check('a date outside the rota returns an empty day, not an error', async () => {
    const r = await api('/api/day/2027-01-01');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.entries.length, 0);
    assert.strictEqual(r.body.unrecorded, r.body.totalStaff);
  });

  console.log('\nSTAFF LOOKUP');

  await check('staff search matches by name', async () => {
    const r = await api('/api/staff?search=isaac');
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.count >= 1);
    assert.ok(r.body.staff.some((s) => s.name.includes('Isaac')));
  });

  await check('staff search matches by designation', async () => {
    const r = await api('/api/staff?search=finance');
    assert.ok(r.body.count >= 1);
    assert.ok(r.body.staff.every((s) =>
      s.name.toLowerCase().includes('finance') || s.designation.toLowerCase().includes('finance')
    ));
  });

  await check('duplicate rows are collapsed to one person', async () => {
    const r = await api('/api/staff?search=Nathanael Anoquah');
    assert.strictEqual(r.body.count, 1, `expected 1 Nathanael, got ${r.body.count}`);
  });

  await check('staff schedule returns dated, labelled entries', async () => {
    const list = await api('/api/staff?search=Kezia');
    const id = list.body.staff[0].id;

    const r = await api(`/api/staff/${id}`);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.daysRecorded > 0);

    const jan28 = r.body.schedule.find((d) => d.date === '2026-01-28');
    assert.strictEqual(jan28.code, 'I');
    assert.strictEqual(jan28.label, 'In (Working)');
    assert.strictEqual(jan28.weekday, 'Wednesday');
  });

  await check('a year-round staff member has data beyond February', async () => {
    // Many rows in the workbook stop after February, so this checks someone who
    // is scheduled all year — proving the parser reads the later sheets too.
    const list = await api('/api/staff?search=Gerard Abradu');
    const id = list.body.staff[0].id;

    const r = await api(`/api/staff/${id}`);
    const laterMonths = r.body.schedule.filter((d) => d.date >= '2026-06-01');
    assert.ok(laterMonths.length > 0, 'expected schedule entries in the second half of the year');
  });

  await check('schedule dates are ordered and unique', async () => {
    const list = await api('/api/staff?search=Gerard Abradu');
    const r = await api(`/api/staff/${list.body.staff[0].id}`);

    const dates = r.body.schedule.map((d) => d.date);
    assert.deepStrictEqual(dates, [...dates].sort(), 'dates should be chronological');
    assert.strictEqual(new Set(dates).size, dates.length, 'dates should be unique');
  });

  await check('schedule respects a date range', async () => {
    const list = await api('/api/staff?search=Kezia');
    const id = list.body.staff[0].id;

    const r = await api(`/api/staff/${id}?from=2026-01-01&to=2026-01-31`);
    assert.ok(r.body.daysRecorded <= 31);
    assert.ok(r.body.schedule.every((d) => d.date >= '2026-01-01' && d.date <= '2026-01-31'));
  });

  await check('unknown staff id returns 404', async () => {
    const r = await api('/api/staff/not-a-real-person');
    assert.strictEqual(r.status, 404);
  });

  console.log('\nCOVERAGE');

  await check('coverage returns a day per date in range', async () => {
    const r = await api('/api/coverage?from=2026-01-01&to=2026-01-31');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.dayCount, 31);
    assert.ok(r.body.averageWorking > 0);
  });

  await check('minStaff flags understaffed days', async () => {
    const r = await api('/api/coverage?from=2026-01-01&to=2026-01-31&minStaff=200');
    assert.strictEqual(r.body.flaggedDays, 31, 'an impossible threshold should flag every day');
    assert.ok(r.body.days.every((d) => d.belowThreshold === true));
  });

  await check('a zero threshold flags nothing', async () => {
    const r = await api('/api/coverage?from=2026-01-01&to=2026-01-31&minStaff=0');
    assert.strictEqual(r.body.flaggedDays, 0);
  });

  await check('coverage working count matches the day endpoint', async () => {
    const cov = await api('/api/coverage?from=2026-01-28&to=2026-01-28');
    const day = await api('/api/day/2026-01-28');
    assert.strictEqual(cov.body.days[0].working, day.body.counts.work);
  });

  await check('negative minStaff is rejected', async () => {
    const r = await api('/api/coverage?minStaff=-5');
    assert.strictEqual(r.status, 400);
  });

  console.log('\nPERSISTENCE');

  await check('data survives a cache clear (read back from disk)', async () => {
    require('../src/store').clearCache();
    const r = await api('/api/day/2026-01-28');
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.entries.length > 0);
  });

  await check('a backup is written on re-upload', async () => {
    const buffer = fs.readFileSync(ROTA_PATH);
    const form = new FormData();
    form.append('file', new Blob([buffer]), 'rota.xlsx');

    await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN}` },
      body: form
    });

    const backupDir = path.join(process.env.DATA_DIR, 'backups');
    const backups = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json'));
    assert.ok(backups.length >= 1, 'expected at least one backup file');
  });

  console.log('\nMISC');

  await check('unknown endpoint returns 404 JSON', async () => {
    const r = await api('/api/nonsense');
    assert.strictEqual(r.status, 404);
    assert.ok(r.body.error);
  });

  await check('codes endpoint lists the legend', async () => {
    const r = await api('/api/codes');
    assert.strictEqual(r.body.codes.I.group, 'work');
    assert.strictEqual(r.body.codes.ML.label, 'Maternity Leave');
  });

  server.close();
  fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  if (server) server.close();
  process.exit(1);
});