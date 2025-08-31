const BridgeSecurityTester = require('./bridge-security-tester');
const ExtendedSecurityTester = require('./extended-security-tester');
const AdvancedEndpointTester = require('./advanced-endpoint-tester');

class Phase4BMonitor {
    constructor() {
        this.bridgeTester = new BridgeSecurityTester();
        this.extendedTester = new ExtendedSecurityTester();
        this.advancedTester = new AdvancedEndpointTester();
    }

    async runAllPhase4BTests() {
        console.log('\n========================================');
        console.log('PHASE 4B - EXTENDED ATTACK SURFACE TESTS');
        console.log('========================================\n');
        
        const results = {
            timestamp: new Date().toISOString(),
            phase: 'Phase 4B - Extended Attack Surface',
            tests: [],
            criticalFindings: []
        };

        // Run bridge security tests
        console.log('[1/3] Testing Bridge Security...');
        const bridgeResults = await this.bridgeTester.testBridgeSecurity();
        bridgeResults.tests.forEach(test => {
            results.tests.push({
                category: 'Bridge Security',
                ...test
            });
        });

        // Run extended surface tests
        console.log('\n[2/3] Testing Extended Attack Surface...');
        const extendedResults = await this.extendedTester.testExtendedSurface();
        extendedResults.tests.forEach(test => {
            results.tests.push({
                category: 'Extended Surface',
                ...test
            });
            
            // Flag the pool creation vulnerability
            if (test.test === 'Pool Creation Security' && !test.passed) {
                results.criticalFindings.push({
                    issue: 'Pool Creation Without Authentication',
                    severity: 'HIGH',
                    details: 'Pool creation endpoint accepts requests without proper validation',
                    recommendation: 'Implement authentication and validation for pool creation'
                });
            }
        });

        // Run advanced endpoint tests
        console.log('\n[3/3] Testing Advanced Endpoints...');
        const advancedResults = await this.advancedTester.testAdvancedEndpoints();
        advancedResults.tests.forEach(test => {
            results.tests.push({
                category: 'Advanced Endpoints',
                ...test
            });
        });

        // Summary
        const passed = results.tests.filter(t => t.passed).length;
        const failed = results.tests.filter(t => !t.passed).length;
        const critical = results.tests.filter(t => t.severity === 'CRITICAL').length;
        const high = results.tests.filter(t => t.severity === 'HIGH').length;

        console.log('\n=== PHASE 4B SUMMARY ===');
        console.log(`Total Tests: ${results.tests.length}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Critical Issues: ${critical}`);
        console.log(`High Severity: ${high}`);

        if (results.criticalFindings.length > 0) {
            console.log('\n⚠️  CRITICAL FINDINGS:');
            results.criticalFindings.forEach(finding => {
                console.log(`\n  ${finding.issue} (${finding.severity})`);
                console.log(`  Details: ${finding.details}`);
                console.log(`  Action: ${finding.recommendation}`);
            });
        }

        // Save results
        const fs = require('fs');
        const filename = `security-results/phase4b-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(results, null, 2));
        console.log(`\nResults saved to: ${filename}`);

        return results;
    }
}

// Run if called directly
if (require.main === module) {
    const monitor = new Phase4BMonitor();
    monitor.runAllPhase4BTests().catch(console.error);
}

module.exports = Phase4BMonitor;