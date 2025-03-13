import influxClient from '../infrastructure/timeseries/influxClient';
import redisClient from '../infrastructure/cache/redisClient';
import { MetricPoint, QueryOptions } from '../types/infrastructure.types';
import { influxConfig } from '../config/influx.config';

export class MetricsService {
    async recordAccountMetric(
        pubkey: string,
        data: any,
        tags: Record<string, string> = {}
    ): Promise<void> {
        const metric: MetricPoint = {
            measurement: influxConfig.measurements.accounts,
            tags: {
                pubkey,
                ...tags
            },
            fields: {
                lamports: data.lamports || 0,
                dataSize: data.size || 0,
                timestamp: Date.now()
            }
        };

        await influxClient.writeMetric(
            metric.measurement,
            metric.tags,
            metric.fields
        );
    }

    async getAccountMetrics(
        pubkey: string,
        options: QueryOptions
    ): Promise<any[]> {
        const cacheKey = `metrics:account:${pubkey}:${options.start}`;
        const cached = await redisClient.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const query = `
            from(bucket: "${influxConfig.bucket}")
                |> range(start: ${options.start}, stop: ${options.stop || 'now()'})
                |> filter(fn: (r) => r["pubkey"] == "${pubkey}")
                |> filter(fn: (r) => r["_measurement"] == "${influxConfig.measurements.accounts}")
                ${options.limit ? `|> limit(n: ${options.limit})` : ''}
        `;

        const results = await influxClient.query(query);
        await redisClient.set(cacheKey, JSON.stringify(results), 300);

        return results;
    }

    async getProtocolMetrics(
        protocolName: string,
        options: QueryOptions
    ): Promise<any[]> {
        const query = `
            from(bucket: "${influxConfig.bucket}")
                |> range(start: ${options.start}, stop: ${options.stop || 'now()'})
                |> filter(fn: (r) => r["protocol"] == "${protocolName}")
                |> filter(fn: (r) => r["_measurement"] == "${influxConfig.measurements.protocols}")
                ${options.limit ? `|> limit(n: ${options.limit})` : ''}
        `;

        return await influxClient.query(query);
    }

    // Add helper methods for common metric queries
    async getAccountActivity(pubkey: string, timeRange: QueryOptions): Promise<any[]> {
        return this.getAccountMetrics(pubkey, {
            ...timeRange,
            limit: 1000 // Reasonable limit for activity analysis
        });
    }

    async getAccountTrends(pubkey: string, timeRange: QueryOptions): Promise<any> {
        const metrics = await this.getAccountMetrics(pubkey, timeRange);
        
        // Calculate basic trends
        return {
            metrics,
            summary: this.calculateMetricsSummary(metrics)
        };
    }

    private calculateMetricsSummary(metrics: any[]): any {
        // Add your summary calculation logic here
        return {
            totalTransactions: metrics.length,
            averageLamports: metrics.reduce((acc, m) => acc + (m.fields?.lamports || 0), 0) / metrics.length,
            lastUpdated: new Date().toISOString()
        };
    }
} 