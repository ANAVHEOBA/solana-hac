import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';

// Update Helius API base URLs
export const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
export const HELIUS_API_URL = `https://api.helius.xyz/v0`;

// Jupiter API base URL
const JUPITER_BASE_URL = 'https://api.jup.ag';

// Add this interface at the top of the file
export interface TokenPrice {
  price: number;
  vsToken: string;
}

export interface TokenPrices {
  [mintAddress: string]: TokenPrice;
}

/**
 * Fetches basic wallet information including SOL balance and token balances
 */
export async function getWalletInfo(walletAddress: string, connection: Connection) {
  try {
    const pubkey = new PublicKey(walletAddress);
    
    // Get SOL balance using Helius RPC
    const balanceResponse = await axios.post(HELIUS_RPC_URL, {
      jsonrpc: "2.0",
      id: "1",
      method: "getBalance",
      params: [walletAddress]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (balanceResponse.data.error) {
      throw new Error(`Helius API error: ${JSON.stringify(balanceResponse.data.error)}`);
    }

    const solBalance = balanceResponse.data.result / 10**9; // Convert lamports to SOL
    
    // Get token accounts using web3.js
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });
    
    // Get token balances for each account
    const tokenBalancePromises = tokenAccounts.value.map(async account => {
      const response = await axios.post(HELIUS_RPC_URL, {
        jsonrpc: "2.0",
        id: "1",
        method: "getTokenAccountBalance",
        params: [account.pubkey.toBase58()]
      });

      if (response.data.error) {
        console.warn(`Error fetching token balance for ${account.pubkey.toBase58()}:`, response.data.error);
        return null;
      }

      return {
        mint: account.account.data.parsed.info.mint,
        amount: response.data.result?.value?.uiAmount || 0,
        decimals: response.data.result?.value?.decimals || 0,
      };
    });
    
    const tokenBalances = (await Promise.all(tokenBalancePromises))
      .filter(balance => balance !== null);
    
    return {
      address: walletAddress,
      solBalance,
      tokenAccounts: tokenBalances,
    };
  } catch (error) {
    console.error('Error fetching wallet info:', error);
    if (axios.isAxiosError(error)) {
      console.error('API Response:', error.response?.data);
    }
    throw new Error('Failed to fetch wallet information');
  }
}

/**
 * Fetches DeFi positions for a wallet using Helius API
 */
export async function getDeFiPositions(walletAddress: string) {
  try {
    const response = await axios.get(`${HELIUS_API_URL}/addresses/${walletAddress}/positions`, {
      headers: {
        'api-key': process.env.HELIUS_API_KEY
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching DeFi positions:', error);
    throw new Error('Failed to fetch DeFi positions: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Fetches token prices using Jupiter API
 */
export async function getTokenPrices(mintAddresses: string[]): Promise<TokenPrices> {
  try {
    if (mintAddresses.length === 0) return {};
    
    const response = await axios.post('https://price.jup.ag/v4/price', {
      tokens: mintAddresses,
      vsToken: 'USDC'
    });

    return Object.fromEntries(
      Object.entries(response.data.data).map(([mint, data]: [string, any]) => [
        mint,
        { 
          price: data.price,
          vsToken: 'USDC'
        }
      ])
    );
  } catch (error) {
    console.error('Error fetching token prices:', error);
    return {};
  }
}

// Add SOL price function
export async function getSOLPrice(): Promise<number> {
  try {
    const response = await axios.get('https://price.jup.ag/v4/price', {
      params: {
        ids: 'SOL'
      }
    });
    return response.data.data.SOL.price;
  } catch (error) {
    console.error('Error fetching SOL price:', error);
    return 100; // Fallback value
  }
}

// Add new protocol analysis functions
export async function getProtocolExposure(positions: any[]) {
  const exposure: Record<string, number> = {};
  
  positions.forEach(position => {
    const protocol = position.protocol.name;
    exposure[protocol] = (exposure[protocol] || 0) + position.value;
  });
  
  return exposure;
}

export function calculateLiquidationRisk(positions: any[]) {
  return positions.reduce((maxRisk, position) => 
    Math.max(maxRisk, position.risk_parameters.liquidation_threshold), 0);
}

export async function getAuditScores(positions: any[]) {
  const scores: Record<string, number> = {};
  const uniqueProtocols = [...new Set(positions.map(p => p.protocol.id))];
  
  await Promise.all(uniqueProtocols.map(async protocolId => {
    const response = await axios.get(`${HELIUS_API_URL}/protocols/${protocolId}/audits`);
    scores[protocolId] = response.data.audit_score;
  }));
  
  return scores;
}