# Timeline Analysis — Line Chart Documentation

## Overview

Six line charts exist across the codebase. They span four pages and cover three distinct domains: incident/disaster timelines, user growth over time, sentiment trend waves, and video detection timelines. All use ECharts (`ReactECharts` from `echarts-for-react`).

| Chart | Function | Page | Series Count | Area Fill | Stack |
|---|---|---|---|---|---|
| 24h Incident Timeline | `getTimelineOption()` | `AdminAnalytics` | 1 | Yes | No |
| Cumulative User Growth | `getUserGrowthOption()` | `AdminAnalytics` | 3 | Yes (`lineStyle:{width:0}`) | Yes (`'T'`) |
| NLP Disaster Stream | `getStreamOption()` | `AdminAnalytics` | Dynamic (per type) | Yes (`lineStyle:{width:0}`) | Yes (`'T'`) |
| Disaster Type Stream | `getModernStreamOption()` | `LiveDashboard` | Dynamic (per type) | Yes | Yes (`'Total'`) |
| Sentiment Wave | `getRealSentimentWaveOption()` | `LiveDashboard` | 2 (scatter + line) | Yes (trend only) | No |
| Detection Timeline | `getDetectionTimelineChart()` | `VideoAnalysis` | Dynamic (per class) | No | No |
| Segmentation Area | `getSegmentationAreaChart()` | `VideoAnalysis` | Dynamic (per class) | Yes | Yes (`'Total'`) |

---

## Part 1: Data Sources

### `AdminAnalytics.jsx`

All data fetched via `Promise.allSettled` over 12 endpoints; refreshes every 60 seconds.

| State Variable | Endpoint | Used By |
|---|---|---|
| `timeline` | `GET /disasters/dashboard/timeline?hours=24` | `getTimelineOption()` |
| `users` | `GET /users/all?skip=0&limit=500` | `getUserGrowthOption()` |
| `recentDisasters` | `GET /disasters/dashboard/recent-disasters?limit=100` | `getStreamOption()` |

### `LiveDashboard.jsx`

| State Variable | Endpoint | Used By | Refresh |
|---|---|---|---|
| `recentDisasters` | `GET /disasters/dashboard/recent-disasters?limit=100` | `getModernStreamOption()`, `getRealSentimentWaveOption()` | Every 30s |

### `VideoAnalysis.jsx`

| State Variable | Source | Used By |
|---|---|---|
| `analysisData.frame_timeline` | POST `/video/analyze` response body | `getDetectionTimelineChart()`, `getSegmentationAreaChart()` |

`frame_timeline` is an array of per-frame objects, each with `detections: { className: count }` and `segmentation: { className: percentage }`.

---

## Part 2: `AdminAnalytics.jsx` — 24h Incident Timeline — `getTimelineOption()`

File: [frontend/src/pages/AdminAnalytics.jsx](../frontend/src/pages/AdminAnalytics.jsx)

### Data Transformation

```js
const hours = timeline.map(t => {
  const d = new Date(t.timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
});
const counts = timeline.map(t => t.count);
```

`timeline` is an array of `{ timestamp, count }` from the API — one entry per hour of the last 24h. Timestamps are converted to `"HH:00"` labels. No gap-filling: if the API skips an hour, that label and count pair are simply absent from the arrays.

### Full Configuration

```js
const getTimelineOption = () => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    textStyle: { color: '#1f2937' },
    axisPointer: {
      type: 'line',
      lineStyle: { color: '#0ea5e9', width: 2 },
    },
  },
  grid: { left: '3%', right: '4%', bottom: '8%', top: '8%', containLabel: true },
  xAxis: {
    type: 'category',
    data: hours,
    boundaryGap: false,                      // line starts/ends at axis edges
    axisLabel: { fontSize: 10, color: '#6b7280', interval: 2 },
    axisLine: { lineStyle: { color: '#e5e7eb' } },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    axisLabel: { fontSize: 10, color: '#9ca3af' },
    splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
    axisLine: { show: false },
  },
  series: [{
    type: 'line',
    data: counts,
    smooth: 0.4,
    showSymbol: false,
    lineStyle: {
      width: 3,
      color: lg(0, 0, 1, 0, [              // horizontal gradient blue→sky
        { offset: 0, color: '#38bdf8' },
        { offset: 1, color: '#0ea5e9' },
      ]),
    },
    areaStyle: {
      color: lg(0, 0, 0, 1, [              // vertical fade sky→transparent
        { offset: 0, color: 'rgba(14,165,233,0.35)' },
        { offset: 1, color: 'rgba(14,165,233,0.02)' },
      ]),
    },
    markPoint: {
      data: [{ type: 'max', name: 'Peak' }],
      symbol: 'pin',
      symbolSize: 40,
      itemStyle: { color: '#ef4444' },
      label: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
    },
  }],
});
```

### Render Call

```jsx
<ReactECharts
  option={getTimelineOption()}
  style={{ height: '380px' }}
  opts={{ renderer: 'svg' }}
/>
```

### Key Details

| Property | Value | Notes |
|---|---|---|
| Single series | 1 — total incident count | No per-type breakdown |
| Smoothing | `0.4` | Partial smooth; not fully curved |
| `boundaryGap: false` | Yes | Line hugs both x-axis ends |
| `showSymbol: false` | Yes | No dot markers on data points |
| Line gradient | Horizontal `'#38bdf8'` → `'#0ea5e9'` | Left lighter sky, right deeper sky-500 |
| Area gradient | Vertical `rgba(14,165,233,0.35)` → `rgba(14,165,233,0.02)` | Near-transparent fade at bottom |
| `markPoint` | `type: 'max'` — automatic peak detection | Red pin marker at the highest count; ECharts finds max automatically |
| Tooltip axis pointer | `type: 'line'` | Vertical line crosshair in sky-500 |
| Renderer | SVG | `opts={{ renderer: 'svg' }}` |
| Height | 380px | |
| Labelled as | "24-Hour Incident Timeline" in Overview tab | |

---

## Part 3: `AdminAnalytics.jsx` — User Growth — `getUserGrowthOption()`

File: [frontend/src/pages/AdminAnalytics.jsx](../frontend/src/pages/AdminAnalytics.jsx)

### Data Transformation

```js
// Group users by YYYY-MM month from created_at
const mMap = {};
users.forEach(u => {
  if (!u.created_at) return;
  const d = new Date(u.created_at);
  const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (!mMap[k]) mMap[k] = { citizen: 0, officer: 0, admin: 0 };
  mMap[k][u.role]++;
});

// Sort months chronologically
const months = Object.keys(mMap).sort();  // lexicographic sort works for YYYY-MM

// Format labels: "Jan '24", "Feb '24", etc.
const labels = months.map(m => {
  const [y, mo] = m.split('-');
  return new Date(y, mo - 1).toLocaleString('en', { month: 'short', year: '2-digit' });
});

// Cumulative running totals
let cc = 0, co = 0, ca = 0;
const cum = months.map(m => {
  cc += mMap[m].citizen; co += mMap[m].officer; ca += mMap[m].admin;
  return { c: cc, o: co, a: ca };
});
```

**Important:** This builds cumulative counts from the `users` array fetched client-side (`GET /users/all?skip=0&limit=500`). The `limit=500` cap means the chart silently undercounts if more than 500 users exist. Months with no registrations are **not** present in `mMap` — there are gaps in the x-axis for quiet months.

### Series Factory

```js
const mkSeries = (name, data, c1, c2) => ({
  name,
  type: 'line',
  stack: 'T',
  smooth: 0.5,
  showSymbol: false,
  data,
  lineStyle: { width: 0 },             // line hidden — area only
  areaStyle: {
    opacity: 0.85,
    color: lg(0, 0, 0, 1, [
      { offset: 0, color: c1 },
      { offset: 1, color: c2 },
    ]),
  },
  emphasis: { focus: 'series' },
});
```

`lineStyle: { width: 0 }` hides the line stroke completely — the chart renders as stacked filled areas with no visible lines. This makes it look like a stacked area chart rather than a line chart, despite using `type: 'line'`.

### Three Series

```js
series: [
  mkSeries('Citizens', cum.map(d => d.c), '#38bdf8', '#38bdf820'),
  mkSeries('Officers', cum.map(d => d.o), '#34d399', '#34d39920'),
  mkSeries('Admins',   cum.map(d => d.a), '#f87171', '#f8717120'),
]
```

`'20'` as hex alpha = 12.5% opacity at the bottom — each area fades to nearly transparent.

### Render Call

```jsx
<ReactECharts
  option={getUserGrowthOption()}
  style={{ height: '340px' }}
  opts={{ renderer: 'svg' }}
/>
```

### Key Details

| Property | Value | Notes |
|---|---|---|
| Stack key | `'T'` | All three series stacked — Citizens is bottom layer |
| `lineStyle.width` | `0` | Lines invisible — pure area chart appearance |
| Y-axis | Cumulative count | Running total, not per-month count |
| X-axis labels | `toLocaleString('en', {month:'short', year:'2-digit'})` | e.g. `"Jan 24"` |
| Data cap | 500 users | API `limit=500`; silently incomplete above that |
| Tooltip axis pointer | `type: 'cross'` with `label.backgroundColor: '#0ea5e9'` | Crosshair labels highlighted sky-500 |
| Legend | Bottom, `icon: 'roundRect'` | Toggleable per series |
| Renderer | SVG | |
| Height | 340px | |
| Labelled as | "Platform Growth" in Users & Permits tab | |

---

## Part 4: `AdminAnalytics.jsx` — NLP Disaster Stream — `getStreamOption()`

File: [frontend/src/pages/AdminAnalytics.jsx](../frontend/src/pages/AdminAnalytics.jsx)

### Data Transformation

```js
const series = {};
recentDisasters.forEach(d => {
  const h = new Date(d.timestamp).getHours();
  const t = d.disaster_type;
  if (!series[t]) series[t] = new Array(24).fill(0); // zero-filled 24-slot array
  series[t][h]++;
});
const hours = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, '0')}:00`
);
```

Groups up to 100 recent disasters by `disaster_type` × hour of day. Index `0` = midnight, `23` = 11pm. Each type gets an exactly-24-element array regardless of whether that type appeared in that hour. **The x-axis is always all 24 hours, not just hours with data.**

### Per-Series Configuration

```js
series: Object.keys(series).map(type => ({
  name: type.charAt(0).toUpperCase() + type.slice(1),
  type: 'line',
  stack: 'T',
  smooth: 0.4,
  emphasis: { focus: 'series' },
  areaStyle: {
    opacity: 0.75,
    color: lg(0, 0, 0, 1, [
      { offset: 0, color: (TYPE_COLORS[type] || '#6b7280') + 'cc' },  // 80% opacity
      { offset: 1, color: (TYPE_COLORS[type] || '#6b7280') + '22' },  // 13% opacity
    ]),
  },
  lineStyle: { width: 0 },              // line invisible — area only
  showSymbol: false,
  data: series[type],
  color: TYPE_COLORS[type] || '#6b7280',
}))
```

### Render Call

```jsx
<ReactECharts
  option={getStreamOption()}
  style={{ height: '350px' }}
  opts={{ renderer: 'svg' }}
/>
```

### Key Details

| Property | Value | Notes |
|---|---|---|
| Series count | Dynamic — one per unique `disaster_type` in `recentDisasters` | Empty if `recentDisasters` is empty |
| Stack key | `'T'` | Stacked areas; total height = all types combined |
| X-axis | Always 24 hours `'00:00'`–`'23:00'` | Fixed range regardless of data density |
| `lineStyle.width` | `0` | Pure area appearance — same as `getUserGrowthOption` |
| Colour fallback | `TYPE_COLORS[type] || '#6b7280'` | 6-type map; unknown types grey |
| Area opacity | `0.75` base opacity + gradient fade | Top `'cc'` (80%) to bottom `'22'` (13%) |
| Label interval | `interval: 2` on x-axis | Shows every 3rd hour label (0, 3, 6…) |
| Tooltip axis pointer | `type: 'cross'` with `label.backgroundColor: '#0ea5e9'` | |
| Legend | Bottom, `icon: 'roundRect'`, `fontSize: 10` | Toggleable per type |
| Renderer | SVG | |
| Height | 350px | |
| Labelled as | "NLP Disaster Stream" in Advanced tab | |

---

## Part 5: `LiveDashboard.jsx` — Disaster Type Stream — `getModernStreamOption()`

File: [frontend/src/pages/LiveDashboard.jsx](../frontend/src/pages/LiveDashboard.jsx)

This is the `LiveDashboard` counterpart to `AdminAnalytics`'s `getStreamOption()`. Both transform `recentDisasters` into a 24-hour stacked area stream by type, but differ in several details.

### Data Transformation

```js
const disasterTimeSeries = {};
recentDisasters.forEach(disaster => {
  const hour = new Date(disaster.timestamp).getHours();
  const type = disaster.disaster_type;
  if (!disasterTimeSeries[type]) {
    disasterTimeSeries[type] = new Array(24).fill(0);
  }
  disasterTimeSeries[type][hour]++;
});
const hours = Array.from({ length: 24 }, (_, i) =>
  `${i.toString().padStart(2, '0')}:00`
);
```

Identical logic to `AdminAnalytics`'s `getStreamOption`. Same 24-slot zero-fill per type.

### Per-Series Configuration

```js
const series = Object.keys(disasterTimeSeries).map(type => ({
  name: type.charAt(0).toUpperCase() + type.slice(1),
  type: 'line',
  stack: 'Total',                       // Note: 'Total' not 'T' — different string
  smooth: 0.4,
  emphasis: { focus: 'series' },
  areaStyle: {
    opacity: 0.8,
    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: DISASTER_COLORS[type] + 'dd' },  // 87% opacity
      { offset: 1, color: DISASTER_COLORS[type] + '33' },  // 20% opacity
    ]),
  },
  lineStyle: { width: 0 },
  showSymbol: false,
  data: disasterTimeSeries[type],
  color: DISASTER_COLORS[type],         // no fallback — undefined if type missing
}));
```

### Render Call

```jsx
<ReactECharts
  option={getModernStreamOption()}
  style={{ height: '280px' }}
  opts={{ renderer: 'svg' }}
/>
```

### Differences vs `AdminAnalytics` `getStreamOption()`

| Property | `AdminAnalytics` `getStreamOption` | `LiveDashboard` `getModernStreamOption` |
|---|---|---|
| Stack key | `'T'` | `'Total'` |
| Gradient method | `lg()` plain object | `new echarts.graphic.LinearGradient` |
| Colour map | `TYPE_COLORS` (6 types, `|| '#6b7280'` fallback) | `DISASTER_COLORS` (13 types, no fallback) |
| Area opacity | `0.75` | `0.8` |
| Gradient upper alpha | `'cc'` (80%) | `'dd'` (87%) |
| Gradient lower alpha | `'22'` (13%) | `'33'` (20%) |
| Legend font size | `10` | `11` |
| Legend position | `bottom: 0` | `bottom: 5` |
| Tooltip axis pointer | `cross` with `label.backgroundColor: '#0ea5e9'` | `cross` with `label.backgroundColor: '#6366f1'` |
| X-axis label interval | `2` | `2` |
| X-axis `axisLine.width` | default | `2` |
| Height | 350px | 280px |
| Renderer | SVG | SVG |
| Data refresh | Every 60s | Every 30s |

---

## Part 6: `LiveDashboard.jsx` — Sentiment Wave — `getRealSentimentWaveOption()`

File: [frontend/src/pages/LiveDashboard.jsx](../frontend/src/pages/LiveDashboard.jsx)

### Data Transformation

```js
// Take last 50 disasters sorted by timestamp ascending
const sentimentTimeline = recentDisasters
  .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  .slice(-50)
  .map((disaster, index) => ({
    x: index,
    y: disaster.sentiment || 0,
    time: new Date(disaster.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    }),
    type: disaster.disaster_type,
  }));
```

**Important:** `.sort()` mutates `recentDisasters` in place — the original array order is permanently changed in component state every time this function is called. ECharts re-renders on any option change, so `recentDisasters` may be re-sorted multiple times during a session.

### Moving Average

```js
const movingAverage = (data, windowSize = 5) => {
  return data.map((item, index) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(data.length, index + Math.ceil(windowSize / 2));
    const window = data.slice(start, end);
    const avg = window.reduce((sum, d) => sum + d.y, 0) / window.length;
    return { ...item, smoothed: avg };
  });
};
const smoothedData = movingAverage(sentimentTimeline);
```

5-point centred moving average. Boundary behaviour: first and last entries use a smaller window (the available points). `smoothed` value replaces raw sentiment for the trend line.

### Three Chart Layers

This chart is a **mixed-type chart** with three series:

**Layer 1 — Scatter (raw sentiment points):**
```js
{
  name: 'Raw Sentiment',
  type: 'scatter',
  data: sentimentTimeline.map(d => d.y),
  symbolSize: 6,
  itemStyle: {
    color: (params) => {
      const val = params.value;
      if (val > 0.3) return '#10b981';   // green
      if (val > 0)   return '#84cc16';   // lime
      if (val > -0.3) return '#f59e0b';  // amber
      return '#ef4444';                  // red
    },
    opacity: 0.6,
  },
  z: 2,
}
```

**Layer 2 — Line (smoothed trend):**
```js
{
  name: 'Trend',
  type: 'line',
  data: smoothedData.map(d => d.smoothed),
  smooth: true,
  symbol: 'none',
  lineStyle: {
    width: 4,
    color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
      { offset: 0,   color: '#3b82f6' },  // blue
      { offset: 0.5, color: '#8b5cf6' },  // violet
      { offset: 1,   color: '#ec4899' },  // pink
    ]),
  },
  areaStyle: {
    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
      { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
    ]),
  },
  z: 1,
}
```

Three-stop horizontal gradient (blue → violet → pink) on the trend line itself — the most visually complex line style in the codebase.

**Layer 3 — Neutral zero baseline (`markLine`):**
```js
{
  type: 'line',
  markLine: {
    silent: true,
    symbol: 'none',
    lineStyle: { color: '#ef4444', type: 'solid', width: 2 },
    data: [{ yAxis: 0 }],
    label: {
      show: true,
      position: 'end',
      formatter: 'Neutral Line',
      fontSize: 10,
      color: '#ef4444',
    },
  },
}
```

This is a ghost series with no data — exists solely to carry the `markLine` at `yAxis: 0`. The red horizontal baseline separates positive from negative sentiment.

### Y-Axis Emoji Labels

```js
axisLabel: {
  formatter: (val) => {
    if (val === 0)   return '😐 Neutral';
    if (val > 0)     return `😊 +${val.toFixed(1)}`;
    return `😰 ${val.toFixed(1)}`;
  },
},
```

Y-axis tick labels use emoji. Range: `min: -1, max: 1, interval: 0.5` — five labels: `-1.0`, `-0.5`, `0`, `+0.5`, `+1.0`.

### Custom Tooltip

```js
formatter: (params) => {
  const data = sentimentTimeline[params[0].dataIndex];
  const sentiment = data.y;
  const emoji = sentiment > 0.3 ? '😊' : sentiment > 0 ? '😐' : sentiment > -0.3 ? '😟' : '😰';
  return `<div>
    ${emoji} Sentiment Analysis
    Time: ${data.time}
    Type: ${data.type}
    Score: ${sentiment.toFixed(3)} (coloured green/red)
    ${sentiment > 0 ? '✅ Positive' : '⚠️ Negative'}
  </div>`;
}
```

### Render Call

```jsx
<ReactECharts
  option={getRealSentimentWaveOption()}
  style={{ height: '380px' }}
  opts={{ renderer: 'svg' }}
/>
```

### Key Details

| Property | Value | Notes |
|---|---|---|
| Data window | Last 50 disasters by timestamp | Sliced after ascending sort |
| `.sort()` side effect | Mutates `recentDisasters` in place | Potential ordering bug — other components reading `recentDisasters` after this render will see sorted order |
| Moving average window | 5-point centred | Boundary uses smaller window, not padding |
| Trend line gradient | 3-stop horizontal blue→violet→pink | Only 3-stop gradient in the codebase |
| Scatter colours | 4 thresholds — 0.3, 0, -0.3 | Green / lime / amber / red |
| Zero line | Red `markLine` at `yAxis: 0` | Carried by ghost series with no data |
| Y-axis range | `-1` to `1` with `interval: 0.5` | Sentiment from NLP pipeline |
| Renderer | SVG | `opts={{ renderer: 'svg' }}` |
| Height | 380px | |

---

## Part 7: `VideoAnalysis.jsx` — Detection Timeline — `getDetectionTimelineChart()`

File: [frontend/src/pages/VideoAnalysis.jsx](../frontend/src/pages/VideoAnalysis.jsx)

### Data Shape

`analysisData.frame_timeline` — array of frame objects:
```json
[
  { "detections": { "fire": 3, "person": 1 }, "segmentation": { "fire": 0.12 } },
  { "detections": { "fire": 5, "person": 2 }, "segmentation": { "fire": 0.18 } },
  ...
]
```

### Data Transformation

```js
const frames = analysisData.frame_timeline;
const detectionTypes = new Set();
frames.forEach(frame => {
  Object.keys(frame.detections).forEach(type => detectionTypes.add(type));
});

const series = Array.from(detectionTypes).map(type => ({
  name: type.charAt(0).toUpperCase() + type.slice(1),
  type: 'line',
  data: frames.map(frame => frame.detections[type] || 0),
  smooth: true,
  lineStyle: { width: 2 },
  itemStyle: { color: DISASTER_COLORS[type] || '#6b7280' },
}));
```

One series per detection class found across all frames. Missing values padded with `0`.

### X-Axis Label

```js
xAxis: {
  data: frames.map((_, i) => `Frame ${i * 10}`),
  axisLabel: { fontSize: 10, interval: Math.floor(frames.length / 10) },
}
```

Each sample represents every 10th frame. Labels: `Frame 0`, `Frame 10`, `Frame 20`…
`interval: Math.floor(frames.length / 10)` shows approximately 10 labels regardless of total frame count.

### Key Details

| Property | Value | Notes |
|---|---|---|
| Area fill | None | No `areaStyle` — pure line chart |
| Stack | None | Individual lines, not stacked |
| Symbol | Default (small circle) | `showSymbol` not set — dots visible |
| Smooth | `true` | Fully smooth Bezier curves |
| Y-axis label | `'Count'` (named axis) | Integer detection count per frame |
| X-axis | `Frame N` labels, sampled every 10 frames | No time conversion — frame number only |
| Guard clause | Returns `{}` if `analysisData` or `.frame_timeline` falsy | ECharts renders empty chart on `{}` |
| Renderer | SVG | |
| Height | 350px | |

---

## Part 8: `VideoAnalysis.jsx` — Segmentation Area — `getSegmentationAreaChart()`

File: [frontend/src/pages/VideoAnalysis.jsx](../frontend/src/pages/VideoAnalysis.jsx)

### Data Transformation

```js
const segTypes = new Set();
frames.forEach(frame => {
  Object.keys(frame.segmentation).forEach(type => segTypes.add(type));
});

const series = Array.from(segTypes).map(type => ({
  name: type.charAt(0).toUpperCase() + type.slice(1),
  type: 'line',
  stack: 'Total',
  data: frames.map(frame => frame.segmentation[type] || 0),
  areaStyle: { opacity: 0.7 },
  smooth: true,
  itemStyle: { color: DISASTER_COLORS[type] || '#6b7280' },
}));
```

Values are percentages of frame area covered by each segmentation class.

### X-Axis — Hardcoded 15fps Assumption

```js
xAxis: {
  data: frames.map((_, i) => `${(i * 10 / 15).toFixed(1)}s`),
}
```

Each frame sample is the 10th frame. At 15fps, 10 frames = 0.667s. Labels: `0.0s`, `0.7s`, `1.3s`…
**If the uploaded video is not 15fps, all timestamps will be wrong.** No frame rate is read from the API response or video metadata.

### Key Details

| Property | Value | Notes |
|---|---|---|
| Stack key | `'Total'` | All segmentation types stacked to 100% area |
| Area fill | `opacity: 0.7` | Simple opacity, no gradient |
| Y-axis formatter | `'{value}%'` | Labels show percentage sign |
| Y-axis label | `'Area %'` (named axis) | |
| X-axis | `N.Ns` timestamps at 15fps assumed | Incorrect for non-15fps video |
| `axisPointer` | `type: 'cross'` | Tooltip shows crosshair |
| Renderer | SVG | |
| Height | 350px | |

---

## Part 9: Cross-Chart Patterns

### `lineStyle: { width: 0 }` — Hidden Line Pattern

Three stacked area charts hide their line strokes:

| Chart | Result |
|---|---|
| `getUserGrowthOption()` | Pure stacked coloured areas — looks like area chart, not line chart |
| `getStreamOption()` | Same — NLP disaster activity appears as coloured area bands |
| `getModernStreamOption()` | Same |

The chart type is still `'line'` — using `width: 0` is the ECharts idiom for a stacked area chart without visible lines.

### Stack Key Inconsistency

| Chart | Stack Key |
|---|---|
| `getUserGrowthOption` | `'T'` |
| `getStreamOption` | `'T'` |
| `getModernStreamOption` | `'Total'` |
| `getSegmentationAreaChart` | `'Total'` |

Stack key is an arbitrary string identifier — series with the same key stack on top of each other. `'T'` and `'Total'` are different keys — they cannot be mixed across series to produce a shared stack.

### `boundaryGap: false`

All timeline line charts set `boundaryGap: false` on the x-axis. This causes the first and last data points to be drawn exactly at the left and right edges of the plot area, rather than with padding. Stacked area charts benefit from this — the filled area extends to the edges.

### Tooltip Axis Pointer Colours

| Chart | Axis Pointer Type | Label Background |
|---|---|---|
| `getTimelineOption` | `line` | N/A (no cross-label) |
| `getUserGrowthOption` | `cross` | `#0ea5e9` |
| `getStreamOption` | `cross` | `#0ea5e9` |
| `getModernStreamOption` | `cross` | `#6366f1` |

---

## Related Documentation

- [chart_configuration.md](chart_configuration.md) — All ECharts configuration patterns including gradient helpers
- [disaster_type_distribution.md](disaster_type_distribution.md) — Pie/rose charts that share the same `recentDisasters` and `disasterTypes` state
- [api_calls_implementation.md](api_calls_implementation.md) — `/disasters/dashboard/timeline` and `/disasters/dashboard/recent-disasters` endpoint fetch details
