#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🏨 HOTEL BOOKING SYSTEM - Development Setup${NC}"
echo -e "${YELLOW}=============================================${NC}"

# Check if MySQL is running
echo -e "${YELLOW}📋 Checking MySQL...${NC}"
if ! docker ps | grep -q hotel_booking_mysql; then
    echo -e "${YELLOW}🗄️  Starting MySQL container...${NC}"
    docker run -d \
      --name hotel_booking_mysql \
      -e MYSQL_ROOT_PASSWORD=password \
      -e MYSQL_DATABASE=hotel_booking \
      -e MYSQL_USER=hotel_user \
      -e MYSQL_PASSWORD=hotel_password \
      -p 3307:3306 \
      mysql:8.0
    echo -e "${GREEN}✅ MySQL started on port 3307${NC}"
else
    echo -e "${GREEN}✅ MySQL is already running${NC}"
fi

# Wait for MySQL to be ready
echo -e "${YELLOW}⏳ Waiting for MySQL to be ready...${NC}"
sleep 10

# Function to run backend
run_backend() {
    echo -e "${YELLOW}🐍 Starting Backend...${NC}"
    cd backend
    
    # Create virtual environment if not exists
    if [ ! -d "hotel_env" ]; then
        echo -e "${YELLOW}📦 Creating virtual environment...${NC}"
        python -m venv hotel_env
    fi
    
    # Activate virtual environment
    source hotel_env/bin/activate
    
    # Install dependencies
    echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
    pip install -r requirements.txt
    
    # Run backend server
    echo -e "${GREEN}🚀 Backend starting on http://localhost:8000${NC}"
    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
}

# Function to run frontend
run_frontend() {
    echo -e "${YELLOW}⚛️  Starting Frontend...${NC}"
    cd frontend
    
    # Install dependencies
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
    
    # Start frontend
    echo -e "${GREEN}🚀 Frontend starting on http://localhost:3000${NC}"
    npm start
}

# Create .env files if they don't exist
echo -e "${YELLOW}📋 Creating environment files...${NC}"

# Backend .env
cat > backend/.env << EOF
DATABASE_URL=mysql+pymysql://hotel_user:hotel_password@localhost:3307/hotel_booking
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DEBUG=true
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]
EOF

# Frontend .env
cat > frontend/.env << EOF
REACT_APP_API_URL=http://localhost:8000/api/v1
EOF

echo -e "${GREEN}✅ Environment files created${NC}"

# Menu to choose what to run
echo -e "${YELLOW}🎯 What would you like to run?${NC}"
echo "1) Backend only"
echo "2) Frontend only"
echo "3) Both (requires 2 terminals)"
echo "4) Exit"

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        run_backend
        ;;
    2)
        run_frontend
        ;;
    3)
        echo -e "${YELLOW}🔄 Running both services...${NC}"
        echo -e "${GREEN}📊 Backend: http://localhost:8000${NC}"
        echo -e "${GREEN}📊 Frontend: http://localhost:3000${NC}"
        echo -e "${GREEN}📊 API Docs: http://localhost:8000/docs${NC}"
        echo -e "${YELLOW}⚠️  You need to run backend and frontend in separate terminals${NC}"
        echo -e "${YELLOW}   Terminal 1: ./run-dev.sh (choose option 1)${NC}"
        echo -e "${YELLOW}   Terminal 2: ./run-dev.sh (choose option 2)${NC}"
        ;;
    4)
        echo -e "${GREEN}👋 Goodbye!${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac 