import { Request, Response } from 'express';
import { AccountService } from '../services/accountService';
import WebSocketManager from '../infrastructure/websocket/wsManager';
import { WebSocketHandlers } from '../infrastructure/websocket/wsHandlers';

export class AccountController {
    private accountService: AccountService;
    private wsManager: WebSocketManager;

    constructor() {
        this.accountService = new AccountService();
        this.wsManager = WebSocketManager.getInstance();
    }

    async getAccountInfo(req: Request, res: Response): Promise<void> {
        try {
            const { pubkey } = req.params;
            const accountInfo = await this.accountService.getAccountInfo(pubkey);
            
            // Subscribe to updates if requested
            if (req.query.subscribe === 'true') {
                await this.wsManager.subscribeToAccount(
                    pubkey,
                    WebSocketHandlers.handleAccountUpdate
                );
            }
            
            res.json(accountInfo);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                error: 'Failed to fetch account information',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    async getBalance(req: Request, res: Response): Promise<void> {
        try {
            const { pubkey } = req.params;
            const balance = await this.accountService.getBalance(pubkey);
            res.json(balance);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                error: 'Failed to fetch balance',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    async getTokenAccounts(req: Request, res: Response): Promise<void> {
        try {
            const { pubkey } = req.params;
            const tokens = await this.accountService.getTokenAccounts(pubkey);
            res.json(tokens);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                error: 'Failed to fetch token accounts',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    async getTokenBalance(req: Request, res: Response): Promise<void> {
        try {
            const { pubkey, tokenAccount } = req.params;
            const balance = await this.accountService.getTokenBalance(tokenAccount);
            res.json(balance);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                error: 'Failed to fetch token balance',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    async getTransactionHistory(req: Request, res: Response): Promise<void> {
        try {
            const { pubkey } = req.params;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
            const history = await this.accountService.getTransactionHistory(pubkey, limit);
            res.json(history);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                error: 'Failed to fetch transaction history',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    async getTransaction(req: Request, res: Response): Promise<void> {
        try {
            const { signature } = req.params;
            const transaction = await this.accountService.getTransaction(signature);
            res.json(transaction);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                error: 'Failed to fetch transaction',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    async getProgramAccounts(req: Request, res: Response): Promise<void> {
        try {
            const { programId } = req.params;
            const accounts = await this.accountService.getProgramAccounts(programId);
            res.json(accounts);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                error: 'Failed to fetch program accounts',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    async getMultipleAccounts(req: Request, res: Response): Promise<void> {
        try {
            const { pubkeys } = req.body;
            if (!Array.isArray(pubkeys)) {
                throw new Error('pubkeys must be an array');
            }
            const accounts = await this.accountService.getMultipleAccounts(pubkeys);
            res.json(accounts);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                error: 'Failed to fetch multiple accounts',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    async simulateTransaction(req: Request, res: Response): Promise<void> {
        try {
            const { transaction } = req.body;
            const simulation = await this.accountService.simulateTransaction(transaction);
            res.json(simulation);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                error: 'Failed to simulate transaction',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    async getPriorityFees(req: Request, res: Response): Promise<void> {
        try {
            const { pubkey } = req.params;
            const fees = await this.accountService.getPriorityFees(pubkey);
            res.json(fees);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                error: 'Failed to fetch priority fees',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    async getLatestBlockhash(req: Request, res: Response): Promise<void> {
        try {
            const blockhash = await this.accountService.getLatestBlockhash();
            res.json(blockhash);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                error: 'Failed to fetch latest blockhash',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    async getBlock(req: Request, res: Response): Promise<void> {
        try {
            const slot = parseInt(req.params.slot);
            const block = await this.accountService.getBlock(slot);
            res.json(block);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                error: 'Failed to fetch block',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    async getSignatureStatuses(req: Request, res: Response): Promise<void> {
        try {
            const { signatures, searchHistory } = req.body;
            const statuses = await this.accountService.getSignatureStatuses(signatures, searchHistory);
            res.json(statuses);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                error: 'Failed to fetch signature statuses',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    async getInflationRate(req: Request, res: Response): Promise<void> {
        try {
            const rate = await this.accountService.getInflationRate();
            res.json(rate);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                error: 'Failed to fetch inflation rate',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    async getTokenLargestAccounts(req: Request, res: Response): Promise<void> {
        try {
            const { mint } = req.params;
            const accounts = await this.accountService.getTokenLargestAccounts(mint);
            res.json(accounts);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                error: 'Failed to fetch largest token accounts',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    async getSupply(req: Request, res: Response): Promise<void> {
        try {
            const excludeNonCirculating = req.query.excludeNonCirculating === 'true';
            const supply = await this.accountService.getSupply(excludeNonCirculating);
            res.json(supply);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                error: 'Failed to fetch supply information',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    async subscribeToAccount(req: Request, res: Response): Promise<void> {
        try {
            const { pubkey } = req.params;
            await this.wsManager.subscribeToAccount(
                pubkey,
                WebSocketHandlers.handleAccountUpdate
            );
            res.json({ success: true, message: 'Subscribed to account updates' });
        } catch (error) {
            console.error('Subscription error:', error);
            res.status(500).json({
                error: 'Failed to subscribe to account',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
}