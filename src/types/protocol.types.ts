export interface ProtocolPosition {
    protocol: string;
    address: string;
    balance: number;
    value: number;
    apy: number;
    healthFactor?: number;
    rewards?: number;
}

export interface ProtocolAdapter {
    getName(): string;
    getPositions(address: string): Promise<ProtocolPosition[]>;
    getAPY(): Promise<number>;
}

// Kamino Types
export interface KaminoStrategyMetrics {
    strategyPubkey: string;
    tvl: number;
    pnl: number;
    apy: number;
    tokenAMint: string;
    tokenBMint: string;
    tokenABalance: number;
    tokenBBalance: number;
    status: string;
    lastUpdated: string;
}

export interface KaminoStrategyDetails {
    metrics: KaminoStrategyMetrics;
    risks: {
        liquidityRisk: number;
        volatilityRisk: number;
        impermanentLoss: number;
    };
    performance: {
        daily: number;
        weekly: number;
        monthly: number;
    };
}

export interface KaminoPriceData {
    mint: string;
    symbol: string;
    price: number;
    timestamp: string;
    source: string;
}

export interface KaminoUserPosition {
    strategyPubkey: string;
    shares: number;
    depositedTokenA: number;
    depositedTokenB: number;
    valueUSD: number;
    lastUpdateTime: string;
}

export interface KaminoApyHistory {
    timestamp: string;
    value: number;
}

export interface KaminoActiveStrategy {
    strategyPubkey: string;
    status: string;
    tokenAPair: string;
    tokenBPair: string;
    tvl: number;
    apy: number;
} 