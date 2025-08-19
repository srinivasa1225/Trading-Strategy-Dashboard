from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import requests
from typing import List, Dict, Any, Optional
import logging
import time

import yfinance as yf

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Enhanced EMA Pullback Trading Strategy API",
    description="FastAPI backend for comprehensive EMA pullback trading strategy with all 6 criteria",
    version="2.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Symbol lists
NASDAQ_TOP_10 = ["NVDA", "AMZN", "MSFT", "PLTR", "AAPL", "GOOGL", "TSLA", "AMD", "SMCI", "UBER"]
CRYPTO_TOP_10 = [
    "BTC-USD", "ETH-USD", "BNB-USD", "SOL-USD", "XRP-USD",
    "DOGE-USD", "ADA-USD", "AVAX-USD", "SHIB-USD", "DOT-USD"
]
CURRENCY_TOP_10 = [
    "EURUSD=X", "USDJPY=X", "GBPUSD=X", "AUDUSD=X", "USDCAD=X",
    "USDCHF=X", "NZDUSD=X", "EURJPY=X", "EURGBP=X", "EURCHF=X"
]
COMMODITY_TOP_10 = [
    "GC=F", "SI=F", "CL=F", "BZ=F", "NG=F",
    "HG=F", "PL=F", "PA=F", "ZC=F", "ZS=F"
]

def get_stock_data(symbol: str = "SPY", period: str = "1d", interval: str = "1h") -> pd.DataFrame:
    """Get stock data with specified interval"""
    stock = yf.Ticker(symbol)
    df = stock.history(period=period, interval=interval)
    df = df.rename(columns={"Open": "Open", "High": "High", "Low": "Low", "Close": "Close", "Volume": "Volume"})
    return df[["Open", "High", "Low", "Close", "Volume"]]

def calculate_atr(data: pd.DataFrame, period: int = 14) -> pd.Series:
    """Calculate Average True Range"""
    high_low = data['High'] - data['Low']
    high_close = np.abs(data['High'] - data['Close'].shift())
    low_close = np.abs(data['Low'] - data['Close'].shift())
    
    true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    return true_range.rolling(window=period, min_periods=1).mean()

def detect_swing_points(data: pd.DataFrame, window: int = 5) -> Dict[str, List]:
    """Detect swing highs and lows"""
    swing_highs = []
    swing_lows = []
    
    for i in range(window, len(data) - window):
        # Swing high: highest point in the window
        if data['High'].iloc[i] == data['High'].iloc[i-window:i+window+1].max():
            swing_highs.append({'index': i, 'price': data['High'].iloc[i], 'time': data.index[i]})
        
        # Swing low: lowest point in the window
        if data['Low'].iloc[i] == data['Low'].iloc[i-window:i+window+1].min():
            swing_lows.append({'index': i, 'price': data['Low'].iloc[i], 'time': data.index[i]})
    
    return {'highs': swing_highs, 'lows': swing_lows}

def check_higher_highs_lows(swing_points: Dict) -> bool:
    """Check for Higher Highs and Higher Lows structure"""
    highs = swing_points['highs']
    lows = swing_points['lows']
    
    if len(highs) < 2 or len(lows) < 2:
        return False
    
    # Check last 2 highs and lows
    recent_highs = sorted(highs, key=lambda x: x['time'])[-2:]
    recent_lows = sorted(lows, key=lambda x: x['time'])[-2:]
    
    higher_highs = recent_highs[1]['price'] > recent_highs[0]['price']
    higher_lows = recent_lows[1]['price'] > recent_lows[0]['price']
    
    return higher_highs and higher_lows

def detect_bullish_patterns(data: pd.DataFrame) -> Dict[str, Any]:
    """Detect bullish candlestick patterns"""
    if len(data) < 3:
        return {'pattern': 'NONE', 'confidence': 0}
    
    current = data.iloc[-1]
    prev1 = data.iloc[-2]
    prev2 = data.iloc[-3] if len(data) > 2 else None
    
    # Hammer pattern
    body = abs(current['Close'] - current['Open'])
    upper_shadow = current['High'] - max(current['Open'], current['Close'])
    lower_shadow = min(current['Open'], current['Close']) - current['Low']
    
    if lower_shadow > 2 * body and upper_shadow < body:
        return {'pattern': 'HAMMER', 'confidence': 75}
    
    # Bullish Engulfing
    if (prev1['Close'] < prev1['Open'] and  # Previous red candle
        current['Close'] > current['Open'] and  # Current green candle
        current['Open'] < prev1['Close'] and  # Opens below prev close
        current['Close'] > prev1['Open']):  # Closes above prev open
        return {'pattern': 'BULLISH_ENGULFING', 'confidence': 85}
    
    # Morning Star (3-candle pattern)
    if prev2 is not None:
        if (prev2['Close'] < prev2['Open'] and  # First candle red
            abs(prev1['Close'] - prev1['Open']) < body * 0.3 and  # Middle doji/small body
            current['Close'] > current['Open'] and  # Last candle green
            current['Close'] > (prev2['Open'] + prev2['Close']) / 2):  # Closes above midpoint
            return {'pattern': 'MORNING_STAR', 'confidence': 90}
    
    # Simple green candle
    if current['Close'] > current['Open']:
        return {'pattern': 'BULLISH_CANDLE', 'confidence': 60}
    
    return {'pattern': 'NONE', 'confidence': 0}

def calculate_enhanced_indicators(data: pd.DataFrame) -> pd.DataFrame:
    """Calculate comprehensive technical indicators"""
    try:
        data = data.copy()
        
        # EMAs
        data['EMA50'] = data['Close'].ewm(span=50, min_periods=1).mean()
        data['EMA200'] = data['Close'].ewm(span=200, min_periods=1).mean()
        
        # RSI
        delta = data['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14, min_periods=1).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14, min_periods=1).mean()
        rs = gain / loss
        data['RSI'] = 100 - (100 / (1 + rs))
        
        # MACD
        data['MACD'] = data['Close'].ewm(span=12, min_periods=1).mean() - data['Close'].ewm(span=26, min_periods=1).mean()
        data['MACD_Signal'] = data['MACD'].ewm(span=9, min_periods=1).mean()
        data['MACD_Histogram'] = data['MACD'] - data['MACD_Signal']
        
        # Volume indicators
        data['Volume_MA'] = data['Volume'].rolling(window=20, min_periods=1).mean()
        data['Volume_Spike'] = data['Volume'] > data['Volume_MA'] * 1.5
        
        # ATR for stop loss calculation
        data['ATR'] = calculate_atr(data)
        
        # Support/Resistance levels
        data['EMA50_Distance'] = abs(data['Close'] - data['EMA50']) / data['Close'] * 100
        data['Near_EMA50'] = data['EMA50_Distance'] < 2.0  # Within 2% of EMA50
        
        return data
    except Exception as e:
        logger.error(f"Error calculating enhanced indicators: {e}")
        return data

def evaluate_pullback_strategy(symbol: str, data_daily: pd.DataFrame, data_4h: pd.DataFrame) -> Dict[str, Any]:
    """
    Evaluate all 6 criteria of the EMA pullback strategy:
    1. Daily Trend = Up (EMA50 > EMA200, HH/HL structure)
    2. Price pulls back to EMA50 or strong support zone
    3. 4H chart → bullish candle pattern + RSI(>50) + MACD confirmation
    4. Volume spike confirms breakout/reversal
    5. Stop Loss = below swing low / 1 ATR
    6. Target = 2x to 3x risk (Risk-Reward ratio ≥ 1:2)
    """
    try:
        # Get latest data points
        daily_latest = data_daily.iloc[-1]
        h4_latest = data_4h.iloc[-1]
        
        # Criterion 1: Daily Trend Analysis
        daily_trend_up = daily_latest['EMA50'] > daily_latest['EMA200']
        swing_points = detect_swing_points(data_daily.tail(50))
        hh_hl_structure = check_higher_highs_lows(swing_points)
        criterion_1 = daily_trend_up and hh_hl_structure
        
        # Criterion 2: Pullback to EMA50 or Support
        near_ema50 = daily_latest['Near_EMA50']
        pullback_complete = daily_latest['Close'] >= daily_latest['EMA50'] * 0.98  # Near or above EMA50
        criterion_2 = near_ema50 and pullback_complete
        
        # Criterion 3: 4H Bullish Confirmation
        bullish_pattern = detect_bullish_patterns(data_4h.tail(3))
        rsi_bullish = h4_latest['RSI'] > 50
        macd_bullish = h4_latest['MACD'] > h4_latest['MACD_Signal']
        criterion_3 = bullish_pattern['confidence'] > 60 and rsi_bullish and macd_bullish
        
        # Criterion 4: Volume Spike
        volume_confirmation = h4_latest['Volume_Spike']
        criterion_4 = volume_confirmation
        
        # Criterion 5: Stop Loss Calculation
        recent_swing_lows = [point['price'] for point in swing_points['lows'][-3:]] if swing_points['lows'] else []
        swing_low_stop = min(recent_swing_lows) if recent_swing_lows else daily_latest['Close'] * 0.95
        atr_stop = daily_latest['Close'] - daily_latest['ATR']
        stop_loss = max(swing_low_stop, atr_stop)  # Use the higher stop for better risk management
        risk_per_share = daily_latest['Close'] - stop_loss
        criterion_5 = risk_per_share > 0
        
        # Criterion 6: Risk-Reward Ratio
        target_2r = daily_latest['Close'] + (risk_per_share * 2)
        target_3r = daily_latest['Close'] + (risk_per_share * 3)
        risk_reward_ratio = risk_per_share / daily_latest['Close'] * 100 if daily_latest['Close'] > 0 else 0
        criterion_6 = risk_reward_ratio > 0.5  # At least 0.5% risk acceptable
        
        # Overall signal strength
        criteria_met = sum([criterion_1, criterion_2, criterion_3, criterion_4, criterion_5, criterion_6])
        signal_strength = criteria_met / 6 * 100
        
        # Generate signal
        if criteria_met >= 5:
            signal = "STRONG_BUY"
            confidence = 90
        elif criteria_met >= 4:
            signal = "BUY"
            confidence = 75
        elif criteria_met >= 3:
            signal = "WEAK_BUY"
            confidence = 60
        else:
            signal = "HOLD"
            confidence = 40
        
        return {
            "symbol": symbol,
            "signal": signal,
            "confidence": confidence,
            "signal_strength": round(signal_strength, 1),
            "criteria": {
                "1_daily_trend": {
                    "met": criterion_1,
                    "ema_trend": daily_trend_up,
                    "hh_hl_structure": hh_hl_structure,
                    "details": f"EMA50: {daily_latest['EMA50']:.2f}, EMA200: {daily_latest['EMA200']:.2f}"
                },
                "2_pullback": {
                    "met": criterion_2,
                    "near_ema50": near_ema50,
                    "distance_pct": round(daily_latest['EMA50_Distance'], 2),
                    "details": f"Price: {daily_latest['Close']:.2f}, EMA50: {daily_latest['EMA50']:.2f}"
                },
                "3_4h_confirmation": {
                    "met": criterion_3,
                    "pattern": bullish_pattern['pattern'],
                    "pattern_confidence": bullish_pattern['confidence'],
                    "rsi": round(h4_latest['RSI'], 2),
                    "macd_bullish": macd_bullish,
                    "details": f"RSI: {h4_latest['RSI']:.1f}, MACD: {h4_latest['MACD']:.4f}"
                },
                "4_volume_spike": {
                    "met": criterion_4,
                    "current_volume": int(h4_latest['Volume']),
                    "avg_volume": int(h4_latest['Volume_MA']),
                    "spike_ratio": round(h4_latest['Volume'] / h4_latest['Volume_MA'], 2)
                },
                "5_stop_loss": {
                    "met": criterion_5,
                    "stop_price": round(stop_loss, 2),
                    "risk_per_share": round(risk_per_share, 2),
                    "risk_pct": round(risk_per_share / daily_latest['Close'] * 100, 2),
                    "atr": round(daily_latest['ATR'], 2)
                },
                "6_risk_reward": {
                    "met": criterion_6,
                    "target_2r": round(target_2r, 2),
                    "target_3r": round(target_3r, 2),
                    "risk_reward_2r": "1:2",
                    "risk_reward_3r": "1:3"
                }
            },
            "trade_setup": {
                "entry_price": round(daily_latest['Close'], 2),
                "stop_loss": round(stop_loss, 2),
                "target_1": round(target_2r, 2),
                "target_2": round(target_3r, 2),
                "risk_amount": round(risk_per_share, 2),
                "reward_1": round(risk_per_share * 2, 2),
                "reward_2": round(risk_per_share * 3, 2)
            },
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
    except Exception as e:
        logger.error(f"Error evaluating pullback strategy for {symbol}: {e}")
        return {
            "symbol": symbol,
            "signal": "ERROR",
            "confidence": 0,
            "error": str(e),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

@app.get("/")
def root():
    return {"message": "Enhanced EMA Pullback Trading Strategy API is running", "version": "2.0.0"}

@app.get("/api/pullback-analysis/{symbol}")
async def get_pullback_analysis(symbol: str):
    """Get comprehensive pullback strategy analysis for a symbol"""
    try:
        # Get daily and 4H data
        data_daily = get_stock_data(symbol, period="3mo", interval="1d")
        data_4h = get_stock_data(symbol, period="1mo", interval="4h")
        
        # Calculate indicators
        data_daily = calculate_enhanced_indicators(data_daily)
        data_4h = calculate_enhanced_indicators(data_4h)
        
        # Evaluate strategy
        analysis = evaluate_pullback_strategy(symbol, data_daily, data_4h)
        
        return {"analysis": analysis, "success": True}
        
    except Exception as e:
        logger.error(f"Error in pullback analysis for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing {symbol}: {str(e)}")

@app.get("/api/pullback-scanner")
async def scan_pullback_opportunities(
    symbols: Optional[List[str]] = None,
    min_confidence: int = 70
):
    """Scan multiple symbols for pullback opportunities"""
    try:
        if symbols is None:
            symbols = NASDAQ_TOP_10[:5]  # Limit for performance
        
        opportunities = []
        
        for symbol in symbols:
            try:
                # Get data
                data_daily = get_stock_data(symbol, period="3mo", interval="1d")
                data_4h = get_stock_data(symbol, period="1mo", interval="4h")
                
                # Calculate indicators
                data_daily = calculate_enhanced_indicators(data_daily)
                data_4h = calculate_enhanced_indicators(data_4h)
                
                # Evaluate strategy
                analysis = evaluate_pullback_strategy(symbol, data_daily, data_4h)
                
                # Filter by confidence
                if analysis.get('confidence', 0) >= min_confidence:
                    opportunities.append(analysis)
                    
            except Exception as e:
                logger.error(f"Error scanning {symbol}: {e}")
                continue
        
        # Sort by confidence
        opportunities.sort(key=lambda x: x.get('confidence', 0), reverse=True)
        
        return {
            "opportunities": opportunities,
            "total_scanned": len(symbols),
            "opportunities_found": len(opportunities),
            "success": True
        }
        
    except Exception as e:
        logger.error(f"Error in pullback scanner: {e}")
        raise HTTPException(status_code=500, detail=f"Scanner error: {str(e)}")

@app.get("/api/strategy-backtest/{symbol}")
async def backtest_pullback_strategy(
    symbol: str,
    period: str = "1y",
    initial_capital: float = 10000.0
):
    """Backtest the comprehensive pullback strategy"""
    try:
        # Get historical data
        data_daily = get_stock_data(symbol, period=period, interval="1d")
        data_4h = get_stock_data(symbol, period=period, interval="4h")
        
        # Calculate indicators
        data_daily = calculate_enhanced_indicators(data_daily)
        data_4h = calculate_enhanced_indicators(data_4h)
        
        trades = []
        capital = initial_capital
        position = None
        entry_info = {}
        
        # Simple backtest logic - look for signals every few days
        for i in range(50, len(data_daily) - 10, 5):  # Every 5 days, skip first 50 for indicators
            current_daily = data_daily.iloc[:i+1]
            current_4h = data_4h[data_4h.index <= data_daily.index[i]]
            
            if len(current_4h) < 10:
                continue
                
            analysis = evaluate_pullback_strategy(symbol, current_daily, current_4h)
            
            # Entry signal
            if position is None and analysis.get('signal') in ['BUY', 'STRONG_BUY']:
                entry_price = analysis['trade_setup']['entry_price']
                stop_loss = analysis['trade_setup']['stop_loss']
                target = analysis['trade_setup']['target_1']
                
                shares = int(capital * 0.02 / (entry_price - stop_loss))  # 2% risk per trade
                if shares > 0:
                    position = {
                        'entry_price': entry_price,
                        'stop_loss': stop_loss,
                        'target': target,
                        'shares': shares,
                        'entry_date': data_daily.index[i].strftime('%Y-%m-%d')
                    }
            
            # Check exit conditions
            elif position is not None:
                current_price = data_daily.iloc[i]['Close']
                
                # Stop loss hit
                if current_price <= position['stop_loss']:
                    pnl = (current_price - position['entry_price']) * position['shares']
                    capital += pnl
                    trades.append({
                        'entry_date': position['entry_date'],
                        'exit_date': data_daily.index[i].strftime('%Y-%m-%d'),
                        'entry_price': position['entry_price'],
                        'exit_price': current_price,
                        'shares': position['shares'],
                        'pnl': round(pnl, 2),
                        'return_pct': round((current_price - position['entry_price']) / position['entry_price'] * 100, 2),
                        'exit_reason': 'STOP_LOSS'
                    })
                    position = None
                
                # Target hit
                elif current_price >= position['target']:
                    pnl = (current_price - position['entry_price']) * position['shares']
                    capital += pnl
                    trades.append({
                        'entry_date': position['entry_date'],
                        'exit_date': data_daily.index[i].strftime('%Y-%m-%d'),
                        'entry_price': position['entry_price'],
                        'exit_price': current_price,
                        'shares': position['shares'],
                        'pnl': round(pnl, 2),
                        'return_pct': round((current_price - position['entry_price']) / position['entry_price'] * 100, 2),
                        'exit_reason': 'TARGET_HIT'
                    })
                    position = None
        
        # Calculate performance metrics
        if trades:
            total_pnl = sum(trade['pnl'] for trade in trades)
            win_trades = [t for t in trades if t['pnl'] > 0]
            lose_trades = [t for t in trades if t['pnl'] <= 0]
            
            metrics = {
                'total_trades': len(trades),
                'winning_trades': len(win_trades),
                'losing_trades': len(lose_trades),
                'win_rate': round(len(win_trades) / len(trades) * 100, 2),
                'total_return': round(total_pnl, 2),
                'total_return_pct': round(total_pnl / initial_capital * 100, 2),
                'avg_win': round(np.mean([t['pnl'] for t in win_trades]), 2) if win_trades else 0,
                'avg_loss': round(np.mean([t['pnl'] for t in lose_trades]), 2) if lose_trades else 0,
                'final_capital': round(capital, 2)
            }
        else:
            metrics = {
                'total_trades': 0,
                'message': 'No trades generated in backtest period'
            }
        
        return {
            'symbol': symbol,
            'period': period,
            'initial_capital': initial_capital,
            'metrics': metrics,
            'trades': trades[-10:],  # Last 10 trades
            'success': True
        }
        
    except Exception as e:
        logger.error(f"Error in backtest for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Backtest error: {str(e)}")

# Keep existing endpoints for backward compatibility
@app.get("/api/market-data")
def get_market_data(symbol: str = "SPY"):
    """Get current market data for a specified symbol"""
    try:
        data = get_stock_data(symbol, period="1d")
        data = calculate_enhanced_indicators(data)
        
        market_data = []
        recent_data = data.tail(12)
        
        for idx, row in recent_data.iterrows():
            market_data.append({
                "time": idx.strftime("%H:%M"),
                "price": round(row['Close'], 2),
                "volume": int(row['Volume'])
            })
        
        return {"data": market_data}
    except Exception as e:
        logger.error(f"Error in get_market_data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Error fetching market data")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)