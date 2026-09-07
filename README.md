# 🏋️ Workout Partner

> AI-powered workout partner web app using camera pose detection, Supabase auth/database, and FastAPI backend.

---

## 🚀 Features

- 🎥 **Live Pose Detection**: MediaPipe PoseLandmarker for tracking joints and rep counting.
- 🏋️ **Exercises Supported**: Jumping Jacks, Squats, Push-ups, Planks, etc.
- 🔊 **Audio Feedback**: Real-time sound cues for reps and sets.
- 🔐 **Authentication & Database**: Powered by Supabase & PostgreSQL.
- 📊 **Dashboard & History**: Track completed workouts, streaks, weekly progress, and stats.

---

## 📁 Repository Structure

```
workout_partner/
├── frontend/           # Vite + Vanilla JS SPA (Supabase & MediaPipe)
├── backend/            # FastAPI + PostgreSQL REST API
├── init.ps1            # Setup script
├── PROJECT.md          # Feature tracker & project specifications
├── CONTEXT.md          # System & API context
└── AGENT_PREFS.md      # Developer guidelines
```

---

## 🛠️ Quick Start

### Frontend (Vite + Vanilla JS)

```powershell
cd frontend
npm install
npm run dev
```

### Backend (FastAPI + PostgreSQL)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 📄 Documentation

- [Frontend README](frontend/README.md)
- [Backend README](backend/README.md)
- [Project Overview](PROJECT.md)
