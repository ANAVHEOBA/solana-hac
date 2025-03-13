import { ProtocolPosition } from '../../types/protocol.types';
import { PositionRisk } from '../../types/risk.types';

export interface ClaudePromptContext {
    wallet_address: string;
    protocol_positions: ProtocolPosition[];
    risk_metrics: PositionRisk[];
    total_value: number;
    protocols_involved: string[];
}

export interface ClaudeToolDefinition {
    name: string;
    description: string;
    input_schema: Record<string, string>;
}

export interface ClaudeResponse {
    insights: string;
    recommendations: string[];
    risk_assessment: {
        overall_risk: number;
        key_warnings: string[];
    };
}

export interface ClaudeToolCall {
    tool_name: string;
    parameters: Record<string, any>;
}