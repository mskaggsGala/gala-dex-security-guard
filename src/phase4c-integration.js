const PerformanceTester = require('./enhanced-performance-tester');


class Phase4CMonitor {
    constructor() {
        this.performanceTester = new PerformanceTester();
    }

    async runPhase4CTests() {
        console.log('\n========================================');
        console.log('PHASE 4C - PERFORMANCE & LOAD TESTING');
        console.log('========================================\n');
        
        const results = await this.performanceTester.runComprehensiveTests();

        
        // Add summary
        const passed = results.tests.filter(t => t.status === 'PASS' || t.status === 'PROTECTED').length;
        const failed = results.tests.filter(t => t.status === 'VULNERABLE' || t.status === 'WARNING' || t.status === 'ERROR').length;

        
        console.log('\n=== PHASE 4C SUMMARY ===');
        console.log(`Total Tests: ${results.tests.length}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        
        // Highlight the payload limit issue
        const payloadTest = results.tests.find(t => t.test === 'Large Payload Performance');
        if (payloadTest && (payloadTest.status !== 'PASS')) {
            console.log('\n⚠️  PERFORMANCE ISSUES:');
            console.log('  - Payload size limit: 10,000 items rejected (HTTP 413)');
            console.log('  - Recommendation: Document payload limits or increase server limits');
        }
        
        return results;
    }
}

module.exports = Phase4CMonitor;
