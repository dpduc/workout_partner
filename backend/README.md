# Workout Partner — Backend API

FastAPI + PostgreSQL backend cho Workout Partner app.

## Quick Start

### 1. Tạo và activate virtual environment
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 2. Cài dependencies
```powershell
pip install -r requirements.txt
```

### 3. Tạo file `.env`
```powershell
Copy-Item .env.example .env
# Chỉnh sửa DATABASE_URL phù hợp với PostgreSQL của bạn
```

### 4. Setup PostgreSQL database
```sql
-- Chạy trong psql hoặc pgAdmin
CREATE DATABASE workout_partner;
```

### 5. Khởi tạo tables + seed data
```powershell
python scripts/init_db.py
```

### 6. Chạy dev server
```powershell
uvicorn main:app --reload --port 8000
```

## API Documentation
- Swagger UI: http://localhost:8000/docs
- Redoc: http://localhost:8000/redoc

## Migration (Alembic)
```powershell
# Tạo migration mới
alembic revision --autogenerate -m "description"

# Apply
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Cấu trúc
```
backend/
├── main.py              # FastAPI app, CORS, routers
├── requirements.txt
├── .env                 # Secrets (gitignored)
├── alembic/             # DB migrations
├── scripts/
│   └── init_db.py       # One-shot DB init + seed
└── app/
    ├── config.py        # Settings (pydantic-settings)
    ├── db.py            # Async engine + session
    ├── models/          # SQLAlchemy ORM models
    ├── schemas/         # Pydantic v2 schemas
    └── api/             # FastAPI routers
```
