import axios from 'axios';
import { KaminoStrategyMetrics, KaminoStrategyDetails, KaminoPriceData } from '../../types/protocol.types';
import { ProtocolAdapter, ProtocolPosition } from '../../types/protocol.types';

export class KaminoAPI {
    private baseUrl: string;
    private env: string;

    constructor(env: string = 'mainnet-beta') {
        this.baseUrl = 'https://api.kamino.finance';
        this.env = env;
    }

    /**
     * Fetch all strategy metrics
     */
    async getAllStrategyMetrics(): Promise<KaminoStrategyMetrics[]> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/strategies/metrics?env=${this.env}`
            );
            
            return response.data.map((item: any) => ({
                strategyPubkey: item.strategy,
                tvl: parseFloat(item.totalValueLocked || '0'),
                pnl: parseFloat(item.profitAndLoss || '0'),
                apy: parseFloat(item.apy?.totalApy || '0'),
                tokenAMint: item.tokenAMint,
                tokenBMint: item.tokenBMint,
                tokenABalance: parseFloat(item.vaultBalances?.tokenA?.total || '0'),
                tokenBBalance: parseFloat(item.vaultBalances?.tokenB?.total || '0'),
                status: item.status || 'unknown',
                lastUpdated: item.lastCalculated || new Date().toISOString()
            }));
        } catch (error) {
            console.error('Error fetching Kamino strategy metrics:', error);
            return [];
        }
    }

    /**
     * Fetch specific strategy metrics and details
     */
    async getStrategyDetails(strategyPubkey: string): Promise<KaminoStrategyDetails | null> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/strategies/${strategyPubkey}/metrics?env=${this.env}`
            );
            
            const data = response.data;
            return {
                metrics: {
                    strategyPubkey: data.strategy,
                    tvl: parseFloat(data.totalValueLocked || '0'),
                    pnl: parseFloat(data.profitAndLoss || '0'),
                    apy: parseFloat(data.apy?.totalApy || '0'),
                    tokenAMint: data.tokenAMint,
                    tokenBMint: data.tokenBMint,
                    tokenABalance: parseFloat(data.vaultBalances?.tokenA?.total || '0'),
                    tokenBBalance: parseFloat(data.vaultBalances?.tokenB?.total || '0'),
                    status: data.status || 'unknown',
                    lastUpdated: data.lastCalculated || new Date().toISOString()
                },
                risks: {
                    liquidityRisk: 0, // These fields aren't in the current API response
                    volatilityRisk: 0,
                    impermanentLoss: 0
                },
                performance: {
                    daily: parseFloat(data.apy?.vault?.totalApr || '0'),
                    weekly: parseFloat(data.apy?.vault?.totalApy || '0'),
                    monthly: parseFloat(data.kaminoApy?.vault?.apy30d || '0')
                }
            };
        } catch (error) {
            console.error('Error fetching strategy details:', error);
            return null;
        }
    }

    /**
     * Fetch current prices
     */
    async getPrices(tokens?: string[]): Promise<KaminoPriceData[]> {
        try {
            let url = `${this.baseUrl}/prices?env=${this.env}&source=scope`;
            if (tokens && tokens.length > 0) {
                url += `&token=${tokens.join(',')}`;
            }

            const response = await axios.get(url);

            return response.data.map((item: any) => ({
                mint: item.mint,
                symbol: item.symbol,
                price: parseFloat(item.price),
                timestamp: item.timestamp,
                source: item.source
            }));
        } catch (error) {
            console.error('Error fetching Kamino prices:', error);
            throw new Error('Failed to fetch Kamino prices');
        }
    }

    /**
     * Fetch user positions
     */
    async getUserPositions(walletAddress: string): Promise<any> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/user/${walletAddress}/positions?env=${this.env}`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching user positions:', error);
            throw new Error('Failed to fetch user positions');
        }
    }

    /**
     * Fetch strategy APY history
     */
    async getStrategyApyHistory(strategyPubkey: string): Promise<any> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/v2/strategies/${strategyPubkey}/history?env=${this.env}`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching strategy APY history:', error);
            return [];
        }
    }

    /**
     * Fetch all active strategies
     */
    async getActiveStrategies(): Promise<any> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/strategies/enabled?env=${this.env}`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching active strategies:', error);
            return [];
        }
    }
}

export class KaminoAdapter implements ProtocolAdapter {
    private api: KaminoAPI;

    constructor() {
        this.api = new KaminoAPI();
    }

    getName(): string {
        return 'Kamino';
    }

    async getPositions(wallet: string): Promise<ProtocolPosition[]> {
        try {
            const metrics = await this.api.getAllStrategyMetrics();
            
            return metrics.map(strategy => ({
                protocol: this.getName(),
                address: strategy.strategyPubkey,
                balance: strategy.tvl,
                value: strategy.tvl,
                apy: strategy.apy,
                healthFactor: 1, // Default value as not provided by API
                rewards: 0 // Calculate from strategy.rewardMints if needed
            }));
        } catch (error) {
            console.error('Error fetching Kamino positions:', error);
            return [];
        }
    }

    async getAPY(): Promise<number> {
        try {
            const metrics = await this.api.getAllStrategyMetrics();
            if (metrics.length === 0) return 0;

            const totalApy = metrics.reduce((sum, strategy) => sum + (strategy.apy || 0), 0);
            return totalApy / metrics.length;
        } catch (error) {
            console.error('Error calculating Kamino APY:', error);
            return 0;
        }
    }
} 