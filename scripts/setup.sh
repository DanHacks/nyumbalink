#!/bin/bash

echo "NyumbaLink Setup Script"
echo "======================="

echo ""
echo "Setting up Backend..."
cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "Virtual environment created"
fi

source venv/bin/activate
pip install -r requirements.txt
echo "Backend dependencies installed"

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo ".env file created from .env.example"
fi

echo ""
echo "Setting up Frontend..."
cd ../frontend

if [ ! -d "node_modules" ]; then
    npm install
    echo "Frontend dependencies installed"
fi

echo ""
echo "Setup complete!"
echo ""
echo "To run the project:"
echo "  1. Start PostgreSQL and Redis"
echo "  2. cd backend && source venv/bin/activate && python run.py"
echo "  3. cd frontend && npm run dev"
echo ""
echo "Or use Docker: docker-compose up"
