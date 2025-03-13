// Base RPC request interface
interface BaseRPCRequest {
    jsonrpc: '2.0';
    id: number | string;
    method: string;
}

// Account Info
export interface AccountInfoRequest extends BaseRPCRequest {
    method: 'getAccountInfo';
    params: [string, { encoding: string }];
}

export interface AccountInfoResponse {
    jsonrpc: '2.0';
    result: {
        context: { apiVersion: string; slot: number };
        value: any;
    };
}

// Balance
export interface BalanceRequest extends BaseRPCRequest {
    method: 'getBalance';
    params: [string];
}

export interface BalanceResponse {
    jsonrpc: '2.0';
    result: {
        context: { slot: number };
        value: number;
    };
}

// Token Accounts
export interface TokenAccountsRequest extends BaseRPCRequest {
    method: 'getTokenAccountsByOwner';
    params: [
        string,
        { programId: string },
        { encoding: string }
    ];
}

export interface TokenAccountsResponse {
    jsonrpc: '2.0';
    result: {
        context: { apiVersion: string; slot: number };
        value: Array<{
            pubkey: string;
            account: {
                data: {
                    program: string;
                    parsed: {
                        info: {
                            mint: string;
                            owner: string;
                            tokenAmount: {
                                amount: string;
                                decimals: number;
                                uiAmount: number;
                            };
                        };
                    };
                };
            };
        }>;
    };
}

// Transaction History
export interface TransactionHistoryRequest extends BaseRPCRequest {
    method: 'getSignaturesForAddress';
    params: [string, object?];
}

export interface TransactionRequest extends BaseRPCRequest {
    method: 'getTransaction';
    params: [string, string];
}

// Token Balance
export interface TokenBalanceRequest extends BaseRPCRequest {
    method: 'getTokenAccountBalance';
    params: [string];
}

export interface TokenBalanceResponse {
    jsonrpc: '2.0';
    result: {
        context: { slot: number };
        value: {
            amount: string;
            decimals: number;
            uiAmount: number;
            uiAmountString: string;
        };
    };
}

// Program Accounts
export interface ProgramAccountsRequest extends BaseRPCRequest {
    method: 'getProgramAccounts';
    params: [string, object?];
}

export interface ProgramAccountsResponse {
    jsonrpc: '2.0';
    result: Array<{
        pubkey: string;
        account: {
            lamports: number;
            owner: string;
            data: [string, string];
            executable: boolean;
            rentEpoch: number;
            space: number;
        };
    }>;
}

// Multiple Accounts
export interface MultipleAccountsRequest extends BaseRPCRequest {
    method: 'getMultipleAccounts';
    params: [string[]];
}

// Transaction Simulation
export interface SimulateTransactionRequest extends BaseRPCRequest {
    method: 'simulateTransaction';
    params: [string, { encoding: string }];
}

export interface SimulateTransactionResponse {
    jsonrpc: '2.0';
    result: {
        context: { slot: number };
        value: {
            err: any;
            logs: string[];
            accounts: Array<{
                lamports: number;
                owner: string;
            }>;
            returnData?: {
                programId: string;
                data: string[];
            };
        };
    };
}

// Priority Fees
export interface PriorityFeesRequest extends BaseRPCRequest {
    method: 'getRecentPrioritizationFees';
    params: [string[]];
}

// Latest Blockhash
export interface LatestBlockhashRequest extends BaseRPCRequest {
    method: 'getLatestBlockhash';
    params: [{ commitment?: string; minContextSlot?: number }?];
}

export interface LatestBlockhashResponse {
    jsonrpc: '2.0';
    result: {
        context: { slot: number };
        value: {
            blockhash: string;
            lastValidBlockHeight: number;
        };
    };
}

// Block
export interface BlockRequest extends BaseRPCRequest {
    method: 'getBlock';
    params: [number];
}

export interface BlockResponse {
    jsonrpc: '2.0';
    result: {
        blockhash: string;
        previousBlockhash: string;
        parentSlot: number;
        transactions: Array<{
            transaction: any;
            meta: {
                fee: number;
                preBalances: number[];
                postBalances: number[];
                rewards?: Array<{
                    pubkey: string;
                    lamports: number;
                    rewardType: string;
                }>;
            };
        }>;
        blockTime: number | null;
        blockHeight: number;
    };
}

// Signature Statuses
export interface SignatureStatusesRequest extends BaseRPCRequest {
    method: 'getSignatureStatuses';
    params: [string[], { searchTransactionHistory?: boolean }?];
}

// Inflation Rate
export interface InflationRateRequest extends BaseRPCRequest {
    method: 'getInflationRate';
}

export interface InflationRateResponse {
    jsonrpc: '2.0';
    result: {
        total: number;
        validator: number;
        foundation: number;
        epoch: number;
    };
}

// Token Largest Accounts
export interface TokenLargestAccountsRequest extends BaseRPCRequest {
    method: 'getTokenLargestAccounts';
    params: [string];
}

// Supply
export interface SupplyRequest extends BaseRPCRequest {
    method: 'getSupply';
    params: [{ commitment?: string; excludeNonCirculatingAccountsList?: boolean }?];
}

export interface SupplyResponse {
    jsonrpc: '2.0';
    result: {
        context: { slot: number };
        value: {
            total: number;
            circulating: number;
            nonCirculating: number;
            nonCirculatingAccounts: string[];
        };
    };
}

// Query Options for Metrics
export interface QueryOptions {
    start: string;
    stop?: string;
    limit?: number;
}