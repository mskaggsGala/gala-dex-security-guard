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

        // Phase 3 - every 8 hours (NEW)
        const phase3Job = cron.schedule('0 */8 * * *', async () => {
            console.log(`[${new Date().toISOString()}] Running Phase 3 Chaincode Security tests...`);
            await this.monitor.runPhase3Tests();
        }, { scheduled: false });

        // Phase 4A - every 4 hours (NEW)  
        const phase4aJob = cron.schedule('0 */4 * * *', async () => {
            console.log(`[${new Date().toISOString()}] Running Phase 4A Time-based Attack tests...`);
            await this.monitor.runPhase4ATests();
        }, { scheduled: false });

        // Phase 4B - every 12 hours
        const phase4bJob = cron.schedule('0 */12 * * *', async () => {
            console.log(`[${new Date().toISOString()}] Running Phase 4B tests...`);
            await this.monitor.runPhase4BTests();
        }, { scheduled: false });



        const phase4cJob = cron.schedule('0 2 * * *', async () => {
            console.log(`[${new Date().toISOString()}] Running Phase 4C performance tests...`);
            await this.monitor.runPhase4CTests();
        }, { scheduled: false });

        // Phase 5 - every 24 hours (daily comprehensive security)
        const phase5Job = cron.schedule('0 1 * * *', async () => {
            console.log(`[${new Date().toISOString()}] Running Phase 5 Permissioned Network tests...`);
            await this.monitor.runPhase5Tests();
        }, { scheduled: false });

        // Phase 6 - every 24 hours (staggered from Phase 5)
        const phase6Job = cron.schedule('0 3 * * *', async () => {
            console.log(`[${new Date().toISOString()}] Running Phase 6 Consensus & Ordering tests...`);
            await this.monitor.runPhase6Tests();
        }, { scheduled: false });

        // Phase 7 - every 48 hours (privacy tests)
        const phase7Job = cron.schedule('0 5 */2 * *', async () => {
            console.log(`[${new Date().toISOString()}] Running Phase 7 Privacy & Confidentiality tests...`);
            await this.monitor.runPhase7Tests();
        }, { scheduled: false });

        // Phase 8 - every 72 hours (compliance tests)
        const phase8Job = cron.schedule('0 7 */3 * *', async () => {
            console.log(`[${new Date().toISOString()}] Running Phase 8 Compliance & Regulatory tests...`);
            await this.monitor.runPhase8Tests();
        }, { scheduled: false });

        // Phase 9 - weekly (business logic comprehensive)
        const phase9Job = cron.schedule('0 4 * * 0', async () => {
            console.log(`[${new Date().toISOString()}] Running Phase 9 Business Logic Exploits tests...`);
            await this.monitor.runPhase9Tests();
        }, { scheduled: false });

        // Phase 10 - weekly (advanced threat analysis)
        const phase10Job = cron.schedule('0 6 * * 0', async () => {
            console.log(`[${new Date().toISOString()}] Running Phase 10 Zero-Day & APT tests...`);
            await this.monitor.runPhase10Tests();
        }, { scheduled: false });

        // Generate report - daily at 9 AM
        const reportJob = cron.schedule('0 9 * * *', async () => {
            console.log(`[${new Date().toISOString()}] Generating daily report...`);
            await this.reportGen.generateFromLatest();
        }, { scheduled: false });

        this.runningJobs = [criticalJob, phase1Job, phase2Job, phase3Job, phase4aJob, phase4bJob, phase4cJob, phase5Job, phase6Job, phase7Job, phase8Job, phase9Job, phase10Job, reportJob];
        
        return this.runningJobs;
    }


    // Add this method to the SecurityScheduler class
    showSchedule() {
        console.log('\n📅 Scheduled Security Tests:');
        console.log('================================');
        console.log('• Every 5 minutes:  Critical tests (rate limiting)');
        console.log('• Every hour:       Phase 1 (infrastructure)');
        console.log('• Every 6 hours:    Phase 2 (economic attacks)');
        console.log('• Every 8 hours:    Phase 3 (chaincode security)');
        console.log('• Every 4 hours:    Phase 4A (time-based attacks)');
        console.log('• Every 12 hours:   Phase 4B (extended surface)');
        console.log('• Daily at 1 AM:    Phase 5 (permissioned network)');
        console.log('• Daily at 2 AM:    Phase 4C (performance)');
        console.log('• Daily at 3 AM:    Phase 6 (consensus & ordering)');
        console.log('• Every 2 days:     Phase 7 (privacy & confidentiality)');
        console.log('• Every 3 days:     Phase 8 (compliance & regulatory)');
        console.log('• Weekly Sunday:    Phase 9 (business logic exploits)');
        console.log('• Weekly Sunday:    Phase 10 (zero-day & APT)');
        console.log('• Daily at 9 AM:    Generate reports');
        console.log('================================\n');
        
        // Show next run times (if you want to calculate them)
        const now = new Date();
        console.log('Current time:', now.toLocaleString());
        console.log('\nNext run times:');
        console.log('• Critical tests: ~' + new Date(now.getTime() + 5*60*1000).toLocaleTimeString());
        console.log('• Phase 1: Next hour at :00');
        console.log('• Phase 2: Next interval at 0:00, 6:00, 12:00, or 18:00');
        console.log('• Phase 3: Next interval at 0:00, 8:00, or 16:00');
        console.log('• Phase 4A: Next interval at 0:00, 4:00, 8:00, 12:00, 16:00, or 20:00');
        console.log('• Phase 4B: Next interval at 0:00 or 12:00');
        console.log('• Phase 4C: Tomorrow at 2:00 AM');
        console.log('• Report: Tomorrow at 9:00 AM\n');
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

        // Show the schedule when starting
        this.showSchedule();  // Add this line
    
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