# Trading Strategy Dashboard

A full-stack application with React frontend and FastAPI backend for monitoring and analyzing the EMA pullback trading strategy.

## Quick Setup

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Features
- Real-time trading dashboard
- EMA pullback strategy monitoring
- Interactive charts and signals
- Backtesting capabilities
- Responsive design

## API Endpoints
- GET /api/market-data
- GET /api/trading-signals
- GET /api/strategy-status
- POST /api/backtest

## Trading Strategy (6 Steps)
1. Daily Trend = Up (EMA50 > EMA200)
2. Price pulls back to EMA50
3. 4H bullish candle + RSI>50 + MACD confirmation
4. Volume spike confirms breakout
5. Stop Loss = below swing low/1 ATR
6. Target = 2x to 3x risk

Access dashboard at: http://localhost:3000
API documentation at: http://localhost:8000/docs
