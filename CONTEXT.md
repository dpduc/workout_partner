# 🔌 Workout Partner — Context & Connections

> File này cung cấp context kỹ thuật cho AI agents trong suốt quá trình phát triển.
> Cập nhật file này mỗi khi thêm dependency, thay đổi API, hoặc tích hợp dịch vụ mới.

---

## 🌍 Môi Trường

| Biến | Giá trị mặc định | Ghi chú |
|------|------------------|---------|
| Frontend dev URL | `http://localhost:5173` | Vite dev server |
| Backend API URL | `http://localhost:8000` | FastAPI uvicorn |
| PostgreSQL URL | `postgresql+psycopg://...` | Xem `.env` |
| API Docs (Swagger) | `http://localhost:8000/docs` | Auto-generated |
| API Docs (Redoc) | `http://localhost:8000/redoc` | |

### File `.env` (backend) — cần tạo thủ công
```env
DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/workout_partner
APP_ENV=development
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]
```

---

## 📦 Dependencies

### Frontend (`frontend/package.json`)

| Package | Version | Mục đích |
|---------|---------|---------|
| `vite` | latest | Build tool / dev server |
| `@mediapipe/tasks-vision` | latest | Pose Landmarker (BlazePose) |
| `chart.js` | ^4.x | Biểu đồ thống kê |

**CDN resources** (load trong HTML):
```html
<!-- MediaPipe WASM backend (tự động load từ CDN) -->
<!-- Model weights: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task -->
```

### Backend (`backend/requirements.txt`)

| Package | Version | Mục đích |
|---------|---------|---------|
| `fastapi` | latest | Web framework |
| `uvicorn[standard]` | latest | ASGI server |
| `sqlalchemy[asyncio]` | ^2.0.x | ORM (async mode) |
| `psycopg[binary,pool]` | ^3.x | **Async PostgreSQL driver** (Python 3.14 compatible) |
| `alembic` | latest | DB migrations |
| `pydantic` | ^2.x | Data validation |
| `pydantic-settings` | ^2.x | Settings từ `.env` |
| `python-dotenv` | latest | Load `.env` |

> **⚠️ Note**: Dùng `psycopg3` (psycopg[binary]) thay vì `asyncpg` vì asyncpg cần build từ source trên Python 3.14 Windows (thiếu MSVC). DATABASE_URL phải dùng scheme `postgresql+psycopg://`.

---

## 🤖 AI / Vision Models

### MediaPipe PoseLandmarker (Primary)
- **Provider**: Google AI Edge
- **Model file**: `pose_landmarker_full.task` (float16, ~30MB)
- **Download URL**: 
  ```
  https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task
  ```
- **Landmarks**: 33 keypoints (COCO format mở rộng)
- **Output**: `x, y, z` normalized + `visibility` + `presence` scores
- **Running mode**: `LIVE_STREAM` với callback
- **Performance**: ~30fps trên CPU, ~60fps với GPU delegate
- **Privacy**: 100% on-device, không gửi dữ liệu ra ngoài

### Landmark Index Reference (Quan trọng cho RepCounter)
```
0:  nose
1:  left eye (inner)     2:  left eye            3:  left eye (outer)
4:  right eye (inner)    5:  right eye           6:  right eye (outer)
7:  left ear             8:  right ear
9:  mouth (left)         10: mouth (right)
11: left shoulder        12: right shoulder
13: left elbow           14: right elbow
15: left wrist           16: right wrist
17: left pinky           18: right pinky
19: left index           20: right index
21: left thumb           22: right thumb
23: left hip             24: right hip
25: left knee            26: right knee
27: left ankle           28: right ankle
29: left heel            30: right heel
31: left foot index      32: right foot index
```

---

## 🔧 API Contract

### Request/Response Examples

#### Tạo buổi tập mới
```http
POST /api/sessions
Content-Type: application/json

{
  "notes": "Tập buổi sáng"
}

→ 201 Created
{
  "id": "uuid-here",
  "started_at": "2026-06-20T08:00:00Z",
  "ended_at": null,
  "total_duration_s": null,
  "notes": "Tập buổi sáng",
  "sets": []
}
```

#### Thêm một set
```http
POST /api/sessions/{session_id}/sets
Content-Type: application/json

{
  "exercise_id": 1,
  "set_number": 1,
  "reps": 20,
  "duration_s": 45
}

→ 201 Created
{
  "id": 1,
  "session_id": "uuid-here",
  "exercise_id": 1,
  "set_number": 1,
  "reps": 20,
  "duration_s": 45,
  "created_at": "2026-06-20T08:01:00Z"
}
```

#### Stats summary
```http
GET /api/stats/summary

→ 200 OK
{
  "total_sessions": 42,
  "total_reps": 1840,
  "total_duration_s": 18600,
  "current_streak_days": 5,
  "best_streak_days": 12
}
```

#### Weekly chart data
```http
GET /api/stats/weekly

→ 200 OK
{
  "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "datasets": [
    { "exercise": "Jumping Jack", "data": [40, 60, 0, 80, 50, 100, 0] }
  ]
}
```

---

## 🔗 Tích Hợp CORS

Backend FastAPI cấu hình CORS cho phép frontend Vite:
```python
# main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # ["http://localhost:5173"]
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Frontend base URL config (`src/modules/api.js`):
```js
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
```

Vite proxy (dev, `vite.config.js`):
```js
server: {
  proxy: {
    '/api': 'http://localhost:8000'
  }
}
```

---

## 🗃️ Alembic Migration Workflow

```bash
# Tạo migration mới
cd backend && alembic revision --autogenerate -m "description"

# Apply migration
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## 🚀 Dev Server Commands

```powershell
# Frontend
cd frontend; npm run dev          # → http://localhost:5173

# Backend
cd backend
.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000

# Database init (run once)
python scripts/init_db.py

# PostgreSQL (Scoop — đã cài trên machine này)
# Khởi động: pg_ctl -D $env:USERPROFILE\scoop\apps\postgresql\current\data start
# Stop:      pg_ctl -D $env:USERPROFILE\scoop\apps\postgresql\current\data stop
```

---

## 📐 Frontend Module Interface

### `poseDetector.js`
```js
// Init
await PoseDetector.init(videoElement, onResultCallback)
PoseDetector.start()   // bắt đầu xử lý frames
PoseDetector.stop()    // dừng
```

### `repCounter.js`
```js
const counter = new RepCounter('jumping_jack')
counter.process(landmarks)  // → { reps: N, phase: 'OPEN'|'CLOSED'|'IDLE' }
counter.reset()
```

### `skeletonDraw.js`
```js
SkeletonDraw.drawLandmarks(canvas, landmarks)
SkeletonDraw.drawConnections(canvas, landmarks)
```

### `audioFeedback.js`
```js
AudioFeedback.beep()       // rep beep (440Hz, 80ms)
AudioFeedback.complete()   // set complete (880Hz, 200ms)
```

### `api.js`
```js
await API.sessions.create(notes)
await API.sessions.list({ page, limit })
await API.sessions.get(id)
await API.sessions.end(id, { total_duration_s, notes })
await API.sets.add(sessionId, { exercise_id, set_number, reps, duration_s })
await API.stats.summary()
await API.stats.weekly()
```

---

## 🛠️ Tool & Plugin Versions

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 18 | LTS recommended |
| Python | 3.14 (on this machine) | psycopg3 driver required for Python 3.14 on Windows |
| PostgreSQL | 16 | |
| Vite | ≥ 5.x | |
| Chrome/Edge | latest | WASM + camera support |
