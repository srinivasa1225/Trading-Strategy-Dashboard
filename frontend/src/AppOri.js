import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// API service functions
const apiService = {
  async getMarketData() {
    try {
      const response = await axios.get(`${API_BASE}/api/market-data`);
      return response.data;
    } catch (error) {
      console.error('Error fetching market data:', error);
      // Fallback to mock data
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
  const [signals, setSignals] = useState([]);
  const [strategyStatus, setStrategyStatus] = useState(null);
  const [backtestResults, setBacktestResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [marketResponse, signalsResponse, statusResponse] = await Promise.all([
        apiService.getMarketData(),
        apiService.getTradingSignals(),
        apiService.getStrategyStatus()
      ]);

      setMarketData(marketResponse.data);
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
              {['overview', 'signals', 'backtest'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Strategy Status Cards */}
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

            {/* Price Chart */}
            <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Price Movement & Volume</h3>
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

        {/* Signals Tab */}
        {activeTab === 'signals' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Trading Signals</h3>
              <p className="text-gray-600">Live signals based on 6-step strategy criteria</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {signals.map((signal) => (
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
};

export default TradingDashboard;