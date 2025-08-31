const fs = require('fs');
const axios = require('axios');

class AlertManager {
    constructor(config = {}) {
        this.config = {
            emailEnabled: config.emailEnabled || false,
            slackEnabled: config.slackEnabled || false,
            webhookEnabled: config.webhookEnabled || false,
            logFile: config.logFile || 'security-alerts.log',
            thresholds: config.thresholds || {
                critical: 0,  // Alert immediately
                high: 3,      // Alert after 3 occurrences
                medium: 10    // Alert after 10 occurrences
            }
        };
        
        this.alertCounts = new Map();
        this.lastAlertTime = new Map();
    }

    // Main alert method
    async sendAlert(severity, test, details) {
        const alertKey = `${test}-${severity}`;
        const now = Date.now();
        
        // Check if we should throttle this alert
        if (this.shouldThrottle(alertKey, severity, now)) {
            return false;
        }

        const alert = {
            timestamp: new Date().toISOString(),
            severity,
            test,
            details,
            alertKey
        };

        // Log to file
        this.logAlert(alert);

        // Send to various channels based on severity
        if (severity === 'CRITICAL') {
            await this.sendCriticalAlert(alert);
        } else if (severity === 'HIGH') {
            await this.sendHighAlert(alert);
        } else {
            await this.sendLowAlert(alert);
        }

        // Update last alert time
        this.lastAlertTime.set(alertKey, now);
        
        return true;
    }

    // Check if we should throttle alerts
    shouldThrottle(alertKey, severity, now) {
        const lastAlert = this.lastAlertTime.get(alertKey) || 0;
        const timeSinceLastAlert = now - lastAlert;
        
        // Throttle rules based on severity
        const throttleWindows = {
            'CRITICAL': 5 * 60 * 1000,   // 5 minutes
            'HIGH': 30 * 60 * 1000,      // 30 minutes
            'MEDIUM': 60 * 60 * 1000,    // 1 hour
            'LOW': 24 * 60 * 60 * 1000   // 24 hours
        };
        
        const window = throttleWindows[severity] || throttleWindows['LOW'];
        return timeSinceLastAlert < window;
    }

    // Log alert to file
    logAlert(alert) {
        const logEntry = JSON.stringify(alert) + '\n';
        fs.appendFileSync(this.config.logFile, logEntry);
        
        // Also log to console with color coding
        const colors = {
            'CRITICAL': '\x1b[31m', // Red
            'HIGH': '\x1b[33m',     // Yellow
            'MEDIUM': '\x1b[36m',   // Cyan
            'LOW': '\x1b[32m'       // Green
        };
        const color = colors[alert.severity] || '\x1b[37m';
        const reset = '\x1b[0m';
        
        console.log(`${color}[${alert.severity}]${reset} ${alert.test}: ${alert.details.recommendation || 'Check details'}`);
    }

    // Send critical alerts (all channels)
    async sendCriticalAlert(alert) {
        const message = this.formatMessage(alert);
        
        // Console with formatting
        console.log('\n🚨🚨🚨 CRITICAL SECURITY ALERT 🚨🚨🚨');
        console.log(message);
        console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨\n');
        
        // Send to external services
        if (this.config.slackEnabled) {
            await this.sendToSlack(message, 'danger');
        }
        
        if (this.config.webhookEnabled) {
            await this.sendToWebhook(alert);
        }
    }

    // Send high priority alerts
    async sendHighAlert(alert) {
        const message = this.formatMessage(alert);
        
        console.log('\n⚠️  HIGH PRIORITY ALERT');
        console.log(message);
        
        if (this.config.slackEnabled) {
            await this.sendToSlack(message, 'warning');
        }
    }

    // Send low priority alerts
    async sendLowAlert(alert) {
        const message = this.formatMessage(alert);
        console.log(`ℹ️  ${alert.severity} Alert: ${alert.test}`);
    }

    // Format alert message
    formatMessage(alert) {
        let message = `Security Alert: ${alert.test}\n`;
        message += `Severity: ${alert.severity}\n`;
        message += `Time: ${alert.timestamp}\n`;
        
        if (alert.details) {
            if (alert.details.recommendation) {
                message += `Action Required: ${alert.details.recommendation}\n`;
            }
            if (alert.details.details) {
                message += `Details: ${JSON.stringify(alert.details.details, null, 2)}\n`;
            }
        }
        
        return message;
    }

    // Send to Slack (requires webhook URL)
    async sendToSlack(message, level = 'info') {
        if (!this.config.slackWebhookUrl) {
            console.log('[Slack integration not configured]');
            return;
        }

        const colors = {
            'danger': '#FF0000',
            'warning': '#FFA500',
            'info': '#0000FF'
        };

        try {
            await axios.post(this.config.slackWebhookUrl, {
                attachments: [{
                    color: colors[level],
                    text: message,
                    footer: 'GalaSwap Security Monitor',
                    footer_icon: '🔒',
                    ts: Math.floor(Date.now() / 1000)
                }]
            });
        } catch (error) {
            console.error('Failed to send Slack alert:', error.message);
        }
    }

    // Send to generic webhook
    async sendToWebhook(alert) {
        if (!this.config.webhookUrl) {
            console.log('[Webhook integration not configured]');
            return;
        }

        try {
            await axios.post(this.config.webhookUrl, alert);
        } catch (error) {
            console.error('Failed to send webhook alert:', error.message);
        }
    }

    // Get alert statistics
    getStats() {
        const stats = {
            totalAlerts: 0,
            bySeverity: {},
            recentAlerts: []
        };

        // Read log file and parse
        if (fs.existsSync(this.config.logFile)) {
            const logs = fs.readFileSync(this.config.logFile, 'utf8')
                .split('\n')
                .filter(line => line)
                .map(line => JSON.parse(line));
            
            stats.totalAlerts = logs.length;
            
            logs.forEach(log => {
                stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
            });
            
            stats.recentAlerts = logs.slice(-10);
        }
        
        return stats;
    }
}

// Test the alert manager
if (require.main === module) {
    const alertManager = new AlertManager({
        // Add your Slack webhook URL here if you have one
        // slackWebhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
        // webhookUrl: 'https://your-webhook-endpoint.com/alerts'
    });

    // Test different severity levels
    console.log('Testing Alert Manager...\n');
    
    alertManager.sendAlert('CRITICAL', 'Rate Limiting', {
        recommendation: 'Implement rate limiting immediately',
        details: { requestsPerSecond: 100 }
    });

    alertManager.sendAlert('HIGH', 'Precision Loss', {
        recommendation: 'Review decimal handling',
        details: { loss: '3.54%' }
    });

    alertManager.sendAlert('LOW', 'Pool Liquidity', {
        recommendation: 'Monitor liquidity levels',
        details: { pool: 'GALA/GUSDC' }
    });

    // Show stats
    console.log('\nAlert Statistics:');
    console.log(alertManager.getStats());
}

module.exports = AlertManager;