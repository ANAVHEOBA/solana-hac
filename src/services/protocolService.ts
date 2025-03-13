import { ProtocolAdapter, ProtocolPosition } from '../types/protocol.types';
import { MarinadeAdapter } from '../integrations/protocols/marinade';
import { RiskMonitoringService } from '../services/risk/riskMonitoringService';
import { AlertService } from '../services/alerts/alertService';
import influxClient from '../infrastructure/timeseries/influxClient';
import redisClient from '../infrastructure/cache/redisClient';
import { KaminoAPI } from '../integrations/protocols/kamino';
import { KaminoStrategyMetrics, KaminoPriceData } from '../types/protocol.types';
import { ProtocolHealthMetrics } from '../types/risk.types';

export class ProtocolService {
    private protocols: Map<string, ProtocolAdapter>;
    private kaminoAPI: KaminoAPI;
    private riskService: RiskMonitoringService;
    private alertService: AlertService;
    private readonly CACHE_TTL = 60; // 60 seconds cache
    private readonly HEALTH_CACHE_TTL = 300; // 5 minutes

    constructor(
        riskService: RiskMonitoringService, 
        alertService: AlertService
    ) {
        this.protocols = new Map();
        this.kaminoAPI = new KaminoAPI();
        this.riskService = riskService;
        this.alertService = alertService;
        this.initializeProtocols();
    }

    private initializeProtocols() {
        const marinade = new MarinadeAdapter();
        this.protocols.set(marinade.getName(), marinade);
    }

    async getAllPositions(address: string): Promise<ProtocolPosition[]> {
        const cacheKey = `positions:${address}`;
        const cached = await redisClient.get(cacheKey);
        
        if (cached) {
            return JSON.parse(cached);
        }

        const positions: ProtocolPosition[] = [];
        
        for (const protocol of this.protocols.values()) {
            try {
                const protocolPositions = await protocol.getPositions(address);
                positions.push(...protocolPositions);

                // Record metrics in InfluxDB
                for (const position of protocolPositions) {
                    await influxClient.writeMetric(
                        'protocol_positions',
                        {
                            protocol: position.protocol,
                            address: position.address
                        },
                        {
                            balance: position.balance,
                            value: position.value,
                            apy: position.apy
                        }
                    );
                }
            } catch (error) {
                console.error(`Error fetching positions for ${protocol.getName()}:`, error);
            }
        }

        // Cache results for 5 minutes
        await redisClient.set(cacheKey, JSON.stringify(positions), 300);
        
        return positions;
    }

    async getKaminoMetrics() {
        try {
            // Try cache first
            const cachedData = await redisClient.get('kamino:metrics');
            if (cachedData) {
                return JSON.parse(cachedData);
            }

            // Fetch fresh data
            const metrics = await this.kaminoAPI.getAllStrategyMetrics();

            // Cache the results
            await redisClient.set('kamino:metrics', JSON.stringify(metrics), this.CACHE_TTL);

            // Store historical data
            await this.storeKaminoMetricsHistory(metrics);

            return metrics;
        } catch (error) {
            console.error('Error in getKaminoMetrics:', error);
            throw error;
        }
    }

    private async storeKaminoMetricsHistory(metrics: KaminoStrategyMetrics[]) {
        try {
            for (const metric of metrics) {
                await influxClient.writeMetric(
                    'kamino_strategy_metrics',
                    {
                        strategy: metric.strategyPubkey,
                        status: metric.status
                    },
                    {
                        tvl: metric.tvl,
                        pnl: metric.pnl,
                        apy: metric.apy,
                        tokenABalance: metric.tokenABalance,
                        tokenBBalance: metric.tokenBBalance
                    }
                );
            }
        } catch (error) {
            console.error('Error storing Kamino metrics history:', error);
        }
    }

    async getKaminoUserPositions(walletAddress: string) {
        try {
            const cacheKey = `kamino:positions:${walletAddress}`;
            const cached = await redisClient.get(cacheKey);
            
            if (cached) {
                return JSON.parse(cached);
            }

            const positions = await this.kaminoAPI.getUserPositions(walletAddress);
            await redisClient.set(cacheKey, JSON.stringify(positions), this.CACHE_TTL);
            
            return positions;
        } catch (error) {
            console.error('Error fetching Kamino user positions:', error);
            throw error;
        }
    }

    async getKaminoStrategyApyHistory(strategyPubkey: string) {
        try {
            const cacheKey = `kamino:apy:history:${strategyPubkey}`;
            const cached = await redisClient.get(cacheKey);
            
            if (cached) {
                return JSON.parse(cached);
            }

            const history = await this.kaminoAPI.getStrategyApyHistory(strategyPubkey);
            await redisClient.set(cacheKey, JSON.stringify(history), this.CACHE_TTL);
            
            return history;
        } catch (error) {
            console.error('Error fetching Kamino APY history:', error);
            throw error;
        }
    }

    async getProtocolHealth(): Promise<ProtocolHealthMetrics[]> {
        const cacheKey = 'protocol:health:metrics';
        const cached = await redisClient.get(cacheKey);
        
        if (cached) {
            return JSON.parse(cached);
        }

        const healthMetrics: ProtocolHealthMetrics[] = [];

        // Fetch Kamino metrics
        try {
            const kaminoMetrics = await this.getKaminoMetrics();
            const kaminoHealth: ProtocolHealthMetrics = {
                name: 'Kamino',
                tvl: kaminoMetrics.reduce((sum: number, metric: KaminoStrategyMetrics) => sum + metric.tvl, 0),
                tvlChange24h: this.calculateTvlChange(kaminoMetrics),
                volumeChange24h: this.calculateVolumeChange(kaminoMetrics),
                userCount24h: kaminoMetrics.length,
                lastUpdated: new Date().toISOString()
            };
            healthMetrics.push(kaminoHealth);

            // Check for potential risks
            const riskScore = this.calculateProtocolRisk(kaminoHealth);
            if (riskScore > 70) {  // High-risk threshold
                await this.triggerProtocolHealthAlert(kaminoHealth, riskScore);
            }
        } catch (error) {
            console.error('Error calculating Kamino protocol health:', error);
        }

        // Cache and store health metrics
        await redisClient.set(cacheKey, JSON.stringify(healthMetrics), this.HEALTH_CACHE_TTL);
        await this.storeProtocolHealthHistory(healthMetrics);

        return healthMetrics;
    }

    private calculateTvlChange(metrics: KaminoStrategyMetrics[]): number {
        // Simple TVL change calculation
        const totalTvl = metrics.reduce((sum: number, metric: KaminoStrategyMetrics) => sum + metric.tvl, 0);
        const avgTvl = totalTvl / metrics.length;
        return ((totalTvl - avgTvl) / avgTvl) * 100;
    }

    private calculateVolumeChange(metrics: KaminoStrategyMetrics[]): number {
        // Placeholder for volume change calculation
        // In a real-world scenario, you'd fetch historical volume data
        return metrics.reduce((sum: number, metric: KaminoStrategyMetrics) => sum + metric.pnl, 0);
    }

    private calculateProtocolRisk(health: ProtocolHealthMetrics): number {
        // Calculate risk based on TVL change and other factors
        const tvlRisk = Math.abs(health.tvlChange24h) * 0.6;
        const volumeRisk = Math.abs(health.volumeChange24h / health.tvl) * 0.4;
        
        return Math.min(100, tvlRisk + volumeRisk);
    }

    private async triggerProtocolHealthAlert(
        health: ProtocolHealthMetrics, 
        riskScore: number
    ) {
        try {
            await this.alertService.triggerAlerts([{
                type: 'PROTOCOL',
                severity: riskScore > 90 ? 'CRITICAL' : 'HIGH',
                message: `High-risk alert for ${health.name}. Risk Score: ${riskScore}`,
                timestamp: new Date().toISOString()
            }], 'system');
        } catch (error) {
            console.error('Error triggering protocol health alert:', error);
        }
    }

    private async storeProtocolHealthHistory(metrics: ProtocolHealthMetrics[]) {
        for (const metric of metrics) {
            await influxClient.writeMetric(
                'protocol_health',
                { protocol: metric.name },
                {
                    tvl: metric.tvl,
                    tvl_change_24h: metric.tvlChange24h,
                    volume_change_24h: metric.volumeChange24h,
                    user_count: metric.userCount24h
                }
            );
        }
    }
} 