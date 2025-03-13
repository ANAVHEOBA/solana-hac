import express from 'express';
import redisClient from './infrastructure/cache/redisClient';
import influxClient from './infrastructure/timeseries/influxClient';
import WebSocketManager from './infrastructure/websocket/wsManager';
import { WebSocketHandlers } from './infrastructure/websocket/wsHandlers';
import accountRoutes from './routes/accountRoutes';
import { createServer } from 'http';
import WebSocket from 'ws';
const { Point } = require('@influxdata/influxdb-client');

const app = express();
const server = createServer(app);

// Initialize infrastructure
async function initializeInfrastructure() {
    try {
        // Connect to Redis
        await redisClient.connect();
        console.log('Redis connected successfully');

        // Test InfluxDB connection
        try {
            // Write a test point
            const testPoint = new Point('system_status')
                .tag('service', 'solana-sentinel')
                .floatField('status', 1)
                .timestamp(Date.now());

            await influxClient.writeMetric(
                'system_status',
                { service: 'solana-sentinel' },
                { status: 1 }
            );
            console.log('InfluxDB connected successfully');
        } catch (influxError) {
            console.error('InfluxDB connection error:', influxError);
            throw influxError;
        }

        // Initialize WebSocket server
        const wss = new WebSocket.Server({ server });
        console.log('WebSocket server initialized');

        wss.on('connection', (ws) => {
            console.log('Client connected');
            
            // Record connection metric in InfluxDB
            influxClient.writeMetric(
                'websocket_connections',
                { event: 'connection' },
                { count: 1 }
            );

            ws.on('message', async (message) => {
                console.log('Received:', message);
                
                // Record message metric
                await influxClient.writeMetric(
                    'websocket_messages',
                    { type: 'received' },
                    { count: 1 }
                );
            });

            ws.on('close', async () => {
                console.log('Client disconnected');
                
                // Record disconnection metric
                await influxClient.writeMetric(
                    'websocket_connections',
                    { event: 'disconnection' },
                    { count: 1 }
                );
            });
        });

    } catch (error) {
        console.error('Failed to initialize infrastructure:', error);
        process.exit(1);
    }
}

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Check Redis
        await redisClient.set('health_check', 'ok');
        const redisStatus = await redisClient.get('health_check');

        // Check InfluxDB
        await influxClient.writeMetric(
            'health_check',
            { service: 'api' },
            { status: 1 }
        );

        res.json({
            status: 'healthy',
            redis: redisStatus === 'ok' ? 'connected' : 'error',
            influxdb: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        });
    }
});

// Initialize app
app.use(express.json());
app.use('/api/account', accountRoutes);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await initializeInfrastructure();
    
    // Record server start metric
    await influxClient.writeMetric(
        'server_events',
        { event: 'start', port: PORT.toString() },
        { status: 1 }
    );
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Starting graceful shutdown...');
    
    // Record shutdown metric
    await influxClient.writeMetric(
        'server_events',
        { event: 'shutdown' },
        { status: 0 }
    );
    
    // Close server
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});