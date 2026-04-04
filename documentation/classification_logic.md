# Classification Logic Documentation

## Overview

The Disaster Management System applies classification at two distinct layers:

| Layer | Source | What Gets Classified | Where |
|---|---|---|---|
| **Reddit Intelligence** | Scraped social media text | Disaster type, severity, urgency, sentiment | `nlp_processor.py` |
| **Citizen Field Reports** | User-submitted reports | Disaster type (user-selected), severity (user-selected), status (officer-assigned) | `disaster_reports.py` schema + model |
| **Video Analysis** | Uploaded video frames | Object classes, risk level per frame | `yolo_detector.py`, `severity_calculator.py` |

These three classification systems are independent — they share vocabulary (e.g. `flood`, `earthquake`) but use entirely different classification methods and produce output stored in separate tables.

---

## 1. Reddit Post Classification (NLP-Driven)

Defined in [app/services/nlp_processor.py](../app/services/nlp_processor.py). All classification is performed automatically on each new scraped post with no human input.

### 1.1 Disaster Type Classification

**Method:** keyword matching against a fixed 12-type dictionary.

**Full taxonomy with keywords and base severity weights (1–10 scale):**

| Type | Trigger Keywords | Severity Weight |
|---|---|---|
| `earthquake` | earthquake, quake, tremor, seismic | 8 |
| `flood` | flood, flooding, deluge, inundation | 7 |
| `fire` | wildfire, fire, blaze, inferno, burning | 7 |
| `hurricane` | hurricane, typhoon, cyclone, storm | 9 |
| `tornado` | tornado, twister | 8 |
| `tsunami` | tsunami, tidal wave | **10** |
| `volcano` | volcano, volcanic, eruption, lava | 9 |
| `drought` | drought, water shortage, arid | 6 |
| `landslide` | landslide, mudslide, avalanche | 7 |
| `pandemic` | pandemic, epidemic, outbreak, disease | 8 |
| `conflict` | war, conflict, attack, bombing, violence | 9 |
| `explosion` | explosion, blast, detonation | 8 |
| `other` *(fallback)* | — | **5** |

**Classification rules:**
- Text is lowercased before matching
- Only the **first** keyword match per type is counted (no double-counting within a type)
- When multiple types match, the one with the **highest confidence score** wins
- Confidence is computed as `min(keyword_count × 0.2 + 0.5, 1.0)`
- No match → `('other', 5, 0.3)`

**Stored in:** `disaster_insight.disaster_type`, `disaster_insight.severity_score`, `disaster_insight.confidence_score`

---

### 1.2 Urgency Classification

**Method:** Multi-factor scoring combining base severity, urgency keyword hits, and sentiment polarity.

**Urgency keyword tiers:**

| Tier | Keywords | Score per match |
|---|---|---|
| Critical | emergency, urgent, critical, immediate, help needed, sos | +3 |
| High | severe, major, significant, extensive, widespread | +1.5 |

**Scoring formula:**

```
urgency_score = severity_weight
              + (critical_keyword_count × 3)
              + (high_keyword_count × 1.5)
              + (2 if sentiment < −0.5 else 0)
```

**Urgency level thresholds:**

| Condition | Level |
|---|---|
| `score ≥ 12` OR `critical_count ≥ 2` | `critical` |
| `score ≥ 9` OR `high_count ≥ 2` | `high` |
| `score ≥ 6` | `medium` |
| `score < 6` | `low` |

**Stored in:** `disaster_insight.urgency_level`

---

### 1.3 Sentiment Classification

**Method:** TextBlob pattern-based polarity scoring.

**Output range:** `−1.0` (very negative) to `+1.0` (very positive)

| Range | Interpretation |
|---|---|
| `−1.0` to `−0.5` | Strongly negative — active distress, high loss |
| `−0.5` to `0.0` | Mildly negative |
| `0.0` | Neutral |
| `0.0` to `+1.0` | Positive (rare in disaster posts) |

Sentiment does not produce a discrete label — the raw float is stored and used as an input to urgency scoring. It is also surfaced in the dashboard as an aggregate (`avg_sentiment` in `disaster_stats`).

**Stored in:** `disaster_insight.sentiment`

---

### 1.4 Request/Offer Classification

**Method:** Simple keyword presence check on the full combined text.

| Tag | Trigger Words | Priority |
|---|---|---|
| `'request'` | need, help, require, looking for | 1st (checked first) |
| `'offer'` | offering, provide, donate, support | 2nd |
| `None` | No match | — |

If both sets match, `'request'` takes precedence.

**Stored in:** `disaster_insight.request_offer`

---

### 1.5 Reddit Classification Flow Summary

```
Raw post text (title + body)
         │
         ▼
  Lowercase + concatenate
         │
         ├──► classify_disaster()
         │         ├─ Check 12 keyword groups
         │         ├─ Score confidence per match
         │         └─ Return highest-confidence type + severity + confidence
         │
         ├──► analyze_sentiment()
         │         └─ TextBlob polarity → float [-1, +1]
         │
         ├──► calculate_urgency()
         │         ├─ Scan critical/high keyword tiers
         │         ├─ urgency_score = severity + keyword_hits + sentiment_penalty
         │         └─ Map score → low/medium/high/critical
         │
         └──► request/offer check
                   └─ Keyword presence → request | offer | None
```

---

## 2. Citizen Report Classification (Human-Driven)

Defined in [app/schemas/disaster_reports.py](../app/schemas/disaster_reports.py) and [app/models/disaster_reports.py](../app/models/disaster_reports.py). Classification is provided by the citizen at submission time; status transitions are made by officers.

### 2.1 Disaster Type (Citizen-Selected)

Citizens select or enter a disaster type when submitting a report. The schema validator accepts the following standard types and normalises them to lowercase:

```python
valid_types = ['fire', 'flood', 'earthquake', 'landslide', 'storm', 'other']
```

**Validation rule:**

```python
@validator('disaster_type')
def validate_disaster_type(cls, v):
    valid_types = ['fire', 'flood', 'earthquake', 'landslide', 'storm', 'other']
    if v.lower() not in valid_types and len(v) > 3:
        return v          # Allow free-text custom types longer than 3 chars
    return v.lower()      # Normalise known types to lowercase
```

This means custom types (e.g. `"gas explosion"`, `"building collapse"`) are accepted as-is if they are longer than 3 characters. There is no exhaustive allowlist enforced at the API level beyond the `min_length=1, max_length=100` field constraint.

**Stored in:** `disaster_reports.disaster_type`

---

### 2.2 Severity (Citizen-Selected)

Citizens choose one of four severity levels. Enforced as a strict regex pattern:

```python
severity: str = Field(..., pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
```

**Severity levels:**

| Level | Meaning |
|---|---|
| `LOW` | Minor incident, no immediate danger |
| `MEDIUM` | Moderate impact, limited threat |
| `HIGH` | Serious incident, immediate response needed |
| `CRITICAL` | Life-threatening, maximum priority |

Values must be **uppercase**. Lowercase or mixed-case submissions are rejected by the validator.

**Stored in:** `disaster_reports.severity`

> Note: A `CheckConstraint` in the database model enforces the same rule at the DB layer:
> ```sql
> CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
> ```

---

### 2.3 Status Classification (Officer-Assigned)

Status transitions are made exclusively by officers and admins via `PATCH /api/v1/disaster-reports/reports/{id}`. Citizens cannot change status.

**Valid statuses:**

```python
status: Optional[str] = Field(None, pattern="^(PENDING|REVIEWING|DISPATCHED|RESCUING|RESOLVED|REJECTED)$")
```

**Status lifecycle:**

```
PENDING
   │
   ├──► REVIEWING      (officer acknowledges, starts assessment)
   │        │
   │        ├──► DISPATCHED    (team/drone sent to location)
   │        │        │
   │        │        ├──► RESCUING    (active rescue underway)
   │        │        │        │
   │        │        │        └──► RESOLVED   (incident closed)
   │        │        │
   │        │        └──► RESOLVED   (directly resolved after dispatch)
   │        │
   │        └──► REJECTED      (false alarm or duplicate)
   │
   └──► REJECTED       (rejected without review)
```

> Note: The DB model's `CheckConstraint` only lists 5 statuses — `PENDING, REVIEWING, DISPATCHED, RESOLVED, REJECTED` — while the schema pattern also allows `RESCUING`. The `RESCUING` status is schema-valid but may fail DB insertion due to this constraint mismatch.

**Every status change** creates a row in `disaster_report_status_history` with:
- Previous and new status
- Officer ID, name, and role
- Timestamp
- Change notes

When status is set to `RESOLVED`, `disaster_reports.resolved_at` is set to `datetime.utcnow()`.

**Stored in:** `disaster_reports.status`, `disaster_report_status_history`

---

### 2.4 Priority (Auto-Calculated)

`disaster_reports.priority` is an integer column with a default of `0`. It is not currently auto-calculated from severity — it defaults to 0 on all new reports and must be manually updated. Officers see reports ordered by `priority DESC, created_at DESC`.

---

### 2.5 Citizen Classification Comparison with Reddit Classification

| Dimension | Reddit (NLP) | Citizen Reports (Human) |
|---|---|---|
| Disaster type | Auto-classified from 12 NLP categories | Human-selected from 6 standard types + free text |
| Severity | Auto-scored 1–10 numeric weight | Human-selected 4-level categorical (LOW/MEDIUM/HIGH/CRITICAL) |
| Urgency | Auto-computed 4-level label | No urgency field — severity + status serve this role |
| Status | No status concept | 5-6 step lifecycle managed by officers |
| Location | NLP-extracted from text | GPS coordinates captured from device |

---

## 3. Video Frame Classification (YOLO-Driven)

Defined in [app/services/yolo_detector.py](../app/services/yolo_detector.py), [app/services/yolo_segmenter.py](../app/services/yolo_segmenter.py), and [app/utils/severity_calculator.py](../app/utils/severity_calculator.py).

### 3.1 Object Detection Classes

The custom detection model (`best_multiclass_detect.pt`) classifies each bounding box into one of 8 classes:

| Class | Disaster Signal | Severity Weight |
|---|---|---|
| `fire` | Active fire present | 2.0 |
| `injured_people` | Casualties visible | 1.8 |
| `landslide` | Landslide/mudflow area | 1.7 |
| `ambulance` | Emergency response on scene | 1.2 |
| `tent` | Relief shelters established | 0.8 |
| `boat` | Water rescue operation | 0.6 |
| `person` | General presence | 0.4 |
| `forest` | Forested area (contextual) | 0.2 |

Default confidence threshold: **0.25** (detections below this are discarded).

### 3.2 Segmentation Classes

The custom segmentation model (`best_multiclass_seg.pt`) classifies each pixel mask into one of 7 classes:

| Class | Area Signal | Severity Weight |
|---|---|---|
| `fire` | Burning area extent | 2.5 |
| `fire_and_smoke` | Fire + smoke coverage | 2.3 |
| `building` | Structure coverage | 1.5 |
| `ambulance` | Emergency vehicle coverage | 1.0 |
| `road` | Road/access path coverage | 0.8 |
| `boat` | Vessel coverage | 0.5 |
| `person` | Person coverage | 0.3 |

### 3.3 Frame Severity Scoring

**Detection score** (per frame):

```
detection_score = Σ (class_weight × log₂(count + 1))  for each detected class
detection_score = min(detection_score / 2, 10.0)
```

Logarithmic scaling applies diminishing returns — detecting 10 fires adds less marginal severity than detecting the first one.

**Segmentation score** (per frame):

```
segmentation_score = Σ (class_weight × area_percent / 10)  for each segmented class
segmentation_score = min(segmentation_score, 10.0)
```

**Combined score** (per frame):

```
combined_score = (detection_score × 0.4) + (segmentation_score × 0.6)
```

Segmentation is weighted higher (60%) because pixel-area coverage is a more reliable proxy for disaster scale than object count.

### 3.4 Risk Level Classification

| Combined Score | Risk Level |
|---|---|
| ≥ 7.5 | `critical` |
| ≥ 5.0 | `high` |
| ≥ 2.5 | `medium` |
| < 2.5 | `low` |

Applied per-frame via `SeverityCalculator.get_risk_level()` and stored in `frame_analysis`.

**Overall video risk** is computed from all frame scores:

| Aggregate | Description |
|---|---|
| `avg_severity_score` | Mean score across all frames |
| `max_severity_score` | Peak frame score |
| `peak_severity_frame` | Frame index at peak |
| `risk_level_distribution` | Count of frames per level: `{low, medium, high, critical}` |

**Stored in:** `frame_analysis.severity_score`, `frame_analysis.risk_level`, `video_analysis.risk_level`, `video_statistics`

---

## 4. Cross-System Classification Comparison

| Dimension | Reddit NLP | Citizen Reports | Video Analysis |
|---|---|---|---|
| **Input** | Post title + body text | User form submission | Video frames (images) |
| **Method** | Keyword matching + NLP | Human selection | YOLO + weighted scoring |
| **Disaster type** | 12 categories + `other` | 6 categories + free text | 8 visual object classes |
| **Severity scale** | Integer 1–10 (per keyword dict) | Categorical: LOW/MEDIUM/HIGH/CRITICAL | Float 0.0–10.0 (computed) |
| **Urgency/Risk** | 4-level: low/medium/high/critical | Not applicable | 4-level: low/medium/high/critical |
| **Confidence** | Float [0.3, 1.0] per keyword match | Not applicable | Float [0, 1] per YOLO detection |
| **Human in loop** | No — fully automated | Yes — citizen submits, officer updates | No — fully automated |
| **Location** | NLP-extracted text entity | GPS coordinates | Not extracted |
| **Output table** | `disaster_insight` | `disaster_reports` | `frame_analysis`, `video_statistics` |

---

## 5. Known Classification Gaps

| Gap | System | Impact |
|---|---|---|
| Substring matching catches false positives | Reddit NLP | `"fire"` matches `"gunfire"`, `"campfire"`, `"crossfire"` |
| Multi-type posts get single label | Reddit NLP | A post about a flood-triggered landslide is classified as whichever has higher confidence |
| `severity_score` is type-weight, not computed | Reddit NLP | All earthquake posts have severity=8 regardless of actual post content |
| Priority field not auto-computed from severity | Citizen Reports | All reports start at priority=0; no automatic triage |
| `RESCUING` status schema/DB mismatch | Citizen Reports | Schema allows it but DB `CheckConstraint` may reject it |
| Custom disaster types not validated | Citizen Reports | Officers see inconsistent type names in dashboards (e.g. `"Gas Explosion"` vs `"gas explosion"`) |
| Confidence threshold fixed in code | Video Analysis | The 0.25 threshold for YOLO is not configurable per-model without code changes |

---

## Related Documentation

- [nlp_pipeline.md](nlp_pipeline.md) — Detailed step-by-step breakdown of the Reddit NLP pipeline
- [model_installation.md](model_installation.md) — Installing YOLO and spaCy models
- [scraping_logic.md](scraping_logic.md) — How and when classification is triggered in the scraping cycle
- [data_retention_policy.md](data_retention_policy.md) — Where classified data is stored and for how long
