from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Dict, Any
import numpy as np
import pandas as pd
import logging
import requests
import yfinance as yf

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Trading Strategy API",
    description="FastAPI backend for EMA pullback trading strategy",
    version="1.0.0"
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
TEST = ["NVDA"]
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

def calculate_indicators(data: pd.DataFrame) -> pd.DataFrame:
    """Calculate technical indicators"""
    try:
        # Simple EMA calculation
        data['EMA50'] = data['Close'].ewm(span=50, min_periods=1).mean()
        data['EMA200'] = data['Close'].ewm(span=200, min_periods=1).mean()
        
        # Simple RSI calculation
        delta = data['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14, min_periods=1).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14, min_periods=1).mean()
        rs = gain / loss.replace(0, np.nan)  # Avoid division by zero
        data['RSI'] = 100 - (100 / (1 + rs))
        data['RSI'] = data['RSI'].fillna(50)  # Fill initial NaN with neutral value
        
        # Simple MACD
        data['MACD'] = data['Close'].ewm(span=12, min_periods=1).mean() - data['Close'].ewm(span=26, min_periods=1).mean()
        data['MACD_Signal'] = data['MACD'].ewm(span=9, min_periods=1).mean()
        data['Volume_MA'] = data['Volume'].rolling(window=20, min_periods=1).mean()
        
        return data
    except Exception as e:
        logger.error(f"Error calculating indicators: {e}")
        return data

@app.get("/")
async def root():
    return {"message": "Trading Strategy API is running", "version": "1.0.0"}

@app.get("/api/market-data")
async def get_market_data(symbol: str = Query("SPY")):
    """Get price and volume data for charting."""
    try:
        df = get_stock_data(symbol, period="1d")
        df = calculate_indicators(df)
        recent = df.tail(24)
        market_data = [
            {
                "time": idx.strftime("%H:%M"),
                "price": round(row["Close"], 2),
                "volume": int(row["Volume"])
            }
            for idx, row in recent.iterrows()
        ]
        return {"data": market_data}
    except Exception as e:
        logger.error(f"Error in get_market_data: {e}")
        raise HTTPException(status_code=500, detail="Error fetching market data")

@app.get("/api/nasdaq-top-10")
async def get_nasdaq_top_10():
    """Return technical indicators for Nasdaq top 10 stocks."""
    stocks = []
    try:
        for symbol in NASDAQ_TOP_10:
            df = get_stock_data(symbol, period="1d")
            df = calculate_indicators(df)
            if df.empty or df.isnull().all().all():
                continue
            last_row = df.iloc[-1]
            stocks.append({
                "symbol": symbol,
                "time": last_row.name.strftime("%Y-%m-%d %H:%M"),
                "price": round(last_row["Close"], 2),
                "volume": int(last_row["Volume"]),
                "ema50": round(last_row["EMA50"], 2) if not pd.isna(last_row["EMA50"]) else None,
                "ema200": round(last_row["EMA200"], 2) if not pd.isna(last_row["EMA200"]) else None,
                "rsi": round(last_row["RSI"], 2) if not pd.isna(last_row["RSI"]) else None,
                "macd": round(last_row["MACD"], 2) if not pd.isna(last_row["MACD"]) else None,
                "macd_signal": round(last_row["MACD_Signal"], 2) if not pd.isna(last_row["MACD_Signal"]) else None,
                "volume_ma": int(last_row["Volume_MA"]) if not pd.isna(last_row["Volume_MA"]) else None
            })
        return {"data": stocks}
    except Exception as e:
        logger.error(f"Error in get_nasdaq_top_10: {e}")
        raise HTTPException(status_code=500, detail="Error fetching Nasdaq top 10 data")

@app.get("/api/trading-signals")
async def get_trading_signals(symbols: List[str] = Query(None)):
    """
    Return 1-day analysis and 1 trading signal for all tracked symbols.
    If 'symbols' query param is provided, only those symbols are analyzed.
    """
    if symbols is None or len(symbols) == 0:
        symbols = NASDAQ_TOP_10 + CRYPTO_TOP_10 + CURRENCY_TOP_10 + COMMODITY_TOP_10
        #symbols = TEST  # Default to Nasdaq top 10 if no symbols provided
    results = []
    for symbol in symbols:
        try:
            df = get_stock_data(symbol, period="1d")
            df = calculate_indicators(df)
            if df.empty or df.isnull().all().all():
                results.append({
                    "symbol": symbol,
                    "analysis": {},
                    "signal": {},
                    "message": "No data available for the selected symbol."
                })
                continue
            last_row = df.iloc[-1]
            analysis = {
                "symbol": symbol,
                "time": last_row.name.strftime("%Y-%m-%d %H:%M"),
                "price": round(last_row["Close"], 2),
                "volume": int(last_row["Volume"]),
                "ema50": round(last_row["EMA50"], 2) if not pd.isna(last_row["EMA50"]) else None,
                "ema200": round(last_row["EMA200"], 2) if not pd.isna(last_row["EMA200"]) else None,
                "rsi": round(last_row["RSI"], 2) if not pd.isna(last_row["RSI"]) and last_row["RSI"] is not None else None,
                "macd": round(last_row["MACD"], 2) if not pd.isna(last_row["MACD"]) else None,
                "macd_signal": round(last_row["MACD_Signal"], 2) if not pd.isna(last_row["MACD_Signal"]) else None,
                "volume_ma": int(last_row["Volume_MA"]) if not pd.isna(last_row["Volume_MA"]) and last_row["Volume_MA"] is not None else None
            }
            ema50 = last_row["EMA50"]
            ema200 = last_row["EMA200"]
            rsi = last_row["RSI"]
            if ema50 > ema200 and rsi < 70:
                signal_type = "BUY"
            elif ema50 < ema200 or rsi > 70:
                signal_type = "SELL"
            else:
                signal_type = "HOLD"
            signal = {
                "symbol": symbol,
                "signal": signal_type,
                "price": round(last_row["Close"], 2),
                "confidence": int(np.random.randint(70, 95)),
                "time": last_row.name.strftime("%Y-%m-%d %H:%M")
            }
            results.append({
                "symbol": symbol,
                "analysis": analysis,
                "signal": signal
            })
        except Exception as e:
            logger.error(f"Error in get_trading_signals for {symbol}: {e}")
            results.append({
                "symbol": symbol,
                "analysis": {},
                "signal": {},
                "message": f"Error fetching trading signals: {str(e)}"
            })
    return {"results": results}

@app.get("/api/strategy-status")
async def get_strategy_status(symbol: str = Query("SPY")):
    """Return strategy status for selected stock."""
    try:
        df = get_stock_data(symbol, period="1d")
        df = calculate_indicators(df)
        if df.empty or df.isnull().all().all():
            raise ValueError("No data available for symbol")
        last_row = df.iloc[-1]
        status = {
            "dailyTrend": "UP" if last_row['EMA50'] > last_row['EMA200'] else "DOWN",
            "ema50": round(last_row['EMA50'], 2) if not pd.isna(last_row['EMA50']) else None,
            "ema200": round(last_row['EMA200'], 2) if not pd.isna(last_row['EMA200']) else None,
            "rsi": round(last_row['RSI'], 2) if not pd.isna(last_row['RSI']) else None,
            "macd": "BULLISH" if last_row['MACD'] > last_row['MACD_Signal'] else "BEARISH" if not pd.isna(last_row['MACD']) and not pd.isna(last_row['MACD_Signal']) else None,
            "volumeSpike": bool(last_row['Volume'] > last_row['Volume_MA']) if not pd.isna(last_row['Volume']) and not pd.isna(last_row['Volume_MA']) else None,
            "lastUpdate": last_row.name.strftime("%Y-%m-%d %H:%M:%S")
        }
        return {"status": status}
    except Exception as e:
        logger.error(f"Error in get_strategy_status: {e}")
        raise HTTPException(status_code=500, detail="Error fetching strategy status")

class BacktestRequest(BaseModel):
    symbol: str = "SPY"
    period: str = "1mo"

@app.post("/api/backtest")
async def backtest_strategy(request: BacktestRequest = Body(default=BacktestRequest())):
    """Run backtest for Nasdaq top 10 stocks and return per-stock results with trade history."""
    results = []
    for symbol in NASDAQ_TOP_10:
        df = get_stock_data(symbol, request.period)
        df = calculate_indicators(df)
        df = df.dropna(subset=["EMA50", "EMA200", "RSI"])
        trades = []
        position = None
        entry_price = 0.0
        total_pnl = 0.0
        for idx, row in df.iterrows():
            # Buy signal
            if position is None and row["EMA50"] > row["EMA200"] and 30 < row["RSI"] < 70:
                position = "LONG"
                entry_price = row["Close"]
                trades.append({"type": "BUY", "price": entry_price, "time": idx.strftime("%Y-%m-%d %H:%M"), "pnl": ""})
            # Sell signal
            elif position == "LONG" and (row["EMA50"] < row["EMA200"] or row["RSI"] > 70):
                exit_price = row["Close"]
                pnl = round(exit_price - entry_price, 2)
                trades.append({"type": "SELL", "price": exit_price, "time": idx.strftime("%Y-%m-%d %H:%M"), "pnl": f"{pnl:.2f}"})
                total_pnl += pnl
                position = None
        returns = [float(trade["pnl"]) for trade in trades if trade["type"] == "SELL"]
        total_trades = len(returns)
        win_trades = [r for r in returns if r > 0]
        win_rate = round(len(win_trades) / total_trades * 100, 2) if total_trades > 0 else 0
        avg_return = round(np.mean(returns), 2) if returns else 0
        max_drawdown = round(np.min(returns), 2) if returns else 0
        sharpe_ratio = round(np.mean(returns) / np.std(returns), 2) if len(returns) > 1 and np.std(returns) != 0 else 0
        results.append({
            "symbol": symbol,
            "totalTrades": total_trades,
            "winRate": win_rate,
            "avgReturn": avg_return,
            "maxDrawdown": max_drawdown,
            "sharpeRatio": sharpe_ratio,
            "trades": trades,
            "totalPnL": round(total_pnl, 2)
        })
    return {"results": results}

def generate_trading_signals(data: pd.DataFrame) -> List[Dict[str, Any]]:
    """Generate simple trading signals based on EMA & RSI"""
    signals = []
    last_row = data.iloc[-1]

    # EMA crossover strategy
    if last_row['EMA50'] > last_row['EMA200']:
        signal = "BUY"
    elif last_row['EMA50'] < last_row['EMA200']:
        signal = "SELL"
    else:
        signal = "HOLD"

    # Add RSI filter
    if last_row['RSI'] > 70:
        signal = "SELL"
    elif last_row['RSI'] < 30:
        signal = "BUY"

    signals.append({
        "symbol": "SPY",
        "signal": signal,
        "price": round(last_row['Close'], 2),
        "confidence": np.random.randint(70, 95),  # placeholder confidence
        "time": last_row.name.strftime("%Y-%m-%d %H:%M")
    })

    return signals

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)