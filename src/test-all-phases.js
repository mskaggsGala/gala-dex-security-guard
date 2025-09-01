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
        
        // Phase 3 - NEW
        console.log('\nStarting Phase 3...');
        await monitor.runPhase3Tests();
        
        // Phase 4A - NEW
        console.log('\nStarting Phase 4A...');
        await monitor.runPhase4ATests();
        
        // Phase 4B
        console.log('\nStarting Phase 4B...');
        await monitor.runPhase4BTests();
        
        // Phase 4C
        console.log('\nStarting Phase 4C...');
        await monitor.runPhase4CTests();
        
        // Phase 5 - NEW
        console.log('\nStarting Phase 5...');
        await monitor.runPhase5Tests();
        
        // Phase 6 - NEW
        console.log('\nStarting Phase 6...');
        await monitor.runPhase6Tests();
        
        // Phase 7 - NEW
        console.log('\nStarting Phase 7...');
        await monitor.runPhase7Tests();
        
        // Phase 8 - NEW
        console.log('\nStarting Phase 8...');
        await monitor.runPhase8Tests();
        
        // Phase 9 - NEW
        console.log('\nStarting Phase 9...');
        await monitor.runPhase9Tests();
        
        // Phase 10 - NEW
        console.log('\nStarting Phase 10...');
        await monitor.runPhase10Tests();
        
        console.log('\n🎉 ALL 10 PHASES COMPLETE - INSTITUTIONAL SECURITY FRAMEWORK READY!');
        console.log('Check enhanced dashboard at http://localhost:3001');
        console.log('Check original dashboard at http://localhost:3000');
        
    } catch (error) {
        console.error('Error during testing:', error);
    }
}

testAllPhases();
