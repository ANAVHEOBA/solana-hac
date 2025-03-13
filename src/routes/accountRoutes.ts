import { Router } from 'express';
import { AccountController } from '../controllers/accountController';
import { ProtocolService } from '../services/protocolService';
import { RiskMonitoringService } from '../services/risk/riskMonitoringService';
import { AlertService } from '../services/alerts/alertService';
import { NotificationManager } from '../infrastructure/alerts/notificationManager';

const router = Router();
const accountController = new AccountController();

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

// Basic account info routes
router.get('/info/:pubkey', (req, res) => accountController.getAccountInfo(req, res));
router.get('/balance/:pubkey', (req, res) => accountController.getBalance(req, res));

// Token account routes
router.get('/tokens/:pubkey', (req, res) => accountController.getTokenAccounts(req, res));
router.get('/token/:pubkey/:tokenAccount', (req, res) => accountController.getTokenBalance(req, res));

// Transaction history routes
router.get('/transactions/:pubkey', (req, res) => accountController.getTransactionHistory(req, res));
router.get('/transaction/:signature', (req, res) => accountController.getTransaction(req, res));

// Program account routes
router.get('/program-accounts/:programId', (req, res) => accountController.getProgramAccounts(req, res));
router.get('/multiple-accounts', (req, res) => accountController.getMultipleAccounts(req, res));

// Transaction simulation and fees
router.post('/simulate', (req, res) => accountController.simulateTransaction(req, res));
router.get('/priority-fees/:pubkey', (req, res) => accountController.getPriorityFees(req, res));
router.get('/latest-blockhash', (req, res) => accountController.getLatestBlockhash(req, res));

// Add these new routes
router.get('/block/:slot', (req, res) => accountController.getBlock(req, res));
router.post('/signatures/status', (req, res) => accountController.getSignatureStatuses(req, res));
router.get('/inflation/rate', (req, res) => accountController.getInflationRate(req, res));
router.get('/token/largest/:mint', (req, res) => accountController.getTokenLargestAccounts(req, res));
router.get('/supply', (req, res) => accountController.getSupply(req, res));

// WebSocket subscription routes
router.post('/subscribe/:pubkey', (req, res) => accountController.subscribeToAccount(req, res));
router.get('/metrics/:pubkey', (req, res) => accountController.getAccountMetrics(req, res));

// Add new route for protocol positions
router.get('/protocols/:pubkey', async (req, res) => {
    try {
        const { pubkey } = req.params;
        const positions = await protocolService.getAllPositions(pubkey);
        res.json({ success: true, positions });
    } catch (error) {
        console.error('Error fetching protocol positions:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;