import dotenv from 'dotenv';
dotenv.config();

export const redisConfig = {
    url: process.env.REDIS_URL,
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD,
    port: parseInt(process.env.REDIS_PORT || '10288'),
    host: process.env.REDIS_HOST,
    maxReconnectAttempts: 10,
    reconnectDelay: 1000,
    // Cache TTLs (in seconds)
    ttl: {
        default: 3600,
        prices: 300,    // 5 minutes
        accounts: 60,   // 1 minute
        transactions: 1800  // 30 minutes
    }
}; 