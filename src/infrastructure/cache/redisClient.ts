import { createClient } from 'redis';
import { redisConfig } from '../../config/redis.config';

class RedisClient {
    private static instance: RedisClient;
    private client: ReturnType<typeof createClient>;

    private constructor() {
        this.client = createClient({
            url: redisConfig.url,
            password: redisConfig.password,
            username: redisConfig.username
        });

        this.client.on('error', (err) => console.error('Redis Client Error', err));
        this.client.on('connect', () => console.log('Redis Client Connected'));
        this.client.on('reconnecting', () => console.log('Redis Client Reconnecting'));
    }

    public static getInstance(): RedisClient {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance;
    }

    public async connect(): Promise<void> {
        await this.client.connect();
    }

    public async set(key: string, value: string, ttl?: number): Promise<void> {
        await this.client.set(key, value, { EX: ttl || redisConfig.ttl.default });
    }

    public async get(key: string): Promise<string | null> {
        return await this.client.get(key);
    }

    public async delete(key: string): Promise<void> {
        await this.client.del(key);
    }
}

export default RedisClient.getInstance(); 