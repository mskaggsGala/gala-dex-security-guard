const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * Phase 4A: Time-Based Attack Testing
 * Tests for timestamp manipulation, deadline exploits, and timing attacks
 */
class TimeBasedAttackTester {
    constructor() {
        this.apiUrl = config.apiUrl;
        this.results = [];
        this.criticalFindings = [];
        this.testCount = 0;
        this.passedCount = 0;
    }

    // Helper to log results
    logResult(category, test, passed, severity, details, recommendation) {
        const result = {
            category,
            test,
            passed,
            severity: passed ? 'PASS' : severity,
            details,
            recommendation,
            timestamp: new Date().toISOString()
        };
        
        this.results.push(result);
        this.testCount++;
        
        if (passed) {
            this.passedCount++;
        } else if (severity === 'CRITICAL' || severity === 'HIGH') {
            this.criticalFindings.push(result);
        }
        
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${test}: ${passed ? 'PASSED' : severity}`);
        if (!passed && details) {
            console.log(`   Details: ${typeof details === 'object' ? JSON.stringify(details) : details}`);
        }
    }

    // Test 1: Timestamp Manipulation
    async testTimestampManipulation() {
        console.log('\n⏰ Testing Timestamp Manipulation...');
        
        const tests = [
            {
                name: 'Future Timestamp',
                timestamp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours future
                description: 'Transaction with future timestamp'
            },
            {
                name: 'Past Timestamp',
                timestamp: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days past
                description: 'Transaction with old timestamp'
            },
            {
                name: 'Zero Timestamp',
                timestamp: 0,
                description: 'Transaction with zero timestamp'
            },
            {
                name: 'Negative Timestamp',
                timestamp: -1,
                description: 'Transaction with negative timestamp'
            },
            {
                name: 'Max Timestamp',
                timestamp: Number.MAX_SAFE_INTEGER,
                description: 'Transaction with maximum timestamp'
            }
        ];

        const results = [];
        let vulnerableCount = 0;

        for (const test of tests) {
            try {
                const response = await axios.post(`${this.apiUrl}/v1/trade/swap`, {
                    tokenIn: 'GALA',
                    tokenOut: 'GUSDC',
                    amountIn: '100',
                    timestamp: test.timestamp,
                    deadline: test.timestamp + 3600000 // 1 hour after timestamp
                }, {
                    validateStatus: () => true
                });

                const vulnerable = response.status === 200 && 
                                 !response.data?.error?.includes('timestamp');
                
                if (vulnerable) vulnerableCount++;
                
                results.push({
                    test: test.name,
                    vulnerable,
                    status: response.status,
                    description: test.description
                });
            } catch (error) {
                results.push({
                    test: test.name,
                    error: error.message
                });
            }
        }

        const passed = vulnerableCount === 0;
        this.logResult(
            'Time-Based Attacks',
            'Timestamp Manipulation',
            passed,
            vulnerableCount > 0 ? 'HIGH' : 'PASS',
            results,
            passed ? 'Timestamp validation properly implemented' : 'Implement strict timestamp validation within acceptable range'
        );
    }

    // Test 2: Deadline Bypass Attacks
    async testDeadlineBypass() {
        console.log('\n⏱️ Testing Deadline Bypass...');
        
        const currentTime = Date.now();
        const tests = [
            {
                name: 'Expired Deadline',
                deadline: currentTime - 3600000, // 1 hour ago
                description: 'Execute transaction after deadline'
            },
            {
                name: 'Immediate Expiry',
                deadline: currentTime,
                description: 'Deadline same as current time'
            },
            {
                name: 'No Deadline',
                deadline: null,
                description: 'Transaction without deadline'
            },
            {
                name: 'Zero Deadline',
                deadline: 0,
                description: 'Deadline set to zero'
            },
            {
                name: 'Infinite Deadline',
                deadline: Number.MAX_SAFE_INTEGER,
                description: 'Extremely far future deadline'
            }
        ];

        const results = [];
        let vulnerableCount = 0;

        for (const test of tests) {
            try {
                const payload = {
                    tokenIn: 'GALA',
                    tokenOut: 'GUSDC',
                    amountIn: '100',
                    minAmountOut: '90'
                };
                
                if (test.deadline !== null) {
                    payload.deadline = test.deadline;
                }

                const response = await axios.post(
                    `${this.apiUrl}/v1/trade/swap`,
                    payload,
                    { validateStatus: () => true }
                );

                const shouldFail = test.deadline !== null && 
                                  (test.deadline <= currentTime || test.deadline === 0);
                
                const vulnerable = shouldFail && response.status === 200;
                
                if (vulnerable) vulnerableCount++;
                
                results.push({
                    test: test.name,
                    vulnerable,
                    status: response.status,
                    description: test.description
                });
            } catch (error) {
                results.push({
                    test: test.name,
                    error: error.message
                });
            }
        }

        const passed = vulnerableCount === 0;
        this.logResult(
            'Time-Based Attacks',
            'Deadline Bypass',
            passed,
            vulnerableCount > 0 ? 'CRITICAL' : 'PASS',
            results,
            passed ? 'Deadline enforcement working correctly' : 'Enforce strict deadline validation'
        );
    }

    // Test 3: Time-Locked Operations
    async testTimeLockExploits() {
        console.log('\n🔒 Testing Time-Lock Exploits...');
        
        const tests = [
            {
                name: 'Premature Unlock',
                test: async () => {
                    // Try to unlock funds before time
                    const response = await axios.post(`${this.apiUrl}/v1/timelock/withdraw`, {
                        lockId: 'test_lock_1',
                        unlockTime: Date.now() + 86400000, // Should unlock tomorrow
                        forceUnlock: true
                    }, {
                        validateStatus: () => true
                    });
                    
                    return {
                        vulnerable: response.status === 200,
                        status: response.status
                    };
                }
            },
            {
                name: 'Time Manipulation Unlock',
                test: async () => {
                    // Try to manipulate block time to unlock
                    const response = await axios.post(`${this.apiUrl}/v1/timelock/withdraw`, {
                        lockId: 'test_lock_2',
                        blockTimestamp: Date.now() + 86400000, // Fake future timestamp
                    }, {
                        validateStatus: () => true
                    });
                    
                    return {
                        vulnerable: response.status === 200,
                        status: response.status
                    };
                }
            },
            {
                name: 'Governance Timelock Bypass',
                test: async () => {
                    // Try to execute governance action before timelock
                    const response = await axios.post(`${this.apiUrl}/v1/governance/execute`, {
                        proposalId: 'prop_1',
                        executionTime: Date.now() - 1000, // Pretend timelock passed
                    }, {
                        validateStatus: () => true
                    });
                    
                    return {
                        vulnerable: response.status === 200,
                        status: response.status
                    };
                }
            }
        ];

        const results = [];
        let vulnerableCount = 0;

        for (const test of tests) {
            try {
                const result = await test.test();
                results.push({
                    test: test.name,
                    ...result
                });
                if (result.vulnerable) vulnerableCount++;
            } catch (error) {
                results.push({
                    test: test.name,
                    error: error.message
                });
            }
        }

        const passed = vulnerableCount === 0;
        this.logResult(
            'Time-Based Attacks',
            'Time-Lock Exploits',
            passed,
            vulnerableCount > 0 ? 'CRITICAL' : 'PASS',
            results,
            passed ? 'Time-locks properly enforced' : 'Use block timestamps for time-lock validation'
        );
    }

    // Test 4: Scheduled Operation Attacks
    async testScheduledOperations() {
        console.log('\n📅 Testing Scheduled Operation Attacks...');
        
        const tests = [
            {
                name: 'Schedule Manipulation',
                payload: {
                    operation: 'rebalance',
                    scheduledTime: Date.now() - 3600000, // Past time
                    executeNow: true
                }
            },
            {
                name: 'Batch Timing Attack',
                payload: {
                    operation: 'batch_swap',
                    batchId: 'current',
                    forceInclusion: true,
                    timestamp: Date.now() + 1000 // Future batch
                }
            },
            {
                name: 'Epoch Boundary Exploit',
                payload: {
                    operation: 'epoch_rewards',
                    epoch: 999999,
                    claimRewards: true
                }
            },
            {
                name: 'Auction Timing Manipulation',
                payload: {
                    operation: 'auction_bid',
                    auctionId: 'current',
                    bidTime: Date.now() - 1, // Just after close
                    amount: '10000'
                }
            }
        ];

        const results = [];
        let vulnerableCount = 0;

        for (const test of tests) {
            try {
                const response = await axios.post(
                    `${this.apiUrl}/v1/scheduled/${test.payload.operation}`,
                    test.payload,
                    { validateStatus: () => true }
                );

                const vulnerable = response.status === 200 && 
                                 !response.data?.error;
                
                if (vulnerable) vulnerableCount++;
                
                results.push({
                    test: test.name,
                    vulnerable,
                    status: response.status
                });
            } catch (error) {
                results.push({
                    test: test.name,
                    error: error.message
                });
            }
        }

        const passed = vulnerableCount === 0;
        this.logResult(
            'Time-Based Attacks',
            'Scheduled Operations',
            passed,
            vulnerableCount > 0 ? 'HIGH' : 'PASS',
            results,
            passed ? 'Scheduled operations properly protected' : 'Implement strict schedule enforcement'
        );
    }

    // Test 5: Front-Running Time Windows
    async testFrontRunningWindows() {
        console.log('\n🏃 Testing Front-Running Time Windows...');
        
        const tests = [
            {
                name: 'Price Update Front-Run',
                test: async () => {
                    // Simulate detecting a price update and front-running it
                    const priceUpdate = {
                        token: 'GALA',
                        newPrice: '0.05',
                        updateTime: Date.now() + 1000 // 1 second future
                    };
                    
                    // Try to trade before price update
                    const response = await axios.post(`${this.apiUrl}/v1/trade/swap`, {
                        tokenIn: 'GUSDC',
                        tokenOut: 'GALA',
                        amountIn: '10000',
                        minAmountOut: '200000', // Expecting old price
                        frontRun: true // Test parameter
                    }, {
                        validateStatus: () => true
                    });
                    
                    return {
                        vulnerable: response.status === 200 && response.data?.executed,
                        status: response.status
                    };
                }
            },
            {
                name: 'Liquidation Front-Run',
                test: async () => {
                    // Try to front-run a liquidation
                    const response = await axios.post(`${this.apiUrl}/v1/liquidate`, {
                        position: 'test_position',
                        expectedReward: '1000',
                        frontRun: true
                    }, {
                        validateStatus: () => true
                    });
                    
                    return {
                        vulnerable: response.status === 200,
                        status: response.status
                    };
                }
            },
            {
                name: 'Arbitrage Window Exploit',
                test: async () => {
                    // Exploit time window for arbitrage
                    const response = await axios.post(`${this.apiUrl}/v1/arbitrage`, {
                        path: ['GALA', 'GUSDC', 'GMUSIC', 'GALA'],
                        amount: '10000',
                        maxLatency: 100, // 100ms window
                        exploitTiming: true
                    }, {
                        validateStatus: () => true
                    });
                    
                    return {
                        vulnerable: response.status === 200 && response.data?.profit > 0,
                        status: response.status
                    };
                }
            }
        ];

        const results = [];
        let vulnerableCount = 0;

        for (const test of tests) {
            try {
                const result = await test.test();
                results.push({
                    test: test.name,
                    ...result
                });
                if (result.vulnerable) vulnerableCount++;
            } catch (error) {
                results.push({
                    test: test.name,
                    error: error.message
                });
            }
        }

        const passed = vulnerableCount === 0;
        this.logResult(
            'Time-Based Attacks',
            'Front-Running Windows',
            passed,
            vulnerableCount > 0 ? 'HIGH' : 'PASS',
            results,
            passed ? 'Front-running protection in place' : 'Implement commit-reveal or batch processing'
        );
    }

    // Main test runner
    async runTests() {
        console.log('\n' + '='.repeat(50));
        console.log('PHASE 4A: TIME-BASED ATTACK TESTING');
        console.log('Testing Timestamp and Timing Vulnerabilities');
        console.log('='.repeat(50));

        const startTime = Date.now();

        try {
            await this.testTimestampManipulation();
            await this.testDeadlineBypass();
            await this.testTimeLockExploits();
            await this.testScheduledOperations();
            await this.testFrontRunningWindows();
        } catch (error) {
            console.error('Error during time-based attack testing:', error);
            this.logResult(
                'Time-Based Attacks',
                'Test Execution',
                false,
                'ERROR',
                { error: error.message },
                'Fix test execution errors'
            );
        }

        const duration = Date.now() - startTime;

        // Generate summary
        const summary = {
            phase: 'Phase 4A - Time-Based Attacks',
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`,
            totalTests: this.testCount,
            passed: this.passedCount,
            failed: this.testCount - this.passedCount,
            passRate: `${Math.round((this.passedCount / this.testCount) * 100)}%`,
            criticalFindings: this.criticalFindings.length,
            tests: this.results
        };

        // Save results
        this.saveResults(summary);

        // Print summary
        this.printSummary(summary);

        return summary;
    }

    // Save results to file
    saveResults(summary) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `security-Phase-4A-TimeAttacks-${timestamp}.json`;
        const filepath = path.join(config.directories.results, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
        console.log(`\nResults saved to: ${filepath}`);
    }

    // Print test summary
    printSummary(summary) {
        console.log('\n' + '='.repeat(50));
        console.log('PHASE 4A SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total Tests: ${summary.totalTests}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        console.log(`Pass Rate: ${summary.passRate}`);
        console.log(`Critical Findings: ${summary.criticalFindings}`);
        
        if (this.criticalFindings.length > 0) {
            console.log('\n⚠️  CRITICAL FINDINGS:');
            this.criticalFindings.forEach(finding => {
                console.log(`\n  ${finding.test} (${finding.severity})`);
                console.log(`  Details: ${JSON.stringify(finding.details)}`);
                console.log(`  Action: ${finding.recommendation}`);
            });
        }
    }
}

// Export for use in security monitor
module.exports = TimeBasedAttackTester;

// Run standalone if called directly
if (require.main === module) {
    const tester = new TimeBasedAttackTester();
    tester.runTests().then(() => {
        console.log('\nPhase 4A Time-Based Attack Testing Complete!');
    }).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}