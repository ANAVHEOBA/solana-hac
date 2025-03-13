import { Connection, PublicKey } from '@solana/web3.js';
import { getWalletInfo, getDeFiPositions, getTokenPrices, getSOLPrice } from '../utils/solanaUtils';
import { 
  getProtocolExposure,
  calculateLiquidationRisk,
  calculateILRisk,
  getAuditScores
} from '../utils/protocolAnalysis';
import { getHistoricalPerformance } from '../utils/historyUtils';

// Define an interface for the input
interface WalletAnalyzerInput {
  wallet_address: string;
}

// Define interfaces for token prices
interface TokenPrice {
  price: number;
  [key: string]: any;
}

interface TokenPrices {
  [mintAddress: string]: TokenPrice;
}

// Define interface for token values
interface TokenValue {
  amount: number;
  price: number;
  value: number;
}

interface TokenValues {
  [mintAddress: string]: TokenValue;
}

/**
 * Tool for analyzing a Solana wallet's DeFi positions
 */
export const walletAnalyzerTool = {
  name: 'wallet_analyzer',
  description: 'Analyzes a Solana wallet address to identify DeFi positions and basic risk metrics',
  input_schema: {
    type: "object" as const,
    properties: {
      wallet_address: {
        type: "string" as const,
        description: 'The Solana wallet address to analyze',
      },
    },
    required: ['wallet_address'],
  },
  execute: async (input: WalletAnalyzerInput, connection: Connection) => {
    try {
      console.log('Starting analysis for:', input.wallet_address);
      
      // Get wallet info (SOL + token balances)
      const walletInfo = await getWalletInfo(input.wallet_address, connection);
      console.log('Wallet info retrieved:', walletInfo.address);
      
      // Get SOL price
      const solPrice = await getSOLPrice();
      console.log('SOL price:', solPrice);
      
      // Get token prices for all tokens in wallet
      const mintAddresses = walletInfo.tokenAccounts.map(account => account.mint);
      const tokenPrices = await getTokenPrices(mintAddresses);
      console.log('Token prices retrieved for', Object.keys(tokenPrices).length, 'tokens');
      
      // Calculate portfolio value
      let portfolioValue = (walletInfo.solBalance * solPrice);
      const tokenValues: TokenValues = {};

      walletInfo.tokenAccounts.forEach(token => {
        const price = tokenPrices[token.mint]?.price || 0;
        const value = token.amount * price;
        tokenValues[token.mint] = {
          amount: token.amount,
          price,
          value
        };
        portfolioValue += value;
      });
      
      // Get DeFi positions
      const defiPositions = await getDeFiPositions(input.wallet_address);
      console.log('DeFi positions retrieved:', defiPositions.length);
      
      // Calculate protocol exposure
      const protocolExposure = await getProtocolExposure(defiPositions);
      console.log('Protocol exposure calculated');
      
      // Calculate risk metrics
      const riskMetrics = {
        liquidation_risk: calculateLiquidationRisk(defiPositions),
        impermanent_loss_risk: calculateILRisk(defiPositions),
        smart_contract_risk: await getAuditScores(defiPositions)
      };
      console.log('Risk metrics calculated');
      
      // Get historical performance
      const historicalStats = await getHistoricalPerformance(input.wallet_address);
      console.log('Historical performance retrieved');
      
      // Calculate diversification score
      const diversificationScore = Math.min(
        Math.floor((Object.keys(tokenValues).length + defiPositions.length) / 5) * 20, 
        100
      );
      
      // Get top holdings
      const topHoldings = Object.entries(tokenValues)
        .sort(([, a], [, b]) => b.value - a.value)
        .slice(0, 3)
        .map(([mint, data]) => ({
          mint,
          ...data
        }));
      
      // Determine concentration risk
      const concentrationRisk = topHoldings[0]?.value > portfolioValue * 0.4 ? 'High' : 'Moderate';
      
      return {
        wallet_address: input.wallet_address,
        sol_balance: walletInfo.solBalance,
        sol_price: solPrice,
        token_count: walletInfo.tokenAccounts.length,
        estimated_portfolio_value: portfolioValue,
        token_values: tokenValues,
        defi_positions: defiPositions,
        risk_analysis: {
          diversification_score: diversificationScore,
          top_holdings: topHoldings,
          concentration_risk: concentrationRisk
        },
        protocol_exposure: protocolExposure,
        risk_metrics: riskMetrics,
        historical_stats: historicalStats
      };
    } catch (error) {
      console.error('Full wallet analysis error:', error);
      throw error;
    }
  }
};