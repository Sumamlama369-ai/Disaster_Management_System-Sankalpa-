# Scraping & NLP Accuracy Documentation

## Overview

The system uses a Reddit scraping pipeline to detect and classify disaster events in near-real-time. Data flows through three stages:

1. **Scraping** — `reddit_service.py` fetches posts via PRAW
2. **NLP Processing** — `nlp_processor.py` classifies, scores, and annotates each post
3. **Storage & Display** — `background_tasks.py` schedules collection; `AdminAnalytics.jsx` visualises results

There is **no automated accuracy test** in the codebase. No ground-truth labels, no confusion matrix, no precision/recall metrics, and no test dataset. The "NLP Coverage" metric shown on the radar chart is a volume proxy, not an accuracy measurement.

---

## 1. Scraping Layer — `reddit_service.py`

### PRAW Client

```python
self.reddit = praw.Reddit(
    client_id='VHX9LpJ314x4BflYHHVBwQ',
    client_secret='gcmZtzix7fjB7f2Cv8G-hLjfVHS8MQ',
    user_agent='DisasterMonitor2025 by u/Popular-Sense8148'
)
```

- Credentials are hardcoded in source. No environment variable indirection.
- Single Reddit API account — rate-limited to 60 requests/minute by the PRAW default.

### Subreddit List

35 subreddits across 6 categories:

| Category | Subreddits |
|---|---|
| News | `news`, `worldnews`, `UpliftingNews`, `nottheonion`, `anime_titties` |
| Disasters | `naturaldisasters`, `emergencymanagement`, `catastrophicfailure`, `CatastrophicFailure`, `TropicalWeather`, `Wildfire`, `Earthquakes` |
| Climate | `climate`, `weather`, `climatechange`, `environment` (listed twice) |
| Health | `globalhealth`, `Coronavirus`, `medicine` |
| Conflict | `conflict`, `geopolitics`, `worldpolitics`, `syriancivilwar`, `UkrainianConflict` |
| Tech | `technology`, `cybersecurity`, `privacy` |
| General/Regional | `breakingnews`, `GlobalOffensive`, `europe`, `asia`, `africa`, `australia`, `canada`, `unitedkingdom` |

**Notable entries:**
- `"anime_titties"` — commented as "Actually serious world news". This is a subreddit primarily for geopolitical news, but the name is misleading and the inclusion is undocumented elsewhere.
- `"GlobalOffensive"` — a Counter-Strike subreddit, commented "Sometimes has disaster news". Likely contributes false positives.
- `"environment"` appears twice in the list (lines 46 and 49). PRAW deduplicates by subreddit object, but it will be fetched twice per cycle, doubling API calls.

### Fetch Strategy

Per subreddit, three PRAW feeds are combined:

```python
posts.extend(list(subreddit.new(limit=limit // 2)))   # 50% new
posts.extend(list(subreddit.hot(limit=limit // 4)))   # 25% hot
posts.extend(list(subreddit.top(time_filter=time_filter, limit=limit // 4)))  # 25% top
```

- `limit=30` is passed to `fetch_posts()` from `process_and_store_posts()`.
- So per subreddit: 15 new + 7 hot + 7 top = 29 posts (before deduplication).
- 3-second sleep between each subreddit (`self.subreddit_delay = 3`). With 35 subreddits this adds 105 seconds of sleep per collection cycle.

### Disaster Keyword Filter — `is_disaster_related()`

```python
def is_disaster_related(self, post):
    """Check if post is disaster-related (RELAXED FILTER)"""
    text = f"{post.title} {post.selftext}".lower()
    return any(keyword in text for keyword in disaster_keywords)
```

The comment "RELAXED FILTER" is accurate. The 70-keyword list includes very broad terms:

| Type | Broad keyword examples |
|---|---|
| Disaster core | `disaster`, `emergency`, `crisis` |
| Weather (loose) | `warning`, `alert`, `watch`, `damage` |
| Violence/Social | `war`, `conflict`, `attack`, `protest`, `riot`, `violence` |
| Economic | `crash`, `recession`, `collapse` |
| Infrastructure | `shortage`, `disruption` |

Single-word substring matches: `'watch'` matches "smartwatch review", `'crash'` matches "stock market crash" and car crash alike, `'collapse'` matches building collapse and currency collapse. No word-boundary enforcement — `'fire'` in `"fired from job"` passes.

---

## 2. NLP Processing — `nlp_processor.py`

### Libraries Used

| Library | Purpose |
|---|---|
| `spacy` (`en_core_web_sm`) | NER for location extraction, POS tagging for keyword extraction |
| `textblob` | Sentiment polarity |
| `re` | Regex for number/damage extraction |

spaCy is loaded at class instantiation. If `en_core_web_sm` is not installed, `self.nlp` is set to `None` — silently disabling location extraction and keyword extraction without raising an error.

### Pipeline Entry Point — `process_post()`

```python
def process_post(self, title: str, text: str = "") -> Dict:
    combined_text = f"{title} {text}"
    disaster_type, severity, confidence = self.classify_disaster(combined_text)
    locations = self.extract_locations(combined_text)
    location = locations[0] if locations else None
    sentiment = self.analyze_sentiment(combined_text)
    urgency = self.calculate_urgency(combined_text, severity, sentiment)
    numbers = self.extract_numbers(combined_text)
    keywords = self.extract_keywords(combined_text)
    return {
        'disaster_type': disaster_type,
        'severity_score': severity,
        'sentiment': sentiment,
        'location': location,
        'urgency_level': urgency,
        'confidence_score': confidence,
        'affected_population': numbers['affected_population'],
        'damage_estimate': numbers['damage_estimate'],
        'trending_keywords': ','.join(keywords) if keywords else None,
        'request_offer': request_offer,
    }
```

- Title and body are concatenated with a space — no separator. If the title ends mid-word, the keywords could bleed.
- Only the **first** extracted location is stored. Multiple NER locations per post are discarded.

### Step 1 — Disaster Classification — `classify_disaster()`

**12 disaster categories** with hardcoded keyword lists and base severity scores:

| Category | Keywords | Base Severity |
|---|---|---|
| earthquake | earthquake, quake, tremor, seismic | 8 |
| flood | flood, flooding, deluge, inundation | 7 |
| fire | wildfire, fire, blaze, inferno, burning | 7 |
| hurricane | hurricane, typhoon, cyclone, storm | 9 |
| tornado | tornado, twister | 8 |
| tsunami | tsunami, tidal wave | 10 |
| volcano | volcano, volcanic, eruption, lava | 9 |
| drought | drought, water shortage, arid | 6 |
| landslide | landslide, mudslide, avalanche | 7 |
| pandemic | pandemic, epidemic, outbreak, disease | 8 |
| conflict | war, conflict, attack, bombing, violence | 9 |
| explosion | explosion, blast, detonation | 8 |
| _(fallback)_ | _(no match)_ | 5, confidence 0.3 |

**Confidence formula:**

```python
count = text_lower.count(keyword)
confidence = min(count * 0.2 + 0.5, 1.0)
```

| Keyword count | Confidence |
|---|---|
| 1 occurrence | 0.70 |
| 2 occurrences | 0.90 |
| 3+ occurrences | 1.00 (capped) |
| 0 (fallback 'other') | 0.30 |

- Minimum confidence for any matched post is **0.70**. There is no "low confidence" classification for posts that barely pass.
- When multiple disaster types match, the one with the **highest confidence** wins: `max(matches, key=lambda x: x[2])`. Ties go to whichever appeared first.
- The `break` inside the inner keyword loop means only the **first matching keyword** per disaster type contributes. If a post mentions "earthquake" once and "quake" once, only the first match is counted — confidence is 0.70, not 0.90.
- `severity_score` is the **base weight** of the matched category, not computed from the text. Every earthquake post gets severity=8 regardless of magnitude or casualties.

### Step 2 — Location Extraction — `extract_locations()`

```python
for ent in doc.ents:
    if ent.label_ in ["GPE", "LOC", "FAC"]:
        locations.append(ent.text)
return list(set(locations))  # Remove duplicates
```

- Uses `en_core_web_sm` — the smallest spaCy model (12 MB). NER accuracy on news text is lower than `en_core_web_lg` (560 MB).
- `FAC` (facility) entities are included — subreddit names, stadium names, building names can end up as "locations".
- The caller (`process_post()`) takes only `locations[0]` — but `set()` ordering is non-deterministic. Which location is stored for a multi-location post is arbitrary.
- If spaCy is not loaded (`self.nlp is None`), returns `[]` — all posts stored with `location=None`.

### Step 3 — Sentiment Analysis — `analyze_sentiment()`

```python
def analyze_sentiment(self, text: str) -> float:
    blob = TextBlob(text)
    return blob.sentiment.polarity
```

- Returns a float in `[-1.0, 1.0]`. TextBlob uses a dictionary-based lexicon (pattern library), not a model.
- TextBlob has no disaster domain tuning — positive disaster terms like "relief" or "rescue" can push sentiment positive.
- Stored directly as `DisasterInsight.sentiment`.

### Step 4 — Urgency Calculation — `calculate_urgency()`

```python
urgency_score = severity + (critical_count * 3) + (high_count * 1.5)
if sentiment < -0.5:
    urgency_score += 2
```

Urgency thresholds:

| Condition | Level |
|---|---|
| `urgency_score >= 12` OR `critical_count >= 2` | `'critical'` |
| `urgency_score >= 9` OR `high_count >= 2` | `'high'` |
| `urgency_score >= 6` | `'medium'` |
| otherwise | `'low'` |

- A tsunami post (`severity=10`) exceeds `>= 9` and scores `'high'` even with no urgency keywords and neutral sentiment.
- An earthquake post (`severity=8`) with one critical word (`8 + 3 = 11`) still doesn't reach `critical` threshold — needs one more critical word or very negative sentiment.
- `critical_words = ['emergency', 'urgent', 'critical', 'immediate', 'help needed', 'sos']` — `'critical'` itself is in the list, so posts that use the word "critical" in normal contexts count toward urgency.

### Step 5 — Number Extraction — `extract_numbers()`

```python
people_patterns = [
    r'(\d+(?:,\d+)*)\s*(?:people|persons|victims|casualties|affected|injured|dead|killed)',
    r'(?:casualties|victims|deaths):\s*(\d+(?:,\d+)*)',
]
damage_patterns = [
    r'\$(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:million|billion|thousand)?',
    r'(\d+(?:,\d+)*)\s*(?:million|billion)\s*(?:dollars|USD)',
]
```

- Both lists stop at the first match — only one affected count and one damage estimate stored per post.
- The `affected_population` capture group returns the raw number string with commas (e.g., `"1,200"`). No parsing to integer.
- The `damage_patterns[0]` does not require a scale word — `$50` matches as well as `$50 million`. The stored value is just `"$50"` — ambiguous without the scale word.

### Step 6 — Keyword Extraction — `extract_keywords()`

```python
for token in doc:
    if token.pos_ in ['NOUN', 'PROPN'] and not token.is_stop and len(token.text) > 3:
        keywords.append(token.text.lower())
keyword_counts = Counter(keywords)
return [word for word, _ in keyword_counts.most_common(top_n)]
```

- Returns top 5 nouns/proper nouns by frequency.
- Depends on spaCy — returns `[]` if spaCy unavailable.

### Critical Bug — Keywords Never Stored

`process_post()` returns the key `'trending_keywords'`. But `reddit_service.py` accesses `nlp_result.get('keywords', [])` (wrong key):

```python
# nlp_processor.py returns:
'trending_keywords': ','.join(keywords) if keywords else None

# reddit_service.py accesses:
trending_keywords=', '.join(nlp_result.get('keywords', [])),
#                                              ^^^^^^^^
#                             'keywords' key does not exist in the dict
#                             .get() returns the default []
#                             ', '.join([]) = '' (empty string)
```

**Result:** `DisasterInsight.trending_keywords` is always stored as `''` (empty string). The keyword extraction in `nlp_processor.py` runs on every post but its output is never persisted.

---

## 3. Background Task Scheduler — `background_tasks.py`

```python
schedule.every(40).minutes.do(self.collect_disaster_data)
schedule.every().day.at("03:00").do(self.cleanup_old_data)
```

- Collection runs every 40 minutes (not aligned with the `3s × 35 subreddits = 105s` sleep in the scraper — the sleep alone takes 1.75 minutes of each 40-minute window).
- Runs in a daemon thread — if the main process exits the thread is killed mid-collection.
- `collection_count` alternates the `time_filter` between `'hour'` and `'day'`:
  ```python
  time_filters = ['hour', 'day']
  time_filter = time_filters[self.collection_count % len(time_filters)]
  ```
  However, `process_and_store_posts()` ignores this argument — it always calls `self.fetch_posts(time_filter='hour', limit=30)` internally. The alternation has no effect.

### Data Retention

Old data is purged at 3 AM daily:

```python
def cleanup_old_data(self, db: Session, days: int = 50):
    cutoff_date = datetime.now() - timedelta(days=days)
    db.query(DisasterInsight).filter(DisasterInsight.created_at < cutoff_date).delete()
    db.query(DisasterPost).filter(DisasterPost.created_at < cutoff_date).delete()
    db.query(DisasterStats).filter(DisasterStats.timestamp < cutoff_date).delete()
```

- 50-day rolling window.
- `DisasterPost.created_at` is the DB insertion time, not the Reddit post's original timestamp. A post from 49 days ago that was scraped yesterday would be retained until 49 days after scraping.

---

## 4. Backend API Endpoints — `disaster.py`

| Endpoint | Description | Notes |
|---|---|---|
| `GET /disasters/dashboard/stats` | Latest `DisasterStats` row | Returns most-recent stats row; no aggregation window |
| `GET /disasters/dashboard/recent-disasters` | Recent `DisasterInsight` + `DisasterPost` joined | `limit=20` default; supports `urgency` and `disaster_type` filters |
| `GET /disasters/dashboard/disaster-types` | Type distribution counts | No date filter — lifetime totals |
| `GET /disasters/dashboard/urgency-distribution` | Urgency level counts | No date filter — lifetime totals |
| `GET /disasters/dashboard/location-hotspots` | Top locations by count | `limit=10` default; excludes NULL and `'Unknown'` locations |
| `GET /disasters/dashboard/timeline` | Hourly counts | `hours=24` default; uses `date_trunc('hour', ...)` — PostgreSQL specific |
| `GET /disasters/system/status` | Background task health | Returns `background_tasks_running`, `total_posts`, `total_insights`, `latest_post_time` |
| `WS /disasters/dashboard/live` | WebSocket push | Pushes latest `DisasterStats` every 30s; bare `except: pass` silently drops broken connections |

**Notable:** The `recent-disasters` endpoint issues N+1 queries — one query for insights, then one `db.query(DisasterPost)` per insight inside the loop:

```python
insights = query.order_by(desc(DisasterPost.timestamp)).limit(limit).all()
for insight in insights:
    post = db.query(DisasterPost).filter(DisasterPost.id == insight.post_id).first()
```

With `limit=20`, this is 21 queries per request.

---

## 5. Frontend Display — `AdminAnalytics.jsx`

### Data Fetched

`nlpStats` maps to `GET /disasters/dashboard/stats` response:

```js
const [nlpStats, setNlpStats] = useState(null);
if (nlpRes.status === 'fulfilled') setNlpStats(nlpRes.value.data);
```

Fields available: `total_incidents`, `urgent_incidents`, `avg_sentiment`, `top_disaster_type`, `top_location`, `hourly_count`, `last_updated`.

`systemStatus` maps to `GET /disasters/system/status`:

```js
const [systemStatus, setSystemStatus] = useState(null);
if (sysRes.status === 'fulfilled') setSystemStatus(sysRes.value.data);
```

Fields available: `background_tasks_running`, `last_data_collection`, `total_posts`, `total_insights`, `latest_post_time`, `database_connected`.

### `SystemStatusCard` Component

Rendered in the Overview tab alongside the sentiment gauge:

```js
function SystemStatusCard({ systemStatus, nlpStats, reportStats, totalUsers }) {
  const items = [
    { label: 'Database', value: systemStatus?.database_connected ? 'Connected' : 'Unknown', ok: systemStatus?.database_connected },
    { label: 'NLP Pipeline', value: systemStatus?.background_tasks_running ? 'Running' : 'Idle', ok: systemStatus?.background_tasks_running },
    { label: 'Total Posts Analyzed', value: systemStatus?.total_posts || 0 },
    { label: 'Total NLP Insights', value: systemStatus?.total_insights || 0 },
    { label: 'Active Drones', value: reportStats?.active_drones || 0 },
    { label: 'Avg Response Time', value: reportStats?.avg_response_time_hours ? `${reportStats.avg_response_time_hours.toFixed(1)}h` : 'N/A' },
    { label: 'Platform Users', value: totalUsers },
    { label: 'Top Disaster Type', value: nlpStats?.top_disaster_type || 'N/A' },
  ];
```

- `ok: systemStatus?.database_connected` — if `systemStatus` is `null` (API failed), `ok` is `undefined`, not `false`. The green/grey indicator shows grey in both "not connected" and "API call failed" cases.
- `ok: systemStatus?.background_tasks_running` — same: `false` (scheduler stopped) and `null` (API failed) both show grey dot with text "Idle" vs "Unknown". But "Idle" is only shown when `systemStatus` is non-null and `background_tasks_running === false`. If `systemStatus` is null, the value would be `undefined?.background_tasks_running ? 'Running' : 'Idle'` = `'Idle'` (since `undefined` is falsy). So a failed API call shows "Idle" (same as a stopped scheduler) — indistinguishable.

### NLP Coverage Radar Metric

In the system health radar chart, "NLP Coverage" is computed as:

```js
const nlpPct = Math.min(100, (nlpStats?.total_incidents || recentDisasters.length) * 2);
```

- This multiplies raw incident count by 2, capped at 100. With 50 incidents, `nlpPct = 100` (full bar).
- This is a **volume metric**, not an accuracy metric. It does not measure classification correctness, recall, or precision.
- Falls back to `recentDisasters.length` (recent 20 incidents) if `nlpStats` is null — so the radar always shows some value.
- Status labels: `>= 70 → 'Strong'`, `>= 40 → 'Moderate'`, `< 40 → 'Low'`. These thresholds map to 35, 20, and <20 total incidents respectively.

### NLP Sentiment Gauge

```js
const getSentimentGaugeOption = () => {
  const sentiment = nlpStats?.avg_sentiment || 0;
  const pct = ((sentiment + 1) / 2 * 100).toFixed(0); // normalize -1..1 to 0..100
  const color = pct > 60 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444';
  return {
    // ...
    detail: {
      formatter: `${(sentiment * 100).toFixed(0)}%`,
      // ...
    },
    data: [{ value: pct, name: 'Public Sentiment' }],
  };
};
```

- `pct` (gauge fill, 0–100): correctly normalises `[-1, 1]` to `[0, 100]`. Neutral sentiment (0.0) shows gauge at 50%.
- `formatter` (the large number displayed): `(sentiment * 100).toFixed(0)%` — this multiplies the raw polarity by 100, **not** the normalised percentage. A sentiment of `0.3` displays as `"30%"` but the gauge needle is at 65%. The displayed percentage and the needle position represent different scales.
- Default when `nlpStats` is null: `sentiment = 0`, `pct = 50`, displayed as `"0%"`.

### NLP Rose Chart — `getNlpRoseOption()`

Nightingale rose of `disasterTypes` from `GET /disasters/dashboard/disaster-types`:

```js
series: [{
  type: 'pie',
  radius: ['20%', '72%'],
  roseType: 'area',
  data: disasterTypes.map(t => ({
    value: t.count,
    name: t.disaster_type?.charAt(0).toUpperCase() + t.disaster_type?.slice(1),
  }))
}]
```

- Lifetime distribution — no date window. The rose reflects all-time type frequency.
- Falls back to empty array if API fails.

### NLP Stream Chart — `getStreamOption()`

24-hour stacked area chart of `recentDisasters` by disaster type and hour:

```js
recentDisasters.forEach(d => {
  const h = new Date(d.timestamp).getHours();
  const t = d.disaster_type;
  if (!series[t]) series[t] = new Array(24).fill(0);
  series[t][h]++;
});
```

- Only the most recently fetched batch of `recentDisasters` (limit=20 from the API) is used — not all historical data. The "24h stream" is actually the hour distribution of the 20 most recent incidents.
- Uses `stack: 'T'` (not `'Total'` as in LiveDashboard — different stack key).
- Rendered in the **Advanced tab** only — chart unmounts and re-mounts on every tab switch (`AnimatePresence mode="wait"`).

---

## 6. Video Severity Scoring — `severity_calculator.py`

Separate from the NLP pipeline — applies to YOLO video analysis results.

### Detection Severity Score

```python
score += weight * math.log2(count + 1)
normalized_score = min(score / 2, 10.0)
```

Weights: `fire=2.0`, `injured_people=1.8`, `landslide=1.7`, `ambulance=1.2`, `tent=0.8`, `boat=0.6`, `person=0.4`, `forest=0.2`

- Log scale: diminishing returns per additional detection.
- Classes not in `DETECTION_WEIGHTS` use a default weight of `0.5`.
- Max denominator is assumed to be ~20. If more classes or high counts produce a raw score >20, the cap at 10.0 silently clamps the result.

### Segmentation Severity Score

```python
score += weight * (area_percent / 10)
normalized_score = min(score, 10.0)
```

Weights: `fire=2.5`, `fire_and_smoke=2.3`, `building=1.5`, `ambulance=1.0`, `road=0.8`, `boat=0.5`, `person=0.3`

- Linear scale: proportional to affected area percentage.
- `fire` 100% coverage: `2.5 × (100/10) = 25.0` → capped to 10.0. Any single class covering >40% at `fire` weight will saturate the score.

### Combined Score

```python
combined = detection_score * 0.4 + segmentation_score * 0.6
```

- Segmentation weighted more heavily (60% vs 40%).
- No justification for the 40/60 split in the codebase — hardcoded constants.

### Risk Level Thresholds

```python
if severity_score >= 7.5: return 'critical'
elif severity_score >= 5.0: return 'high'
elif severity_score >= 2.5: return 'medium'
else: return 'low'
```

These same thresholds are mirrored in `VideoAnalysis.jsx`:

```js
const getSeverityColor = (score) => {
  if (score >= 7.5) return 'text-red-600 bg-red-100';
  if (score >= 5.0) return 'text-orange-600 bg-orange-100';
  if (score >= 2.5) return 'text-yellow-600 bg-yellow-100';
  return 'text-green-600 bg-green-100';
};
```

Frontend and backend thresholds are in sync.

---

## 7. Known Issues Summary

| Issue | Location | Detail |
|---|---|---|
| Keywords never stored | `reddit_service.py` line 259 | Accesses `nlp_result.get('keywords', [])` but key is `'trending_keywords'` — always stores `''` |
| Hardcoded API credentials | `reddit_service.py` lines 21–24 | `client_id`, `client_secret` are plaintext in source |
| `"environment"` subreddit listed twice | `reddit_service.py` lines 46, 49 | Fetched twice per cycle — doubles API calls for that subreddit |
| `time_filter` alternation has no effect | `background_tasks.py` / `reddit_service.py` | `collect_disaster_data()` alternates filter but `process_and_store_posts()` ignores the argument |
| `"GlobalOffensive"` / `"anime_titties"` subreddits | `reddit_service.py` | High false-positive risk; comments acknowledge the uncertainty |
| N+1 query in `recent-disasters` | `disaster.py` | `O(limit)` DB queries per API request |
| Severity score is static per category | `nlp_processor.py` | `classify_disaster()` returns the category's base weight, not a text-derived score |
| Minimum confidence 0.70 for any match | `nlp_processor.py` | Single keyword match gives 70% confidence — no "uncertain" classification range |
| `break` skips multi-keyword counting | `nlp_processor.py` | If a post mentions "earthquake" and "quake", only first match counts; confidence stays at 0.70 |
| `set()` location non-determinism | `nlp_processor.py` | Which location is stored when multiple are extracted is arbitrary per run |
| Sentiment gauge scale mismatch | `AdminAnalytics.jsx` | Gauge fill uses normalised `[0,100]` scale; displayed number uses `polarity * 100` — different scales shown together |
| "NLP Coverage" is volume, not accuracy | `AdminAnalytics.jsx` | Radar metric measures incident count × 2, not classification correctness |
| NLP Pipeline "Idle" on API failure | `AdminAnalytics.jsx` `SystemStatusCard` | Null `systemStatus` indistinguishable from a stopped scheduler |
| `getSentimentGaugeOption()` shows `"0%"` by default | `AdminAnalytics.jsx` | `nlpStats?.avg_sentiment \|\| 0` — `null` and `0.0` treated identically |
| No accuracy test or ground truth | Entire codebase | No confusion matrix, no labelled test set, no precision/recall measurement anywhere |
