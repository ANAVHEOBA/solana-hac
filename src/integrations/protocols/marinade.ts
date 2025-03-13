import { Connection, PublicKey } from '@solana/web3.js';
import { Marinade, MarinadeConfig } from '@marinade.finance/marinade-ts-sdk';
import { ProtocolAdapter, ProtocolPosition } from '../../types/protocol.types';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export class MarinadeAdapter implements ProtocolAdapter {
    private connection: Connection;
    private marinade: Marinade;
    // Mainnet addresses
    private MSOL_MINT = new PublicKey('mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So');
    private MARINADE_PROGRAM_ID = new PublicKey('MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD');
    private MARINADE_STATE = new PublicKey('8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC');

    constructor() {
        console.log('[Marinade] Initializing adapter...');
        this.connection = new Connection(
            'https://api.mainnet-beta.solana.com',
            'confirmed'
        );
        
        const config: MarinadeConfig = {
            connection: this.connection,
            marinadeFinanceProgramId: this.MARINADE_PROGRAM_ID,
            marinadeStateAddress: this.MARINADE_STATE,
            marinadeReferralProgramId: this.MARINADE_PROGRAM_ID,
            marinadeReferralGlobalStateAddress: new PublicKey('MarGf17XmvGhfxZRyxP4zZw7ie8GkCwKBMgYYyBSS5u'),
            publicKey: this.MARINADE_PROGRAM_ID,
            stakeWithdrawAuthPDA: this.MARINADE_STATE,
            lookupTableAddress: new PublicKey('LTR8xXcSrEDsCbTWPY4JmJREFdMz4uYh65uajkVjzru'),
            referralCode: null
        };
        
        this.marinade = new Marinade(config);
        console.log('[Marinade] Adapter initialized');
    }

    async getPositions(address: string): Promise<ProtocolPosition[]> {
        try {
            console.log(`[Marinade] Checking positions for ${address}`);
            const pubkey = new PublicKey(address);
            
            // Get all token accounts
            console.log('[Marinade] Fetching all token accounts...');
            const allTokens = await this.connection.getParsedTokenAccountsByOwner(
                pubkey,
                { programId: TOKEN_PROGRAM_ID }
            );
            
            // Find mSOL accounts
            const msolAccounts = allTokens.value.filter(
                account => account.account.data.parsed.info.mint === this.MSOL_MINT.toString()
            );
            
            console.log(`[Marinade] Found ${msolAccounts.length} mSOL accounts`);
            
            if (msolAccounts.length === 0) {
                return [];
            }

            // Get Marinade state for mSOL price
            console.log('[Marinade] Fetching Marinade state...');
            const marinadeState = await this.marinade.getMarinadeState();
            const msolPrice = marinadeState.mSolPrice;
            console.log(`[Marinade] mSOL price: ${msolPrice}`);

            // Calculate total balance and value
            const totalBalance = msolAccounts.reduce((sum, account) => {
                return sum + Number(account.account.data.parsed.info.tokenAmount.uiAmount || 0);
            }, 0);

            const value = totalBalance * msolPrice;
            const apy = await this.getAPY();

            console.log(`[Marinade] Total balance: ${totalBalance} mSOL`);
            console.log(`[Marinade] Total value: ${value} SOL`);
            console.log(`[Marinade] Current APY: ${apy}%`);

            if (totalBalance > 0) {
                return [{
                    protocol: this.getName(),
                    address: address,
                    balance: totalBalance,
                    value: value,
                    apy: apy,
                    healthFactor: 1,
                    rewards: value * apy / 100
                }];
            }

            return [];
        } catch (error) {
            console.error('[Marinade] Error in getPositions:', error);
            return [];
        }
    }

    getName(): string {
        return 'Marinade';
    }

    async getAPY(): Promise<number> {
        try {
            console.log('[Marinade] Fetching APY...');
            const marinadeState = await this.marinade.getMarinadeState();
            const rewardRate = marinadeState.rewardsCommissionPercent;
            const annualRate = rewardRate * 365;
            console.log(`[Marinade] APY: ${annualRate * 100}%`);
            return annualRate * 100;
        } catch (error) {
            console.error('[Marinade] Error in getAPY:', error);
            return 0;
        }
    }
} 