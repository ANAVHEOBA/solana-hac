import { ClaudePromptContext, ClaudeToolDefinition } from '../types/claude.types';

export class PromptBuilder {
    static buildPortfolioAnalysisPrompt(context: ClaudePromptContext): string {
        return `
You are a Solana DeFi risk analyst. Analyze the following portfolio:

Wallet Address: ${context.wallet_address}
Total Portfolio Value: $${context.total_value.toFixed(2)}
Protocols Involved: ${context.protocols_involved.join(', ')}

Positions:
${context.protocol_positions.map(pos => 
    `- ${pos.protocol}: $${pos.value.toFixed(2)} (APY: ${pos.apy}%)`
).join('\n')}

Risk Metrics:
${context.risk_metrics.map(risk => 
    `- ${risk.protocol}: Overall Risk ${risk.riskScore.overall}/100`
).join('\n')}

Provide a comprehensive analysis focusing on:
1. Portfolio diversification
2. Potential risks
3. Optimization strategies
4. Comparative protocol performance
`;
    }

    static getToolDefinitions(): ClaudeToolDefinition[] {
        return [
            {
                name: 'fetch_protocol_details',
                description: 'Retrieve detailed information about a specific DeFi protocol',
                input_schema: {
                    protocol_name: 'string',
                    metric: 'string'
                }
            },
            // Add more tool definitions
        ];
    }
}