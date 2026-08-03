# NATGAB Rota API

A small backend that reads the yearly rota workbook once and answers scheduling
questions over HTTP. Built so the web dashboard and a future WhatsApp bot can
share one source of truth instead of each re-parsing the spreadsheet.

## Running it locally

```bash
npm install
cp .env.example .env          # then edit in real keys
API_KEY=... ADMIN_KEY=... npm start
```

Generate keys with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The server refuses to start without both keys set. That is deliberate — the data
includes staff phone numbers, sickness records and maternity leave.

## Loading a rota

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer $ADMIN_KEY" \
  -F "file=@JANUARY_TO_DECEMBER_ROTA_26.xlsx"
```

The workbook is parsed into `data/rota.json`. The previous version is copied to
`data/backups/` first, and the ten most recent backups are kept.

## Endpoints

All reads need `Authorization: Bearer <API_KEY>`. Uploads need the admin key.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness check. No key needed. |
| POST | `/api/upload` | Replace the stored rota. Admin key only. |
| GET | `/api/status` | What is currently loaded. |
| GET | `/api/codes` | The status-code legend. |
| GET | `/api/day/:date` | Everyone's status on one date. |
| GET | `/api/staff` | List or search staff. |
| GET | `/api/staff/:id` | One person's schedule. |
| GET | `/api/coverage` | Headcount per day across a range. |

### `GET /api/day/2026-01-28`

Optional `?group=work|off|leave|sick|other` filters the returned list. The
`counts` block always describes the whole day, so a filtered response still
tells you the full picture.

```json
{
  "date": "2026-01-28",
  "weekday": "Wednesday",
  "counts": { "work": 84, "off": 8, "leave": 6, "sick": 2, "other": 0 },
  "totalStaff": 117,
  "recorded": 100,
  "unrecorded": 17,
  "entries": [
    {
      "staffId": "Ama-Mensah-kwawudade",
      "name": "Ama Mensah Kwawudade",
      "designation": "RN /Brown Team Manager",
      "team": "Brown",
      "code": "I",
      "label": "In (Working)",
      "group": "work"
    }
  ]
}
```

### `GET /api/staff?search=kofi`

Matches on name or designation. Returns ids to use with the next endpoint.

### `GET /api/staff/:id?from=2026-01-01&to=2026-01-31`

One person's day-by-day schedule plus their totals by group. The range is
optional.

### `GET /api/coverage?from=2026-01-01&to=2026-01-31&minStaff=40`

Headcount per day. When `minStaff` is supplied, each day gets a
`belowThreshold` flag and the response reports how many days were flagged —
this is the basis for spotting cover gaps before they happen.

## Status codes

Taken from the legend at the bottom of each rota sheet, grouped so counts stay
meaningful:

- **work** — `I` In, `N` Night, `LI` Live-In, `H` Home, `O` Office, `TS`
  Training/Shadow, `T` Training, `C` College, `M` Meeting, `AP` Appointment
- **off** — `X` Day off / weekend / bank holiday
- **leave** — `AL` Annual, `EL` Emergency, `ML` Maternity
- **sick** — `S`

An unrecognised code is returned as-is under the `other` group rather than being
dropped, so nothing disappears silently if a new code starts being used.

## Deploying

The Dockerfile makes this portable across Render, Railway, Fly.io or a plain
VPS.

1. Push to a **private** GitHub repo.
2. Create a web service pointing at the repo.
3. Set `API_KEY` and `ADMIN_KEY` as environment variables — never in the repo.
4. Attach a persistent disk mounted at `/app/data`.

Step 4 matters. Without a persistent disk the parsed rota is wiped on every
redeploy and has to be re-uploaded.

On free tiers the service sleeps after inactivity, so the first request after a
quiet spell takes 30–60 seconds.

## Tests

```bash
npm test
```

Runs 33 checks against the real workbook, covering auth, parsing accuracy,
every endpoint, input validation and persistence.

## Known issue: the `xlsx` dependency

The npm registry's copy of `xlsx` stops at 0.18.5, which has two unpatched
advisories (prototype pollution and a ReDoS). SheetJS moved distribution to
their own CDN. To install the patched build:

```bash
npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

The exposure is limited here — only an admin key holder can submit a file to
parse — but it is worth doing before this goes anywhere near production.