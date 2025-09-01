const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

/**
 * Phase 7: Privacy & Confidentiality Tests
 * Hyperledger Fabric Private Data and Channel Isolation Vulnerabilities
 */
class PrivacyConfidentialityTester {
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

    // Test 1: Private Data Collection Security
    async testPrivateDataCollectionSecurity() {
        console.log('\n🔐 Testing Private Data Collection Security...');
        
        const tests = [
            {
                name: 'Unauthorized Private Data Access',
                test: async () => {
                    try {
                        const response = await axios.get(`${this.apiUrl}/v1/private-data/trading-secrets`, {
                            params: {
                                collection: 'confidential_trades',
                                key: 'high_value_trade_123'
                            },
                            headers: {
                                'X-MSP-ID': 'UnauthorizedMSP'
                            },
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200 && response.data?.value,
                            status: response.status,
                            dataExposed: !!response.data?.value
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
                name: 'Private Data Hash Collision',
                test: async () => {
                    try {
                        // Attempt to create hash collision for private data
                        const maliciousData = crypto.randomBytes(1024).toString('hex');
                        const response = await axios.post(`${this.apiUrl}/v1/private-data/store`, {
                            collection: 'trading-private',
                            key: 'legitimate_trade',
                            value: maliciousData,
                            hash: 'PREDETERMINED_HASH_FOR_COLLISION'
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
                name: 'Private Data Purge Bypass',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/private-data/query`, {
                            collection: 'expired_data',
                            selector: {
                                purged: false,
                                expiryDate: { '$lt': '2020-01-01' }
                            },
                            bypassPurge: true
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200 && response.data?.records?.length > 0,
                            status: response.status,
                            expiredRecords: response.data?.records?.length || 0
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
            'Privacy & Confidentiality',
            'Private Data Collection Security',
            passed,
            vulnerableCount > 0 ? 'CRITICAL' : 'PASS',
            results,
            passed ? 'Private data collections properly secured' : 'Implement strict private data access controls and hash validation'
        );
    }

    // Test 2: Channel Isolation Attacks
    async testChannelIsolationAttacks() {
        console.log('\n🏠 Testing Channel Isolation Attacks...');
        
        const tests = [
            {
                name: 'Cross-Channel Data Leakage',
                payload: {
                    sourceChannel: 'private-trading-channel',
                    targetChannel: 'public-channel',
                    dataKey: 'confidential_balance',
                    leakageMethod: 'chaincode_cross_reference'
                }
            },
            {
                name: 'Channel State Database Access',
                payload: {
                    channel: 'restricted-channel',
                    query: {
                        selector: { '_id': { '$regex': '.*' } },
                        use_index: ['_all_docs']
                    },
                    bypassChannelACL: true
                }
            },
            {
                name: 'Inter-Channel Communication',
                payload: {
                    fromChannel: 'trading-channel',
                    toChannel: 'settlement-channel',
                    message: 'UNAUTHORIZED_COMMUNICATION',
                    chaincodeProxy: 'bridge_chaincode'
                }
            },
            {
                name: 'Channel Event Interception',
                payload: {
                    targetChannel: 'confidential-channel',
                    eventFilter: 'HIGH_VALUE_TRADES',
                    interceptMethod: 'gossip_protocol_tap'
                }
            }
        ];

        const results = [];
        let vulnerableCount = 0;

        for (const test of tests) {
            try {
                const response = await axios.post(
                    `${this.apiUrl}/v1/channels/isolation-test`,
                    test.payload,
                    { validateStatus: () => true }
                );
                
                const vulnerable = response.status === 200 && 
                                 response.data?.isolationBroken === true;
                
                if (vulnerable) vulnerableCount++;
                
                results.push({
                    test: test.name,
                    vulnerable,
                    status: response.status,
                    isolationIntact: !vulnerable
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
            'Privacy & Confidentiality',
            'Channel Isolation Attacks',
            passed,
            vulnerableCount > 0 ? 'HIGH' : 'PASS',
            results,
            passed ? 'Channel isolation properly maintained' : 'Strengthen channel isolation and prevent cross-channel data access'
        );
    }

    // Test 3: Encryption Key Management
    async testEncryptionKeyManagement() {
        console.log('\n🔑 Testing Encryption Key Management...');
        
        const tests = [
            {
                name: 'Weak Key Generation',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/crypto/generate-key`, {
                            algorithm: 'DES',  // Weak encryption
                            keySize: 56,
                            purpose: 'private_data_encryption'
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
                name: 'Key Rotation Bypass',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/private-data/decrypt`, {
                            collection: 'trading-private',
                            encryptedData: 'OLD_ENCRYPTED_DATA',
                            keyVersion: 'deprecated_key_v1',
                            forceOldKey: true
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200 && response.data?.decrypted,
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
                name: 'Key Exposure in Logs',
                test: async () => {
                    try {
                        const response = await axios.get(`${this.apiUrl}/v1/system/logs`, {
                            params: {
                                level: 'DEBUG',
                                component: 'crypto',
                                includeKeys: true
                            },
                            validateStatus: () => true
                        });
                        
                        const hasKeyData = response.data?.logs?.some(log => 
                            log.message.includes('private_key') || 
                            log.message.includes('encryption_key')
                        );
                        
                        return {
                            vulnerable: response.status === 200 && hasKeyData,
                            status: response.status,
                            keysInLogs: hasKeyData
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
            'Privacy & Confidentiality',
            'Encryption Key Management',
            passed,
            vulnerableCount > 0 ? 'CRITICAL' : 'PASS',
            results,
            passed ? 'Encryption key management properly secured' : 'Implement strong key management practices and secure key rotation'
        );
    }

    // Test 4: Data Anonymization Attacks
    async testDataAnonymizationAttacks() {
        console.log('\n👤 Testing Data Anonymization Attacks...');
        
        const tests = [
            {
                name: 'User Identity Correlation',
                payload: {
                    analysisType: 'transaction_pattern',
                    targetData: {
                        anonymizedTransactions: [
                            { id: 'anon_001', amount: '1000.50', timestamp: '2024-01-01' },
                            { id: 'anon_002', amount: '1000.50', timestamp: '2024-01-02' },
                            { id: 'anon_003', amount: '1000.50', timestamp: '2024-01-03' }
                        ]
                    },
                    correlationMethod: 'amount_frequency_analysis'
                }
            },
            {
                name: 'Linkage Attack',
                payload: {
                    analysisType: 'behavioral_linking',
                    datasets: [
                        'anonymized_trading_data',
                        'public_blockchain_data',
                        'timing_correlation_data'
                    ],
                    linkageAlgorithm: 'statistical_disclosure'
                }
            },
            {
                name: 'De-anonymization via Side Channels',
                payload: {
                    method: 'side_channel_analysis',
                    targetCollection: 'anonymized_user_data',
                    sideChannels: [
                        'transaction_timing',
                        'gas_usage_patterns',
                        'network_metadata'
                    ]
                }
            },
            {
                name: 'Homomorphic Encryption Bypass',
                payload: {
                    encryptedQuery: 'SUM(encrypted_balances)',
                    knownPlaintextAttack: true,
                    partialDecryption: true
                }
            }
        ];

        const results = [];
        let vulnerableCount = 0;

        for (const test of tests) {
            try {
                const response = await axios.post(
                    `${this.apiUrl}/v1/privacy/anonymization-test`,
                    test.payload,
                    { validateStatus: () => true }
                );
                
                const vulnerable = response.status === 200 && 
                                 (response.data?.identitiesRevealed > 0 ||
                                  response.data?.anonymityBroken === true);
                
                if (vulnerable) vulnerableCount++;
                
                results.push({
                    test: test.name,
                    vulnerable,
                    status: response.status,
                    identitiesRevealed: response.data?.identitiesRevealed || 0
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
            'Privacy & Confidentiality',
            'Data Anonymization Attacks',
            passed,
            vulnerableCount > 0 ? 'HIGH' : 'PASS',
            results,
            passed ? 'Data anonymization properly implemented' : 'Strengthen anonymization techniques and prevent correlation attacks'
        );
    }

    // Test 5: Zero-Knowledge Proof Vulnerabilities
    async testZeroKnowledgeProofVulnerabilities() {
        console.log('\n🔍 Testing Zero-Knowledge Proof Vulnerabilities...');
        
        const tests = [
            {
                name: 'ZK Proof Forgery',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/zk/verify-proof`, {
                            proof: {
                                statement: 'balance > 1000000',
                                witness: 'FORGED_WITNESS_DATA',
                                proof: 'MALICIOUS_PROOF_CONSTRUCTION'
                            },
                            publicInputs: ['balance_commitment'],
                            verificationKey: 'COMPROMISED_VK'
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200 && response.data?.verified === true,
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
                name: 'Trusted Setup Compromise',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/zk/setup`, {
                            circuit: 'balance_proof_circuit',
                            participants: ['attacker_node'],
                            entropy: 'PREDETERMINED_ENTROPY',
                            compromiseSetup: true
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
                name: 'Zero-Knowledge Circuit Manipulation',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/zk/generate-proof`, {
                            circuit: 'modified_trading_circuit',
                            privateInputs: {
                                actualBalance: '100',
                                claimedBalance: '1000000'  // False claim
                            },
                            publicInputs: {
                                balanceCommitment: 'MANIPULATED_COMMITMENT'
                            }
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200 && response.data?.proof,
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
            'Privacy & Confidentiality',
            'Zero-Knowledge Proof Vulnerabilities',
            passed,
            vulnerableCount > 0 ? 'CRITICAL' : 'PASS',
            results,
            passed ? 'Zero-knowledge proofs properly implemented' : 'Implement secure ZK proof systems with proper trusted setup'
        );
    }

    // Test 6: Metadata Leakage
    async testMetadataLeakage() {
        console.log('\n📊 Testing Metadata Leakage...');
        
        const tests = [
            {
                name: 'Transaction Timing Analysis',
                test: async () => {
                    const timingData = [];
                    
                    // Collect timing data for pattern analysis
                    for (let i = 0; i < 10; i++) {
                        const start = Date.now();
                        try {
                            await axios.post(`${this.apiUrl}/v1/transactions/submit`, {
                                transaction: {
                                    chaincode: 'trading',
                                    function: 'getBalance',
                                    args: [`user_${i % 3}`]  // Limited user set for pattern detection
                                }
                            }, {
                                timeout: 5000,
                                validateStatus: () => true
                            });
                            
                            timingData.push({
                                user: `user_${i % 3}`,
                                responseTime: Date.now() - start
                            });
                        } catch (error) {
                            timingData.push({
                                user: `user_${i % 3}`,
                                error: true
                            });
                        }
                    }
                    
                    // Analyze for timing patterns that could reveal user info
                    const userTimings = {};
                    timingData.forEach(data => {
                        if (!data.error) {
                            if (!userTimings[data.user]) userTimings[data.user] = [];
                            userTimings[data.user].push(data.responseTime);
                        }
                    });
                    
                    // Check if timing patterns are distinguishable
                    const avgTimings = Object.keys(userTimings).map(user => ({
                        user,
                        avgTime: userTimings[user].reduce((a, b) => a + b, 0) / userTimings[user].length
                    }));
                    
                    const maxDiff = Math.max(...avgTimings.map(t => t.avgTime)) - Math.min(...avgTimings.map(t => t.avgTime));
                    
                    return {
                        vulnerable: maxDiff > 100, // If timing difference > 100ms, potentially exploitable
                        status: 'timing_analysis',
                        details: { maxTimingDifference: maxDiff, avgTimings }
                    };
                }
            },
            {
                name: 'Network Traffic Analysis',
                test: async () => {
                    try {
                        const response = await axios.get(`${this.apiUrl}/v1/network/traffic-patterns`, {
                            params: {
                                includeMetadata: true,
                                timeWindow: '1h',
                                detailLevel: 'verbose'
                            },
                            validateStatus: () => true
                        });
                        
                        const hasExposedMetadata = response.data?.metadata && (
                            response.data.metadata.userIPs ||
                            response.data.metadata.sessionTokens ||
                            response.data.metadata.deviceFingerprints
                        );
                        
                        return {
                            vulnerable: response.status === 200 && hasExposedMetadata,
                            status: response.status,
                            metadataExposed: hasExposedMetadata
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
            'Privacy & Confidentiality',
            'Metadata Leakage',
            passed,
            vulnerableCount > 0 ? 'MEDIUM' : 'PASS',
            results,
            passed ? 'Metadata properly protected' : 'Implement metadata protection and timing attack mitigation'
        );
    }

    // Main test runner
    async runTests() {
        console.log('\n' + '='.repeat(70));
        console.log('PHASE 7: PRIVACY & CONFIDENTIALITY TESTS');
        console.log('Testing Hyperledger Fabric Privacy and Data Protection');
        console.log('='.repeat(70));

        const startTime = Date.now();

        try {
            await this.testPrivateDataCollectionSecurity();
            await this.testChannelIsolationAttacks();
            await this.testEncryptionKeyManagement();
            await this.testDataAnonymizationAttacks();
            await this.testZeroKnowledgeProofVulnerabilities();
            await this.testMetadataLeakage();
        } catch (error) {
            console.error('Error during privacy & confidentiality testing:', error);
            this.logResult(
                'Privacy & Confidentiality',
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
            phase: 'Phase 7 - Privacy & Confidentiality',
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
        const filename = `security-Phase-7-PrivacyConfidentiality-${timestamp}.json`;
        const filepath = path.join(config.directories.results, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
        console.log(`\nResults saved to: ${filepath}`);
    }

    // Print test summary
    printSummary(summary) {
        console.log('\n' + '='.repeat(70));
        console.log('PHASE 7 SUMMARY');
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
module.exports = PrivacyConfidentialityTester;

// Run standalone if called directly
if (require.main === module) {
    const tester = new PrivacyConfidentialityTester();
    tester.runTests().then(() => {
        console.log('\nPhase 7 Privacy & Confidentiality Testing Complete!');
    }).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}