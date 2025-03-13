import { RiskWarning } from '../../types/risk.types';
import { NotificationManager } from '../../infrastructure/alerts/notificationManager';
import redisClient from '../../infrastructure/cache/redisClient';
import influxClient from '../../infrastructure/timeseries/influxClient';

export class AlertService {
    private readonly ALERT_CACHE_TTL = 3600; // 1 hour
    private readonly MAX_ALERTS_PER_HOUR = 10;

    constructor(
        private notificationManager: NotificationManager
    ) {}

    async triggerAlerts(warnings: RiskWarning[], address: string): Promise<void> {
        try {
            // Check rate limiting
            if (await this.isRateLimited(address)) {
                console.log(`Alert rate limit reached for ${address}`);
                return;
            }

            // Process each warning
            for (const warning of warnings) {
                // Check if this specific alert was recently sent
                const alertKey = `alert:${address}:${warning.type}:${warning.severity}`;
                const recentAlert = await redisClient.get(alertKey);
                
                if (!recentAlert) {
                    // Send notification
                    await this.notificationManager.sendNotification({
                        type: warning.type,
                        severity: warning.severity,
                        message: warning.message,
                        address: address,
                        timestamp: warning.timestamp
                    });

                    // Cache the alert to prevent spam
                    await redisClient.set(alertKey, 'sent', this.ALERT_CACHE_TTL);

                    // Store alert in InfluxDB for historical analysis
                    await this.storeAlert(warning, address);
                }
            }

            // Increment alert counter
            await this.incrementAlertCounter(address);

        } catch (error) {
            console.error('Error triggering alerts:', error);
            throw error;
        }
    }

    private async isRateLimited(address: string): Promise<boolean> {
        const counterKey = `alerts:counter:${address}`;
        const counter = await redisClient.get(counterKey);
        return counter ? parseInt(counter) >= this.MAX_ALERTS_PER_HOUR : false;
    }

    private async incrementAlertCounter(address: string): Promise<void> {
        const counterKey = `alerts:counter:${address}`;
        
        // Use Redis commands compatible with the current client
        const currentCount = await redisClient.get(counterKey) || '0';
        const newCount = parseInt(currentCount) + 1;
        
        await redisClient.set(counterKey, newCount.toString(), this.ALERT_CACHE_TTL);
    }

    private async storeAlert(warning: RiskWarning, address: string): Promise<void> {
        await influxClient.writeMetric(
            'risk_alerts',
            {
                address: address,
                type: warning.type,
                severity: warning.severity
            },
            {
                // Use a numeric value or omit timestamp
                message_length: warning.message.length,
                timestamp: Date.now()
            }
        );
    }
} 