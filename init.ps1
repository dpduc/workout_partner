$ErrorActionPreference = "Stop"

Write-Host "Checking and installing dependencies..." -ForegroundColor Cyan

# ==========================================
# 1. SETUP BACKEND
# ==========================================
Write-Host "`n[1/2] Setting up Backend (FastAPI)..." -ForegroundColor Yellow

if (-not (Test-Path "backend/requirements.txt") -or (Get-Content "backend/requirements.txt").Length -lt 5) {
    @"
fastapi
uvicorn[standard]
sqlalchemy[asyncio]
psycopg[binary,pool]
alembic
pydantic
pydantic-settings
python-dotenv
"@ | Out-File -FilePath "backend/requirements.txt" -Encoding UTF8
}

if (-not (Test-Path "backend/main.py") -or (Get-Content "backend/main.py").Length -lt 5) {
    @"
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Workout Partner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend is running!"}
"@ | Out-File -FilePath "backend/main.py" -Encoding UTF8
}

if (-not (Test-Path "backend/.env")) {
    @"
DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/workout_partner
APP_ENV=development
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]
"@ | Out-File -FilePath "backend/.env" -Encoding UTF8
}

Set-Location "backend"
if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor DarkGray
    python -m venv .venv
}
Write-Host "Installing pip packages (this may take a while)..." -ForegroundColor DarkGray
.\.venv\Scripts\python.exe -m pip install -r requirements.txt --quiet
Set-Location ".."


# ==========================================
# 2. SETUP FRONTEND
# ==========================================
Write-Host "`n[2/2] Setting up Frontend (Vite)..." -ForegroundColor Yellow

Set-Location "frontend"
if (-not (Test-Path "package.json") -or (Get-Content "package.json").Length -lt 5) {
    Write-Host "Initializing package.json..." -ForegroundColor DarkGray
    npm init -y | Out-Null
    
    $pkg = Get-Content package.json | ConvertFrom-Json
    $pkg.type = "module"
    $pkg.scripts = @{
        "dev"     = "vite"
        "build"   = "vite build"
        "preview" = "vite preview"
    }
    $pkg | ConvertTo-Json -Depth 10 | Out-File "package.json" -Encoding UTF8

    Write-Host "Installing npm packages..." -ForegroundColor DarkGray
    npm install vite @mediapipe/tasks-vision chart.js --silent
}
else {
    Write-Host "Checking npm dependencies..." -ForegroundColor DarkGray
    npm install --silent
}

if (-not (Test-Path "index.html") -or (Get-Content "index.html").Length -lt 5) {
    @"
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Workout Partner</title>
    <link rel="stylesheet" href="/src/style.css">
  </head>
  <body>
    <div id="app">
        <h1>Workout Partner Frontend is running!</h1>
    </div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
"@ | Out-File -FilePath "index.html" -Encoding UTF8
}

if (-not (Test-Path "src/main.js") -or (Get-Content "src/main.js").Length -lt 5) {
    "console.log('App started');" | Out-File -FilePath "src/main.js" -Encoding UTF8
}
Set-Location ".."


# ==========================================
# 3. START SERVERS
# ==========================================
Write-Host "`nStarting servers..." -ForegroundColor Cyan

# Backend in new window
Write-Host "Opening Backend window..." -ForegroundColor DarkGray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$ErrorActionPreference='Stop'; cd backend; .\.venv\Scripts\Activate.ps1; uvicorn main:app --reload --port 8000"

# Frontend in new window
Write-Host "Opening Frontend window..." -ForegroundColor DarkGray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$ErrorActionPreference='Stop'; cd frontend; npm run dev"

# Wait a bit
Start-Sleep -Seconds 3

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "PROJECT STARTED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Frontend URL:       http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend API URL:    http://localhost:8000" -ForegroundColor Cyan
Write-Host "API Docs (Swagger): http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Green
Write-Host "(Note: 2 new terminal windows have been opened to run Frontend and Backend. Close them to stop the servers.)" -ForegroundColor Yellow
