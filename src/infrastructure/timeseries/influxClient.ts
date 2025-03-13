import { InfluxDB, Point, WriteApi, QueryApi } from '@influxdata/influxdb-client';
import { influxConfig } from '../../config/influx.config';

interface InfluxMetric {
    measurement: string;
    tags: Record<string, string>;
    fields: Record<string, number>;
    timestamp?: number;
}

class InfluxClient {
    private static instance: InfluxClient;
    private client: InfluxDB;
    private writeApi: WriteApi;
    private queryApi: QueryApi;

    private constructor() {
        if (!influxConfig.url || !influxConfig.token || !influxConfig.org || !influxConfig.bucket) {
            throw new Error('Missing required InfluxDB configuration');
        }

        this.client = new InfluxDB({
            url: influxConfig.url,
            token: influxConfig.token
        });

        this.writeApi = this.client.getWriteApi(
            influxConfig.org,
            influxConfig.bucket,
            'ns'
        );

        this.queryApi = this.client.getQueryApi(influxConfig.org);
    }

    public static getInstance(): InfluxClient {
        if (!InfluxClient.instance) {
            InfluxClient.instance = new InfluxClient();
        }
        return InfluxClient.instance;
    }

    public async writeMetric(
        measurement: string,
        tags: Record<string, string>,
        fields: Record<string, number>,
        timestamp?: number
    ): Promise<void> {
        try {
            const point = new Point(measurement);
            
            // Add tags
            Object.entries(tags).forEach(([key, value]) => {
                point.tag(key, value);
            });

            // Add fields
            Object.entries(fields).forEach(([key, value]) => {
                point.floatField(key, value);
            });

            if (timestamp) {
                point.timestamp(timestamp);
            }

            this.writeApi.writePoint(point);
            await this.writeApi.flush();
        } catch (error) {
            console.error('Error writing metric:', error);
            throw error;
        }
    }

    public async writeMetrics(metrics: InfluxMetric[]): Promise<void> {
        try {
            const points = metrics.map(metric => {
                const point = new Point(metric.measurement);
                
                Object.entries(metric.tags).forEach(([key, value]) => {
                    point.tag(key, value);
                });

                Object.entries(metric.fields).forEach(([key, value]) => {
                    point.floatField(key, value);
                });

                if (metric.timestamp) {
                    point.timestamp(metric.timestamp);
                }

                return point;
            });

            points.forEach(point => this.writeApi.writePoint(point));
            await this.writeApi.flush();
        } catch (error) {
            console.error('Error writing metrics batch:', error);
            throw error;
        }
    }

    public async query(query: string): Promise<any[]> {
        try {
            return await this.queryApi.collectRows(query);
        } catch (error) {
            console.error('Error querying InfluxDB:', error);
            throw error;
        }
    }

    public async close(): Promise<void> {
        try {
            await this.writeApi.close();
        } catch (error) {
            console.error('Error closing InfluxDB client:', error);
            throw error;
        }
    }

    // Helper method to check connection
    public async ping(): Promise<boolean> {
        try {
            await this.writeMetric(
                'health_check',
                { service: 'influxdb' },
                { status: 1 }
            );
            return true;
        } catch (error) {
            console.error('InfluxDB ping error:', error);
            return false;
        }
    }
}

export default InfluxClient.getInstance(); 