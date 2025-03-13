import dotenv from 'dotenv';
dotenv.config();

export const influxConfig = {
    url: process.env.INFLUX_URL,
    token: process.env.INFLUX_TOKEN,
    org: process.env.INFLUX_ORG,
    bucket: process.env.INFLUX_BUCKET,
    // Measurement names
    measurements: {
        transactions: 'solana_transactions',
        prices: 'token_prices',
        accounts: 'account_metrics',
        protocols: 'protocol_metrics'
    }
}; 