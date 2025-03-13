// WebSocket Types
export interface WSSubscription {
    id: number;
    accountId: string;
    callback: (data: any) => void;
}

// Redis Cache Types
export interface CacheOptions {
    ttl?: number;
    tags?: string[];
}

export interface CacheEntry<T> {
    value: T;
    timestamp: number;
    tags?: string[];
}

// InfluxDB Metric Types
export interface MetricPoint {
    measurement: string;
    tags: Record<string, string>;
    fields: Record<string, number>;
    timestamp?: number;
}

export interface QueryOptions {
    start?: string;
    stop?: string;
    limit?: number;
} 