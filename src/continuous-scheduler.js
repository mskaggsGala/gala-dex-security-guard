/**
 * Continuous Security Testing Scheduler
 * 
 * Since tests are free to run and complete quickly, this scheduler
 * runs tests much more frequently for real-time security monitoring
 */

const cron = require('node-cron');
const SecurityMonitor = require('./security-monitor');
const ReportGenerator = require('./report-generator');
const fs = require('fs');

class ContinuousSecurityScheduler {
    constructor() {
        this.monitor = new SecurityMonitor();
        this.reportGen = new ReportGenerator();
        this.runningJobs = [];
        this.testStats = {
            totalRuns: 0,
            lastRun: {},
            averageTime: {}
        };
    }

    setupContinuousSchedules() {
        console.log('🚀 Setting up CONTINUOUS security monitoring...\n');
        console.log('Since tests are free and fast, we\'re maximizing coverage!\n');

        // CONTINUOUS TESTING SCHEDULE - Much more aggressive
        
        // Critical tests - Every 30 seconds (was 5 minutes)
        const criticalJob = cron.schedule('*/30 * * * * *', async () => {
            await this.runWithTiming('Critical', () => this.runCriticalTests());
        }, { scheduled: false });

        // Phase 1: Infrastructure - Every 5 minutes (was hourly)
        const phase1Job = cron.schedule('*/5 * * * *', async () => {
            await this.runWithTiming('Phase 1', () => this.monitor.runBasicTests());
        }, { scheduled: false });

        // Phase 2: Economic - Every 15 minutes (was 6 hours)
        const phase2Job = cron.schedule('*/15 * * * *', async () => {
            await this.runWithTiming('Phase 2', () => this.monitor.runPhase2Tests());
        }, { scheduled: false });

        // Phase 3: Chaincode - Every 10 minutes (was 8 hours)
        const phase3Job = cron.schedule('*/10 * * * *', async () => {
            await this.runWithTiming('Phase 3', () => this.monitor.runPhase3Tests());
        }, { scheduled: false });

        // Phase 4A: Time-based - Every 10 minutes (was 4 hours)
        const phase4aJob = cron.schedule('*/10 * * * *', async () => {
            await this.runWithTiming('Phase 4A', () => this.monitor.runPhase4ATests());
        }, { scheduled: false });

        // Phase 4B: Extended - Every 20 minutes (was 12 hours)
        const phase4bJob = cron.schedule('*/20 * * * *', async () => {
            await this.runWithTiming('Phase 4B', () => this.monitor.runPhase4BTests());
        }, { scheduled: false });

        // Phase 4C: Performance - Every 30 minutes (was daily)
        const phase4cJob = cron.schedule('*/30 * * * *', async () => {
            await this.runWithTiming('Phase 4C', () => this.monitor.runPhase4CTests());
        }, { scheduled: false });

        // Phase 5: Permissioned Network - Every hour (was daily)
        const phase5Job = cron.schedule('0 * * * *', async () => {
            await this.runWithTiming('Phase 5', () => this.monitor.runPhase5Tests());
        }, { scheduled: false });

        // Phase 6: Consensus - Every hour (was daily)
        const phase6Job = cron.schedule('0 * * * *', async () => {
            await this.runWithTiming('Phase 6', () => this.monitor.runPhase6Tests());
        }, { scheduled: false });

        // Phase 7: Privacy - Every 2 hours (was every 2 days)
        const phase7Job = cron.schedule('0 */2 * * *', async () => {
            await this.runWithTiming('Phase 7', () => this.monitor.runPhase7Tests());
        }, { scheduled: false });

        // Phase 8: Compliance - Every 3 hours (was every 3 days)
        const phase8Job = cron.schedule('0 */3 * * *', async () => {
            await this.runWithTiming('Phase 8', () => this.monitor.runPhase8Tests());
        }, { scheduled: false });

        // Phase 9: Business Logic - Every 6 hours (was weekly)
        const phase9Job = cron.schedule('0 */6 * * *', async () => {
            await this.runWithTiming('Phase 9', () => this.monitor.runPhase9Tests());
        }, { scheduled: false });

        // Phase 10: Zero-Day - Every 12 hours (was weekly)
        const phase10Job = cron.schedule('0 */12 * * *', async () => {
            await this.runWithTiming('Phase 10', () => this.monitor.runPhase10Tests());
        }, { scheduled: false });

        // Reports - Every 2 hours (was daily)
        const reportJob = cron.schedule('0 */2 * * *', async () => {
            console.log(`[${new Date().toISOString()}] Generating security report...`);
            await this.reportGen.generateFromLatest();
        }, { scheduled: false });

        this.runningJobs = [
            criticalJob, phase1Job, phase2Job, phase3Job, phase4aJob, 
            phase4bJob, phase4cJob, phase5Job, phase6Job, phase7Job, 
            phase8Job, phase9Job, phase10Job, reportJob
        ];
        
        return this.runningJobs;
    }

    async runWithTiming(phaseName, testFunction) {
        const startTime = Date.now();
        console.log(`[${new Date().toISOString()}] Running ${phaseName} tests...`);
        
        try {
            await testFunction();
            const duration = Date.now() - startTime;
            
            this.testStats.totalRuns++;
            this.testStats.lastRun[phaseName] = new Date().toISOString();
            
            if (!this.testStats.averageTime[phaseName]) {
                this.testStats.averageTime[phaseName] = duration;
            } else {
                this.testStats.averageTime[phaseName] = 
                    (this.testStats.averageTime[phaseName] + duration) / 2;
            }
            
            console.log(`✅ ${phaseName} completed in ${duration}ms`);
        } catch (error) {
            console.error(`❌ ${phaseName} failed:`, error.message);
        }
    }

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

    async sendAlert(message, details) {
        const alert = {
            timestamp: new Date().toISOString(),
            message,
            details
        };

        fs.appendFileSync('security-alerts.log', JSON.stringify(alert) + '\n');
        
        // Only log critical alerts every 5 minutes to avoid spam
        const now = Date.now();
        if (!this.lastAlertTime || now - this.lastAlertTime > 5 * 60 * 1000) {
            console.log(`🚨 ALERT: ${message}`);
            this.lastAlertTime = now;
        }
    }

    showContinuousSchedule() {
        console.log('\n⚡ CONTINUOUS SECURITY TESTING SCHEDULE');
        console.log('=====================================');
        console.log('');
        console.log('🔥 REAL-TIME MONITORING (seconds/minutes):');
        console.log('  • Every 30 seconds:  Critical tests');
        console.log('  • Every 5 minutes:   Phase 1 (Infrastructure)');
        console.log('  • Every 10 minutes:  Phase 3 (Chaincode) & 4A (Time-based)');
        console.log('  • Every 15 minutes:  Phase 2 (Economic attacks)');
        console.log('  • Every 20 minutes:  Phase 4B (Extended surface)');
        console.log('  • Every 30 minutes:  Phase 4C (Performance)');
        console.log('');
        console.log('📊 REGULAR MONITORING (hours):');
        console.log('  • Every hour:        Phase 5 (Permissioned) & 6 (Consensus)');
        console.log('  • Every 2 hours:     Phase 7 (Privacy) & Reports');
        console.log('  • Every 3 hours:     Phase 8 (Compliance)');
        console.log('  • Every 6 hours:     Phase 9 (Business logic)');
        console.log('  • Every 12 hours:    Phase 10 (Zero-day & APT)');
        console.log('=====================================\n');
        
        this.showTestsPerDay();
    }

    showTestsPerDay() {
        console.log('📈 TESTS PER DAY COMPARISON:');
        console.log('=====================================');
        console.log('Phase         | Old Schedule | Continuous | Improvement');
        console.log('--------------|--------------|------------|------------');
        console.log('Critical      | 288/day      | 2,880/day  | 10x more');
        console.log('Phase 1       | 24/day       | 288/day    | 12x more');
        console.log('Phase 2       | 4/day        | 96/day     | 24x more');
        console.log('Phase 3       | 3/day        | 144/day    | 48x more');
        console.log('Phase 4A      | 6/day        | 144/day    | 24x more');
        console.log('Phase 4B      | 2/day        | 72/day     | 36x more');
        console.log('Phase 4C      | 1/day        | 48/day     | 48x more');
        console.log('Phase 5       | 1/day        | 24/day     | 24x more');
        console.log('Phase 6       | 1/day        | 24/day     | 24x more');
        console.log('Phase 7       | 0.5/day      | 12/day     | 24x more');
        console.log('Phase 8       | 0.33/day     | 8/day      | 24x more');
        console.log('Phase 9       | 0.14/day     | 4/day      | 28x more');
        console.log('Phase 10      | 0.14/day     | 2/day      | 14x more');
        console.log('Reports       | 1/day        | 12/day     | 12x more');
        console.log('=====================================');
        console.log('TOTAL         | ~332/day     | ~3,948/day | ~12x more');
        console.log('=====================================\n');
    }

    showStats() {
        console.log('\n📊 TESTING STATISTICS:');
        console.log('=====================================');
        console.log(`Total test runs: ${this.testStats.totalRuns}`);
        console.log('\nLast run times:');
        Object.entries(this.testStats.lastRun).forEach(([phase, time]) => {
            console.log(`  ${phase}: ${time}`);
        });
        console.log('\nAverage execution times:');
        Object.entries(this.testStats.averageTime).forEach(([phase, time]) => {
            console.log(`  ${phase}: ${Math.round(time)}ms`);
        });
        console.log('=====================================\n');
    }

    start() {
        const jobs = this.setupContinuousSchedules();
        jobs.forEach(job => job.start());
        
        this.showContinuousSchedule();
        
        // Show stats every 10 minutes
        setInterval(() => this.showStats(), 10 * 60 * 1000);
        
        console.log('✅ Continuous security monitoring active!');
        console.log('Press Ctrl+C to stop monitoring.\n');
    }

    stop() {
        this.runningJobs.forEach(job => job.stop());
        console.log('Continuous security monitoring stopped.');
        this.showStats();
    }
}

// Run if called directly
if (require.main === module) {
    const scheduler = new ContinuousSecurityScheduler();
    
    process.on('SIGINT', () => {
        console.log('\nStopping continuous security monitoring...');
        scheduler.stop();
        process.exit(0);
    });

    // Run initial tests immediately
    console.log('Running initial test sweep...\n');
    scheduler.runCriticalTests().then(() => {
        scheduler.start();
    });
}

module.exports = ContinuousSecurityScheduler;