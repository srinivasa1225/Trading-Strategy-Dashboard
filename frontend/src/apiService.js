// apiService.js - Utility functions for API calls

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Symbol lists matching the backend
export const NASDAQ_TOP_10 = ["NVDA", "AMZN", "MSFT", "PLTR", "AAPL", "GOOGL", "TSLA", "AMD", "SMCI", "UBER"];
export const CRYPTO_TOP_10 = [
  "BTC-USD", "ETH-USD", "BNB-USD", "SOL-USD", "XRP-USD",
  "DOGE-USD", "ADA-USD", "AVAX-USD", "SHIB-USD", "DOT-USD"
];
export const CURRENCY_TOP_10 = [
  "EURUSD=X", "USDJPY=X", "GBPUSD=X", "AUDUSD=X", "USDCAD=X",
  "USDCHF=X", "NZDUSD=X", "EURJPY=X", "EURGBP=X", "EURCHF=X"
];
export const COMMODITY_TOP_10 = [
  "GC=F", "SI=F", "CL=F", "BZ=F", "NG=F",
  "HG=F", "PL=F", "PA=F", "ZC=F", "ZS=F"
];

// Enhanced API service class
export class TradingAPIService {
  constructor(baseUrl = API_BASE) {
    this.baseUrl = baseUrl;
  }

  /**
   * Handle API response and errors
   */
  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API Error ${response.status}: ${errorData}`);
    }
    return await response.json();
  }

  /**
   * Make GET request with error handling
   */
  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });

    try {
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make POST request with error handling
   */
  async post(endpoint, body = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Get basic market data for a symbol
   */
  async getMarketData(symbol = 'SPY') {
    try {
      return await this.get('/api/market-data', { symbol });
    } catch (error) {
      console.warn(`Fallback: Using mock data for ${symbol}`);
      return this.getMockMarketData(symbol);
    }
  }

  /**
   * Get comprehensive pullback analysis for a symbol
   */
  async getPullbackAnalysis(symbol) {
    return await this.get(`/api/pullback-analysis/${symbol}`);
  }

  /**
   * Scan multiple symbols for pullback opportunities
   */
  async scanPullbackOpportunities(options = {}) {
    const {
      symbols = NASDAQ_TOP_10.slice(0, 5), // Limit for performance
      minConfidence = 70,
      maxSymbols = 10
    } = options;

    const params = {
      min_confidence: minConfidence
    };

    // Add symbols as comma-separated string if provided
    if (symbols && symbols.length > 0) {
      params.symbols = symbols.slice(0, maxSymbols).join(',');
    }

    return await this.get('/api/pullback-scanner', params);
  }

  /**
   * Run backtest for a specific symbol
   */
  async getStrategyBacktest(symbol, options = {}) {
    const {
      period = '1y',
      initialCapital = 10000
    } = options;

    return await this.get(`/api/strategy-backtest/${symbol}`, {
      period,
      initial_capital: initialCapital
    });
  }

  /**
   * Check API health
   */
  async checkHealth() {
    try {
      const response = await this.get('/');
      return { connected: true, data: response };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  /**
   * Get all available symbol lists
   */
  getSymbolLists() {
    return {
      nasdaq: NASDAQ_TOP_10,
      crypto: CRYPTO_TOP_10,
      currencies: CURRENCY_TOP_10,
      commodities: COMMODITY_TOP_10
    };
  }

  /**
   * Mock market data for fallback
   */
  getMockMarketData(symbol) {
    const basePrice = Math.random() * 200 + 50;
    const data = [];
    
    for (let i = 0; i < 24; i++) {
      const time = new Date();
      time.setHours(9 + Math.floor(i / 2), (i % 2) * 30, 0, 0);
      
      const priceChange = (Math.random() - 0.5) * 4;
      const price = Math.max(basePrice + priceChange, basePrice * 0.9);
      const volume = Math.floor(Math.random() * 2000 + 1000);

      data.push({
        time: time.toTimeString().slice(0, 5),
        price: Math.round(price * 100) / 100,
        volume: volume
      });
    }

    return { data };
  }

  /**
   * Get mock pullback analysis for fallback
   */
  getMockPullbackAnalysis(symbol) {
    const mockPrice = Math.random() * 200 + 50;
    const stopLoss = mockPrice * 0.95;
    const target1 = mockPrice * 1.04;
    const target2 = mockPrice * 1.06;

    return {
      analysis: {
        symbol,
        signal: ['STRONG_BUY', 'BUY', 'WEAK_BUY', 'HOLD'][Math.floor(Math.random() * 4)],
        confidence: Math.floor(Math.random() * 40 + 60),
        signal_strength: Math.floor(Math.random() * 30 + 70),
        criteria: {
          "1_daily_trend": {
            met: Math.random() > 0.3,
            ema_trend: Math.random() > 0.4,
            hh_hl_structure: Math.random() > 0.5,
            details: `EMA50: ${(mockPrice * 0.98).toFixed(2)}, EMA200: ${(mockPrice * 0.95).toFixed(2)}`
          },
          "2_pullback": {
            met: Math.random() > 0.4,
            near_ema50: Math.random() > 0.5,
            distance_pct: Math.random() * 3,
            details: `Price: ${mockPrice.toFixed(2)}, EMA50: ${(mockPrice * 0.98).toFixed(2)}`
          },
          "3_4h_confirmation": {
            met: Math.random() > 0.4,
            pattern: ['HAMMER', 'BULLISH_ENGULFING', 'MORNING_STAR', 'BULLISH_CANDLE'][Math.floor(Math.random() * 4)],
            pattern_confidence: Math.floor(Math.random() * 40 + 60),
            rsi: Math.random() * 40 + 30,
            macd_bullish: Math.random() > 0.5,
            details: `RSI: ${(Math.random() * 40 + 30).toFixed(1)}, MACD: ${(Math.random() * 2 - 1).toFixed(4)}`
          },
          "4_volume_spike": {
            met: Math.random() > 0.5,
            current_volume: Math.floor(Math.random() * 5000 + 2000),
            avg_volume: Math.floor(Math.random() * 3000 + 1500),
            spike_ratio: Math.random() * 2 + 1
          },
          "5_stop_loss": {
            met: true,
            stop_price: stopLoss.toFixed(2),
            risk_per_share: (mockPrice - stopLoss).toFixed(2),
            risk_pct: ((mockPrice - stopLoss) / mockPrice * 100).toFixed(2),
            atr: (mockPrice * 0.02).toFixed(2)
          },
          "6_risk_reward": {
            met: true,
            target_2r: target1.toFixed(2),
            target_3r: target2.toFixed(2),
            risk_reward_2r: "1:2",
            risk_reward_3r: "1:3"
          }
        },
        trade_setup: {
          entry_price: mockPrice.toFixed(2),
          stop_loss: stopLoss.toFixed(2),
          target_1: target1.toFixed(2),
          target_2: target2.toFixed(2),
          risk_amount: (mockPrice - stopLoss).toFixed(2),
          reward_1: ((target1 - mockPrice)).toFixed(2),
          reward_2: ((target2 - mockPrice)).toFixed(2)
        },
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Get mock scanner results for fallback
   */
  getMockScannerResults() {
    const opportunities = [];
    const symbols = NASDAQ_TOP_10.slice(0, 5);

    symbols.forEach(symbol => {
      if (Math.random() > 0.4) { // 60% chance of opportunity
        const mockAnalysis = this.getMockPullbackAnalysis(symbol);
        opportunities.push(mockAnalysis.analysis);
      }
    });

    return {
      opportunities,
      total_scanned: symbols.length,
      opportunities_found: opportunities.length,
      success: true
    };
  }

  /**
   * Get mock backtest results for fallback
   */
  getMockBacktestResults(symbol) {
    const totalTrades = Math.floor(Math.random() * 30 + 15);
    const winRate = Math.random() * 30 + 55; // 55-85%
    const winningTrades = Math.floor(totalTrades * winRate / 100);
    const losingTrades = totalTrades - winningTrades;
    
    const avgWin = Math.random() * 3 + 1; // 1-4%
    const avgLoss = -(Math.random() * 2 + 0.5); // -0.5 to -2.5%
    
    const totalReturn = winningTrades * avgWin + losingTrades * avgLoss;
    const initialCapital = 10000;

    // Generate some sample trades
    const trades = [];
    for (let i = 0; i < Math.min(totalTrades, 10); i++) {
      const isWin = Math.random() < winRate / 100;
      const returnPct = isWin ? avgWin * (0.5 + Math.random()) : avgLoss * (0.5 + Math.random());
      const entryPrice = Math.random() * 200 + 50;
      const exitPrice = entryPrice * (1 + returnPct / 100);
      const shares = Math.floor(Math.random() * 100 + 10);
      const pnl = (exitPrice - entryPrice) * shares;

      const entryDate = new Date();
      entryDate.setDate(entryDate.getDate() - Math.floor(Math.random() * 365));
      const exitDate = new Date(entryDate);
      exitDate.setDate(exitDate.getDate() + Math.floor(Math.random() * 10 + 1));

      trades.push({
        entry_date: entryDate.toISOString().split('T')[0],
        exit_date: exitDate.toISOString().split('T')[0],
        entry_price: entryPrice.toFixed(2),
        exit_price: exitPrice.toFixed(2),
        shares: shares,
        pnl: pnl.toFixed(2),
        return_pct: returnPct.toFixed(2),
        exit_reason: isWin ? 'TARGET_HIT' : 'STOP_LOSS'
      });
    }

    return {
      symbol,
      period: '1y',
      initial_capital: initialCapital,
      metrics: {
        total_trades: totalTrades,
        winning_trades: winningTrades,
        losing_trades: losingTrades,
        win_rate: winRate.toFixed(2),
        total_return: totalReturn.toFixed(2),
        total_return_pct: (totalReturn / initialCapital * 100).toFixed(2),
        avg_win: avgWin.toFixed(2),
        avg_loss: avgLoss.toFixed(2),
        final_capital: (initialCapital + totalReturn).toFixed(2)
      },
      trades: trades.reverse(), // Show most recent first
      success: true
    };
  }
}

// Export singleton instance
export const apiService = new TradingAPIService();

// Export utility functions
export const utils = {
  /**
   * Format currency values
   */
  formatCurrency(value, decimals = 2) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  },

  /**
   * Format percentage values
   */
  formatPercentage(value, decimals = 2) {
    return `${parseFloat(value).toFixed(decimals)}%`;
  },

  /**
   * Get signal color class
   */
  getSignalColorClass(signal) {
    const colorMap = {
      'STRONG_BUY': 'bg-green-100 text-green-800 border-green-200',
      'BUY': 'bg-blue-100 text-blue-800 border-blue-200',
      'WEAK_BUY': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'HOLD': 'bg-gray-100 text-gray-800 border-gray-200',
      'SELL': 'bg-red-100 text-red-800 border-red-200',
      'STRONG_SELL': 'bg-red-100 text-red-800 border-red-200'
    };
    return colorMap[signal] || colorMap['HOLD'];
  },

  /**
   * Calculate risk-reward ratio
   */
  calculateRiskReward(entryPrice, stopLoss, target) {
    const risk = entryPrice - stopLoss;
    const reward = target - entryPrice;
    return risk > 0 ? (reward / risk).toFixed(2) : '0';
  },

  /**
   * Validate symbol format
   */
  isValidSymbol(symbol) {
    // Basic validation - alphanumeric, hyphens, equals signs for forex/crypto
    return /^[A-Z0-9\-=.]+$/i.test(symbol);
  },

  /**
   * Get symbol type based on format
   */
  getSymbolType(symbol) {
    if (symbol.includes('-USD')) return 'crypto';
    if (symbol.includes('=X')) return 'forex';
    if (symbol.includes('=F')) return 'commodity';
    return 'stock';
  }
};

// Export constants for easy import
export const SIGNAL_TYPES = {
  STRONG_BUY: 'STRONG_BUY',
  BUY: 'BUY',
  WEAK_BUY: 'WEAK_BUY',
  HOLD: 'HOLD',
  SELL: 'SELL',
  STRONG_SELL: 'STRONG_SELL'
};

export const MARKET_TYPES = {
  NASDAQ: 'nasdaq',
  CRYPTO: 'crypto',
  FOREX: 'forex',
  COMMODITIES: 'commodities'
};

export default apiService;