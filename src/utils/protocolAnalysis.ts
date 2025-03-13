import axios from 'axios';
import { HELIUS_API_URL } from './solanaUtils';

interface DeFiPosition {
  protocol: {
    name: string;
    id: string;
  };
  value: number;
  risk_parameters?: {
    liquidation_threshold?: number;
    impermanent_loss_risk?: number;
  };
}

interface ProtocolRisk {
  audit_score: number;
  tvl_change_24h: number;
  total_value_locked: number;
}

export async function getProtocolExposure(positions: DeFiPosition[]) {
  try {
    const exposure: Record<string, number> = {};
    
    for (const position of positions) {
      const protocol = position.protocol.name;
      exposure[protocol] = (exposure[protocol] || 0) + position.value;
    }
    
    // Get protocol TVL data to calculate relative exposure
    const protocols = [...new Set(positions.map(p => p.protocol.id))];
    const tvlData = await Promise.all(
      protocols.map(async (protocolId) => {
        try {
          const response = await axios.get(`${HELIUS_API_URL}/protocols/${protocolId}/tvl`, {
            headers: {
              'api-key': process.env.HELIUS_API_KEY
            }
          });
          return {
            protocol: protocolId,
            tvl: response.data.total_value_locked
          };
        } catch (error) {
          console.error(`Error fetching TVL for ${protocolId}:`, error);
          return { protocol: protocolId, tvl: 0 };
        }
      })
    );
    
    // Calculate relative exposure (position value / protocol TVL)
    const relativeExposure: Record<string, number> = {};
    tvlData.forEach(({ protocol, tvl }) => {
      if (tvl > 0 && exposure[protocol]) {
        relativeExposure[protocol] = exposure[protocol] / tvl;
      }
    });
    
    return {
      absolute: exposure,
      relative: relativeExposure
    };
  } catch (error) {
    console.error('Error calculating protocol exposure:', error);
    throw error;
  }
}

export function calculateLiquidationRisk(positions: DeFiPosition[]) {
  try {
    // Get highest liquidation risk across all positions
    const maxLiquidationRisk = positions.reduce((maxRisk, position) => {
      const threshold = position.risk_parameters?.liquidation_threshold || 0;
      return Math.max(maxRisk, threshold);
    }, 0);
    
    // Weight by position value
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
    const weightedRisk = positions.reduce((risk, position) => {
      const threshold = position.risk_parameters?.liquidation_threshold || 0;
      const weight = position.value / totalValue;
      return risk + (threshold * weight);
    }, 0);
    
    return {
      max: maxLiquidationRisk,
      weighted: weightedRisk
    };
  } catch (error) {
    console.error('Error calculating liquidation risk:', error);
    return { max: 0, weighted: 0 };
  }
}

export function calculateILRisk(positions: DeFiPosition[]) {
  try {
    // Calculate weighted IL risk based on position values
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
    
    return positions.reduce((totalRisk, position) => {
      const ilRisk = position.risk_parameters?.impermanent_loss_risk || 0;
      const weight = position.value / totalValue;
      return totalRisk + (ilRisk * weight);
    }, 0);
  } catch (error) {
    console.error('Error calculating IL risk:', error);
    return 0;
  }
}

export async function getAuditScores(positions: DeFiPosition[]) {
  try {
    const protocols = [...new Set(positions.map(p => p.protocol.id))];
    const protocolRisks = await Promise.all(
      protocols.map(async (protocolId) => {
        try {
          const response = await axios.get(`${HELIUS_API_URL}/protocols/${protocolId}/risk`, {
            params: {
              'api-key': process.env.HELIUS_API_KEY
            }
          });
          
          const risk: ProtocolRisk = response.data;
          return {
            protocol: protocolId,
            audit_score: risk.audit_score,
            tvl_volatility: Math.abs(risk.tvl_change_24h),
            size_factor: Math.log10(risk.total_value_locked)
          };
        } catch (error) {
          console.error(`Error fetching risk data for ${protocolId}:`, error);
          return {
            protocol: protocolId,
            audit_score: 0,
            tvl_volatility: 0,
            size_factor: 0
          };
        }
      })
    );
    
    // Calculate composite risk scores
    const riskScores: Record<string, number> = {};
    protocolRisks.forEach(({ protocol, audit_score, tvl_volatility, size_factor }) => {
      // Higher score = lower risk
      riskScores[protocol] = Math.min(
        100,
        audit_score * 0.5 + // 50% weight on audit score
        (100 - tvl_volatility) * 0.3 + // 30% weight on TVL stability
        size_factor * 10 * 0.2 // 20% weight on protocol size
      );
    });
    
    return riskScores;
  } catch (error) {
    console.error('Error fetching audit scores:', error);
    throw error;
  }
} 