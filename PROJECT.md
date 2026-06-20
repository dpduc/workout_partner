# 🏋️ Workout Partner — Project Management

> **Mục tiêu**: Local web app dùng camera + AI pose estimation để đếm reps và theo dõi tiến trình tập luyện.
> **Trạng thái hiện tại**: 🟡 Setup / Phase 1
> **Cập nhật lần cuối**: 2026-06-20

---

## 📁 Cấu Trúc Dự Án

```
workout_partner/
├── PROJECT.md          ← File này (quản lý cấu trúc & tính năng)
├── CONTEXT.md          ← API, plugins, context cho agent
├── AGENT_PREFS.md      ← Preferences cá nhân của developer
│
├── frontend/           ← Vite + Vanilla JS SPA
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.js             # Router, app bootstrap
│       ├── style.css           # Global design system (CSS vars, dark mode)
│       ├── pages/
│       │   ├── workout.js      # Trang tập luyện chính
│       │   ├── dashboard.js    # Tổng quan & charts
│       │   └── history.js      # Lịch sử buổi tập
│       ├── modules/
│       │   ├── poseDetector.js # MediaPipe PoseLandmarker wrapper
│       │   ├── repCounter.js   # State machine đếm rep (multi-exercise)
│       │   ├── skeletonDraw.js # Canvas skeleton overlay renderer
│       │   ├── audioFeedback.js# Web Audio API beep
│       │   └── api.js          # HTTP client → FastAPI backend
│       └── components/
│           ├── navbar.js       # Top navigation
│           ├── workoutModal.js # Modal bắt đầu/kết thúc workout
│           └── statsCard.js    # Reusable stats card
│
├── backend/            ← Python FastAPI + PostgreSQL
│   ├── main.py                 # FastAPI app, CORS, router mount
│   ├── requirements.txt
│   ├── .env                    # DATABASE_URL, APP_SECRET (gitignore)
│   ├── .env.example            # Template công khai
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/           # Migration files
│   └── app/
│       ├── db.py               # Async SQLAlchemy engine + session
│       ├── api/
│       │   ├── __init__.py
│       │   ├── workouts.py     # /api/sessions CRUD
│       │   ├── sets.py         # /api/sets CRUD
│       │   ├── exercises.py    # /api/exercises catalog
│       │   └── stats.py        # /api/stats aggregations
│       ├── models/
│       │   ├── __init__.py
│       │   ├── workout.py      # WorkoutSession, WorkoutSet ORM models
│       │   └── exercise.py     # Exercise ORM model
│       └── schemas/
│           ├── __init__.py
│           ├── workout.py      # Pydantic request/response schemas
│           └── exercise.py
│
└── asset/
    └── sounds/                 # (optional) pre-baked audio files
```

---

## ✅ Feature Tracker

### 🟢 Core Features (MVP)

| ID | Feature | Module | Trạng thái |
|----|---------|--------|------------|
| F01 | Camera stream + MediaPipe pose detection | `poseDetector.js` | ⬜ TODO |
| F02 | Skeleton overlay (33 landmarks + bones) | `skeletonDraw.js` | ⬜ TODO |
| F03 | Jumping Jack rep counting (state machine) | `repCounter.js` | ⬜ TODO |
| F04 | Audio beep on rep count | `audioFeedback.js` | ⬜ TODO |
| F05 | Set timer (đếm thời gian mỗi set) | `workout.js` | ⬜ TODO |
| F06 | Start/End set UI | `workout.js` | ⬜ TODO |
| F07 | Save workout session to backend | `api.js` | ⬜ TODO |
| F08 | Workout history list | `history.js` | ⬜ TODO |
| F09 | Dashboard stats (total reps, sessions, streak) | `dashboard.js` | ⬜ TODO |
| F10 | Weekly rep chart (Chart.js) | `dashboard.js` | ⬜ TODO |

### 🟡 Multi-Exercise Scaffold (post-MVP)

| ID | Feature | Trạng thái |
|----|---------|------------|
| F11 | Squat detection logic | ⬜ TODO |
| F12 | Push-up detection logic | ⬜ TODO |
| F13 | Plank hold timer logic | ⬜ TODO |
| F14 | Exercise selector UI | ⬜ TODO |

### 🔵 Nice-to-Have

| ID | Feature | Trạng thái |
|----|---------|------------|
| F15 | Rep speed / cadence indicator | ⬜ TODO |
| F16 | Form quality score (landmark alignment) | ⬜ TODO |
| F17 | REST timer giữa các set | ⬜ TODO |
| F18 | Export data (CSV/JSON) | ⬜ TODO |
| F19 | Workout plan / program builder | ⬜ TODO |

---

## 🗄️ Database Schema (PostgreSQL)

### Table: `exercises`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| slug | VARCHAR UNIQUE | `jumping_jack`, `squat`, `push_up`, `plank` |
| name | VARCHAR | Display name |
| description | TEXT | |
| muscle_groups | VARCHAR[] | `['legs', 'arms']` |
| difficulty | VARCHAR | `beginner / intermediate / advanced` |
| counting_type | VARCHAR | `reps` hoặc `duration` |

### Table: `workout_sessions`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| started_at | TIMESTAMPTZ | |
| ended_at | TIMESTAMPTZ | nullable khi đang tập |
| total_duration_s | INTEGER | tổng giây |
| notes | TEXT | ghi chú của người dùng |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### Table: `workout_sets`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| session_id | UUID FK → sessions | CASCADE DELETE |
| exercise_id | INTEGER FK → exercises | |
| set_number | INTEGER | thứ tự set trong session |
| reps | INTEGER | nullable (cho plank) |
| duration_s | INTEGER | thời gian set (giây) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

---

## 🌐 API Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/exercises` | Danh sách bài tập |
| POST | `/api/sessions` | Tạo buổi tập mới |
| GET | `/api/sessions` | Lịch sử (có pagination) |
| GET | `/api/sessions/{id}` | Chi tiết session |
| PATCH | `/api/sessions/{id}` | Kết thúc / cập nhật session |
| DELETE | `/api/sessions/{id}` | Xóa session |
| POST | `/api/sessions/{id}/sets` | Thêm set |
| PATCH | `/api/sets/{id}` | Sửa set |
| DELETE | `/api/sets/{id}` | Xóa set |
| GET | `/api/stats/summary` | Tổng reps, sessions, streak |
| GET | `/api/stats/weekly` | Data chart 7 ngày gần nhất |

---

## 🏗️ Development Phases

### Phase 1 — Backend Foundation
- [ ] FastAPI project setup
- [ ] PostgreSQL connection + Alembic
- [ ] Models + Schemas
- [ ] CRUD endpoints
- [ ] Seed exercise catalog

### Phase 2 — Frontend Core
- [ ] Vite setup + CSS design system
- [ ] MediaPipe integration
- [ ] Jumping Jack counter
- [ ] Skeleton renderer
- [ ] Audio feedback

### Phase 3 — Pages & Integration
- [ ] Workout page
- [ ] API client
- [ ] Dashboard + Charts
- [ ] History page

### Phase 4 — Polish
- [ ] Animations & transitions
- [ ] Responsive design
- [ ] Error states

---

## 📝 Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-06-20 | 0.1.0 | Initial project plan |

---

## 🔗 Tài Liệu Liên Quan

- [CONTEXT.md](./CONTEXT.md) — API keys, plugins, agent context
- [AGENT_PREFS.md](./AGENT_PREFS.md) — Developer preferences
- [implementation_plan.md](C:\Users\Admin\.gemini\antigravity-ide\brain\f5e3ae67-f1ab-40c8-9674-7be8b059c3ec\implementation_plan.md) — Technical plan chi tiết
