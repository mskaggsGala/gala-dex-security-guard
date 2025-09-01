const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * Phase 3: Chaincode Security Testing
 * Hyperledger Fabric-specific smart contract vulnerabilities
 */
class ChaincodeTester {
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

    // Test 1: Chaincode Access Control
    async testAccessControl() {
        console.log('\n🔐 Testing Chaincode Access Control...');
        
        const tests = [
            {
                name: 'Unauthorized Invocation',
                test: async () => {
                    // Test invoking chaincode without proper credentials
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/chaincode/invoke`, {
                            chaincodeName: 'trading',
                            functionName: 'adminFunction',
                            args: ['unauthorized_test']
                        }, {
                            headers: {} // No auth headers
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
                name: 'Certificate-based Permissions',
                test: async () => {
                    // Test with invalid certificate
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/chaincode/invoke`, {
                            chaincodeName: 'trading',
                            functionName: 'transfer',
                            args: ['user1', 'user2', '1000']
                        }, {
                            headers: {
                                'X-Certificate': 'INVALID_CERT_DATA'
                            }
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
                name: 'Channel Access Restrictions',
                test: async () => {
                    // Try accessing a restricted channel
                    try {
                        const response = await axios.get(`${this.apiUrl}/v1/channels/private-channel/chaincode`, {
                            headers: {
                                'X-Channel-Access': 'public-user'
                            }
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
            'Chaincode Security',
            'Access Control',
            passed,
            vulnerableCount > 0 ? 'CRITICAL' : 'PASS',
            results,
            passed ? 'Access control properly enforced' : 'Implement strict certificate-based access control'
        );
    }

    // Test 2: State Database Security
    async testStateDatabaseSecurity() {
        console.log('\n💾 Testing State Database Security...');
        
        const injectionTests = [
            {
                name: 'CouchDB Injection',
                payload: '{"selector": {"_id": {"$gt": null}}, "execution_stats": true}',
                endpoint: '/v1/query'
            },
            {
                name: 'State Tampering',
                payload: '{"key": "../../../system", "value": "malicious"}',
                endpoint: '/v1/state'
            },
            {
                name: 'Private Data Access',
                payload: '{"collection": "privateData", "key": "sensitive"}',
                endpoint: '/v1/private'
            },
            {
                name: 'MVCC Conflict Exploitation',
                payload: '{"key": "balance", "value": "999999", "version": "old"}',
                endpoint: '/v1/state/update'
            }
        ];

        const results = [];
        let vulnerableCount = 0;

        for (const test of injectionTests) {
            try {
                const response = await axios.post(
                    `${this.apiUrl}${test.endpoint}`,
                    test.payload,
                    { 
                        headers: { 'Content-Type': 'application/json' },
                        validateStatus: () => true 
                    }
                );
                
                const vulnerable = response.status === 200 && 
                                 !response.data?.error &&
                                 !response.data?.message?.includes('invalid');
                
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
            'Chaincode Security',
            'State Database Security',
            passed,
            vulnerableCount > 0 ? 'HIGH' : 'PASS',
            results,
            passed ? 'State database properly secured' : 'Implement input validation and query sanitization'
        );
    }

    // Test 3: Chaincode Lifecycle Security
    async testChaincodeLifecycle() {
        console.log('\n🔄 Testing Chaincode Lifecycle Security...');
        
        const tests = [
            {
                name: 'Unauthorized Installation',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/chaincode/install`, {
                            chaincodeName: 'malicious',
                            version: '1.0',
                            package: 'BASE64_ENCODED_MALICIOUS_CODE'
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
                name: 'Endorsement Policy Bypass',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/chaincode/instantiate`, {
                            chaincodeName: 'trading',
                            policy: '{"identities": [], "policy": {"signed-by": -1}}'
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
                name: 'Upgrade Permission Check',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/chaincode/upgrade`, {
                            chaincodeName: 'trading',
                            newVersion: '2.0',
                            args: ['admin_bypass']
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
            'Chaincode Security',
            'Lifecycle Security',
            passed,
            vulnerableCount > 0 ? 'CRITICAL' : 'PASS',
            results,
            passed ? 'Chaincode lifecycle properly secured' : 'Implement strict lifecycle governance'
        );
    }

    // Test 4: Cross-Chaincode Invocation Security
    async testCrossChaincodeInvocation() {
        console.log('\n🔗 Testing Cross-Chaincode Invocation Security...');
        
        const tests = [
            {
                name: 'Unauthorized Cross-Contract Call',
                payload: {
                    fromChaincode: 'trading',
                    toChaincode: 'admin',
                    function: 'emergencyWithdraw',
                    args: ['all_funds']
                }
            },
            {
                name: 'Reentrancy Attack',
                payload: {
                    chaincode: 'trading',
                    function: 'swap',
                    callbackChaincode: 'malicious',
                    callbackFunction: 'reenter'
                }
            },
            {
                name: 'State Consistency Violation',
                payload: {
                    chaincode1: 'trading',
                    chaincode2: 'liquidity',
                    conflictingUpdates: true
                }
            }
        ];

        const results = [];
        let vulnerableCount = 0;

        for (const test of tests) {
            try {
                const response = await axios.post(
                    `${this.apiUrl}/v1/chaincode/cross-invoke`,
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
            'Chaincode Security',
            'Cross-Chaincode Invocation',
            passed,
            vulnerableCount > 0 ? 'HIGH' : 'PASS',
            results,
            passed ? 'Cross-chaincode calls properly secured' : 'Implement invocation access control'
        );
    }

    // Test 5: Deterministic Execution
    async testDeterministicExecution() {
        console.log('\n🎲 Testing Deterministic Execution...');
        
        const tests = [
            {
                name: 'Random Number Usage',
                payload: {
                    function: 'getRandom',
                    iterations: 5
                }
            },
            {
                name: 'Timestamp Dependency',
                payload: {
                    function: 'getCurrentTime',
                    iterations: 5
                }
            },
            {
                name: 'External API Calls',
                payload: {
                    function: 'fetchExternalData',
                    url: 'https://api.external.com/data'
                }
            }
        ];

        const results = [];
        let nondeterministicCount = 0;

        for (const test of tests) {
            try {
                const responses = [];
                
                // Execute multiple times to check determinism
                for (let i = 0; i < (test.payload.iterations || 1); i++) {
                    const response = await axios.post(
                        `${this.apiUrl}/v1/chaincode/query`,
                        test.payload,
                        { validateStatus: () => true }
                    );
                    responses.push(response.data);
                }
                
                // Check if all responses are identical
                const isNondeterministic = test.payload.iterations && 
                    responses.some(r => JSON.stringify(r) !== JSON.stringify(responses[0]));
                
                if (isNondeterministic) nondeterministicCount++;
                
                results.push({
                    test: test.name,
                    nondeterministic: isNondeterministic,
                    responses: responses.length
                });
            } catch (error) {
                results.push({
                    test: test.name,
                    error: error.message
                });
            }
        }

        const passed = nondeterministicCount === 0;
        this.logResult(
            'Chaincode Security',
            'Deterministic Execution',
            passed,
            nondeterministicCount > 0 ? 'HIGH' : 'PASS',
            results,
            passed ? 'Chaincode execution is deterministic' : 'Remove non-deterministic operations from chaincode'
        );
    }

    // Main test runner
    async runTests() {
        console.log('\n' + '='.repeat(50));
        console.log('PHASE 3: CHAINCODE SECURITY TESTING');
        console.log('Testing Hyperledger Fabric Smart Contract Security');
        console.log('='.repeat(50));

        const startTime = Date.now();

        try {
            await this.testAccessControl();
            await this.testStateDatabaseSecurity();
            await this.testChaincodeLifecycle();
            await this.testCrossChaincodeInvocation();
            await this.testDeterministicExecution();
        } catch (error) {
            console.error('Error during chaincode security testing:', error);
            this.logResult(
                'Chaincode Security',
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
            phase: 'Phase 3 - Chaincode Security',
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
        const filename = `security-Phase-3-Chaincode-${timestamp}.json`;
        const filepath = path.join(config.directories.results, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
        console.log(`\nResults saved to: ${filepath}`);
    }

    // Print test summary
    printSummary(summary) {
        console.log('\n' + '='.repeat(50));
        console.log('PHASE 3 SUMMARY');
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
module.exports = ChaincodeTester;

// Run standalone if called directly
if (require.main === module) {
    const tester = new ChaincodeTester();
    tester.runTests().then(() => {
        console.log('\nPhase 3 Chaincode Security Testing Complete!');
    }).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}