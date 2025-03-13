import axios from 'axios';

interface NotificationConfig {
    discord?: {
        webhookUrl: string;
    };
    telegram?: {
        botToken: string;
        chatId: string;
    };
}

interface Notification {
    type: string;
    severity: string;
    message: string;
    address: string;
    timestamp: string;
}

export class NotificationManager {
    constructor(private config: NotificationConfig) {}

    async sendNotification(notification: Notification): Promise<void> {
        try {
            // Format the message
            const formattedMessage = this.formatMessage(notification);

            // Send to all configured channels
            await Promise.all([
                this.sendToDiscord(formattedMessage),
                this.sendToTelegram(formattedMessage)
            ]);

        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }

    private formatMessage(notification: Notification): string {
        const severityEmoji = this.getSeverityEmoji(notification.severity);
        return `${severityEmoji} Risk Alert for ${notification.address}\n\n` +
               `Type: ${notification.type}\n` +
               `Severity: ${notification.severity}\n` +
               `Message: ${notification.message}\n` +
               `Time: ${new Date(notification.timestamp).toLocaleString()}`;
    }

    private getSeverityEmoji(severity: string): string {
        switch (severity) {
            case 'CRITICAL': return '🚨';
            case 'HIGH': return '⚠️';
            case 'MEDIUM': return '⚡';
            case 'LOW': return 'ℹ️';
            default: return '📢';
        }
    }

    private async sendToDiscord(message: string): Promise<void> {
        if (!this.config.discord?.webhookUrl) return;

        try {
            await axios.post(this.config.discord.webhookUrl, {
                content: message,
                username: 'DeFi Sentinel'
            });
        } catch (error) {
            console.error('Discord notification error:', error);
        }
    }

    private async sendToTelegram(message: string): Promise<void> {
        if (!this.config.telegram?.botToken || !this.config.telegram?.chatId) return;

        try {
            const url = `https://api.telegram.org/bot${this.config.telegram.botToken}/sendMessage`;
            await axios.post(url, {
                chat_id: this.config.telegram.chatId,
                text: message,
                parse_mode: 'HTML'
            });
        } catch (error) {
            console.error('Telegram notification error:', error);
        }
    }
} 