# Location Heatmap Documentation

## Overview

One heatmap chart exists in the codebase: `getHeatmapOption()` in `AdminAnalytics.jsx`. It is a **dual side-by-side heatmap** rendered in a single ECharts instance. Both heatmaps share the same axes (hour of day × day of week) but display different activity datasets — user registrations on the left, disaster reports and NLP detections on the right.

The chart answers the question: *At what time of week does platform activity peak?*

File: [frontend/src/pages/AdminAnalytics.jsx](../frontend/src/pages/AdminAnalytics.jsx)

---

## Part 1: Data Sources

Three state variables feed the heatmap. All are fetched as part of the 12-endpoint `Promise.allSettled` batch and refresh every 60 seconds.

| State Variable | Endpoint | Page Limit | Feeds |
|---|---|---|---|
| `users` | `GET /users/all?skip=0&limit=500` | 500 users | Left heatmap (Registrations) |
| `reports` | `GET /disaster-reports/reports?page=1&page_size=100` | 100 reports | Right heatmap (Reports & NLP) |
| `recentDisasters` | `GET /disasters/dashboard/recent-disasters?limit=100` | 100 disasters | Right heatmap (Reports & NLP) |

**Caps:** `users` is capped at 500, `reports` at 100, `recentDisasters` at 100. The heatmap silently undercounts if any source exceeds its cap. The right heatmap merges citizen-filed reports (`reports`) with NLP-sourced disaster detections (`recentDisasters`) into a single combined dataset — these two sources are not distinguished within the right heatmap.

---

## Part 2: Data Transformation

### Axes

```js
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
```

X-axis: 24 hour slots `'00:00'` through `'23:00'`.
Y-axis: 7 day slots `'Sun'` through `'Sat'` — JavaScript `Date.getDay()` order (0=Sunday).

### Aggregation Key

Each event is bucketed by a `"hour-day"` composite string key:

```js
const key = `${d.getHours()}-${d.getDay()}`;
// e.g. "14-2" = Tuesday at 14:00
```

This collapses all events at the same hour of the same weekday into one cell, regardless of which week or month they occurred. A registration on Monday at 09:00 in January and another on Monday at 09:00 in August both increment the same `"9-1"` cell.

### Left Heatmap — Registrations

```js
const regAgg = {};     // key → cumulative count
const regDetails = {}; // key → { "Jan 2024": count, ... }

users.forEach(u => {
  if (!u.created_at) return;
  const d = new Date(u.created_at);
  const key = `${d.getHours()}-${d.getDay()}`;
  regAgg[key] = (regAgg[key] || 0) + 1;
  if (!regDetails[key]) regDetails[key] = {};
  const mk = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  regDetails[key][mk] = (regDetails[key][mk] || 0) + 1;
});
```

`regDetails[key]` stores a breakdown by `"Mon YYYY"` label for the tooltip's month-level drill-down. This is the only tooltip in the codebase that shows sub-cell breakdown data.

### Right Heatmap — Reports & NLP

```js
const rptAgg = {};
const rptDetails = {};

// Source 1: citizen-filed reports (up to 100)
reports.forEach(r => {
  const ts = r.created_at || r.timestamp;   // two possible timestamp fields
  if (!ts) return;
  const d = new Date(ts);
  const key = `${d.getHours()}-${d.getDay()}`;
  rptAgg[key] = (rptAgg[key] || 0) + 1;
  // ... month detail
});

// Source 2: NLP-sourced disasters (up to 100)
recentDisasters.forEach(rd => {
  if (!rd.timestamp) return;
  const d = new Date(rd.timestamp);
  const key = `${d.getHours()}-${d.getDay()}`;
  rptAgg[key] = (rptAgg[key] || 0) + 1;
  // ... month detail
});
```

Reports use `r.created_at || r.timestamp` — two fields are tried because the `/disaster-reports/reports` response may use either field name depending on the backend serializer version. NLP disasters use `rd.timestamp` only.

### Series Data Format

ECharts heatmap expects `[xIndex, yIndex, value]`:

```js
const regData = Object.entries(regAgg).map(([k, v]) => {
  const [h, d] = k.split('-').map(Number);
  return [h, d, v];   // [hourIndex, dayIndex, count]
});
const rptData = Object.entries(rptAgg).map(([k, v]) => {
  const [h, d] = k.split('-').map(Number);
  return [h, d, v];
});
```

`h` = x-axis index (0–23 maps to `hours` array).
`d` = y-axis index (0–6 maps to `dayNames` array, 0=Sunday).

Cells with zero activity are **not included** — only slots with at least one event appear in the data arrays. Empty cells render as the lightest colour in the `visualMap` scale (white/off-white), not as a truly absent cell.

### Shared `max` Scale

```js
const allVals = [...regData.map(d => d[2]), ...rptData.map(d => d[2])];
const max = Math.max(...allVals, 1);
```

Both `visualMap` instances share the same `max` value — derived from the global maximum across both datasets combined. This makes the two heatmaps colour-comparable: a dark cell in the left heatmap represents the same count as a dark cell in the right. The `1` floor prevents `max` from being `0` on an empty dataset, which would cause ECharts to divide by zero in the colour scale.

---

## Part 3: Full Chart Configuration

```js
return {
  backgroundColor: 'transparent',

  // ── Tooltip ─────────────────────────────────────────────────
  tooltip: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    textStyle: { color: '#1f2937', fontSize: 12 },
    formatter: (p) => {
      const dayName = dayNames[p.value[1]];
      const hour = hours[p.value[0]];
      const key = `${p.value[0]}-${p.value[1]}`;
      const isReg = p.seriesIndex === 0;
      const label = isReg ? 'Registrations' : 'Reports & NLP';
      const details = isReg ? regDetails[key] : rptDetails[key];

      let monthBreakdown = '';
      if (details) {
        const entries = Object.entries(details).sort((a, b) => b[1] - a[1]);
        monthBreakdown =
          '<br/><div style="margin-top:4px;border-top:1px solid #e5e7eb;padding-top:4px;font-size:11px">' +
          entries
            .map(([m, c]) => `<span style="color:#6b7280">${m}:</span> <b>${c}</b>`)
            .join('<br/>') +
          '</div>';
      }

      return `<div style="padding:2px">
        <b>${dayName}</b> at <b>${hour}</b><br/>
        <span style="color:${isReg ? '#0ea5e9' : '#f59e0b'}">${label}</span>:
        <b>${p.value[2]}</b>
        ${monthBreakdown}
      </div>`;
    },
  },

  // ── Legend ──────────────────────────────────────────────────
  legend: {
    data: ['Registrations', 'Reports & NLP'],
    bottom: 0,
    textStyle: { fontSize: 10, fontWeight: '600' },
    itemWidth: 16,
    itemHeight: 10,
    icon: 'roundRect',
  },

  // ── Dual Grid Layout ────────────────────────────────────────
  grid: [
    { left: '10%', right: '52%', bottom: '14%', top: '5%' },   // left heatmap
    { left: '55%', right: '5%',  bottom: '14%', top: '5%' },   // right heatmap
  ],

  // ── Dual X-Axes (one per grid) ──────────────────────────────
  xAxis: [
    {
      type: 'category', data: hours, gridIndex: 0,
      splitArea: { show: true },
      axisLabel: { fontSize: 8, color: '#6b7280', interval: 3 },  // every 4th hour
      name: 'Registrations (Day x Hour)',
      nameLocation: 'center', nameGap: 25,
      nameTextStyle: { fontSize: 10, fontWeight: 'bold', color: '#0ea5e9' },
    },
    {
      type: 'category', data: hours, gridIndex: 1,
      splitArea: { show: true },
      axisLabel: { fontSize: 8, color: '#6b7280', interval: 3 },
      name: 'Reports & NLP (Day x Hour)',
      nameLocation: 'center', nameGap: 25,
      nameTextStyle: { fontSize: 10, fontWeight: 'bold', color: '#f59e0b' },
    },
  ],

  // ── Dual Y-Axes ─────────────────────────────────────────────
  yAxis: [
    {
      type: 'category', data: dayNames, gridIndex: 0,
      splitArea: { show: true },
      axisLabel: { fontSize: 10, color: '#374151', fontWeight: '600' },
    },
    {
      type: 'category', data: dayNames, gridIndex: 1,
      splitArea: { show: true },
      axisLabel: { show: false },   // right heatmap hides day labels (shared visual)
    },
  ],

  // ── Visual Maps ─────────────────────────────────────────────
  visualMap: [
    {
      min: 0, max,
      calculable: false,
      show: false,                  // no colour-bar legend rendered
      seriesIndex: 0,
      inRange: {
        color: ['#f0f9ff', '#bae6fd', '#38bdf8', '#0284c7', '#0c4a6e'],  // blue scale
      },
    },
    {
      min: 0, max,
      calculable: false,
      show: false,
      seriesIndex: 1,
      inRange: {
        color: ['#fffbeb', '#fde68a', '#fbbf24', '#f59e0b', '#d97706'],  // amber scale
      },
    },
  ],

  // ── Two Heatmap Series ───────────────────────────────────────
  series: [
    {
      name: 'Registrations',
      type: 'heatmap',
      data: regData,
      xAxisIndex: 0,
      yAxisIndex: 0,
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.2)' } },
      itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 4 },
    },
    {
      name: 'Reports & NLP',
      type: 'heatmap',
      data: rptData,
      xAxisIndex: 1,
      yAxisIndex: 1,
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.2)' } },
      itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 4 },
    },
  ],
};
```

---

## Part 4: Render Call

```jsx
<ReactECharts
  option={getHeatmapOption()}
  style={{ height: '340px' }}
  opts={{ renderer: 'svg' }}
/>
```

Located in the **Users & Permits tab** of `AdminAnalytics`, spanning the full 12-column grid row. Labelled `"Platform Activity Heatmap"` with subtitle `"Registrations vs Report submissions & NLP detections by day and hour"`.

---

## Part 5: Configuration Deep-Dive

### Dual Grid Layout

```
|←10%→|←──── left grid (42%) ────→|←3%→|←──── right grid (40%) ────→|←5%→|
```

- Left grid: `left:'10%'`, `right:'52%'` — occupies left ~42% of chart area
- Right grid: `left:'55%'`, `right:'5%'` — occupies right ~40% of chart area
- 3% gap between grids

Each heatmap has its own independent `grid`, `xAxis`, `yAxis`, and `visualMap`. The two heatmaps are completely separate coordinate systems sharing one ECharts canvas.

### `xAxisIndex` / `yAxisIndex` Binding

ECharts uses integer indexes to bind series to their coordinate system:

```
series[0] (Registrations) → xAxis[0] + yAxis[0] → grid[0]
series[1] (Reports & NLP) → xAxis[1] + yAxis[1] → grid[1]
```

The `gridIndex` on each axis must match the grid's position in the `grid` array. If these indexes are mismatched, heatmap cells render in the wrong coordinate space.

### Colour Scales

| Heatmap | Palette | Lightest (min=0) | Darkest (max) |
|---|---|---|---|
| Registrations | 5-stop blue | `#f0f9ff` (sky-50) | `#0c4a6e` (sky-950) |
| Reports & NLP | 5-stop amber | `#fffbeb` (amber-50) | `#d97706` (amber-600) |

Both `visualMap` instances use `show: false` — no colour legend bar is displayed in the chart. The user has no colour-to-count reference unless they hover a cell. `calculable: false` disables the interactive drag handle on the colour bar (moot since it's hidden anyway).

### `splitArea` — Alternating Row/Column Bands

```js
splitArea: { show: true }
```

Set on all four axes. This enables alternating light grey and white bands behind the cells, making rows and columns easier to track visually. ECharts draws these automatically when `splitArea.show` is true on a category axis.

### Cell Style

```js
itemStyle: {
  borderColor: '#fff',
  borderWidth: 2,
  borderRadius: 4,
}
```

White 2px border between cells creates a grid gap effect. `borderRadius: 4` rounds each cell's corners — makes cells look like small rounded rectangles rather than flush squares. This is a purely visual choice not affecting data.

### Tooltip — Month Breakdown

The tooltip is the most complex in the codebase. It has two layers:

**Layer 1 — Summary line:**
```
Monday at 14:00
Registrations: 7
```

**Layer 2 — Month breakdown (if details exist):**
```
─────────────────
Mar 2024: 3
Jan 2024: 2
Nov 2023: 2
```

Month entries are sorted descending by count. The breakdown is only shown if `regDetails[key]` or `rptDetails[key]` is non-null — if data was aggregated correctly, this should always be present for any non-empty cell.

`p.seriesIndex === 0` distinguishes which heatmap was hovered — 0 = Registrations (blue label), 1 = Reports & NLP (amber label).

### Y-Axis Day Order

`dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']` follows JavaScript's `Date.getDay()` convention (0=Sunday). In the rendered chart, Sunday appears at the **bottom** of the y-axis (index 0) because ECharts renders category y-axes bottom-to-top by default. No `inverse: true` is set, so the visual order from bottom to top is: Sun, Mon, Tue, Wed, Thu, Fri, Sat.

### Right Heatmap Hidden Y-Axis Labels

```js
yAxis[1]: { axisLabel: { show: false } }
```

The right heatmap's day labels are hidden. Because both heatmaps share the same y-axis categories and are positioned side by side, showing labels on both would duplicate them. The left heatmap's `'Sun'`–`'Sat'` labels serve both.

---

## Part 6: Data Properties and Limitations

| Property | Detail |
|---|---|
| Time dimension | Hour of day (0–23) × day of week (0–6) — **not** a calendar heatmap |
| Historical range | All available data within the API cap — not limited to a specific date range |
| `users` cap | 500 — registrations beyond 500 are not reflected |
| `reports` cap | 100 — only the most recent 100 citizen reports |
| `recentDisasters` cap | 100 — most recent 100 NLP-sourced disasters |
| Right heatmap source mixing | Citizen reports + NLP detections counted in same cells without distinction |
| Empty cells | Not included in data arrays — render as lightest palette colour |
| Shared `max` | Both heatmaps use identical `max` — cross-comparable colour intensity |
| `visualMap` hidden | No colour scale legend visible — count only readable via tooltip |
| Timestamp fallback | `r.created_at || r.timestamp` — two field names tried for citizen reports |
| Missing `created_at` | Users and reports without timestamp are silently skipped |
| Timezone | `new Date()` uses browser local timezone — cells may shift if users are in different timezones from the server |

---

## Part 7: Comparison with Other Activity Views

The heatmap is one of three ways activity is visualised in `AdminAnalytics`. Each answers a different time question:

| Chart | Time Dimension | Granularity | Data |
|---|---|---|---|
| `getHeatmapOption()` | Hour × day-of-week (pattern) | Per weekday-hour slot | All available within caps |
| `getTimelineOption()` | Hour of current day (sequence) | Hourly count | Last 24h from `/timeline` endpoint |
| `getUserGrowthOption()` | Month × year (trend) | Per calendar month | All users within 500 cap |

The heatmap focuses on *when during the week* activity is concentrated (recurring pattern), not *how much* activity occurred recently or how it trended over time.

---

## Related Documentation

- [chart_configuration.md](chart_configuration.md) — Full ECharts configuration patterns; dual-grid/dual-axis pattern explained
- [timeline_analysis.md](timeline_analysis.md) — `getTimelineOption()` and `getUserGrowthOption()` — time-based line charts sharing the same data sources
- [api_calls_implementation.md](api_calls_implementation.md) — `/users/all`, `/disaster-reports/reports`, and `/disasters/dashboard/recent-disasters` endpoint fetch details
