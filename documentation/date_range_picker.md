# Date Range Picker & Date/Time Interactivity

## Overview

The codebase contains **no date range picker component** and no date range filter of any kind. No external date library (`react-datepicker`, `react-day-picker`, `dayjs`, `moment`, `luxon`) is installed. The only native `<input type="date">` in the entire frontend is the `date_of_birth` field in `DronePermitForm.jsx`.

All date/time interactivity falls into one of five patterns:

| Pattern | Pages |
|---|---|
| Native `<input type="date">` — single date only | `DronePermitForm.jsx` |
| Live clock display — `setInterval` every 1s | `CommandCenter.jsx` |
| Auto-refresh countdown timers | `AdminAnalytics.jsx`, `LiveDashboard.jsx` |
| Timestamp formatting helpers / display | `DisasterAlertSMS.jsx`, all dashboard pages |
| Relative elapsed time computation | `PermitReview.jsx`, `AdminAnalytics.jsx` |

---

## 1. Native Date Input — `DronePermitForm.jsx`

### State

```js
const [formData, setFormData] = useState({
  date_of_birth: '',
  // ... other fields
});
```

### Markup

```jsx
<input
  type="date"
  name="date_of_birth"
  value={formData.date_of_birth}
  onChange={handleChange}
  required
  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
```

### Handler

```js
const handleChange = (e) => {
  const { name, value, type, checked } = e.target;
  setFormData({
    ...formData,
    [name]: type === 'checkbox' ? checked : value,
  });
};
```

- Single handler for all inputs via `name` attribute spread.
- No `min`/`max` constraints — the browser native date picker allows any date including future dates for a date-of-birth field.
- Value stored as an ISO string `"YYYY-MM-DD"` (browser native format). Submitted as-is via `FormData.append()`.
- **No validation** beyond `required`. A future birth date passes form submission.

### Display in `PermitReview.jsx`

When the officer reviews a submitted permit, the stored `date_of_birth` ISO string is re-formatted for display:

```jsx
{new Date(selectedPermit.date_of_birth).toLocaleDateString()}
```

- Uses the user's browser locale for formatting (e.g., `3/15/1990` on en-US).
- No explicit locale argument — output varies by browser locale settings.

---

## 2. Live Clock — `CommandCenter.jsx`

### State and Timer

```js
const [clock, setClock] = useState(new Date());

useEffect(() => {
  const t = setInterval(() => setClock(new Date()), 1000);
  return () => clearInterval(t);
}, []);
```

- `clock` is a `Date` object updated every 1,000 ms.
- The effect runs once on mount; cleanup clears the interval on unmount.
- Every 1s re-render affects the entire component — no isolation via a sub-component.

### Display

```js
const clockStr = clock.toLocaleTimeString('en-US', {
  hour12: true,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});
```

- Explicit `'en-US'` locale overrides browser locale — always 12-hour format regardless of user system settings.
- Rendered in the header alongside the map — acts as a mission clock for operators.

### Drone Timestamp Display (Static)

Drone data carries `drone.time` and `drone.date` properties that come directly from the WebSocket/API payload and are rendered as-is:

```jsx
Updated: {drone.time} · {drone.date}
```

- These are pre-formatted strings from the backend, not `Date` objects. No client-side formatting applied.

---

## 3. Auto-Refresh Countdown Timers

### `AdminAnalytics.jsx` — 60-Second Countdown

**State:**
```js
const [countdown, setCountdown] = useState(60);
const [lastUpdate, setLastUpdate] = useState(null);
```

**Timer logic:**
```js
useEffect(() => {
  const t = setInterval(() => setCountdown(p => {
    if (p <= 1) { fetchData(true); return 60; }
    return p - 1;
  }), 1000);
  return () => clearInterval(t);
}, []);
```

- The countdown reducer fires `fetchData(true)` inline inside `setCountdown`. This couples side-effect logic into a state updater.
- `fetchData(true)` sets `refreshing=true` to show the spinner vs the initial `loading=true` full-screen loader.
- After successful fetch: `setLastUpdate(new Date()); setCountdown(60);`

**Display in header:**
```jsx
<span className="text-sky-100">{lastUpdate?.toLocaleTimeString()}</span>
{/* ... */}
<span className="font-mono font-bold text-white">{countdown}s</span>
```

- `lastUpdate` is `null` on first render — the `?.` optional chaining suppresses the call, rendering nothing until first fetch completes.
- `countdown` ticks down from 60 to 0 in 1s steps and is displayed as a raw integer (`"{countdown}s"`).
- Manual refresh button calls `fetchData(true)` directly but does NOT reset the interval timer — the auto-refresh continues on its original schedule regardless of manual refreshes.

### `LiveDashboard.jsx` — Split 30s / 5min Strategy

LiveDashboard uses two different refresh intervals on different data sets:

**State:**
```js
const [countdown, setCountdown] = useState(300);    // 5 minutes
const [lastUpdate, setLastUpdate] = useState(new Date());
const [nextFetch, setNextFetch] = useState(new Date(Date.now() + 300000));
```

- `countdown` initialises to 300 (5 minutes in seconds), unlike AdminAnalytics which starts at 60.
- `lastUpdate` initialises to `new Date()` on mount — it is never `null` (unlike AdminAnalytics).
- `nextFetch` stores an absolute `Date` of the next full refresh — unused in rendering logic but held in state.

**Timer — light refresh every 30s:**
```js
useEffect(() => {
  fetchAllData();
  const interval = setInterval(() => {
    fetchStats();
    fetchRecentDisasters();
    setLastUpdate(new Date());
    setNextFetch(new Date(Date.now() + 30000));
    setCountdown(30);   // resets to 30, not 300
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

- The 30s interval only fetches `stats` and `recentDisasters` — skips `locationHotspots`, `timeline`, `disasterTypes`.
- After the 30s fetch it resets `countdown` to 30 (not 300). This means the countdown is inconsistent — after mount it says "5 minutes", but after the first 30s tick it switches to "30 seconds" cadence.

**Full data fetch:**
```js
// fetchAllData() is called once on mount inside the above useEffect
// After full fetch completes:
setLastUpdate(new Date());
setNextFetch(new Date(Date.now() + 300000));
setCountdown(300);
```

- The full data fetch (all endpoints) resets to 300. But `fetchAllData` is only called on mount — subsequent auto-refreshes only do the light 30s fetch.

**Countdown display:**
```js
const formatCountdown = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  // returns formatted string e.g. "4:59"
};
```

- Unlike AdminAnalytics, the countdown is formatted as `M:SS` not raw seconds.
- The displayed "Refresh interval: 5 minutes" label is hardcoded text — it does not reflect the actual 30s interval used after mount.

**Countdown decrement — separate `useEffect`:**
```js
useEffect(() => {
  const t = setInterval(() => setCountdown(p => Math.max(0, p - 1)), 1000);
  return () => clearInterval(t);
}, []);
```

- Separate 1s interval just for decrementing the display counter.
- Two separate intervals run simultaneously: the 1s display decrement and the 30s data fetch.
- Countdown can reach 0 and stay at 0 for up to 30s between fetches (clamped at 0 by `Math.max(0, p-1)`).

**Last-update display:**
```jsx
<span className="text-xs text-gray-600 font-medium">
  {lastUpdate.toLocaleTimeString()}
</span>
```

- No explicit locale — uses browser locale (unlike CommandCenter which forces `'en-US'`).

---

## 4. Timestamp Formatting — `DisasterAlertSMS.jsx`

Three formatting helpers defined at module scope:

```js
function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 5) return 'just now';
  // ... additional threshold logic
}
```

- Both `formatTime` and `formatDate` use explicit `'en-US'` locale — consistent with `CommandCenter.jsx`.
- `timeAgo` accepts a timestamp string `ts`, parses it with `new Date(ts)`, and computes elapsed seconds.
- `timeAgo` is used in the SMS history list for relative time display.

### SMS History Entry Construction

All three send modes stamp entries at send time:

```js
// Single send:
const entry = {
  phones: [phone],
  message,
  type: selectedType || 'Custom',
  severity,
  time: formatTime(new Date()),   // "02:35:44 PM"
  date: formatDate(new Date()),   // "Mar 28, 2026"
  timestamp,
  status: result.success ? 'sent' : 'failed',
  // ...
};

// Bulk send — identical time/date stamping
// Broadcast — identical time/date stamping
```

- `time` and `date` are formatted strings, not raw timestamps — they cannot be re-parsed for sorting or comparison.
- `timestamp` is also stored (raw ISO string from the API response) enabling `timeAgo()` calls.

### History Rendering

```jsx
<span>{item.date}</span>   {/* pre-formatted "Mar 28, 2026" */}
```

- History is ordered by insertion (newest first via `[entry, ...prev]`). There is no date-based sorting.
- History is capped at 100 entries via `.slice(0, 100)`.

---

## 5. Relative Elapsed Time — `PermitReview.jsx`

### Days-Since Calculation

```js
const daysSinceApplied = Math.floor(
  (new Date() - new Date(permit.created_at)) / (1000 * 60 * 60 * 24)
);
const isUrgent = daysSinceApplied > 3;
```

- Computed inline inside a `.map()` on every render — `new Date()` is called fresh each render.
- Urgency threshold: >3 days.

### Overdue Count (summary banner):

```js
permits.filter(p => {
  const daysDiff = Math.floor((new Date() - new Date(p.created_at)) / (1000 * 60 * 60 * 24));
  return daysDiff > 3;
}).length
```

- Same >3-day threshold. The same calculation runs twice — once for the banner count and once in the `.map()`.

### Display formats used in `PermitReview.jsx`:

| Data | Method | Output example |
|---|---|---|
| Permit detail card | `new Date(permit.created_at).toLocaleString()` | "3/28/2026, 2:35:44 PM" |
| Date of birth (read-only) | `new Date(selectedPermit.date_of_birth).toLocaleDateString()` | "3/15/1990" |
| Days since applied | inline arithmetic | "4 days ago" (text interpolated) |

---

## 6. Timestamp Display Patterns Across Pages

### `AdminAnalytics.jsx` — Heatmap temporal aggregation

Timestamps aggregated by hour-of-day (0–23) and day-of-week (0–6). No date range filter:

```js
users.forEach(u => {
  if (!u.created_at) return;
  const d = new Date(u.created_at);
  const key = `${d.getHours()}-${d.getDay()}`;
  regAgg[key] = (regAgg[key] || 0) + 1;
});
```

- `getDay()` returns 0=Sunday…6=Saturday. Displayed as `['Sun','Mon','Tue','Wed','Thu','Fri','Sat']`.
- The heatmap shows patterns across the full history of all loaded data — there is no "last N days" or date range UI anywhere on the page.

### `AdminAnalytics.jsx` — User growth chart month labels

```js
const labels = months.map(m => {
  const [y, mo] = m.split('-');
  return new Date(y, mo - 1).toLocaleString('en', { month: 'short', year: '2-digit' });
});
```

- Uses `'en'` locale (not `'en-US'`). Output: `"Jan 24"`, `"Feb 24"`, etc.
- Chart shows all months available in data — no date window applied.

### `AdminAnalytics.jsx` — Timeline chart (24h)

```js
const hours = timeline.map(t => {
  const d = new Date(t.timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
});
```

- X-axis labels formatted as `"00:00"` to `"23:00"`.
- Timeline data comes from `GET /analytics/timeline` — the server determines the 24h window.

### `LiveDashboard.jsx` — Sentiment wave (most recent 50)

```js
const sentimentTimeline = recentDisasters
  .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  .slice(-50)
  .map((disaster, index) => ({
    x: index,
    y: disaster.sentiment || 0,
    time: new Date(disaster.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    type: disaster.disaster_type,
  }));
```

- `.slice(-50)` acts as an implicit recency window — no date range UI.
- Time label in tooltip is `"HH:MM AM/PM"` (12-hour, en-US).
- **Bug:** `.sort()` mutates `recentDisasters` state array in place. See `timeline_analysis.md` for full details.

### `LiveDashboard.jsx` — Recent disasters list

```jsx
{new Date(disaster.timestamp).toLocaleTimeString('en-US', {
  hour: '2-digit',
  minute: '2-digit'
})}
```

- Only time portion, no date. Two adjacent disasters from different days would be indistinguishable.

### `CommandCenter.jsx` — Report timestamps

```jsx
{/* Sidebar card — time only */}
<span>{new Date(r.created_at).toLocaleTimeString()}</span>

{/* Detail panel — full date+time */}
<span>{new Date(selectedReport.created_at).toLocaleString()}</span>
```

- Sidebar shows time only (no explicit locale — browser default).
- Detail panel shows full date+time (no explicit locale — browser default).
- Inconsistency: sidebar omits locale arg, CommandCenter live clock forces `'en-US'`.

### `OfficerDashboard.jsx` — Time-of-day greeting

```js
const hour = new Date().getHours();
const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
```

- Computed once on render, not reactive. Greeting does not change during a session.
- Threshold: `< 12` morning, `12–16` afternoon, `≥ 17` evening.

### `OfficerDashboard.jsx` — Date display in header

```jsx
{new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric'
})}
```

- Explicit `'en-US'`. Output: `"Saturday, Mar 28"`.
- No year in output — will be ambiguous at year boundary.

---

## 7. Locale Consistency Summary

| Location | Locale arg | Format example |
|---|---|---|
| `CommandCenter.jsx` clock | `'en-US'` | `"02:35:44 PM"` |
| `AdminAnalytics.jsx` month labels | `'en'` | `"Jan 24"` |
| `AdminAnalytics.jsx` lastUpdate | none (browser) | varies |
| `LiveDashboard.jsx` lastUpdate | none (browser) | varies |
| `LiveDashboard.jsx` timestamps | `'en-US'` | `"02:35 PM"` |
| `CommandCenter.jsx` report sidebar | none (browser) | varies |
| `CommandCenter.jsx` report detail | none (browser) | varies |
| `OfficerDashboard.jsx` header date | `'en-US'` | `"Saturday, Mar 28"` |
| `DisasterAlertSMS.jsx` formatTime | `'en-US'` | `"02:35:44 PM"` |
| `DisasterAlertSMS.jsx` formatDate | `'en-US'` | `"Mar 28, 2026"` |
| `PermitReview.jsx` created_at | none (browser) | varies |
| `PermitReview.jsx` date_of_birth | none (browser) | varies |

- Pages with no explicit locale (`CommandCenter` report timestamps, `LiveDashboard` last-update, `PermitReview`) will render differently across browser locale settings.
- `AdminAnalytics.jsx` uses `'en'` (generic English) for month labels while other pages use `'en-US'` — subtle inconsistency with no practical impact in a Nepal-deployed system.

---

## 8. Known Issues

| Issue | Location | Detail |
|---|---|---|
| No date range filtering | All pages | No UI exists to filter data by date range. All charts and lists show the full dataset window returned by the API. |
| No `min`/`max` on date_of_birth | `DronePermitForm.jsx` | Future dates accepted as valid birth dates. |
| Countdown/interval mismatch in LiveDashboard | `LiveDashboard.jsx` | UI label says "Refresh interval: 5 minutes" but data actually refreshes every 30s after mount. |
| Manual refresh does not reset auto-refresh timer | `AdminAnalytics.jsx` | The 60s `setInterval` continues on its original schedule after a manual refresh — a manual refresh at T+55s means auto-refresh fires again at T+60s, 5s later. |
| Greeting never updates during session | `OfficerDashboard.jsx` | Computed once at render time; a user who logs in at 11:58 AM will see "Good Morning" all session. |
| `'en'` vs `'en-US'` locale inconsistency | `AdminAnalytics.jsx` | Month labels use `'en'` while all other explicit locales use `'en-US'`. |
| `toLocaleTimeString()` without locale on `lastUpdate` | `LiveDashboard.jsx` | Output varies by browser locale; contrast with `CommandCenter.jsx` which forces `'en-US'`. |
| Year missing from OfficerDashboard header date | `OfficerDashboard.jsx` | `{ weekday:'long', month:'short', day:'numeric' }` omits `year`. |
| Two identical days-since calculations | `PermitReview.jsx` | The overdue banner filter and the per-row display both compute `daysDiff` independently — same logic duplicated. |
