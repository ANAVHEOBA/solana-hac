import axios from 'axios';
import { HELIUS_RPC_URL } from './solanaUtils';

interface PerformanceMetrics {
  monthly_roi?: number;
  volatility?: string;
  total_volume_30d?: number;
  avg_trade_size?: number;
  win_rate?: number;
  profit_factor?: number;
}

export async function getHistoricalPerformance(walletAddress: string): Promise<PerformanceMetrics> {
  try {
    // Get transaction history
    const response = await axios.post(HELIUS_RPC_URL, {
      jsonrpc: "2.0",
      id: "1",
      method: "getSignaturesForAddress",
      params: [
        walletAddress,
        { limit: 100 } // Last 100 transactions
      ]
    });

    const transactions = response.data.result || [];
    
    if (transactions.length === 0) {
      return {
        monthly_roi: 0,
        volatility: "Low",
        total_volume_30d: 0,
        avg_trade_size: 0,
        win_rate: 0,
        profit_factor: 0
      };
    }

    // Calculate metrics from transaction history
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentTxs = transactions.filter((tx: any) => 
      tx.blockTime * 1000 > thirtyDaysAgo
    );

    const volume = recentTxs.reduce((sum: number, tx: any) => 
      sum + (tx.meta?.fee || 0), 0) / 1e9;

    return {
      monthly_roi: calculateROI(recentTxs),
      volatility: calculateVolatility(recentTxs),
      total_volume_30d: volume,
      avg_trade_size: volume / (recentTxs.length || 1),
      win_rate: calculateWinRate(recentTxs),
      profit_factor: calculateProfitFactor(recentTxs)
    };
  } catch (error) {
    console.error('Error fetching historical performance:', error);
    return {
      monthly_roi: 0,
      volatility: "Unknown",
      total_volume_30d: 0,
      avg_trade_size: 0,
      win_rate: 0,
      profit_factor: 0
    };
  }
}

// Helper functions
function calculateROI(transactions: any[]): number {
  // Simple ROI calculation based on net value change
  const netValue = transactions.reduce((sum, tx) => {
    const preBalance = tx.meta?.preBalances?.[0] || 0;
    const postBalance = tx.meta?.postBalances?.[0] || 0;
    return sum + (postBalance - preBalance);
  }, 0);
  
  const initialBalance = transactions[transactions.length - 1]?.meta?.preBalances?.[0] || 1;
  return (netValue / initialBalance) * 100;
}

function calculateVolatility(transactions: any[]): string {
  const changes = transactions.map(tx => {
    const pre = tx.meta?.preBalances?.[0] || 0;
    const post = tx.meta?.postBalances?.[0] || 0;
    return Math.abs((post - pre) / (pre || 1));
  });
  
  const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
  
  if (avgChange < 0.01) return "Low";
  if (avgChange < 0.05) return "Medium";
  return "High";
}

function calculateWinRate(transactions: any[]): number {
  const profitableTxs = transactions.filter(tx => {
    const pre = tx.meta?.preBalances?.[0] || 0;
    const post = tx.meta?.postBalances?.[0] || 0;
    return post > pre;
  });
  
  return (profitableTxs.length / transactions.length) * 100;
}

function calculateProfitFactor(transactions: any[]): number {
  let totalProfit = 0;
  let totalLoss = 0;
  
  transactions.forEach(tx => {
    const pre = tx.meta?.preBalances?.[0] || 0;
    const post = tx.meta?.postBalances?.[0] || 0;
    const change = post - pre;
    
    if (change > 0) totalProfit += change;
    else totalLoss += Math.abs(change);
  });
  
  return totalLoss === 0 ? totalProfit : totalProfit / totalLoss;
} 