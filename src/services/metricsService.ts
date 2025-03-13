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
        options: QueryOptions = {}
    ): Promise<any[]> {
        const cacheKey = `metrics:account:${pubkey}`;
        const cached = await redisClient.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const query = `
            from(bucket: "${influxConfig.bucket}")
                |> range(start: ${options.start || '-1h'})
                |> filter(fn: (r) => r["pubkey"] == "${pubkey}")
                |> filter(fn: (r) => r["_measurement"] == "${influxConfig.measurements.accounts}")
        `;

        const results = await influxClient.query(query);
        await redisClient.set(cacheKey, JSON.stringify(results), 300);

        return results;
    }

    async getProtocolMetrics(
        protocolName: string,
        options: QueryOptions = {}
    ): Promise<any[]> {
        const query = `
            from(bucket: "${influxConfig.bucket}")
                |> range(start: ${options.start || '-24h'})
                |> filter(fn: (r) => r["protocol"] == "${protocolName}")
                |> filter(fn: (r) => r["_measurement"] == "${influxConfig.measurements.protocols}")
        `;

        return await influxClient.query(query);
    }
} 