import { Connection, PublicKey } from '@solana/web3.js';
import WebSocket from 'ws';
import redisClient from '../cache/redisClient';
import influxClient from '../timeseries/influxClient';
import { MetricPoint } from '../../types/infrastructure.types';

export class WebSocketHandlers {
    static async handleAccountUpdate(data: any) {
        try {
            // Cache the account data
            await redisClient.set(
                `account:${data.pubkey}`,
                JSON.stringify(data),
                300 // 5 minutes TTL
            );

            // Record metric
            const metric: MetricPoint = {
                measurement: 'account_updates',
                tags: {
                    pubkey: data.pubkey,
                    program: data.account.owner
                },
                fields: {
                    lamports: data.account.lamports,
                    dataSize: data.account.data.length
                },
                timestamp: Date.now()
            };

            await influxClient.writeMetric(
                metric.measurement,
                metric.tags,
                metric.fields,
                metric.timestamp
            );
        } catch (error) {
            console.error('Error handling account update:', error);
        }
    }

    static async handleTransactionUpdate(data: any) {
        try {
            // Process and store transaction data
            const metric: MetricPoint = {
                measurement: 'transactions',
                tags: {
                    status: data.status,
                    type: data.type
                },
                fields: {
                    fee: data.fee,
                    slots: data.slots
                },
                timestamp: Date.now()
            };

            await influxClient.writeMetric(
                metric.measurement,
                metric.tags,
                metric.fields,
                metric.timestamp
            );
        } catch (error) {
            console.error('Error handling transaction update:', error);
        }
    }
} 