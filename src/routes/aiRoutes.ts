import { Router } from 'express';
import { ClaudeService } from '../ai/services/claudeService';
import { ProtocolService } from '../services/protocolService';
import { RiskMonitoringService } from '../services/risk/riskMonitoringService';
import { AlertService } from '../services/alerts/alertService';
import { NotificationManager } from '../infrastructure/alerts/notificationManager';
import { PositionRisk } from '../types/risk.types';

const router = Router();

// Initialize services with proper dependencies
const notificationManager = new NotificationManager({
    discord: {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL || ''
    },
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
        chatId: process.env.TELEGRAM_CHAT_ID || ''
    }
});

const alertService = new AlertService(notificationManager);
const riskService = new RiskMonitoringService(alertService);
const protocolService = new ProtocolService(riskService, alertService);
const claudeService = new ClaudeService(protocolService, riskService);

// Analyze wallet portfolio
router.get('/analyze/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const analysis = await claudeService.analyzePortfolio(walletAddress);
        
        res.json({
            success: true,
            analysis
        });
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get protocol health insights
router.get('/health/protocols', async (req, res) => {
    try {
        const protocols = await protocolService.getProtocolHealth();
        const insights = await claudeService.analyzeProtocolHealth(protocols);
        
        res.json({
            success: true,
            insights
        });
    } catch (error) {
        console.error('Protocol health analysis error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Add detailed portfolio analysis endpoint
router.get('/analyze/detailed/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        
        // First get positions
        const positions = await protocolService.getAllPositions(walletAddress);
        
        // Get risk metrics
        const riskMetrics = await Promise.all(
            positions.map(pos => riskService.monitorPosition(pos.address))
        );

        // Get AI analysis
        const analysis = await claudeService.analyzePortfolio(walletAddress);

        // Calculate highest risk from flattened risk metrics
        const flattenedRiskMetrics = riskMetrics.flat();
        const highestRisk = Math.max(
            ...flattenedRiskMetrics.map(metric => metric.riskScore.overall),
            0  // Default if array is empty
        );

        res.json({
            success: true,
            data: {
                wallet: walletAddress,
                positions: positions,
                risk_metrics: flattenedRiskMetrics,
                ai_analysis: analysis,
                summary: {
                    total_value: positions.reduce((sum, pos) => sum + pos.value, 0),
                    protocols: [...new Set(positions.map(pos => pos.protocol))],
                    highest_risk: highestRisk
                }
            }
        });
    } catch (error) {
        console.error('Detailed analysis error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            wallet: req.params.walletAddress // Fixed walletAddress reference
        });
    }
});

export default router; 