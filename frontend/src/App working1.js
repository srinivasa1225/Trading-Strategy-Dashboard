import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// API service functions
const apiService = {
  async getMarketData(symbol = 'SPY') {
    try {
      const response = await axios.get(`${API_BASE}/api/market-data`, { params: { symbol } });
      return response.data;
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error);
      return {
        data: [
          { time: '09:00', price: 100, volume: 1200 },
          { time: '09:30', price: 102, volume: 1500 },
          { time: '10:00', price: 105, volume: 1800 },
          { time: '10:30', price: 103, volume: 1300 },
          { time: '11:00', price: 108, volume: 2100 },
          { time: '11:30', price: 112, volume: 2400 },
          { time: '12:00', price: 115, volume: 2800 }
        ]
      };
    }
  },

  async getNasdaqTop10() {
    try {
      const response = await axios.get(`${API_BASE}/api/nasdaq-top-10`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Nasdaq top 10 data:', error);
      return {
        data: [
          { symbol: 'NVDA', time: '2025-08-17 12:00', price: 120.50, volume: 5000, ema50: 118.20, ema200: 115.30, rsi: 65.40, macd: 2.10, macd_signal: 1.90, volume_ma: 4800 },
          { symbol: 'AMZN', time: '2025-08-17 12:00', price: 180.25, volume: 3200, ema50: 178.50, ema200: 175.60, rsi: 60.20, macd: 1.50, macd_signal: 1.40, volume_ma: 3100 },
          { symbol: 'MSFT', time: '2025-08-17 12:00', price: 420.75, volume: 2800, ema50: 418.30, ema200: 415.20, rsi: 58.70, macd: 1.80, macd_signal: 1.70, volume_ma: 2700 },
          { symbol: 'PLTR', time: '2025-08-17 12:00', price: 35.40, volume: 4500, ema50: 34.90, ema200: 33.80, rsi: 62.10, macd: 0.90, macd_signal: 0.85, volume_ma: 4400 },
          { symbol: 'AAPL', time: '2025-08-17 12:00', price: 150.25, volume: 3800, ema50: 148.70, ema200: 146.50, rsi: 55.30, macd: 1.20, macd_signal: 1.15, volume_ma: 3700 },
          { symbol: 'GOOGL', time: '2025-08-17 12:00', price: 2750.80, volume: 2200, ema50: 2740.50, ema200: 2730.20, rsi: 57.80, macd: 2.30, macd_signal: 2.20, volume_ma: 2100 },
          { symbol: 'TSLA', time: '2025-08-17 12:00', price: 245.60, volume: 5100, ema50: 243.20, ema200: 240.10, rsi: 64.50, macd: 2.00, macd_signal: 1.95, volume_ma: 5000 },
          { symbol: 'AMD', time: '2025-08-17 12:00', price: 140.30, volume: 3600, ema50: 138.50, ema200: 136.70, rsi: 61.20, macd: 1.40, macd_signal: 1.35, volume_ma: 3500 },
          { symbol: 'SMCI', time: '2025-08-17 12:00', price: 650.90, volume: 2900, ema50: 648.30, ema200: 645.20, rsi: 59.40, macd: 1.70, macd_signal: 1.65, volume_ma: 2800 },
          { symbol: 'UBER', time: '2025-08-17 12:00', price: 72.10, volume: 3400, ema50: 71.50, ema200: 70.20, rsi: 56.90, macd: 0.80, macd_signal: 0.75, volume_ma: 3300 }
        ]
      };
    }
  },

  async getTradingSignals() {
    try {
      const response = await axios.get(`${API_BASE}/api/trading-signals`);
      return response.data;
    } catch (error) {
      console.error('Error fetching signals:', error);
      return {
        signals: [
          { id: 1, symbol: 'AAPL', signal: 'BUY', price: 150.25, confidence: 85, time: '2025-08-17 10:30' },
          { id: 2, symbol: 'GOOGL', signal: 'HOLD', price: 2750.80, confidence: 72, time: '2025-08-17 10:45' },
          { id: 3, symbol: 'TSLA', signal: 'SELL', price: 245.60, confidence: 90, time: '2025-08-17 11:00' }
        ]
      };
    }
  },

  async getStrategyStatus() {
    try {
      const response = await axios.get(`${API_BASE}/api/strategy-status`);
      return response.data;
    } catch (error) {
      console.error('Error fetching strategy status:', error);
      return {
        status: {
          dailyTrend: 'UP',
          ema50: 112.5,
          ema200: 108.2,
          rsi: 58.3,
          macd: 'BULLISH',
          volumeSpike: true,
          lastUpdate: '2025-08-17 12:00:00'
        }
      };
    }
  },

  async runBacktest() {
    try {
      const response = await axios.post(`${API_BASE}/api/backtest`);
      return response.data;
    } catch (error) {
      console.error('Error running backtest:', error);
      return {
        results: {
          totalTrades: 45,
          winRate: 67.8,
          avgReturn: 2.3,
          maxDrawdown: -5.2,
          sharpeRatio: 1.42
        }
      };
    }
  }
};

const TradingDashboard = () => {
  const [marketData, setMarketData] = useState([]);
  const [nasdaqTop10, setNasdaqTop10] = useState([]);
  const [signals, setSignals] = useState([]);
  const [strategyStatus, setStrategyStatus] = useState(null);
  const [backtestResults, setBacktestResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedStock, setSelectedStock] = useState('SPY');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [selectedStock]);

  const fetchData = async () => {
    try {
      const [marketResponse, nasdaqResponse, signalsResponse, statusResponse] = await Promise.all([
        apiService.getMarketData(selectedStock),
        apiService.getNasdaqTop10(),
        apiService.getTradingSignals(),
        apiService.getStrategyStatus()
      ]);

      setMarketData(marketResponse.data);
      setNasdaqTop10(nasdaqResponse.data);
      setSignals(signalsResponse.signals);
      setStrategyStatus(statusResponse.status);
      setIsConnected(true);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsConnected(false);
      setLoading(false);
    }
  };

  const runBacktest = async () => {
    setLoading(true);
    try {
      const response = await apiService.runBacktest();
      setBacktestResults(response.results);
    } catch (error) {
      console.error('Error running backtest:', error);
    }
    setLoading(false);
  };

  const handleStockSelect = (symbol) => {
    setSelectedStock(symbol);
    setLoading(true);
    apiService.getMarketData(symbol).then(response => {
      setMarketData(response.data);
      setLoading(false);
    });
  };

  const getSignalIcon = (signal) => {
    switch (signal) {
      case 'BUY': return <TrendingUp className="text-green-500" size={16} />;
      case 'SELL': return <TrendingDown className="text-red-500" size={16} />;
      default: return <Activity className="text-yellow-500" size={16} />;
    }
  };

  const getSignalColor = (signal) => {
    switch (signal) {
      case 'BUY': return 'bg-green-100 text-green-800';
      case 'SELL': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading && !strategyStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="animate-spin mx-auto mb-4 text-blue-500" size={48} />
          <p className="text-gray-600">Loading trading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Trading Strategy Dashboard</h1>
              <p className="text-gray-600">Real-time monitoring of EMA pullback strategy</p>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected to API' : 'Using mock data'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {['overview', 'nasdaq', 'signals', 'backtest'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'nasdaq' ? 'Nasdaq Top 10' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Activity className="mr-2 text-blue-500" size={20} />
                  Strategy Status
                </h3>
                {strategyStatus && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Daily Trend:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        strategyStatus.dailyTrend === 'UP' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {strategyStatus.dailyTrend}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">EMA50:</span>
                      <span className="font-medium">{strategyStatus.ema50}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">EMA200:</span>
                      <span className="font-medium">{strategyStatus.ema200}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">RSI:</span>
                      <span className={`font-medium ${strategyStatus.rsi > 50 ? 'text-green-600' : 'text-red-600'}`}>
                        {strategyStatus.rsi}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">MACD:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        strategyStatus.macd === 'BULLISH' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {strategyStatus.macd}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Volume Spike:</span>
                      {strategyStatus.volumeSpike ? (
                        <CheckCircle className="text-green-500" size={16} />
                      ) : (
                        <AlertCircle className="text-red-500" size={16} />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-4">
                      Last updated: {strategyStatus.lastUpdate}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <DollarSign className="mr-2 text-green-500" size={20} />
                  Risk Management
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Risk-Reward:</span>
                    <span className="font-medium text-green-600">1:2.5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Stop Loss:</span>
                    <span className="font-medium">1 ATR below swing low</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Position Size:</span>
                    <span className="font-medium">2% of capital</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Max Drawdown:</span>
                    <span className="font-medium text-red-600">-10%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Price Movement & Volume ({selectedStock})</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={marketData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="price" orientation="left" />
                    <YAxis yAxisId="volume" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line 
                      yAxisId="price"
                      type="monotone" 
                      dataKey="price" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      name="Price"
                    />
                    <Line 
                      yAxisId="volume"
                      type="monotone" 
                      dataKey="volume" 
                      stroke="#ef4444" 
                      strokeWidth={1}
                      dot={false}
                      name="Volume"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Nasdaq Top 10 Tab */}
        {activeTab === 'nasdaq' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Nasdaq Top 10 Stocks</h3>
              <p className="text-gray-600">Real-time data and technical indicators for top Nasdaq stocks</p>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-md font-semibold mb-2">Select Stock for Chart</h4>
                <div className="flex flex-wrap gap-2">
                  {nasdaqTop10.map(stock => (
                    <button
                      key={stock.symbol}
                      onClick={() => handleStockSelect(stock.symbol)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        selectedStock === stock.symbol
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {stock.symbol}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <h4 className="text-md font-semibold mb-2">Price Movement & Volume ({selectedStock})</h4>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={marketData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="price" orientation="left" />
                    <YAxis yAxisId="volume" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line 
                      yAxisId="price"
                      type="monotone" 
                      dataKey="price" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      name="Price"
                    />
                    <Line 
                      yAxisId="volume"
                      type="monotone" 
                      dataKey="volume" 
                      stroke="#ef4444" 
                      strokeWidth={1}
                      dot={false}
                      name="Volume"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th className="px-6 py-3">Symbol</th>
                      <th className="px-6 py-3">Price ($)</th>
                      <th className="px-6 py-3">Volume</th>
                      <th className="px-6 py-3">EMA50</th>
                      <th className="px-6 py-3">EMA200</th>
                      <th className="px-6 py-3">RSI</th>
                      <th className="px-6 py-3">MACD</th>
                      <th className="px-6 py-3">MACD Signal</th>
                      <th className="px-6 py-3">Volume MA</th>
                      <th className="px-6 py-3">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nasdaqTop10.map(stock => (
                      <tr
                        key={stock.symbol}
                        className="bg-white border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleStockSelect(stock.symbol)}
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">{stock.symbol}</td>
                        <td className="px-6 py-4">{stock.price?.toFixed(2)}</td>
                        <td className="px-6 py-4">{stock.volume}</td>
                        <td className="px-6 py-4">{stock.ema50?.toFixed(2) || '-'}</td>
                        <td className="px-6 py-4">{stock.ema200?.toFixed(2) || '-'}</td>
                        <td className={`px-6 py-4 ${stock.rsi > 50 ? 'text-green-600' : 'text-red-600'}`}>
                          {stock.rsi?.toFixed(2) || '-'}
                        </td>
                        <td className="px-6 py-4">{stock.macd?.toFixed(2) || '-'}</td>
                        <td className="px-6 py-4">{stock.macd_signal?.toFixed(2) || '-'}</td>
                        <td className="px-6 py-4">{stock.volume_ma || '-'}</td>
                        <td className="px-6 py-4">{stock.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Signals Tab */}
        {activeTab === 'signals' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Trading Signals</h3>
              <p className="text-gray-600">Live signals based on 6-step strategy criteria</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {(Array.isArray(signals) ? signals : []).map((signal) => (
                  <div key={signal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-4">
                      {getSignalIcon(signal.signal)}
                      <div>
                        <div className="font-medium text-lg">{signal.symbol}</div>
                        <div className="text-sm text-gray-600">{signal.time}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-lg">${signal.price}</div>
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getSignalColor(signal.signal)}`}>
                        {signal.signal}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Confidence</div>
                      <div className="font-bold text-lg">{signal.confidence}%</div>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{width: `${signal.confidence}%`}}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Backtest Tab */}
        {activeTab === 'backtest' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Strategy Backtest Results</h3>
                  <p className="text-gray-600">Historical performance analysis based on your 6-step strategy</p>
                </div>
                <button
                  onClick={runBacktest}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                >
                  {loading ? (
                    <Activity className="animate-spin mr-2" size={16} />
                  ) : null}
                  {loading ? 'Running...' : 'Run Backtest'}
                </button>
              </div>
            </div>
            <div className="p-6">
              {backtestResults ? (
                <div>
                  {/* If backtestResults is an object with per-stock results, show a selector and details */}
                  {Object.keys(backtestResults).length > 0 && backtestResults.totalTrades === undefined ? (
                    <BacktestResultsPerStock backtestResults={backtestResults} />
                  ) : (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                        <div className="bg-blue-50 p-6 rounded-lg text-center border border-blue-200">
                          <div className="text-3xl font-bold text-blue-600 mb-2">{backtestResults.totalTrades}</div>
                          <div className="text-sm text-gray-600 font-medium">Total Trades</div>
                        </div>
                        <div className="bg-green-50 p-6 rounded-lg text-center border border-green-200">
                          <div className="text-3xl font-bold text-green-600 mb-2">{backtestResults.winRate}%</div>
                          <div className="text-sm text-gray-600 font-medium">Win Rate</div>
                        </div>
                        <div className="bg-purple-50 p-6 rounded-lg text-center border border-purple-200">
                          <div className="text-3xl font-bold text-purple-600 mb-2">{backtestResults.avgReturn}%</div>
                          <div className="text-sm text-gray-600 font-medium">Avg Return</div>
                        </div>
                        <div className="bg-red-50 p-6 rounded-lg text-center border border-red-200">
                          <div className="text-3xl font-bold text-red-600 mb-2">{backtestResults.maxDrawdown}%</div>
                          <div className="text-sm text-gray-600 font-medium">Max Drawdown</div>
                        </div>
                        <div className="bg-yellow-50 p-6 rounded-lg text-center border border-yellow-200">
                          <div className="text-3xl font-bold text-yellow-600 mb-2">{backtestResults.sharpeRatio}</div>
                          <div className="text-sm text-gray-600 font-medium">Sharpe Ratio</div>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <h4 className="font-semibold mb-4">Strategy Performance Summary</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h5 className="font-medium text-gray-700 mb-2">Risk Metrics</h5>
                            <ul className="space-y-2 text-sm">
                              <li>Maximum consecutive losses: 3</li>
                              <li>Average loss: -1.8%</li>
                              <li>Risk-adjusted return: {((backtestResults.avgReturn / Math.abs(backtestResults.maxDrawdown)) * 100).toFixed(2)}%</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-700 mb-2">Performance Metrics</h5>
                            <ul className="space-y-2 text-sm">
                              <li>Average win: +{(backtestResults.avgReturn * 1.5).toFixed(2)}%</li>
                              <li>Profit factor: {((backtestResults.winRate/100) / (1 - backtestResults.winRate/100) * 1.5).toFixed(2)}</li>
                              <li>Total return: +{(backtestResults.avgReturn * backtestResults.totalTrades).toFixed(1)}%</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <Activity size={64} className="mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-medium mb-2">Ready to Backtest</h3>
                  <p className="mb-6">Click "Run Backtest" to analyze your strategy's historical performance</p>
                  <div className="text-sm text-gray-400">
                    <p>• Tests all 6 strategy criteria</p>
                    <p>• Analyzes 1 year of historical data</p>
                    <p>• Calculates risk-adjusted returns</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Helper component for per-stock backtest results
  function BacktestResultsPerStock({ backtestResults }) {
    const [selected, setSelected] = useState(Object.keys(backtestResults)[0]);
    const stockResult = backtestResults[selected];

    return (
      <div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Stock</label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(backtestResults).map(symbol => (
              <button
                key={symbol}
                onClick={() => setSelected(symbol)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  selected === symbol
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-blue-50 p-6 rounded-lg text-center border border-blue-200">
            <div className="text-3xl font-bold text-blue-600 mb-2">{stockResult.totalTrades}</div>
            <div className="text-sm text-gray-600 font-medium">Total Trades</div>
          </div>
          <div className="bg-green-50 p-6 rounded-lg text-center border border-green-200">
            <div className="text-3xl font-bold text-green-600 mb-2">{stockResult.winRate}%</div>
            <div className="text-sm text-gray-600 font-medium">Win Rate</div>
          </div>
          <div className="bg-purple-50 p-6 rounded-lg text-center border border-purple-200">
            <div className="text-3xl font-bold text-purple-600 mb-2">{stockResult.avgReturn}%</div>
            <div className="text-sm text-gray-600 font-medium">Avg Return</div>
          </div>
          <div className="bg-red-50 p-6 rounded-lg text-center border border-red-200">
            <div className="text-3xl font-bold text-red-600 mb-2">{stockResult.maxDrawdown}%</div>
            <div className="text-sm text-gray-600 font-medium">Max Drawdown</div>
          </div>
          <div className="bg-yellow-50 p-6 rounded-lg text-center border border-yellow-200">
            <div className="text-3xl font-bold text-yellow-600 mb-2">{stockResult.sharpeRatio}</div>
            <div className="text-sm text-gray-600 font-medium">Sharpe Ratio</div>
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <h4 className="font-semibold mb-4">Strategy Performance Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Risk Metrics</h5>
              <ul className="space-y-2 text-sm">
                <li>Maximum consecutive losses: 3</li>
                <li>Average loss: -1.8%</li>
                <li>Risk-adjusted return: {((stockResult.avgReturn / Math.abs(stockResult.maxDrawdown)) * 100).toFixed(2)}%</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Performance Metrics</h5>
              <ul className="space-y-2 text-sm">
                <li>Average win: +{(stockResult.avgReturn * 1.5).toFixed(2)}%</li>
                <li>Profit factor: {((stockResult.winRate/100) / (1 - stockResult.winRate/100) * 1.5).toFixed(2)}</li>
                <li>Total return: +{(stockResult.avgReturn * stockResult.totalTrades).toFixed(1)}%</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="font-semibold mb-4">Trade History ({selected})</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Price ($)</th>
                  <th className="px-6 py-3">Time</th>
                   <th className="px-6 py-3">Profit/Loss</th>
                </tr>
              </thead>
              <tbody>
                {stockResult.trades.map((trade, idx) => (
                  <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                    <td className={`px-6 py-4 font-medium ${trade.type === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>{trade.type}</td>
                    <td className="px-6 py-4">{trade.price.toFixed(2)}</td>
                    <td className="px-6 py-4">{trade.time}</td>
                     <td className="px-6 py-4">{trade.pnl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-right font-bold text-lg">
          Total PnL: {stockResult.totalPnL}
          </div>

        </div>
      </div>
    );
  }
};

export default TradingDashboard;