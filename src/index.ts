import express from 'express';
import redisClient from './infrastructure/cache/redisClient';
import influxClient from './infrastructure/timeseries/influxClient';
import WebSocketManager from './infrastructure/websocket/wsManager';
import { WebSocketHandlers } from './infrastructure/websocket/wsHandlers';
import accountRoutes from './routes/accountRoutes';
import { createServer } from 'http';
import WebSocket from 'ws';
import { ProtocolService } from './services/protocolService';
import { RiskMonitoringService } from './services/risk/riskMonitoringService';
import { AlertService } from './services/alerts/alertService';
import { NotificationManager } from './infrastructure/alerts/notificationManager';
import { ClaudeService } from './ai/services/claudeService';
import aiRoutes from './routes/aiRoutes';
import dotenv from 'dotenv';
const { Point } = require('@influxdata/influxdb-client');

dotenv.config();

const app = express();
const server = createServer(app);

// Initialize notification manager
const notificationManager = new NotificationManager({
    discord: {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL || ''
    },
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
        chatId: process.env.TELEGRAM_CHAT_ID || ''
    }
});

// Initialize services
const alertService = new AlertService(notificationManager);
const riskService = new RiskMonitoringService(alertService);
const protocolService = new ProtocolService(riskService, alertService);

// Initialize Claude service with API key check
if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set in environment variables');
    process.exit(1);
}

const claudeService = new ClaudeService(protocolService, riskService);

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

        // Test Claude connectivity
        const claudeHealth = await claudeService.testConnection();

        res.json({
            status: 'healthy',
            redis: redisStatus === 'ok' ? 'connected' : 'error',
            influxdb: 'connected',
            claude: claudeHealth ? 'connected' : 'error',
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

// Mount routes with the /api/account prefix
app.use('/api/account', accountRoutes);
app.use('/api/ai', aiRoutes);

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

    // Start protocol monitoring
    monitorProtocols();
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

// Add new monitoring function for Kamino
async function monitorProtocols() {
    try {
        // Get Kamino metrics
        const kaminoMetrics = await protocolService.getKaminoMetrics();
        
        if (kaminoMetrics && kaminoMetrics.length > 0) {
            // Record metrics to InfluxDB
            for (const metric of kaminoMetrics) {
                await influxClient.writeMetric(
                    'protocol_metrics',
                    {
                        protocol: 'kamino',
                        strategy: metric.strategyName || 'unknown',
                        pair: metric.tokenAPair + '-' + metric.tokenBPair
                    },
                    {
                        tvl: metric.tvl || 0,
                        apy: metric.apy || 0,
                        volume24h: metric.volume24h || 0
                    }
                );
            }
        }

        // AI-enhanced monitoring
        const protocols = await protocolService.getProtocolHealth();
        if (protocols.length > 0) {
            // Get AI insights
            const aiInsights = await claudeService.analyzeProtocolHealth(protocols);
            
            // Record AI insights
            await influxClient.writeMetric(
                'ai_insights',
                { source: 'claude' },
                {
                    risk_score: aiInsights.risk_assessment.overall_risk,
                    recommendations_count: aiInsights.recommendations.length
                }
            );

            // Trigger alerts if AI detects high risk
            if (aiInsights.risk_assessment.overall_risk > 75) {
                await alertService.triggerAlerts([{
                    type: 'PROTOCOL',
                    severity: 'HIGH',
                    message: `AI Risk Alert: ${aiInsights.insights}`,
                    timestamp: new Date().toISOString()
                }], 'system');
            }
        }

        // Schedule next monitoring run
        setTimeout(monitorProtocols, 60000);

    } catch (error) {
        console.error('Error monitoring protocols:', error);
        
        await influxClient.writeMetric(
            'protocol_errors',
            { protocol: 'all', type: 'monitoring' },
            { count: 1 }
        );

        setTimeout(monitorProtocols, 30000);
    }
}