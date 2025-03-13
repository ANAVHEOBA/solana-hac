export interface RiskScore {
    overall: number;          // 0-100, higher = riskier
    liquidation: number;      // 0-100
    impermanentLoss: number;  // 0-100
    protocolRisk: number;     // 0-100
    timestamp: string;
}

export interface RiskThresholds {
    liquidationWarning: number;
    liquidationCritical: number;
    ilWarning: number;
    ilCritical: number;
    tvlChangeWarning: number;
}

export interface PositionRisk {
    protocol: string;
    positionId: string;
    riskScore: RiskScore;
    liquidationPrice?: number;
    currentPrice?: number;
    ilExposure?: number;
    warnings: RiskWarning[];
}

export interface RiskWarning {
    type: 'LIQUIDATION' | 'IMPERMANENT_LOSS' | 'PROTOCOL' | 'TVL_CHANGE';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    timestamp: string;
}

export interface ProtocolHealthMetrics {
    name: string;
    tvl: number;
    tvlChange24h: number;
    volumeChange24h: number;
    userCount24h: number;
    lastUpdated: string;
} 