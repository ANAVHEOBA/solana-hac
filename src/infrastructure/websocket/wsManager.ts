import WebSocket from 'ws';
import { Connection, PublicKey } from '@solana/web3.js';

export class WebSocketManager {
    private static instance: WebSocketManager;
    private connections: Map<string, WebSocket>;
    private subscriptions: Map<string, number>;

    private constructor() {
        this.connections = new Map();
        this.subscriptions = new Map();
    }

    public static getInstance(): WebSocketManager {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }

    public async subscribeToAccount(accountPubkey: string, callback: (data: any) => void): Promise<number> {
        const ws = await this.getConnection('main');
        const subscriptionId = await this.createAccountSubscription(ws, accountPubkey);
        
        ws.on('message', (data: WebSocket.Data) => {
            const message = JSON.parse(data.toString());
            if (message.method === 'accountNotification') {
                callback(message.params);
            }
        });

        return subscriptionId;
    }

    private async getConnection(id: string): Promise<WebSocket> {
        if (!this.connections.has(id)) {
            const ws = new WebSocket(process.env.WS_ENDPOINT!);
            await new Promise((resolve) => ws.on('open', resolve));
            this.connections.set(id, ws);
        }
        return this.connections.get(id)!;
    }

    private async createAccountSubscription(ws: WebSocket, accountPubkey: string): Promise<number> {
        const subscribeRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'accountSubscribe',
            params: [
                accountPubkey,
                { encoding: 'jsonParsed', commitment: 'confirmed' }
            ]
        };

        ws.send(JSON.stringify(subscribeRequest));

        return new Promise((resolve) => {
            ws.once('message', (data: WebSocket.Data) => {
                const response = JSON.parse(data.toString());
                resolve(response.result);
            });
        });
    }
}

export default WebSocketManager.getInstance(); 