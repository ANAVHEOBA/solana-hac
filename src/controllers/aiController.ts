import { Request, Response } from 'express';
import { ClaudeService } from '../ai/services/claudeService';
import { ProtocolService } from '../services/protocolService';
import { RiskMonitoringService } from '../services/risk/riskMonitoringService';

export class AIController {
    private claudeService: ClaudeService;

    constructor(
        protocolService: ProtocolService,
        riskService: RiskMonitoringService
    ) {
        this.claudeService = new ClaudeService(protocolService, riskService);
    }

    async analyzePortfolio(req: Request, res: Response): Promise<void> {
        try {
            const { walletAddress } = req.params;
            const analysis = await this.claudeService.analyzePortfolio(walletAddress);
            
            res.json({
                success: true,
                analysis
            });
        } catch (error) {
            console.error('Portfolio analysis error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}