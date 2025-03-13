import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config/config';
import { 
    ClaudePromptContext, 
    ClaudeResponse, 
    ClaudeToolDefinition 
} from '../types/claude.types';
import { PromptBuilder } from '../utils/promptBuilder';
import { ProtocolService } from '../../services/protocolService';
import { RiskMonitoringService } from '../../services/risk/riskMonitoringService';
import { ProtocolHealthMetrics } from '../../types/risk.types';

export class ClaudeService {
    private anthropic: Anthropic;
    private protocolService: ProtocolService;
    private riskService: RiskMonitoringService;

    constructor(
        protocolService: ProtocolService,
        riskService: RiskMonitoringService
    ) {
        const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
        if (!apiKey) {
            throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
        }

        this.anthropic = new Anthropic({
            apiKey,
            defaultHeaders: {
                'anthropic-version': '2023-06-01'
            }
        });
        
        this.protocolService = protocolService;
        this.riskService = riskService;
    }

    async analyzePortfolio(walletAddress: string): Promise<ClaudeResponse> {
        try {
            const positions = await this.protocolService.getAllPositions(walletAddress);
            const riskMetrics = await Promise.all(
                positions.map(pos => this.riskService.monitorPosition(pos.address))
            );

            const context: ClaudePromptContext = {
                wallet_address: walletAddress,
                protocol_positions: positions,
                risk_metrics: riskMetrics.flat(),
                total_value: positions.reduce((sum, pos) => sum + pos.value, 0),
                protocols_involved: [...new Set(positions.map(pos => pos.protocol))]
            };

            const prompt = PromptBuilder.buildPortfolioAnalysisPrompt(context);

            const response = await this.anthropic.messages.create({
                model: "claude-3-5-haiku-20241022",
                max_tokens: 1024,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            const responseText = response.content
                .filter(block => block.type === 'text')
                .map(block => (block as any).text)
                .join('\n');

            return this.parseResponse(responseText);
        } catch (error) {
            console.error('Claude analysis error:', error);
            throw error;
        }
    }

    private parseResponse(rawResponse: string): ClaudeResponse {
        // Basic parsing logic
        return {
            insights: rawResponse,
            recommendations: this.extractRecommendations(rawResponse),
            risk_assessment: {
                overall_risk: this.calculateOverallRisk(rawResponse),
                key_warnings: this.extractWarnings(rawResponse)
            }
        };
    }

    private extractRecommendations(response: string): string[] {
        // More sophisticated recommendation extraction
        const recommendationRegex = /Recommendation:\s*(.*?)(?=\n|$)/g;
        const recommendations: string[] = [];
        let match;

        while ((match = recommendationRegex.exec(response)) !== null) {
            recommendations.push(match[1].trim());
        }

        return recommendations.length > 0 
            ? recommendations 
            : ['No specific recommendations found'];
    }

    private calculateOverallRisk(response: string): number {
        // More intelligent risk calculation
        const riskIndicators = [
            { pattern: /high risk/i, score: 80 },
            { pattern: /moderate risk/i, score: 50 },
            { pattern: /low risk/i, score: 20 }
        ];

        for (const indicator of riskIndicators) {
            if (indicator.pattern.test(response)) {
                return indicator.score;
            }
        }

        return 50; // Default moderate risk
    }

    private extractWarnings(response: string): string[] {
        // More sophisticated warning extraction
        const warningRegex = /Warning:\s*(.*?)(?=\n|$)/g;
        const warnings: string[] = [];
        let match;

        while ((match = warningRegex.exec(response)) !== null) {
            warnings.push(match[1].trim());
        }

        return warnings.length > 0 
            ? warnings 
            : ['No specific warnings detected'];
    }

    // Add test connection method
    async testConnection(): Promise<boolean> {
        try {
            const response = await this.anthropic.messages.create({
                model: "claude-3-haiku-20240307",
                max_tokens: 10,
                system: "You are a Solana DeFi risk analyst specializing in portfolio analysis.",
                messages: [{ role: 'user', content: 'test' }]
            });
            return true;
        } catch (error) {
            console.error('Claude connection test failed:', error);
            return false;
        }
    }

    // Add protocol health analysis method
    async analyzeProtocolHealth(protocols: ProtocolHealthMetrics[]): Promise<ClaudeResponse> {
        try {
            const prompt = `
Analyze the health of the following DeFi protocols:

${protocols.map(p => `
Protocol: ${p.name}
TVL: $${p.tvl}
24h TVL Change: ${p.tvlChange24h}%
24h Volume Change: ${p.volumeChange24h}%
Active Users (24h): ${p.userCount24h}
`).join('\n')}

Provide a comprehensive analysis focusing on:
1. Overall protocol health
2. Risk indicators
3. Concerning trends
4. Recommendations
`;

            const response = await this.anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 1024,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            const responseText = response.content
                .filter(block => block.type === 'text')
                .map(block => (block as any).text)
                .join('\n');

            return this.parseResponse(responseText);
        } catch (error) {
            console.error('Protocol health analysis error:', error);
            throw error;
        }
    }
}