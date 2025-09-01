const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * Phase 6: Consensus & Ordering Service Tests
 * Hyperledger Fabric Ordering Service and Consensus Vulnerabilities
 */
class ConsensusOrderingTester {
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

    // Test 1: Ordering Service Manipulation
    async testOrderingServiceManipulation() {
        console.log('\n📋 Testing Ordering Service Manipulation...');
        
        const tests = [
            {
                name: 'Transaction Order Manipulation',
                test: async () => {
                    try {
                        // Attempt to submit transactions with manipulated ordering
                        const response1 = await axios.post(`${this.apiUrl}/v1/transactions/submit`, {
                            transaction: {
                                chaincode: 'trading',
                                function: 'transfer',
                                args: ['user1', 'attacker', '1000'],
                                nonce: '12345'
                            },
                            orderingHint: 'PRIORITY_HIGH',
                            sequenceNumber: 999999
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response1.status === 200 && response1.data?.accepted,
                            status: response1.status
                        };
                    } catch (error) {
                        return {
                            vulnerable: false,
                            status: error.response?.status || 'error'
                        };
                    }
                }
            },
            {
                name: 'Block Creation Bypass',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/orderer/blocks/create`, {
                            channelId: 'trading-channel',
                            transactions: [
                                {
                                    txId: 'malicious-tx-' + Date.now(),
                                    payload: 'UNAUTHORIZED_TRANSACTION'
                                }
                            ],
                            previousBlockHash: '0x123456789abcdef',
                            forceCreate: true
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200,
                            status: response.status
                        };
                    } catch (error) {
                        return {
                            vulnerable: false,
                            status: error.response?.status || 'error'
                        };
                    }
                }
            },
            {
                name: 'Consensus Protocol Disruption',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/consensus/disrupt`, {
                            action: 'fork_chain',
                            alternativeBlocks: [
                                {
                                    blockNumber: 12345,
                                    transactions: ['MALICIOUS_TX_1', 'MALICIOUS_TX_2']
                                }
                            ]
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200,
                            status: response.status
                        };
                    } catch (error) {
                        return {
                            vulnerable: false,
                            status: error.response?.status || 'error'
                        };
                    }
                }
            }
        ];

        let vulnerableCount = 0;
        const results = [];

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
            'Consensus & Ordering',
            'Ordering Service Manipulation',
            passed,
            vulnerableCount > 0 ? 'CRITICAL' : 'PASS',
            results,
            passed ? 'Ordering service properly secured' : 'Implement strict ordering service access controls and consensus validation'
        );
    }

    // Test 2: Byzantine Fault Tolerance
    async testByzantineFaultTolerance() {
        console.log('\n⚡ Testing Byzantine Fault Tolerance...');
        
        const tests = [
            {
                name: 'Malicious Orderer Simulation',
                payload: {
                    ordererAction: 'MALICIOUS_BEHAVIOR',
                    scenarios: [
                        'double_spend_attempt',
                        'block_withholding',
                        'invalid_block_proposal'
                    ]
                }
            },
            {
                name: 'Network Partition Attack',
                payload: {
                    action: 'network_partition',
                    partitionedNodes: ['orderer1', 'orderer2'],
                    isolatedNodes: ['orderer3'],
                    duration: 30000
                }
            },
            {
                name: 'Consensus Delay Attack',
                payload: {
                    action: 'consensus_delay',
                    delayType: 'selective',
                    targetTransactions: ['high_value_transfer'],
                    delayDuration: 60000
                }
            },
            {
                name: 'Fork Attack Simulation',
                payload: {
                    action: 'create_fork',
                    forkPoint: 'block_12345',
                    alternativeChain: [
                        {
                            blockHeight: 12346,
                            maliciousTransactions: true
                        }
                    ]
                }
            }
        ];

        const results = [];
        let vulnerableCount = 0;

        for (const test of tests) {
            try {
                const response = await axios.post(
                    `${this.apiUrl}/v1/consensus/byzantine-test`,
                    test.payload,
                    { validateStatus: () => true }
                );
                
                const vulnerable = response.status === 200 && 
                                 !response.data?.error &&
                                 response.data?.consensus_broken === true;
                
                if (vulnerable) vulnerableCount++;
                
                results.push({
                    test: test.name,
                    vulnerable,
                    status: response.status,
                    consensusIntact: !vulnerable
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
            'Consensus & Ordering',
            'Byzantine Fault Tolerance',
            passed,
            vulnerableCount > 0 ? 'CRITICAL' : 'PASS',
            results,
            passed ? 'Byzantine fault tolerance working correctly' : 'Strengthen consensus mechanism against Byzantine failures'
        );
    }

    // Test 3: Block Validation Security
    async testBlockValidationSecurity() {
        console.log('\n📦 Testing Block Validation Security...');
        
        const tests = [
            {
                name: 'Invalid Block Structure',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/blocks/validate`, {
                            block: {
                                header: {
                                    number: -1,  // Invalid block number
                                    previousHash: 'INVALID_HASH',
                                    dataHash: null
                                },
                                data: {
                                    transactions: ['MALFORMED_TX']
                                }
                            }
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200 && response.data?.valid === true,
                            status: response.status
                        };
                    } catch (error) {
                        return {
                            vulnerable: false,
                            status: error.response?.status || 'error'
                        };
                    }
                }
            },
            {
                name: 'Merkle Tree Tampering',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/blocks/validate`, {
                            block: {
                                header: {
                                    number: 12345,
                                    dataHash: 'TAMPERED_MERKLE_ROOT'
                                },
                                data: {
                                    transactions: [
                                        'valid_tx_1',
                                        'INJECTED_MALICIOUS_TX',
                                        'valid_tx_2'
                                    ]
                                }
                            }
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200 && response.data?.valid === true,
                            status: response.status
                        };
                    } catch (error) {
                        return {
                            vulnerable: false,
                            status: error.response?.status || 'error'
                        };
                    }
                }
            },
            {
                name: 'Genesis Block Manipulation',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/channels/create`, {
                            channelName: 'malicious-channel',
                            genesisBlock: {
                                header: {
                                    number: 0
                                },
                                data: {
                                    config: {
                                        admins: ['AttackerMSP'],
                                        policies: {
                                            admins: 'AttackerMSP.admin'
                                        }
                                    }
                                }
                            }
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200,
                            status: response.status
                        };
                    } catch (error) {
                        return {
                            vulnerable: false,
                            status: error.response?.status || 'error'
                        };
                    }
                }
            }
        ];

        const results = [];
        let vulnerableCount = 0;

        for (const test of tests) {
            const result = await test.test();
            results.push({
                test: test.name,
                ...result
            });
            if (result.vulnerable) vulnerableCount++;
        }

        const passed = vulnerableCount === 0;
        this.logResult(
            'Consensus & Ordering',
            'Block Validation Security',
            passed,
            vulnerableCount > 0 ? 'HIGH' : 'PASS',
            results,
            passed ? 'Block validation working correctly' : 'Strengthen block validation and integrity checks'
        );
    }

    // Test 4: Transaction Finality Attacks
    async testTransactionFinalityAttacks() {
        console.log('\n🔒 Testing Transaction Finality Attacks...');
        
        const tests = [
            {
                name: 'Transaction Rollback Attempt',
                payload: {
                    action: 'rollback_transaction',
                    txId: 'high_value_transfer_123',
                    rollbackReason: 'administrative_override',
                    newBlockHeight: 12300  // Roll back 100 blocks
                }
            },
            {
                name: 'Finality Bypass',
                payload: {
                    action: 'bypass_finality',
                    transactions: [
                        {
                            txId: 'unconfirmed_tx_1',
                            status: 'FORCE_FINAL'
                        }
                    ]
                }
            },
            {
                name: 'Chain Reorganization Attack',
                payload: {
                    action: 'chain_reorg',
                    fromBlock: 12345,
                    toBlock: 12350,
                    alternativeChain: [
                        'alternative_block_12346',
                        'alternative_block_12347'
                    ]
                }
            },
            {
                name: 'Confirmation Depth Manipulation',
                payload: {
                    action: 'modify_confirmation_depth',
                    transactionId: 'target_tx_123',
                    fakeConfirmations: 100,
                    actualConfirmations: 1
                }
            }
        ];

        const results = [];
        let vulnerableCount = 0;

        for (const test of tests) {
            try {
                const response = await axios.post(
                    `${this.apiUrl}/v1/finality/test`,
                    test.payload,
                    { validateStatus: () => true }
                );
                
                const vulnerable = response.status === 200 && 
                                 response.data?.success === true;
                
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
            'Consensus & Ordering',
            'Transaction Finality Attacks',
            passed,
            vulnerableCount > 0 ? 'CRITICAL' : 'PASS',
            results,
            passed ? 'Transaction finality properly enforced' : 'Implement strict finality guarantees and prevent rollback attacks'
        );
    }

    // Test 5: Orderer Performance & DoS
    async testOrdererPerformanceDoS() {
        console.log('\n🚀 Testing Orderer Performance & DoS...');
        
        const tests = [
            {
                name: 'Transaction Flood Attack',
                test: async () => {
                    const startTime = Date.now();
                    const promises = [];
                    const floodSize = 1000;
                    
                    for (let i = 0; i < floodSize; i++) {
                        promises.push(
                            axios.post(`${this.apiUrl}/v1/transactions/submit`, {
                                transaction: {
                                    chaincode: 'trading',
                                    function: 'noop',
                                    args: [`flood_${i}`],
                                    nonce: `flood_nonce_${i}`
                                }
                            }, {
                                timeout: 1000,
                                validateStatus: () => true
                            }).catch(() => ({ status: 'timeout' }))
                        );
                    }
                    
                    const results = await Promise.allSettled(promises);
                    const duration = Date.now() - startTime;
                    const successful = results.filter(r => 
                        r.status === 'fulfilled' && 
                        r.value.status === 200
                    ).length;
                    
                    return {
                        vulnerable: successful > floodSize * 0.8, // If >80% successful, orderer may be vulnerable
                        status: 'flood_test',
                        details: {
                            attempted: floodSize,
                            successful,
                            duration: `${duration}ms`,
                            rate: Math.round(successful / (duration / 1000))
                        }
                    };
                }
            },
            {
                name: 'Large Transaction DoS',
                test: async () => {
                    try {
                        const largePayload = 'X'.repeat(10 * 1024 * 1024); // 10MB payload
                        const response = await axios.post(`${this.apiUrl}/v1/transactions/submit`, {
                            transaction: {
                                chaincode: 'trading',
                                function: 'store',
                                args: [largePayload]
                            }
                        }, {
                            timeout: 30000,
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200,
                            status: response.status
                        };
                    } catch (error) {
                        return {
                            vulnerable: false,
                            status: error.response?.status || 'error'
                        };
                    }
                }
            },
            {
                name: 'Orderer Resource Exhaustion',
                test: async () => {
                    try {
                        // Attempt to create many channels simultaneously
                        const promises = [];
                        for (let i = 0; i < 100; i++) {
                            promises.push(
                                axios.post(`${this.apiUrl}/v1/channels/create`, {
                                    channelName: `dos-channel-${i}`,
                                    organizations: ['GalaChainMSP']
                                }, {
                                    timeout: 5000,
                                    validateStatus: () => true
                                }).catch(() => ({ status: 'error' }))
                            );
                        }
                        
                        const results = await Promise.allSettled(promises);
                        const successful = results.filter(r => 
                            r.status === 'fulfilled' && 
                            r.value.status === 200
                        ).length;
                        
                        return {
                            vulnerable: successful > 10, // If more than 10 channels created, may indicate lack of rate limiting
                            status: 'resource_test',
                            details: { successful }
                        };
                    } catch (error) {
                        return {
                            vulnerable: false,
                            status: 'error'
                        };
                    }
                }
            }
        ];

        const results = [];
        let vulnerableCount = 0;

        for (const test of tests) {
            const result = await test.test();
            results.push({
                test: test.name,
                ...result
            });
            if (result.vulnerable) vulnerableCount++;
        }

        const passed = vulnerableCount === 0;
        this.logResult(
            'Consensus & Ordering',
            'Orderer Performance & DoS',
            passed,
            vulnerableCount > 0 ? 'HIGH' : 'PASS',
            results,
            passed ? 'Orderer properly protected against DoS attacks' : 'Implement rate limiting and resource protection for ordering service'
        );
    }

    // Main test runner
    async runTests() {
        console.log('\n' + '='.repeat(70));
        console.log('PHASE 6: CONSENSUS & ORDERING SERVICE TESTS');
        console.log('Testing Hyperledger Fabric Consensus and Ordering Security');
        console.log('='.repeat(70));

        const startTime = Date.now();

        try {
            await this.testOrderingServiceManipulation();
            await this.testByzantineFaultTolerance();
            await this.testBlockValidationSecurity();
            await this.testTransactionFinalityAttacks();
            await this.testOrdererPerformanceDoS();
        } catch (error) {
            console.error('Error during consensus & ordering testing:', error);
            this.logResult(
                'Consensus & Ordering',
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
            phase: 'Phase 6 - Consensus & Ordering Service',
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
        const filename = `security-Phase-6-ConsensusOrdering-${timestamp}.json`;
        const filepath = path.join(config.directories.results, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
        console.log(`\nResults saved to: ${filepath}`);
    }

    // Print test summary
    printSummary(summary) {
        console.log('\n' + '='.repeat(70));
        console.log('PHASE 6 SUMMARY');
        console.log('='.repeat(70));
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
module.exports = ConsensusOrderingTester;

// Run standalone if called directly
if (require.main === module) {
    const tester = new ConsensusOrderingTester();
    tester.runTests().then(() => {
        console.log('\nPhase 6 Consensus & Ordering Service Testing Complete!');
    }).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}