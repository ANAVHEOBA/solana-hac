import dotenv from 'dotenv';

dotenv.config();

export const config = {
    helius: {
        apiKey: process.env.HELIUS_API_KEY || '',
        baseUrl: 'https://mainnet.helius-rpc.com',
    },
    anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY?.trim() || '',
        model: "claude-3-5-haiku-20241022"
    },
    server: {
        port: process.env.PORT || 3000
    }
};