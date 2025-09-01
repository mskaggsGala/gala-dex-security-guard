const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * Phase 8: Compliance & Regulatory Tests
 * Testing AML/KYC, Jurisdiction Controls, and Regulatory Compliance
 */
class ComplianceRegulatoryTester {
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

    // Test 1: AML/KYC Bypass Attempts
    async testAMLKYCBypass() {
        console.log('\n🔍 Testing AML/KYC Bypass Attempts...');
        
        const tests = [
            {
                name: 'Unverified User Trading',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/trade/execute`, {
                            tokenIn: 'GALA$Unit$none$none',
                            tokenOut: 'GUSDC$Unit$none$none',
                            amountIn: '50000', // High value trade
                            user: {
                                id: 'unverified_user_' + Date.now(),
                                kycStatus: 'PENDING',
                                amlCheck: 'NOT_COMPLETED'
                            }
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200 && response.data?.executed,
                            status: response.status,
                            tradeValue: '50000'
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
                name: 'Transaction Limit Bypass',
                test: async () => {
                    try {
                        // Attempt to exceed daily limits through multiple small transactions
                        const promises = [];
                        for (let i = 0; i < 50; i++) {
                            promises.push(
                                axios.post(`${this.apiUrl}/v1/trade/execute`, {
                                    tokenIn: 'GALA$Unit$none$none',
                                    tokenOut: 'GUSDC$Unit$none$none',
                                    amountIn: '2000', // Just under limit per transaction
                                    user: {
                                        id: 'limit_test_user',
                                        dailyLimit: '10000'
                                    }
                                }, {
                                    timeout: 2000,
                                    validateStatus: () => true
                                }).catch(() => ({ status: 'error' }))
                            );
                        }
                        
                        const results = await Promise.allSettled(promises);
                        const successful = results.filter(r => 
                            r.status === 'fulfilled' && 
                            r.value.status === 200
                        ).length;
                        
                        const totalValue = successful * 2000;
                        
                        return {
                            vulnerable: totalValue > 10000, // Exceeded daily limit
                            status: 'limit_test',
                            details: {
                                successfulTrades: successful,
                                totalValue,
                                dailyLimit: 10000
                            }
                        };
                    } catch (error) {
                        return {
                            vulnerable: false,
                            status: 'error'
                        };
                    }
                }
            },
            {
                name: 'Sanctioned Address Bypass',
                test: async () => {
                    try {
                        const sanctionedAddresses = [
                            '0x1234567890123456789012345678901234567890', // Known sanctioned address
                            '0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF'  // Test sanctioned address
                        ];
                        
                        let bypassCount = 0;
                        const results = [];
                        
                        for (const address of sanctionedAddresses) {
                            const response = await axios.post(`${this.apiUrl}/v1/trade/execute`, {
                                tokenIn: 'GALA$Unit$none$none',
                                tokenOut: 'GUSDC$Unit$none$none',
                                amountIn: '1000',
                                fromAddress: address
                            }, {
                                validateStatus: () => true
                            });
                            
                            if (response.status === 200) {
                                bypassCount++;
                            }
                            
                            results.push({
                                address,
                                allowed: response.status === 200,
                                status: response.status
                            });
                        }
                        
                        return {
                            vulnerable: bypassCount > 0,
                            status: 'sanction_test',
                            details: {
                                sanctionedAddressesTested: sanctionedAddresses.length,
                                bypassCount,
                                results
                            }
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
            'Compliance & Regulatory',
            'AML/KYC Bypass Attempts',
            passed,
            vulnerableCount > 0 ? 'CRITICAL' : 'PASS',
            results,
            passed ? 'AML/KYC controls properly enforced' : 'Implement strict AML/KYC validation and transaction monitoring'
        );
    }

    // Test 2: Jurisdiction Control Bypass
    async testJurisdictionControlBypass() {
        console.log('\n🌍 Testing Jurisdiction Control Bypass...');
        
        const tests = [
            {
                name: 'Geolocation Bypass',
                payload: {
                    userLocation: {
                        country: 'US',
                        state: 'NY',
                        vpn: false
                    },
                    realLocation: {
                        country: 'RESTRICTED_COUNTRY',
                        detectedVPN: true
                    },
                    tradeRequest: {
                        amount: '10000',
                        restricted: true
                    }
                }
            },
            {
                name: 'IP Spoofing Detection',
                payload: {
                    sourceIP: '192.168.1.1', // Private IP claiming to be US
                    xForwardedFor: '203.0.113.1', // Example IP
                    xRealIP: '198.51.100.1', // Different IP
                    userAgent: 'Tor Browser',
                    jurisdiction: 'RESTRICTED'
                }
            },
            {
                name: 'Cross-Border Transaction Restrictions',
                payload: {
                    fromJurisdiction: 'RESTRICTED_REGION',
                    toJurisdiction: 'COMPLIANT_REGION',
                    transactionType: 'HIGH_RISK',
                    amount: '100000',
                    regulatoryBypass: true
                }
            },
            {
                name: 'Regulatory Reporting Bypass',
                payload: {
                    transaction: {
                        amount: '15000', // Above reporting threshold
                        reportToRegulator: false,
                        hideFromCompliance: true
                    },
                    user: {
                        jurisdiction: 'US',
                        reportingRequired: true
                    }
                }
            }
        ];

        const results = [];
        let vulnerableCount = 0;

        for (const test of tests) {
            try {
                const response = await axios.post(
                    `${this.apiUrl}/v1/compliance/jurisdiction-test`,
                    test.payload,
                    { validateStatus: () => true }
                );
                
                const vulnerable = response.status === 200 && 
                                 response.data?.accessGranted === true;
                
                if (vulnerable) vulnerableCount++;
                
                results.push({
                    test: test.name,
                    vulnerable,
                    status: response.status,
                    jurisdictionEnforced: !vulnerable
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
            'Compliance & Regulatory',
            'Jurisdiction Control Bypass',
            passed,
            vulnerableCount > 0 ? 'HIGH' : 'PASS',
            results,
            passed ? 'Jurisdiction controls properly enforced' : 'Implement robust geolocation validation and IP analysis'
        );
    }

    // Test 3: Regulatory Reporting Failures
    async testRegulatoryReportingFailures() {
        console.log('\n📋 Testing Regulatory Reporting Failures...');
        
        const tests = [
            {
                name: 'Suspicious Activity Reporting',
                test: async () => {
                    try {
                        // Simulate suspicious trading patterns
                        const response = await axios.post(`${this.apiUrl}/v1/trade/suspicious-pattern`, {
                            pattern: 'STRUCTURING',
                            transactions: [
                                { amount: '9999', timestamp: '2024-01-01T10:00:00Z' },
                                { amount: '9999', timestamp: '2024-01-01T10:30:00Z' },
                                { amount: '9999', timestamp: '2024-01-01T11:00:00Z' }
                            ],
                            reportGenerated: false
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200 && !response.data?.sarFiled,
                            status: response.status,
                            reportFiled: response.data?.sarFiled || false
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
                name: 'Large Transaction Reporting',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/trade/large-transaction`, {
                            amount: '50000', // Above CTR threshold
                            currency: 'USD',
                            reportingRequired: true,
                            skipReporting: true
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200 && !response.data?.ctrFiled,
                            status: response.status,
                            reportFiled: response.data?.ctrFiled || false
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
                name: 'Cross-Border Reporting',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/compliance/cross-border`, {
                            fromCountry: 'US',
                            toCountry: 'EU',
                            amount: '25000',
                            reportingRequirement: 'FINCEN_114',
                            skipReporting: true
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200 && !response.data?.reportSubmitted,
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
            'Compliance & Regulatory',
            'Regulatory Reporting Failures',
            passed,
            vulnerableCount > 0 ? 'CRITICAL' : 'PASS',
            results,
            passed ? 'Regulatory reporting working correctly' : 'Implement mandatory regulatory reporting for all applicable transactions'
        );
    }

    // Test 4: Data Retention Compliance
    async testDataRetentionCompliance() {
        console.log('\n💾 Testing Data Retention Compliance...');
        
        const tests = [
            {
                name: 'GDPR Data Deletion',
                payload: {
                    userRequest: 'DELETE_ALL_DATA',
                    userId: 'eu_user_123',
                    jurisdiction: 'EU',
                    dataTypes: [
                        'personal_info',
                        'transaction_history',
                        'kyc_documents'
                    ],
                    retentionOverride: true
                }
            },
            {
                name: 'Legal Hold Override',
                payload: {
                    dataCategory: 'investigation_data',
                    retentionPeriod: 'EXPIRED',
                    legalHold: false,
                    forceDelete: true,
                    investigationActive: true
                }
            },
            {
                name: 'Audit Trail Preservation',
                payload: {
                    auditData: 'COMPLIANCE_AUDIT_LOGS',
                    retentionPeriod: '7_YEARS',
                    currentAge: '8_YEARS',
                    regulatoryRequirement: 'SOX_COMPLIANCE',
                    allowDeletion: true
                }
            },
            {
                name: 'Cross-Jurisdiction Data Transfer',
                payload: {
                    sourceJurisdiction: 'EU',
                    targetJurisdiction: 'US',
                    dataType: 'PII',
                    adequacyDecision: false,
                    userConsent: false,
                    forceTransfer: true
                }
            }
        ];

        const results = [];
        let vulnerableCount = 0;

        for (const test of tests) {
            try {
                const response = await axios.post(
                    `${this.apiUrl}/v1/compliance/data-retention`,
                    test.payload,
                    { validateStatus: () => true }
                );
                
                const vulnerable = response.status === 200 && 
                                 (response.data?.dataDeleted === true ||
                                  response.data?.transferAllowed === true ||
                                  response.data?.complianceViolated === true);
                
                if (vulnerable) vulnerableCount++;
                
                results.push({
                    test: test.name,
                    vulnerable,
                    status: response.status,
                    complianceViolation: vulnerable
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
            'Compliance & Regulatory',
            'Data Retention Compliance',
            passed,
            vulnerableCount > 0 ? 'HIGH' : 'PASS',
            results,
            passed ? 'Data retention policies properly enforced' : 'Implement strict data retention and legal hold controls'
        );
    }

    // Test 5: License and Registration Validation
    async testLicenseRegistrationValidation() {
        console.log('\n📜 Testing License and Registration Validation...');
        
        const tests = [
            {
                name: 'Unlicensed Operation Test',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/compliance/license-check`, {
                            operation: 'MONEY_TRANSMISSION',
                            jurisdiction: 'NY',
                            licenseStatus: 'EXPIRED',
                            operatorId: 'unlicensed_operator'
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200 && response.data?.operationAllowed,
                            status: response.status,
                            operationAllowed: response.data?.operationAllowed
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
                name: 'Registration Requirements',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/compliance/registration`, {
                            entityType: 'VIRTUAL_CURRENCY_BUSINESS',
                            jurisdictions: ['NY', 'CA', 'EU'],
                            registrationStatus: {
                                NY: 'PENDING',
                                CA: 'NONE',
                                EU: 'EXPIRED'
                            },
                            allowUnregisteredOperation: true
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200 && response.data?.registrationValid,
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
                name: 'Regulatory Capital Requirements',
                test: async () => {
                    try {
                        const response = await axios.post(`${this.apiUrl}/v1/compliance/capital-adequacy`, {
                            requiredCapital: '10000000', // $10M required
                            currentCapital: '5000000',   // $5M actual
                            capitalRatio: 0.5,           // 50% - Below requirement
                            allowOperationBelowRatio: true
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: response.status === 200 && response.data?.operationAllowed,
                            status: response.status,
                            capitalAdequate: response.data?.capitalAdequate
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
            'Compliance & Regulatory',
            'License and Registration Validation',
            passed,
            vulnerableCount > 0 ? 'CRITICAL' : 'PASS',
            results,
            passed ? 'License and registration validation working correctly' : 'Implement strict license validation and capital adequacy checks'
        );
    }

    // Test 6: Market Manipulation Detection
    async testMarketManipulationDetection() {
        console.log('\n📈 Testing Market Manipulation Detection...');
        
        const tests = [
            {
                name: 'Wash Trading Detection',
                test: async () => {
                    const washTrades = [];
                    
                    // Execute wash trading pattern
                    for (let i = 0; i < 10; i++) {
                        try {
                            const buyResponse = await axios.post(`${this.apiUrl}/v1/trade/execute`, {
                                type: 'BUY',
                                tokenIn: 'GUSDC$Unit$none$none',
                                tokenOut: 'GALA$Unit$none$none',
                                amountIn: '1000',
                                user: 'wash_trader_a'
                            }, {
                                validateStatus: () => true
                            });
                            
                            const sellResponse = await axios.post(`${this.apiUrl}/v1/trade/execute`, {
                                type: 'SELL',
                                tokenIn: 'GALA$Unit$none$none',
                                tokenOut: 'GUSDC$Unit$none$none',
                                amountIn: '1000',
                                user: 'wash_trader_b' // Related entity
                            }, {
                                validateStatus: () => true
                            });
                            
                            washTrades.push({
                                buy: buyResponse.status === 200,
                                sell: sellResponse.status === 200
                            });
                        } catch (error) {
                            washTrades.push({ error: true });
                        }
                    }
                    
                    const successfulWashTrades = washTrades.filter(t => t.buy && t.sell).length;
                    
                    return {
                        vulnerable: successfulWashTrades > 5, // If >5 wash trades executed
                        status: 'wash_trading_test',
                        details: {
                            attemptedWashTrades: 10,
                            successfulWashTrades,
                            detectionTriggered: successfulWashTrades <= 5
                        }
                    };
                }
            },
            {
                name: 'Pump and Dump Scheme',
                test: async () => {
                    try {
                        // Simulate coordinated buying followed by selling
                        const pumpResponse = await axios.post(`${this.apiUrl}/v1/market/manipulation-test`, {
                            pattern: 'PUMP_AND_DUMP',
                            phase: 'PUMP',
                            coordinatedBuyers: [
                                'pump_user_1', 'pump_user_2', 'pump_user_3'
                            ],
                            targetToken: 'GALA$Unit$none$none',
                            volumeIncrease: '1000%',
                            priceTarget: '+50%'
                        }, {
                            validateStatus: () => true
                        });
                        
                        return {
                            vulnerable: pumpResponse.status === 200 && !pumpResponse.data?.manipulationDetected,
                            status: pumpResponse.status,
                            manipulationDetected: pumpResponse.data?.manipulationDetected
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
            'Compliance & Regulatory',
            'Market Manipulation Detection',
            passed,
            vulnerableCount > 0 ? 'HIGH' : 'PASS',
            results,
            passed ? 'Market manipulation detection working correctly' : 'Implement advanced market surveillance and manipulation detection'
        );
    }

    // Main test runner
    async runTests() {
        console.log('\n' + '='.repeat(70));
        console.log('PHASE 8: COMPLIANCE & REGULATORY TESTS');
        console.log('Testing AML/KYC, Jurisdiction Controls, and Regulatory Compliance');
        console.log('='.repeat(70));

        const startTime = Date.now();

        try {
            await this.testAMLKYCBypass();
            await this.testJurisdictionControlBypass();
            await this.testRegulatoryReportingFailures();
            await this.testDataRetentionCompliance();
            await this.testLicenseRegistrationValidation();
            await this.testMarketManipulationDetection();
        } catch (error) {
            console.error('Error during compliance & regulatory testing:', error);
            this.logResult(
                'Compliance & Regulatory',
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
            phase: 'Phase 8 - Compliance & Regulatory',
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
        const filename = `security-Phase-8-ComplianceRegulatory-${timestamp}.json`;
        const filepath = path.join(config.directories.results, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
        console.log(`\nResults saved to: ${filepath}`);
    }

    // Print test summary
    printSummary(summary) {
        console.log('\n' + '='.repeat(70));
        console.log('PHASE 8 SUMMARY');
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
module.exports = ComplianceRegulatoryTester;

// Run standalone if called directly
if (require.main === module) {
    const tester = new ComplianceRegulatoryTester();
    tester.runTests().then(() => {
        console.log('\nPhase 8 Compliance & Regulatory Testing Complete!');
    }).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}