import axios from 'axios';
import { config } from '../config/config';
import {
    AccountInfoRequest,
    AccountInfoResponse,
    BalanceRequest,
    BalanceResponse,
    TokenAccountsRequest,
    TokenAccountsResponse,
    TokenBalanceRequest,
    TokenBalanceResponse,
    TransactionHistoryRequest,
    TransactionRequest,
    ProgramAccountsRequest,
    ProgramAccountsResponse,
    MultipleAccountsRequest,
    SimulateTransactionRequest,
    SimulateTransactionResponse,
    PriorityFeesRequest,
    LatestBlockhashRequest,
    LatestBlockhashResponse,
    BlockRequest,
    BlockResponse,
    SignatureStatusesRequest,
    InflationRateRequest,
    InflationRateResponse,
    TokenLargestAccountsRequest,
    SupplyRequest,
    SupplyResponse
} from '../schemas/accountSchema';
import redisClient from '../infrastructure/cache/redisClient';
import { MetricsService } from './metricsService';

export class AccountService {
    private readonly baseUrl: string;
    private readonly TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
    private metricsService: MetricsService;
    
    constructor() {
        this.baseUrl = `${config.helius.baseUrl}/?api-key=${config.helius.apiKey}`;
        this.metricsService = new MetricsService();
    }

    private async makeRPCRequest<T>(request: any): Promise<T> {
        try {
            const response = await axios.post<T>(
                this.baseUrl,
                request,
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            );
            return response.data;
        } catch (error) {
            console.error('RPC request error:', error);
            throw error;
        }
    }

    private async getCachedData<T>(key: string, ttl: number = 300): Promise<T | null> {
        const cached = await redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
    }

    private async setCachedData(key: string, data: any, ttl: number = 300): Promise<void> {
        await redisClient.set(key, JSON.stringify(data), ttl);
    }

    async getAccountInfo(pubkey: string): Promise<AccountInfoResponse> {
        const cacheKey = `account:info:${pubkey}`;
        const cached = await this.getCachedData<AccountInfoResponse>(cacheKey);
        
        if (cached) return cached;

        const response = await this.makeRPCRequest<AccountInfoResponse>({
            jsonrpc: '2.0',
            id: 1,
            method: 'getAccountInfo',
            params: [pubkey, { encoding: 'base58' }]
        });

        await this.setCachedData(cacheKey, response, 60); // 1 minute cache
        await this.metricsService.recordAccountMetric(pubkey, response.result.value);
        
        return response;
    }

    async getBalance(pubkey: string): Promise<BalanceResponse> {
        const request: BalanceRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [pubkey]
        };
        return this.makeRPCRequest<BalanceResponse>(request);
    }

    async getTokenAccounts(pubkey: string): Promise<TokenAccountsResponse> {
        const request: TokenAccountsRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'getTokenAccountsByOwner',
            params: [
                pubkey,
                { programId: this.TOKEN_PROGRAM_ID },
                { encoding: 'jsonParsed' }
            ]
        };
        return this.makeRPCRequest<TokenAccountsResponse>(request);
    }

    async getTransactionHistory(pubkey: string, limit = 10): Promise<any> {
        const request: TransactionHistoryRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'getSignaturesForAddress',
            params: [pubkey, { limit }]
        };
        return this.makeRPCRequest(request);
    }

    async getTransaction(signature: string): Promise<any> {
        const request: TransactionRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'getTransaction',
            params: [signature, 'json']
        };
        return this.makeRPCRequest(request);
    }

    async getTokenBalance(tokenAccount: string): Promise<TokenBalanceResponse> {
        const request: TokenBalanceRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'getTokenAccountBalance',
            params: [tokenAccount]
        };
        return this.makeRPCRequest<TokenBalanceResponse>(request);
    }

    async getProgramAccounts(programId: string): Promise<ProgramAccountsResponse> {
        const request: ProgramAccountsRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'getProgramAccounts',
            params: [programId]
        };
        return this.makeRPCRequest<ProgramAccountsResponse>(request);
    }

    async getMultipleAccounts(pubkeys: string[]): Promise<any> {
        const request: MultipleAccountsRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'getMultipleAccounts',
            params: [pubkeys]
        };
        return this.makeRPCRequest(request);
    }

    async simulateTransaction(transaction: string): Promise<SimulateTransactionResponse> {
        const request: SimulateTransactionRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'simulateTransaction',
            params: [transaction, { encoding: 'base64' }]
        };
        return this.makeRPCRequest<SimulateTransactionResponse>(request);
    }

    async getPriorityFees(pubkey: string): Promise<any> {
        const request: PriorityFeesRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'getRecentPrioritizationFees',
            params: [[pubkey]]
        };
        return this.makeRPCRequest(request);
    }

    async getLatestBlockhash(): Promise<LatestBlockhashResponse> {
        const request: LatestBlockhashRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'getLatestBlockhash',
            params: [{ commitment: 'processed' }]
        };
        return this.makeRPCRequest<LatestBlockhashResponse>(request);
    }

    async getBlock(slot: number): Promise<BlockResponse> {
        const request: BlockRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'getBlock',
            params: [slot]
        };
        return this.makeRPCRequest<BlockResponse>(request);
    }

    async getSignatureStatuses(signatures: string[], searchHistory = false): Promise<any> {
        const request: SignatureStatusesRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'getSignatureStatuses',
            params: [signatures, { searchTransactionHistory: searchHistory }]
        };
        return this.makeRPCRequest(request);
    }

    async getInflationRate(): Promise<InflationRateResponse> {
        const request: InflationRateRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'getInflationRate'
        };
        return this.makeRPCRequest<InflationRateResponse>(request);
    }

    async getTokenLargestAccounts(mint: string): Promise<any> {
        const request: TokenLargestAccountsRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'getTokenLargestAccounts',
            params: [mint]
        };
        return this.makeRPCRequest(request);
    }

    async getSupply(excludeNonCirculating = false): Promise<SupplyResponse> {
        const request: SupplyRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'getSupply',
            params: [{
                commitment: 'finalized',
                excludeNonCirculatingAccountsList: excludeNonCirculating
            }]
        };
        return this.makeRPCRequest<SupplyResponse>(request);
    }
}