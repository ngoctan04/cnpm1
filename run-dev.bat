@echo off
setlocal enabledelayedexpansion

echo 🏨 HOTEL BOOKING SYSTEM - Development Setup
echo =============================================

:: Check if MySQL is running
echo 📋 Checking MySQL...
docker ps | findstr hotel_booking_mysql >nul
if %errorlevel% neq 0 (
    echo 🗄️  Starting MySQL container...
    docker run -d ^
      --name hotel_booking_mysql ^
      -e MYSQL_ROOT_PASSWORD=password ^
      -e MYSQL_DATABASE=hotel_booking ^
      -e MYSQL_USER=hotel_user ^
      -e MYSQL_PASSWORD=hotel_password ^
      -p 3307:3306 ^
      mysql:8.0
    echo ✅ MySQL started on port 3307
) else (
    echo ✅ MySQL is already running
)

:: Wait for MySQL to be ready
echo ⏳ Waiting for MySQL to be ready...
timeout /t 10 /nobreak >nul

:: Create .env files
echo 📋 Creating environment files...

:: Backend .env
(
echo DATABASE_URL=mysql+pymysql://hotel_user:hotel_password@localhost:3307/hotel_booking
echo SECRET_KEY=your-super-secret-key-change-in-production
echo ALGORITHM=HS256
echo ACCESS_TOKEN_EXPIRE_MINUTES=30
echo DEBUG=true
echo HOST=0.0.0.0
echo PORT=8000
echo CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]
) > backend\.env

:: Frontend .env
(
echo REACT_APP_API_URL=http://localhost:8000/api/v1
) > frontend\.env

echo ✅ Environment files created

:: Menu
echo 🎯 What would you like to run?
echo 1) Backend only
echo 2) Frontend only
echo 3) Both (requires 2 terminals)
echo 4) Exit

set /p choice=Enter your choice (1-4): 

if %choice%==1 goto backend
if %choice%==2 goto frontend
if %choice%==3 goto both
if %choice%==4 goto exit
echo ❌ Invalid choice
goto exit

:backend
echo 🐍 Starting Backend...
cd backend

:: Create virtual environment if not exists
if not exist "hotel_env" (
    echo 📦 Creating virtual environment...
    python -m venv hotel_env
)

:: Activate virtual environment
call hotel_env\Scripts\activate

:: Install dependencies
echo 📦 Installing backend dependencies...
pip install -r requirements.txt

:: Run backend server
echo 🚀 Backend starting on http://localhost:8000
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
goto exit

:frontend
echo ⚛️  Starting Frontend...
cd frontend

:: Install dependencies
echo 📦 Installing frontend dependencies...
npm install

:: Start frontend
echo 🚀 Frontend starting on http://localhost:3000
npm start
goto exit

:both
echo 🔄 Running both services...
echo 📊 Backend: http://localhost:8000
echo 📊 Frontend: http://localhost:3000
echo 📊 API Docs: http://localhost:8000/docs
echo ⚠️  You need to run backend and frontend in separate terminals
echo    Terminal 1: run-dev.bat (choose option 1)
echo    Terminal 2: run-dev.bat (choose option 2)
goto exit

:exit
echo 👋 Goodbye!
pause 