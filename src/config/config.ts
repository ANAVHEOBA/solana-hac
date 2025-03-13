import dotenv from 'dotenv';

dotenv.config();

export const config = {
    helius: {
        apiKey: process.env.HELIUS_API_KEY || '',
        baseUrl: 'https://mainnet.helius-rpc.com',
    },
    server: {
        port: process.env.PORT || 3000
    }
};
