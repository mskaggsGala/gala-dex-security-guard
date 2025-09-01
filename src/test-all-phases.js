const SecurityMonitor = require('./security-monitor');

async function testAllPhases() {
    const monitor = new SecurityMonitor();
    console.log('🚀 Running ALL test phases immediately...\n');
    
    try {
        // Phase 1
        console.log('Starting Phase 1...');
        await monitor.runBasicTests();
        
        // Phase 2
        console.log('\nStarting Phase 2...');
        await monitor.runPhase2Tests();
        
        // Phase 4B
        console.log('\nStarting Phase 4B...');
        await monitor.runPhase4BTests();
        
        // Phase 4C
        console.log('\nStarting Phase 4C...');
        await monitor.runPhase4CTests();
        
        console.log('\n✅ All phases complete!');
        console.log('Check dashboard at http://localhost:3000');
        
    } catch (error) {
        console.error('Error during testing:', error);
    }
}

testAllPhases();
