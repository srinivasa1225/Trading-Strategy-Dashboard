import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, DollarSign, AlertCircle, CheckCircle, Target, Shield, BarChart3 } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

// API service functions
const apiService = {
  async getMarketData(symbol = 'SPY') {
    try {
      const response = await fetch(`${API_BASE}/api/market-data?symbol=${symbol}`);
      const data = await response.json();
      return data;
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

  async getPullbackAnalysis(symbol) {
    try {
      const response = await fetch(`${API_BASE}/api/pullback-analysis/${symbol}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching pullback analysis for ${symbol}:`, error);
      return null;
    }
  },

  async scanPullbackOpportunities(symbols = null, minConfidence = 70) {
    try {
      const params = new URLSearchParams();
      if (symbols) params.append('symbols', symbols.join(','));
      params.append('min_confidence', minConfidence);
      
      const response = await fetch(`${API_BASE}/api/pullback-scanner?${params}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error scanning pullback opportunities:', error);
      return {
        opportunities: [],
        total_scanned: 0,
        opportunities_found: 0,
        success: false
      };
    }
  },

  async getBacktest(symbol, period = '1y', initialCapital = 10000) {
    try {
      const response = await fetch(`${API_BASE}/api/strategy-backtest/${symbol}?period=${period}&initial_capital=${initialCapital}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching backtest for ${symbol}:`, error);
      return null;
    }
  }
};

const NASDAQ_TOP_10 = ["NVDA", "AMZN", "MSFT", "PLTR", "AAPL", "GOOGL", "TSLA", "AMD", "SMCI", "UBER"];
const CRYPTO_TOP_10 = ["BTC-USD", "ETH-USD", "BNB-USD", "SOL-USD", "XRP-USD", "DOGE-USD", "ADA-USD", "AVAX-USD", "SHIB-USD", "DOT-USD"];

const TradingDashboard = () => {
  const [marketData, setMarketData] = useState([]);
  const [pullbackAnalysis, setPullbackAnalysis] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [backtestResults, setBacktestResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analysis');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [symbolType, setSymbolType] = useState('nasdaq');

  useEffect(() => {
    fetchData();
  }, [selectedSymbol]);

  useEffect(() => {
    if (activeTab === 'scanner') {
      fetchOpportunities();
    }
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [marketResponse, analysisResponse] = await Promise.all([
        apiService.getMarketData(selectedSymbol),
        apiService.getPullbackAnalysis(selectedSymbol)
      ]);

      setMarketData(marketResponse.data || []);
      setPullbackAnalysis(analysisResponse?.analysis || null);
      setIsConnected(true);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsConnected(false);
    }
    setLoading(false);
  };

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const symbols = symbolType === 'nasdaq' ? NASDAQ_TOP_10 : CRYPTO_TOP_10;
      const response = await apiService.scanPullbackOpportunities(symbols, 60);
      setOpportunities(response.opportunities || []);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
    setLoading(false);
  };

  const runBacktest = async () => {
    setLoading(true);
    try {
      const response = await apiService.getBacktest(selectedSymbol);
      setBacktestResults(response);
    } catch (error) {
      console.error('Error running backtest:', error);
    }
    setLoading(false);
  };

  const getSignalColor = (signal) => {
    switch (signal) {
      case 'STRONG_BUY': return 'bg-green-100 text-green-800 border-green-200';
      case 'BUY': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'WEAK_BUY': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HOLD': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSignalIcon = (signal) => {
    switch (signal) {
      case 'STRONG_BUY': return <TrendingUp className="text-green-600" size={20} />;
      case 'BUY': return <TrendingUp className="text-blue-600" size={20} />;
      case 'WEAK_BUY': return <TrendingUp className="text-yellow-600" size={20} />;
      case 'HOLD': return <Activity className="text-gray-600" size={20} />;
      default: return <Activity className="text-gray-600" size={20} />;
    }
  };

  if (loading && !pullbackAnalysis && activeTab === 'analysis') {
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced EMA Pullback Strategy</h1>
              <p className="text-gray-600">Comprehensive 6-criteria trading strategy analysis</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected to API' : 'Using mock data'}
              </span>
            </div>
          </div>
        </div>

        {/* Symbol Selection */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Market Type</label>
              <select
                value={symbolType}
                onChange={(e) => setSymbolType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="nasdaq">Nasdaq Stocks</option>
                <option value="crypto">Cryptocurrencies</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Symbol</label>
              <div className="flex flex-wrap gap-2">
                {(symbolType === 'nasdaq' ? NASDAQ_TOP_10 : CRYPTO_TOP_10).map(symbol => (
                  <button
                    key={symbol}
                    onClick={() => setSelectedSymbol(symbol)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      selectedSymbol === symbol
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {['analysis', 'scanner', 'backtest'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Strategy Analysis */}
            <div className="lg:col-span-1 space-y-6">
              {pullbackAnalysis && (
                <>
                  {/* Signal Overview */}
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center">
                        {getSignalIcon(pullbackAnalysis.signal)}
                        <span className="ml-2">Signal: {selectedSymbol}</span>
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSignalColor(pullbackAnalysis.signal)}`}>
                        {pullbackAnalysis.signal}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Confidence:</span>
                        <span className="font-semibold">{pullbackAnalysis.confidence}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Signal Strength:</span>
                        <span className="font-semibold">{pullbackAnalysis.signal_strength}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{width: `${pullbackAnalysis.confidence}%`}}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* 6 Criteria Checklist */}
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <CheckCircle className="mr-2 text-green-500" size={20} />
                      6-Step Strategy Criteria
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(pullbackAnalysis.criteria).map(([key, criterion]) => (
                        <div key={key} className="flex items-start space-x-3">
                          {criterion.met ? (
                            <CheckCircle className="text-green-500 mt-0.5" size={16} />
                          ) : (
                            <AlertCircle className="text-red-500 mt-0.5" size={16} />
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {key.replace(/_/g, ' ').replace(/^\d+\s/, '').toUpperCase()}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {criterion.details || 'No details available'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Trade Setup */}
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Target className="mr-2 text-blue-500" size={20} />
                      Trade Setup
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Entry Price:</span>
                        <span className="font-semibold">${pullbackAnalysis.trade_setup.entry_price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Stop Loss:</span>
                        <span className="font-semibold text-red-600">${pullbackAnalysis.trade_setup.stop_loss}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Target 1 (1:2):</span>
                        <span className="font-semibold text-green-600">${pullbackAnalysis.trade_setup.target_1}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Target 2 (1:3):</span>
                        <span className="font-semibold text-green-600">${pullbackAnalysis.trade_setup.target_2}</span>
                      </div>
                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Risk Amount:</span>
                          <span className="font-semibold">${pullbackAnalysis.trade_setup.risk_amount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Reward (1:2):</span>
                          <span className="font-semibold">${pullbackAnalysis.trade_setup.reward_1}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Chart */}
            <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Price Movement & Volume ({selectedSymbol})</h3>
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

        {/* Scanner Tab */}
        {activeTab === 'scanner' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Pullback Opportunity Scanner</h3>
                  <p className="text-gray-600">Scan multiple symbols for high-confidence pullback setups</p>
                </div>
                <button
                  onClick={fetchOpportunities}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <Activity className="animate-spin mr-2" size={16} />
                  ) : (
                    <BarChart3 className="mr-2" size={16} />
                  )}
                  {loading ? 'Scanning...' : 'Scan Opportunities'}
                </button>
              </div>
            </div>
            <div className="p-6">
              {opportunities.length > 0 ? (
                <div className="space-y-4">
                  {opportunities.map((opportunity) => (
                    <div key={opportunity.symbol} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-3">
                          {getSignalIcon(opportunity.signal)}
                          <div>
                            <h4 className="font-semibold text-lg">{opportunity.symbol}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getSignalColor(opportunity.signal)}`}>
                              {opportunity.signal}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Confidence</div>
                          <div className="font-bold text-xl">{opportunity.confidence}%</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Entry Price</div>
                          <div className="font-semibold">${opportunity.trade_setup.entry_price}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Stop Loss</div>
                          <div className="font-semibold text-red-600">${opportunity.trade_setup.stop_loss}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Target 1:2</div>
                          <div className="font-semibold text-green-600">${opportunity.trade_setup.target_1}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Risk/Reward</div>
                          <div className="font-semibold">1:2 to 1:3</div>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(opportunity.criteria).map(([key, criterion]) => (
                          <span
                            key={key}
                            className={`px-2 py-1 rounded-full text-xs ${
                              criterion.met ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {key.replace(/_/g, ' ').replace(/^\d+\s/, '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 size={64} className="mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-medium mb-2">No Opportunities Found</h3>
                  <p>Click "Scan Opportunities" to search for pullback setups</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Backtest Tab */}
        {activeTab === 'backtest' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Strategy Backtest - {selectedSymbol}</h3>
                  <p className="text-gray-600">Historical performance analysis of the 6-step pullback strategy</p>
                </div>
                <button
                  onClick={runBacktest}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <Activity className="animate-spin mr-2" size={16} />
                  ) : (
                    <Shield className="mr-2" size={16} />
                  )}
                  {loading ? 'Running...' : 'Run Backtest'}
                </button>
              </div>
            </div>
            <div className="p-6">
              {backtestResults ? (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-blue-50 p-6 rounded-lg text-center border border-blue-200">
                      <div className="text-3xl font-bold text-blue-600 mb-2">{backtestResults.metrics.total_trades || 0}</div>
                      <div className="text-sm text-gray-600 font-medium">Total Trades</div>
                    </div>
                    <div className="bg-green-50 p-6 rounded-lg text-center border border-green-200">
                      <div className="text-3xl font-bold text-green-600 mb-2">{backtestResults.metrics.win_rate || 0}%</div>
                      <div className="text-sm text-gray-600 font-medium">Win Rate</div>
                    </div>
                    <div className="bg-purple-50 p-6 rounded-lg text-center border border-purple-200">
                      <div className="text-3xl font-bold text-purple-600 mb-2">{backtestResults.metrics.total_return_pct || 0}%</div>
                      <div className="text-sm text-gray-600 font-medium">Total Return</div>
                    </div>
                    <div className="bg-yellow-50 p-6 rounded-lg text-center border border-yellow-200">
                      <div className="text-3xl font-bold text-yellow-600 mb-2">${backtestResults.metrics.final_capital || 0}</div>
                      <div className="text-sm text-gray-600 font-medium">Final Capital</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h4 className="font-semibold mb-4">Performance Metrics</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Winning Trades:</span>
                          <span className="font-medium">{backtestResults.metrics.winning_trades || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Losing Trades:</span>
                          <span className="font-medium">{backtestResults.metrics.losing_trades || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Win:</span>
                          <span className="font-medium text-green-600">${backtestResults.metrics.avg_win || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Loss:</span>
                          <span className="font-medium text-red-600">${backtestResults.metrics.avg_loss || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h4 className="font-semibold mb-4">Risk Analysis</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Initial Capital:</span>
                          <span className="font-medium">${backtestResults.initial_capital}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Return:</span>
                          <span className={`font-medium ${backtestResults.metrics.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${backtestResults.metrics.total_return || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Return %:</span>
                          <span className={`font-medium ${backtestResults.metrics.total_return_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {backtestResults.metrics.total_return_pct || 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Trades */}
                  {backtestResults.trades && backtestResults.trades.length > 0 && (
                    <div className="bg-white rounded-lg border">
                      <div className="p-4 border-b">
                        <h4 className="font-semibold">Recent Trades</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left">Entry Date</th>
                              <th className="px-4 py-3 text-left">Exit Date</th>
                              <th className="px-4 py-3 text-left">Entry Price</th>
                              <th className="px-4 py-3 text-left">Exit Price</th>
                              <th className="px-4 py-3 text-left">Return %</th>
                              <th className="px-4 py-3 text-left">P&L</th>
                              <th className="px-4 py-3 text-left">Exit Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {backtestResults.trades.map((trade, idx) => (
                              <tr key={idx} className="border-b">
                                <td className="px-4 py-3">{trade.entry_date}</td>
                                <td className="px-4 py-3">{trade.exit_date}</td>
                                <td className="px-4 py-3">${trade.entry_price}</td>
                                <td className="px-4 py-3">${trade.exit_price}</td>
                                <td className={`px-4 py-3 ${trade.return_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {trade.return_pct}%
                                </td>
                                <td className={`px-4 py-3 font-medium ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ${trade.pnl}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    trade.exit_reason === 'TARGET_HIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {trade.exit_reason.replace('_', ' ')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <Shield size={64} className="mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-medium mb-2">Ready to Backtest</h3>
                  <p className="mb-6">Click "Run Backtest" to analyze the strategy's historical performance on {selectedSymbol}</p>
                  <div className="text-sm text-gray-400">
                    <p>• Tests all 6 strategy criteria</p>
                    <p>• Analyzes 1 year of historical data</p>
                    <p>• Calculates risk-adjusted returns</p>
                    <p>• Shows individual trade details</p>
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