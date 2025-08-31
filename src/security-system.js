const SecurityMonitor = require('./security-monitor');
const ReportGenerator = require('./report-generator');
const AlertManager = require('./alert-manager');
const SecurityScheduler = require('./scheduler');
const SecurityDashboard = require('./dashboard');
const fs = require('fs');

class SecuritySystem {
    constructor(config = {}) {
        this.config = {
            runScheduler: config.runScheduler !== false,
            runDashboard: config.runDashboard !== false,
            dashboardPort: config.dashboardPort || 3000,
            runInitialTests: config.runInitialTests !== false,
            alertConfig: config.alertConfig || {}
        };

        // Initialize components
        this.monitor = new SecurityMonitor();
        this.reportGen = new ReportGenerator();
        this.alertManager = new AlertManager(this.config.alertConfig);
        this.scheduler = new SecurityScheduler();
        this.dashboard = null;
        
        // Integrate alert manager with scheduler
        this.integrateAlerts();
    }

    // Connect the alert manager to the monitoring system
    integrateAlerts() {
        // Override the scheduler's sendAlert method to use our alert manager
        this.scheduler.sendAlert = async (message, details) => {
            const severity = details.severity || 'HIGH';
            const test = details.test || 'Security Test';
            await this.alertManager.sendAlert(severity, test, details);
        };
    }



    // Update the runInitialTests method to include Phase 4C
    async runInitialTests() {
        console.log('\n🔍 Running initial security assessment...\n');
        
        // Run Phase 1
        console.log('Phase 1: Infrastructure Tests');
        const phase1Results = await this.monitor.runBasicTests();
        
        // Run Phase 2
        console.log('\nPhase 2: Economic Attack Tests');
        const phase2Results = await this.monitor.runPhase2Tests();
        
        // Run Phase 4B
        console.log('\nPhase 4B: Extended Attack Surface Tests');
        const phase4bResults = await this.monitor.runPhase4BTests();
        
        // Run Phase 4C (NEW)
        console.log('\nPhase 4C: Performance & Load Tests');
        const phase4cResults = await this.monitor.runPhase4CTests();
        
        // Generate report
        console.log('\n📊 Generating comprehensive report...');
        const report = await this.reportGen.generateFromLatest();
        
        // Check for issues
        const allTests = [
            ...(phase1Results.tests || []), 
            ...(phase2Results.tests || []),
            ...(phase4bResults.tests || []),
            ...(phase4cResults.tests || [])
        ];
        
        const criticalIssues = allTests.filter(t => t.severity === 'CRITICAL');
        const highIssues = allTests.filter(t => t.severity === 'HIGH');
        const mediumIssues = allTests.filter(t => t.severity === 'MEDIUM');
        
        // Alert for all severity levels
        if (criticalIssues.length > 0) {
            console.log('\n⚠️  CRITICAL ISSUES DETECTED:');
            criticalIssues.forEach(issue => {
                console.log(`  - ${issue.test}: ${issue.recommendation}`);
                this.alertManager.sendAlert('CRITICAL', issue.test, issue);
            });
        }
        
        if (highIssues.length > 0) {
            console.log('\n⚠️  HIGH SEVERITY ISSUES:');
            highIssues.forEach(issue => {
                console.log(`  - ${issue.test}: ${issue.recommendation}`);
                this.alertManager.sendAlert('HIGH', issue.test, issue);
            });
        }
        
        if (mediumIssues.length > 0) {
            console.log('\n⚠️  MEDIUM SEVERITY ISSUES:');
            mediumIssues.forEach(issue => {
                console.log(`  - ${issue.test}: ${issue.recommendation}`);
                this.alertManager.sendAlert('MEDIUM', issue.test, issue);
            });
        }
        
        return { phase1Results, phase2Results, phase4bResults, phase4cResults, criticalIssues, highIssues, mediumIssues };
    }



    // Start the complete system
    async start() {
        console.log(`
╔══════════════════════════════════════════════╗
║     GalaSwap Security System v1.0           ║
║     Integrated Monitoring & Protection      ║
╚══════════════════════════════════════════════╝
        `);

        // Run initial tests if configured
        if (this.config.runInitialTests) {
            await this.runInitialTests();
        }

        // Start scheduler if configured
        if (this.config.runScheduler) {
            console.log('\n⏰ Starting automated scheduler...');
            this.scheduler.start();
        }

        // Start dashboard if configured
        if (this.config.runDashboard) {
            console.log('\n🌐 Starting web dashboard...');
            this.dashboard = new SecurityDashboard(this.config.dashboardPort);
            this.dashboardServer = this.dashboard.start();
        }

        // Show system status
        this.showStatus();

        // Set up periodic status updates
        setInterval(() => {
            this.showStatus();
        }, 60000); // Every minute

        console.log('\n✅ Security system fully operational');
        console.log('Press Ctrl+C to shutdown\n');
    }

    // Show current system status
    showStatus() {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`\n[${timestamp}] System Status:`);
        
        // Check latest results
        const resultsDir = './security-results';
        const files = fs.readdirSync(resultsDir)
            .filter(f => f.startsWith('security-'))
            .sort()
            .reverse();
        
        if (files.length > 0) {
            const latest = JSON.parse(
                fs.readFileSync(`${resultsDir}/${files[0]}`, 'utf8')
            );
            
            const critical = latest.tests.filter(t => t.severity === 'CRITICAL').length;
            const passed = latest.tests.filter(t => t.passed).length;
            
            console.log(`  Tests: ${passed}/${latest.tests.length} passed`);
            if (critical > 0) {
                console.log(`  ⚠️  ${critical} CRITICAL issues active`);
            }
        }
        
        // Show alert stats
        const alertStats = this.alertManager.getStats();
        console.log(`  Alerts: ${alertStats.totalAlerts} total`);
        
        if (this.config.runDashboard) {
            console.log(`  Dashboard: http://localhost:${this.config.dashboardPort}`);
        }
    }

    // Graceful shutdown
    async shutdown() {
        console.log('\n🛑 Shutting down security system...');
        
        if (this.scheduler) {
            this.scheduler.stop();
        }
        
        if (this.dashboardServer) {
            this.dashboardServer.close();
        }
        
        console.log('Security system stopped.\n');
    }
}

// Main entry point
if (require.main === module) {
    const system = new SecuritySystem({
        runScheduler: true,
        runDashboard: true,
        dashboardPort: 3000,
        runInitialTests: true,
        alertConfig: {
            // Add Slack webhook if you have one
            // slackWebhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        }
    });

    // Handle shutdown gracefully
    process.on('SIGINT', async () => {
        await system.shutdown();
        process.exit(0);
    });

    // Start the system
    system.start().catch(error => {
        console.error('Failed to start security system:', error);
        process.exit(1);
    });
}

module.exports = SecuritySystem;