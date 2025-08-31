const cron = require('node-cron');
const SecurityMonitor = require('./security-monitor');
const ReportGenerator = require('./report-generator');
const fs = require('fs');

class SecurityScheduler {
    constructor() {
        this.monitor = new SecurityMonitor();
        this.reportGen = new ReportGenerator();
        this.runningJobs = [];
    }

    // Schedule different tests at different intervals
    setupSchedules() {
        console.log('Setting up automated security monitoring...\n');

        // Critical tests - every 5 minutes
        const criticalJob = cron.schedule('*/5 * * * *', async () => {
            console.log(`[${new Date().toISOString()}] Running critical tests...`);
            await this.runCriticalTests();
        }, { scheduled: false });

        // Full Phase 1 - every hour
        const phase1Job = cron.schedule('0 * * * *', async () => {
            console.log(`[${new Date().toISOString()}] Running Phase 1 tests...`);
            await this.monitor.runBasicTests();
        }, { scheduled: false });

        // Full Phase 2 - every 6 hours
        const phase2Job = cron.schedule('0 */6 * * *', async () => {
            console.log(`[${new Date().toISOString()}] Running Phase 2 tests...`);
            await this.monitor.runPhase2Tests();
        }, { scheduled: false });

        // Generate report - daily at 9 AM
        const reportJob = cron.schedule('0 9 * * *', async () => {
            console.log(`[${new Date().toISOString()}] Generating daily report...`);
            await this.reportGen.generateFromLatest();
        }, { scheduled: false });

        this.runningJobs = [criticalJob, phase1Job, phase2Job, reportJob];
        
        return this.runningJobs;
    }

    // Run only critical tests (rate limiting)
    async runCriticalTests() {
        const results = {
            timestamp: new Date().toISOString(),
            phase: 'Critical Tests Only',
            tests: []
        };

        const rateLimitTest = await this.monitor.testRateLimiting();
        results.tests.push(rateLimitTest);

        if (rateLimitTest.severity === 'CRITICAL') {
            await this.sendAlert('CRITICAL: Rate limiting still not implemented!', rateLimitTest);
        }

        this.monitor.saveResults(results);
        return results;
    }

    // Send alerts (stub for now - would integrate with email/Slack/etc)
    async sendAlert(message, details) {
        const alert = {
            timestamp: new Date().toISOString(),
            message,
            details
        };

        // Log to file for now
        fs.appendFileSync('security-alerts.log', JSON.stringify(alert) + '\n');
        console.log(`🚨 ALERT: ${message}`);

        // TODO: Integrate with:
        // - Email service (SendGrid, AWS SES)
        // - Slack webhook
        // - PagerDuty
        // - Custom webhook
    }

    // Start all scheduled jobs
    start() {
        const jobs = this.setupSchedules();
        jobs.forEach(job => job.start());
        
        console.log('✅ Security monitoring scheduled:');
        console.log('  - Critical tests: Every 5 minutes');
        console.log('  - Phase 1 tests: Every hour');
        console.log('  - Phase 2 tests: Every 6 hours');
        console.log('  - Daily report: 9 AM daily\n');
        console.log('Press Ctrl+C to stop monitoring.\n');
    }

    // Stop all jobs
    stop() {
        this.runningJobs.forEach(job => job.stop());
        console.log('Security monitoring stopped.');
    }
}

// Run if called directly
if (require.main === module) {
    const scheduler = new SecurityScheduler();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nStopping security monitoring...');
        scheduler.stop();
        process.exit(0);
    });

    // For testing, run once immediately then start schedule
    scheduler.runCriticalTests().then(() => {
        scheduler.start();
    });
}

module.exports = SecurityScheduler;