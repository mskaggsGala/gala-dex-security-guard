const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

/**
 * Phase 5: Permissioned Network Attacks
 * Hyperledger Fabric MSP and Identity Management Vulnerabilities
 */
class PermissionedNetworkTester {
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

    // Test 1: MSP Identity Manipulation
    async testMSPIdentityManipulation() {
        console.log('\n🆔 Testing MSP Identity Manipulation...');
        
        const tests = [
            {
                name: 'Invalid MSP Certificate',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/identity/validate`, {
                            certificate: 'INVALID_CERT_DATA_' + crypto.randomBytes(64).toString('hex'),
                            mspId: 'GalaChainMSP'
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
                name: 'MSP Impersonation',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/chaincode/invoke`, {
                            chaincodeName: 'trading',
                            functionName: 'adminFunction',
                            args: ['impersonation_test']
                        }, {
                            headers: {
                                'X-MSP-ID': 'FakeAdminMSP',
                                'X-Certificate': 'FAKE_ADMIN_CERT'
                            },
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
                name: 'Certificate Authority Bypass',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/ca/register`, {
                            enrollmentId: 'malicious_user',
                            enrollmentSecret: 'bypass_attempt',
                            role: 'admin'
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
            'Permissioned Network',
            'MSP Identity Manipulation',
            passed,
            vulnerableCount > 0 ? 'CRITICAL' : 'PASS',
            results,
            passed ? 'MSP identity validation properly enforced' : 'Strengthen MSP certificate validation and CA controls'
        );
    }

    // Test 2: Channel Access Control
    async testChannelAccessControl() {
        console.log('\n📡 Testing Channel Access Control...');
        
        const tests = [
            {
                name: 'Unauthorized Channel Join',
                endpoint: '/v1/channels/private-channel/join',
                payload: {
                    peer: 'malicious-peer',
                    mspId: 'UnauthorizedMSP'
                }
            },
            {
                name: 'Channel Configuration Tampering',
                endpoint: '/v1/channels/trading-channel/config',
                payload: {
                    configUpdate: {
                        readSet: [],
                        writeSet: [
                            {
                                key: 'Admins',
                                value: 'malicious_admin'
                            }
                        ]
                    }
                }
            },
            {
                name: 'Cross-Channel Data Access',
                endpoint: '/v1/channels/private-channel/query',
                payload: {
                    chaincode: 'confidential',
                    function: 'getAllData'
                }
            },
            {
                name: 'Channel Event Eavesdropping',
                endpoint: '/v1/channels/trading-channel/events/subscribe',
                payload: {
                    eventType: 'ALL',
                    unauthorized: true
                }
            }
        ];

        const results = [];
        let vulnerableCount = 0;

        for (const test of tests) {
            try {
                const response = await axios.post(
                    `${this.apiUrl}${test.endpoint}`,
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
            'Permissioned Network',
            'Channel Access Control',
            passed,
            vulnerableCount > 0 ? 'HIGH' : 'PASS',
            results,
            passed ? 'Channel access controls properly enforced' : 'Implement strict channel access policies'
        );
    }

    // Test 3: Peer Network Security
    async testPeerNetworkSecurity() {
        console.log('\n🖥️ Testing Peer Network Security...');
        
        const tests = [
            {
                name: 'Malicious Peer Registration',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/peers/register`, {
                            peerId: 'malicious-peer-' + Date.now(),
                            endpoint: 'malicious.peer.com:7051',
                            mspId: 'FakeMSP',
                            tlsCert: 'FAKE_TLS_CERT'
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
                name: 'Peer Gossip Protocol Manipulation',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/gossip/broadcast`, {
                            message: 'MALICIOUS_GOSSIP_MESSAGE',
                            type: 'BLOCK_VALIDATION',
                            spoofedFrom: 'trusted-peer'
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
                name: 'Endorsement Policy Bypass',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/transactions/submit`, {
                            proposal: {
                                chaincode: 'trading',
                                function: 'transfer',
                                args: ['user1', 'attacker', '1000000']
                            },
                            endorsements: [
                                {
                                    peer: 'fake-peer',
                                    signature: 'FAKE_SIGNATURE',
                                    mspId: 'FakeEndorserMSP'
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
            'Permissioned Network',
            'Peer Network Security',
            passed,
            vulnerableCount > 0 ? 'CRITICAL' : 'PASS',
            results,
            passed ? 'Peer network security properly enforced' : 'Implement strict peer validation and gossip protocol security'
        );
    }

    // Test 4: Organization Privilege Escalation
    async testOrganizationPrivilegeEscalation() {
        console.log('\n🏢 Testing Organization Privilege Escalation...');
        
        const tests = [
            {
                name: 'Admin Role Assumption',
                payload: {
                    operation: 'createChannel',
                    channelName: 'unauthorized-channel',
                    organizations: ['MaliciousOrg'],
                    adminOverride: true
                }
            },
            {
                name: 'Policy Modification Attack',
                payload: {
                    operation: 'updateChannelConfig',
                    channelName: 'trading-channel',
                    policy: {
                        admins: ['AttackerMSP'],
                        writers: ['AttackerMSP'],
                        readers: ['AttackerMSP']
                    }
                }
            },
            {
                name: 'Consensus Manipulation',
                payload: {
                    operation: 'orderingService',
                    action: 'addOrderer',
                    orderer: 'malicious-orderer.com:7050',
                    organization: 'AttackerOrg'
                }
            },
            {
                name: 'Certificate Authority Takeover',
                payload: {
                    operation: 'ca-admin',
                    action: 'revoke-all',
                    targetMSP: 'GalaChainMSP',
                    reason: 'administrative'
                }
            }
        ];

        const results = [];
        let vulnerableCount = 0;

        for (const test of tests) {
            try {
                const response = await axios.post(
                    `${this.apiUrl}/v1/admin/operations`,
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
            'Permissioned Network',
            'Organization Privilege Escalation',
            passed,
            vulnerableCount > 0 ? 'CRITICAL' : 'PASS',
            results,
            passed ? 'Organization privileges properly controlled' : 'Implement strict role-based access control for organizational operations'
        );
    }

    // Test 5: Identity Revocation and CRL
    async testIdentityRevocationAndCRL() {
        console.log('\n🚫 Testing Identity Revocation and CRL...');
        
        const tests = [
            {
                name: 'Revoked Certificate Usage',
                test: async () => {
                    // Simulate using a certificate that should be revoked
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/chaincode/invoke`, {
                            chaincodeName: 'trading',
                            functionName: 'transfer',
                            args: ['revokedUser', 'targetUser', '1000']
                        }, {
                            headers: {
                                'X-Certificate': 'REVOKED_CERT_DATA',
                                'X-MSP-ID': 'GalaChainMSP'
                            },
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
                name: 'CRL Bypass Attempt',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/identity/validate`, {
                            certificate: 'BYPASS_CRL_CERT',
                            skipCRLCheck: true,
                            mspId: 'GalaChainMSP'
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
                name: 'Expired Certificate Usage',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/transactions/submit`, {
                            proposal: 'TRANSACTION_PROPOSAL',
                            signature: 'EXPIRED_CERT_SIGNATURE',
                            certificateExpiry: '2020-01-01'
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
            'Permissioned Network',
            'Identity Revocation and CRL',
            passed,
            vulnerableCount > 0 ? 'HIGH' : 'PASS',
            results,
            passed ? 'Certificate revocation properly enforced' : 'Implement strict CRL checking and certificate expiration validation'
        );
    }

    // Main test runner
    async runTests() {
        console.log('\n' + '='.repeat(60));
        console.log('PHASE 5: PERMISSIONED NETWORK ATTACKS');
        console.log('Testing Hyperledger Fabric MSP and Identity Security');
        console.log('='.repeat(60));

        const startTime = Date.now();

        try {
            await this.testMSPIdentityManipulation();
            await this.testChannelAccessControl();
            await this.testPeerNetworkSecurity();
            await this.testOrganizationPrivilegeEscalation();
            await this.testIdentityRevocationAndCRL();
        } catch (error) {
            console.error('Error during permissioned network testing:', error);
            this.logResult(
                'Permissioned Network',
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
            phase: 'Phase 5 - Permissioned Network Attacks',
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
        const filename = `security-Phase-5-PermissionedNetwork-${timestamp}.json`;
        const filepath = path.join(config.directories.results, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
        console.log(`\nResults saved to: ${filepath}`);
    }

    // Print test summary
    printSummary(summary) {
        console.log('\n' + '='.repeat(60));
        console.log('PHASE 5 SUMMARY');
        console.log('='.repeat(60));
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
module.exports = PermissionedNetworkTester;

// Run standalone if called directly
if (require.main === module) {
    const tester = new PermissionedNetworkTester();
    tester.runTests().then(() => {
        console.log('\nPhase 5 Permissioned Network Testing Complete!');
    }).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}