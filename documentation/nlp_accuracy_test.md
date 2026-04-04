# NLP Accuracy Testing Documentation

## Overview

The system has **two separate NLP/ML accuracy surfaces** that are often conflated:

1. **Text NLP pipeline** — `nlp_processor.py` classifies Reddit posts into disaster types, severity scores, urgency levels, and sentiment using spaCy + TextBlob + regex. No accuracy tests exist.
2. **YOLO visual ML pipeline** — `yolo_detector.py` and `yolo_segmenter.py` run custom-trained YOLOv8 models on video frames. Per-frame confidence scores are stored, but never tested against ground truth.

Additionally, `yolo_service.py` runs a **third, separate YOLO model** (`yolov8n.pt` — the generic pretrained nano model) for live IP camera surveillance, which has no overlap with the disaster-specific models used for video analysis.

There are **zero test files in `app/`** — no unit tests, no integration tests, no accuracy benchmarks. The only test code in the repository is inside third-party packages in `venv/`.

---

## 1. Text NLP Pipeline Accuracy

### Disaster Classification

**Method:** Keyword substring matching in `classify_disaster()`.

```python
for disaster_type, data in self.disaster_keywords.items():
    for keyword in data['keywords']:
        if keyword in text_lower:
            count = text_lower.count(keyword)
            confidence = min(count * 0.2 + 0.5, 1.0)
            matches.append((disaster_type, data['severity'], confidence))
            break  # Only first keyword per type counted
```

**Confidence output range:**

| Occurrences | Score | Interpretation |
|---|---|---|
| 0 (no match, fallback) | 0.30 | "other" category |
| 1 | 0.70 | Single mention |
| 2 | 0.90 | Double mention |
| 3+ | 1.00 | Capped |

**Accuracy issues with this approach:**

- **No lower bound distinction** — a post with one marginal keyword match ("fire" in "house fire insurance claim") gets 0.70 confidence, same as a post with an explicit disaster event.
- **`break` prevents multi-keyword accumulation** — if a post says "earthquake and seismic activity", only the first matching keyword (`'earthquake'`) counts. Confidence stays at 0.70, not the 0.90 it would score if both keywords were counted.
- **Highest confidence wins, not best match** — if a post mentions "flood" once (0.70) and "tornado" twice (0.90), it's classified as "tornado" even if the post is fundamentally about flooding with tornado mentioned in passing.
- **No word boundaries** — `'fire'` matches `"fired"`, `"crossfire"`, `"hellfire"`. `'storm'` matches `"brainstorm"`. `'blast'` matches `"blasted"`.
- **Conflict category catches broad social unrest** — `'war'`, `'conflict'`, `'attack'`, `'violence'`, `'riot'`, `'protest'` all classify as `conflict`. A post about a product launch event ("attack" in "attack on monopoly") would classify as conflict.

### Severity Score Accuracy

```python
# From disaster_keywords dict:
'earthquake': {'keywords': [...], 'severity': 8},
'tsunami':    {'keywords': [...], 'severity': 10},
'drought':    {'keywords': [...], 'severity': 6},
```

- Severity is a **static lookup per disaster category**. It does not vary with event magnitude, death toll, affected population, or any text content.
- A Reddit post about a minor 2.0 magnitude tremor gets `severity_score=8`, identical to a post about a catastrophic 9.0 earthquake.
- The `extract_numbers()` function does parse casualties and damage estimates, but these values are stored separately (`affected_population`, `damage_estimate`) and are **never fed back into the severity score**.
- Severity range: `6` (drought) to `10` (tsunami), with fallback `5` for "other". The range is narrow (5–10) but the UI displays it on a 0–10 scale, implying values below 5 are possible when they are not.

### Urgency Score Accuracy

```python
urgency_score = severity + (critical_count * 3) + (high_count * 1.5)
if sentiment < -0.5:
    urgency_score += 2
```

- Urgency levels (critical/high/medium/low) are derived from the same static severity base plus keyword bonuses.
- A tsunami post (`severity=10`) reaches `urgency_score=10`, which immediately qualifies as `'high'` (`>= 9`) even with no urgency keywords and positive sentiment. It can only reach `'critical'` with urgency keywords or very negative sentiment.
- A drought post (`severity=6`) with neutral sentiment needs **4 urgency-word matches** to reach `'critical'` (`6 + 4×1.5 = 12`). Drought events rarely use the critical words list, so drought is nearly always classified `'medium'` or `'low'`.
- The `critical_words` list itself includes `'critical'` — any post that reports a "critical situation" gets 3 urgency points regardless of actual severity. News headlines routinely use "critical" metaphorically.
- Sentiment threshold (`< -0.5`) adds 2 urgency points. TextBlob polarity rarely reaches < -0.5 on news-style text, so this branch fires infrequently.

### Sentiment Accuracy (TextBlob)

```python
def analyze_sentiment(self, text: str) -> float:
    blob = TextBlob(text)
    return blob.sentiment.polarity
```

- TextBlob uses a **dictionary-based lexicon** (Pattern library), not a trained model. It has no disaster domain adaptation.
- Disaster reporting language is neutral-to-negative by nature but includes "rescue", "relief", "aid", "support", "help" which are positive in the TextBlob lexicon. This pushes disaster posts toward neutral or mildly positive.
- "Victims were rescued" — "rescued" is positive (+0.5 in the lexicon) even though the context involves disaster victims.
- The stored `sentiment` floats form the `avg_sentiment` in `DisasterStats`, which is displayed in the `AdminAnalytics.jsx` sentiment gauge. The gauge correctly labels 0.0 as neutral sentiment, but TextBlob's 0.0 on disaster text often means "couldn't determine" rather than "genuinely neutral".

### Location Extraction Accuracy (spaCy NER)

```python
for ent in doc.ents:
    if ent.label_ in ["GPE", "LOC", "FAC"]:
        locations.append(ent.text)
return list(set(locations))
```

- Uses `en_core_web_sm` — the smallest spaCy English model (12 MB). Its NER F1 on OntoNotes benchmark is ~84% for GPE/LOC entities. The `en_core_web_lg` (560 MB) scores ~88–91% on the same benchmark.
- `FAC` (facility) label includes named buildings, airports, stadiums. Post mentioning "evacuation at Madison Square Garden" would extract "Madison Square Garden" as the disaster location.
- Reddit subreddit names in post text (e.g., "posted in r/Ukraine") are not NER entities — they don't pollute location extraction. However, usernames formatted as locations can be mistaken for GPE entities.
- `set()` ordering is non-deterministic in CPython (though consistent within a session). Only `locations[0]` is stored — which location is selected from multi-location posts is effectively random across server restarts.
- If `self.nlp is None` (spaCy not installed), the method silently returns `[]`. All posts then store `location=None`, and the location hotspot chart in `AdminAnalytics.jsx` shows nothing without any error indication.

### Number Extraction Accuracy

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

- `people_patterns[0]` requires the number to precede the word. "Three people killed" (word numeral) doesn't match. "3 people killed" matches.
- `damage_patterns[0]` captures `$50` as `"$50"` with no scale — `$50` and `$50 million` are stored identically as `"$50"` since the scale word is not in a capture group.
- Both lists stop at the first match. A post reporting "200 injured and 45 dead" stores `affected_population="200"` — the death count is discarded.
- No post-processing: `"1,200"` is stored as the raw comma-separated string, not an integer. Cannot be used for arithmetic comparisons later.

---

## 2. YOLO Visual Model Pipeline

### Two Custom Models — Class Mismatch

The video analysis pipeline uses **two separate custom-trained models** with **different class schemas**:

**Detection model** — `models/best_multiclass_detect.pt`

```python
# YOLODetector.class_names
['ambulance', 'boat', 'fire', 'forest',
 'injured_people', 'landslide', 'person', 'tent']
```

**Segmentation model** — `models/best_multiclass_seg.pt`

```python
# YOLOSegmenter.class_names
['ambulance', 'boat', 'building', 'fire',
 'fire_and_smoke', 'person', 'road']
```

| Class | Detection | Segmentation |
|---|---|---|
| ambulance | ✓ | ✓ |
| boat | ✓ | ✓ |
| fire | ✓ | ✓ |
| person | ✓ | ✓ |
| forest | ✓ | — |
| injured_people | ✓ | — |
| landslide | ✓ | — |
| tent | ✓ | — |
| building | — | ✓ |
| fire_and_smoke | — | ✓ |
| road | — | ✓ |

- 4 classes are detection-only; 3 are segmentation-only; 4 are shared.
- The combined severity score uses separate weight tables for each model (`DETECTION_WEIGHTS`, `SEGMENTATION_WEIGHTS`) — so a `tent` detected doesn't contribute to the segmentation score at all even though its presence is significant.
- Note: The hardcoded `class_names` lists in `YOLODetector` and `YOLOSegmenter` are overridden at runtime by `self.model.names` (from the actual `.pt` file). The source code comment says "update based on your trained model". If the actual model was trained with different class order, `self.model.names[cls_id]` will return the correct class from the model file, but `self.colors` dict would have wrong label-to-colour mappings if class names differ.

### Confidence Threshold

Both models use `conf_threshold=0.25` by default:

```python
def detect(self, frame: np.ndarray, conf_threshold: float = 0.25) -> Dict:
    results = self.model(frame, conf=conf_threshold, verbose=False)
```

- The `VideoProcessor._process_frames()` method calls `detect()` and `segment()` with no `conf_threshold` argument — both use 0.25.
- The live surveillance model (`yolo_service.py`) uses `settings.YOLO_CONFIDENCE = 0.45` — a higher threshold than the video analysis models. Live surveillance has a stricter confidence gate; recorded video analysis accepts lower-confidence detections.
- 0.25 is the YOLOv8 default. No tuning or evaluation was done to justify this value for disaster imagery.

### Confidence Averaging — `avg_confidence`

```python
# YOLODetector.detect()
detections['avg_confidence'] = (
    np.mean(detections['confidences']) if detections['confidences'] else 0.0
)
```

- `avg_confidence` is the mean confidence **only over detected objects**. It does not include undetected classes.
- A frame where YOLO detects 1 object at 0.26 confidence has `avg_confidence=0.26`.
- A frame with no detections has `avg_confidence=0.0`.

In `_calculate_statistics()`:

```python
if frame['detections']['avg_confidence'] > 0:
    detection_confidences.append(float(frame['detections']['avg_confidence']))
```

- **Frames with no detections are excluded** from the per-video average confidence calculation. The final `avg_detection_confidence` in `VideoStatistics` is the mean over detection-positive frames only.
- This inflates the reported confidence — a video where 90% of frames have no detections and the 10% that do detect at 0.60 confidence will report `avg_detection_confidence=0.60`, not `0.06`.

### `timestamp_seconds` in `FrameAnalysis`

```python
timestamp_seconds=round(frame_number / fps, 2),
```

- `fps` is read from the actual processed video via `cap.get(cv2.CAP_PROP_FPS)` — this is the real fps after conversion to 720p @ 15fps.
- However, in `_calculate_statistics()`:

```python
peak_severity_timestamp=round(peak_frame / 15, 2),  # Assuming 15 fps
```

- The statistics calculation **hardcodes 15fps** instead of using the actual fps from `video_info`. This matches the conversion target (720p @ 15fps) but would be wrong if conversion failed and the video retained a different fps.
- The `FrameAnalysis.timestamp_seconds` uses actual fps; `VideoStatistics.peak_severity_timestamp` hardcodes 15. These are consistent when conversion succeeds but diverge if it fails.

### Live Surveillance — Different Model

`yolo_service.py` uses a completely different model:

```python
# settings.YOLO_MODEL_PATH defaults to "yolov8n.pt"
model_path = settings.YOLO_MODEL_PATH
_yolo_model = YOLO(model_path)
```

- `yolov8n.pt` is the **pretrained YOLOv8 nano model** trained on COCO (80 classes: person, car, cat, dog, etc.).
- It has no disaster-specific classes — it cannot detect `injured_people`, `landslide`, `tent`, `fire_and_smoke`, or `forest`.
- It will detect `person`, `boat`, `ambulance` (mapped from COCO's `ambulance` if present), and `fire` (COCO does not have a fire class — it would not detect fire at all).
- Live surveillance output is only sent over WebSocket as JPEG frames annotated by `results.plot()`. No confidence scores or class names are stored to the database from the live stream.
- The live surveillance YOLO model in `yolov8n.pt` in the repo root is unrelated to `models/best_multiclass_detect.pt` and `models/best_multiclass_seg.pt`.

---

## 3. Model Identity and Storage

### Custom Model Files

- `models/best_multiclass_detect.pt` — referenced by `VideoProcessor.__init__` and `YOLODetector.__init__`
- `models/best_multiclass_seg.pt` — referenced by `VideoProcessor.__init__` and `YOLOSegmenter.__init__`
- `yolov8n.pt` — present in repo root, used by live surveillance

No model version information, training dataset description, mAP scores, training date, or evaluation results are stored anywhere in the codebase. The `.pt` files are binary blobs with no associated metadata file.

### Model Load Path

`YOLODetector` raises `FileNotFoundError` if the model file is missing — this is the only validation:

```python
if not os.path.exists(model_path):
    raise FileNotFoundError(f"Detection model not found at {model_path}")
```

- Path is relative. If the server is started from a directory other than the project root, the model won't be found.
- `yolo_service.py` does not raise — it calls `YOLO(model_path)` directly and lets `ultralytics` raise its own error.

---

## 4. Confidence Values in the Database

### `DisasterInsight.confidence_score` (text NLP)

Stored from `nlp_result['confidence_score']` which is the output of `classify_disaster()`:

```python
confidence = min(count * 0.2 + 0.5, 1.0)
```

- Range: 0.30 (fallback) to 1.00.
- This field is **never queried or displayed** anywhere in the frontend or backend API responses. The `GET /disasters/dashboard/recent-disasters` endpoint returns `confidence_score` in its JSON output, but no frontend component reads or renders it.

### `FrameAnalysis.detection_confidence` (YOLO)

```python
detection_confidence=float(detections['avg_confidence']),
```

- Mean YOLO confidence over detected objects in that frame (0.0 if no detections).
- Stored per frame. Queried only in `_calculate_statistics()` to compute `VideoStatistics.avg_detection_confidence`.

### `VideoStatistics.avg_detection_confidence` / `avg_segmentation_confidence`

- Displayed in `VideoAnalysis.jsx` via the API but only as a raw number — there's no benchmark or threshold to compare it against. A value of 0.43 has no labelled interpretation (e.g., "good", "acceptable", "low") in the frontend.

---

## 5. Frontend Confidence Display — `VideoAnalysis.jsx`

### Top Detections Chart

```js
const DISASTER_COLORS = {
  ambulance: '#ef4444', boat: '#3b82f6', fire: '#f97316',
  forest: '#22c55e', injured_people: '#8b5cf6', landslide: '#a16207',
  person: '#64748b', tent: '#0891b2', building: '#6b7280',
  fire_and_smoke: '#dc2626', road: '#374151'
};
```

- 11 classes listed here — the union of detection (8) and segmentation (7) classes, minus duplicates.
- `injured_people` is rendered as "Injured_people" (underscore not replaced with space) in bar chart labels:
  ```js
  formatter: (v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v
  ```
  This formatter only formats numbers; the class name displayed on the y-axis comes from the raw key unchanged.

### Severity Score Display

```js
const getSeverityColor = (score) => {
  if (score >= 7.5) return 'text-red-600 bg-red-100';
  if (score >= 5.0) return 'text-orange-600 bg-orange-100';
  if (score >= 2.5) return 'text-yellow-600 bg-yellow-100';
  return 'text-green-600 bg-green-100';
};
```

- These thresholds match `severity_calculator.py` exactly. Frontend and backend are in sync for risk level display.
- No YOLO confidence percentage is shown alongside the severity score in the UI — only the derived 0–10 severity score is surfaced.

### Processing Progress

```python
# video_processor.py progress_callback milestones:
# 5  → video conversion started
# 10 → video conversion completed
# 10 + (frame_number / total_frames) * 85 → during frame processing (per 10 frames)
# 95 → statistics calculation
# 100 → completed
```

- Progress jumps from 10 to 95 during frame processing, then directly to 100. The statistics step (95→100) is instant.
- If conversion takes a long time, the UI stays at 5% for the entire conversion duration with no sub-progress.

---

## 6. What "Accuracy" Metrics Are Actually Displayed

| Metric | Where | What it actually measures |
|---|---|---|
| "NLP Coverage" radar axis | `AdminAnalytics.jsx` | `total_incidents × 2` capped at 100 — incident volume, not classification accuracy |
| Sentiment gauge | `AdminAnalytics.jsx` | TextBlob raw polarity × 100, displayed as "%" — average text tone, not classification correctness |
| `avg_detection_confidence` | `VideoAnalysis.jsx` | Mean YOLO confidence over detection-positive frames only — inflated relative to all frames |
| `confidence_score` (NLP) | `DisasterInsight` DB field | Keyword occurrence count mapped to [0.30, 1.00] — never rendered in frontend |
| Severity score 0–10 | `VideoAnalysis.jsx` | Weighted sum of YOLO detections/areas — no ground truth, no mAP |

None of these are accuracy metrics in the formal sense (precision, recall, F1, mAP). They are system activity indicators or model-internal confidence scores with no baseline comparison.

---

## 7. Known Issues Summary

| Issue | Location | Detail |
|---|---|---|
| No test suite | Entire `app/` | Zero test files. All test code is third-party (venv packages only) |
| No ground truth labels | Entire pipeline | No labelled dataset for evaluating text NLP or YOLO model accuracy |
| Static severity per disaster type | `nlp_processor.py` | Every earthquake = 8, every tsunami = 10, regardless of actual event scale |
| `break` limits multi-keyword confidence | `nlp_processor.py` | Only first matching keyword per type scores; second keyword ignored |
| Minimum confidence 0.70 for any text match | `nlp_processor.py` | No "uncertain" band below 0.70; single word match = high confidence |
| `confidence_score` never displayed | `AdminAnalytics.jsx` | Stored in DB but no API consumer renders it |
| Detection/segmentation class mismatch | `yolo_detector.py` / `yolo_segmenter.py` | 4 classes detection-only, 3 segmentation-only; no cross-model consistency |
| `avg_confidence` excludes zero-detection frames | `video_processor.py` | Inflates reported average confidence for videos with mostly empty frames |
| Live surveillance uses unrelated model | `yolo_service.py` | `yolov8n.pt` is COCO-pretrained; cannot detect disaster-specific classes |
| Live surveillance threshold ≠ video threshold | `config.py` vs `yolo_detector.py` | Live: 0.45, Video: 0.25 — different confidence gates for same operator |
| `peak_severity_timestamp` hardcodes 15fps | `video_processor.py` line 479 | Uses `peak_frame / 15` instead of actual fps; wrong if conversion failed |
| No model version metadata | `models/*.pt` | No training date, dataset, mAP, or evaluation results stored anywhere |
| TextBlob domain mismatch | `nlp_processor.py` | Disaster terminology ("rescue", "relief") registers as positive sentiment |
| `set()` non-determinism in location selection | `nlp_processor.py` | First location stored is arbitrary across server restarts |
| `$50` and `$50 million` stored identically | `nlp_processor.py` | Scale word not captured; damage estimates are ambiguous strings |
| `injured_people` renders with underscore | `VideoAnalysis.jsx` | Y-axis label shows "Injured_people" instead of "Injured People" |
