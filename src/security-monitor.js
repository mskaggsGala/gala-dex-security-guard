const SecurityTester = require('./security-tester');
const AttackSimulator = require('./attack-simulator');
const fs = require('fs');
const path = require('path');
const Phase4BMonitor = require('./phase4b-integration');
const Phase4CMonitor = require('./phase4c-integration');
const ChaincodeTester = require('./phase3-chaincode-security');
const TimeBasedTester = require('./phase4-time-based-attacks');
const PermissionedNetworkTester = require('./phase5-permissioned-network');
const ConsensusOrderingTester = require('./phase6-consensus-ordering');
const PrivacyConfidentialityTester = require('./phase7-privacy-confidentiality');
const ComplianceRegulatoryTester = require('./phase8-compliance-regulatory');
const BusinessLogicExploitsTester = require('./phase9-business-logic-exploits');
const ZeroDayAPTTester = require('./phase10-zero-day-apt');




class SecurityMonitor {
    constructor() {
        this.testsRun = 0;
        this.criticalIssues = [];
        this.resultsDir = './security-results';
        
        // Create results directory if it doesn't exist
        if (!fs.existsSync(this.resultsDir)) {
            fs.mkdirSync(this.resultsDir);
        }
    }

    // Save results with timestamp
    saveResults(results) {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const filename = path.join(this.resultsDir, `security-${timestamp}.json`);
        fs.writeFileSync(filename, JSON.stringify(results, null, 2));
        console.log(`Results saved to: ${filename}`);
        return filename;
    }

    // Load historical results for pattern analysis
    loadHistoricalResults(limit = 10) {
        const files = fs.readdirSync(this.resultsDir)
            .filter(f => f.startsWith('security-'))
            .sort()
            .reverse()
            .slice(0, limit);
        
        return files.map(file => {
            const content = fs.readFileSync(path.join(this.resultsDir, file), 'utf8');
            return JSON.parse(content);
        });
    }


    // Update the runBasicTests method to include all three Phase 1 tests

    async runBasicTests() {
        console.log('\n========================================');
        console.log('SECURITY MONITOR - PHASE 1 BASIC TESTS');
        console.log('========================================\n');
        
        const results = {
            timestamp: new Date().toISOString(),
            phase: 'Phase 1 - Critical Infrastructure',
            tests: []
        };

        // Test 1: Rate Limiting (Critical)
        console.log('[1/3] Running Rate Limit Test...');
        const rateLimitResult = await this.testRateLimiting();
        results.tests.push(rateLimitResult);
        
        // Test 2: Liquidity Drain
        console.log('\n[2/3] Running Liquidity Drain Test...');
        const liquidityResult = await this.testLiquidityDrain();
        results.tests.push(liquidityResult);
        
        // Test 3: Precision/Rounding
        console.log('\n[3/3] Running Precision Test...');
        const precisionResult = await this.testPrecisionExploits();
        results.tests.push(precisionResult);
        
        // Track critical issues
        results.tests.forEach(test => {
            if (test.severity === 'CRITICAL' || test.severity === 'HIGH') {
                this.criticalIssues.push(test);
            }
        });

        // Save and return
        this.saveResults(results);
        this.printSummary(results);
        
        return results;
    }


     async runPhase2Tests() {
        console.log('\n========================================');
        console.log('SECURITY MONITOR - PHASE 2 ECONOMIC ATTACKS');
        console.log('========================================\n');
        
        const MEVTester = require('./mev-tester');
        const CrossPoolArbitrage = require('./cross-pool-arbitrage');
        const FlashLoanTester = require('./flash-loan-tester');
        
        const results = {
            timestamp: new Date().toISOString(),
            phase: 'Phase 2 - Economic Attack Vectors',
            tests: []
        };

        // Test 1: MEV Testing
        console.log('[1/3] Running MEV Tests...');
        const mevTester = new MEVTester();
        const mevResults = await mevTester.testMEVVulnerabilities();
        
        results.tests.push({
            test: 'MEV Vulnerabilities',
            timestamp: mevResults.timestamp,
            passed: !mevResults.attacks.some(a => a.vulnerable),
            severity: mevResults.attacks.some(a => a.vulnerable) ? 'HIGH' : 'PASS',
            details: mevResults.attacks,
            recommendation: mevResults.attacks.some(a => a.vulnerable) ? 
                'Implement MEV protection mechanisms' : 
                'DEX appears protected against common MEV attacks'
        });

        // Test 2: Cross-Pool Arbitrage
        console.log('\n[2/3] Running Cross-Pool Arbitrage Tests...');
        const arbTester = new CrossPoolArbitrage();
        const arbResults = await arbTester.testCrossPoolArbitrage();
        
        const hasArbitrage = arbResults.arbitrageOpportunities.some(a => a.profitable);
        results.tests.push({
            test: 'Cross-Pool Arbitrage',
            timestamp: arbResults.timestamp,
            passed: !hasArbitrage,
            severity: hasArbitrage ? 'MEDIUM' : 'PASS',
            details: arbResults.arbitrageOpportunities,
            recommendation: hasArbitrage ? 
                'Price discrepancies detected between pools - review pricing mechanism' : 
                'Pool pricing appears consistent'
        });

        // Test 3: Flash Loan Attacks
        console.log('\n[3/3] Running Flash Loan Attack Tests...');
        const flashTester = new FlashLoanTester();
        const flashResults = await flashTester.testFlashLoanVulnerabilities();
        
        const hasFlashRisk = flashResults.flashLoanRisks.some(r => r.vulnerable);
        results.tests.push({
            test: 'Flash Loan Attacks',
            timestamp: flashResults.timestamp,
            passed: !hasFlashRisk,
            severity: hasFlashRisk ? 'HIGH' : 'PASS',
            details: flashResults.flashLoanRisks,
            recommendation: hasFlashRisk ? 
                'Implement flash loan protection mechanisms' : 
                'DEX appears resistant to flash loan attacks'
        });

        // Save and return
        this.saveResults(results);
        this.printSummary(results);
        
        return results;
    }


    // Add this method to the SecurityMonitor class
    async runPhase4BTests() {
        console.log('\n========================================');
        console.log('SECURITY MONITOR - PHASE 4B EXTENDED SURFACE');
        console.log('========================================\n');
        
        const phase4b = new Phase4BMonitor();
        const phase4bResults = await phase4b.runAllPhase4BTests();
        
        // Convert to standard format for our system
        const results = {
            timestamp: phase4bResults.timestamp,
            phase: 'Phase 4B - Extended Attack Surface',
            tests: phase4bResults.tests.map(test => ({
                test: `${test.category}: ${test.test}`,
                timestamp: new Date().toISOString(),
                passed: test.passed,
                severity: test.severity,
                details: test.details,
                recommendation: test.recommendation
            }))
        };
        
        // Save in standard format
        this.saveResults(results);
        this.printSummary(results);
        
        return results;
    }


    // Phase 3: Chaincode Security Tests
    async runPhase3Tests() {
        console.log('\n========================================');
        console.log('SECURITY MONITOR - PHASE 3 CHAINCODE SECURITY');
        console.log('========================================');

        const chaincodeTester = new ChaincodeTester();
        const results = await chaincodeTester.runTests();
        
        this.saveResults(results);
        this.printSummary(results);
        
        return results;
    }

    // Add method to SecurityMonitor class
    async runPhase4CTests() {
        const phase4c = new Phase4CMonitor();
        const results = await phase4c.runPhase4CTests();
        
        // Convert to standard format
        const standardResults = {
            timestamp: results.timestamp,
            phase: results.phase,
            tests: results.tests
        };
        
        this.saveResults(standardResults);
        this.printSummary(standardResults);
        
        return standardResults;
    }

    // Phase 4A: Time-Based Attack Tests  
    async runPhase4ATests() {
        console.log('\n========================================');
        console.log('SECURITY MONITOR - PHASE 4A TIME-BASED ATTACKS');
        console.log('========================================');

        const timeBasedTester = new TimeBasedTester();
        const results = await timeBasedTester.runTests();
        
        this.saveResults(results);
        this.printSummary(results);
        
        return results;
    }

    // Phase 5: Permissioned Network Attack Tests
    async runPhase5Tests() {
        console.log('\n========================================');
        console.log('SECURITY MONITOR - PHASE 5 PERMISSIONED NETWORK ATTACKS');
        console.log('========================================');

        const permissionedNetworkTester = new PermissionedNetworkTester();
        const results = await permissionedNetworkTester.runTests();
        
        this.saveResults(results);
        this.printSummary(results);
        
        return results;
    }

    // Phase 6: Consensus & Ordering Service Tests
    async runPhase6Tests() {
        console.log('\n========================================');
        console.log('SECURITY MONITOR - PHASE 6 CONSENSUS & ORDERING');
        console.log('========================================');

        const consensusOrderingTester = new ConsensusOrderingTester();
        const results = await consensusOrderingTester.runTests();
        
        this.saveResults(results);
        this.printSummary(results);
        
        return results;
    }

    // Phase 7: Privacy & Confidentiality Tests
    async runPhase7Tests() {
        console.log('\n========================================');
        console.log('SECURITY MONITOR - PHASE 7 PRIVACY & CONFIDENTIALITY');
        console.log('========================================');

        const privacyConfidentialityTester = new PrivacyConfidentialityTester();
        const results = await privacyConfidentialityTester.runTests();
        
        this.saveResults(results);
        this.printSummary(results);
        
        return results;
    }

    // Phase 8: Compliance & Regulatory Tests
    async runPhase8Tests() {
        console.log('\n========================================');
        console.log('SECURITY MONITOR - PHASE 8 COMPLIANCE & REGULATORY');
        console.log('========================================');

        const complianceRegulatoryTester = new ComplianceRegulatoryTester();
        const results = await complianceRegulatoryTester.runTests();
        
        this.saveResults(results);
        this.printSummary(results);
        
        return results;
    }

    // Phase 9: Business Logic Exploits Tests
    async runPhase9Tests() {
        console.log('\n========================================');
        console.log('SECURITY MONITOR - PHASE 9 BUSINESS LOGIC EXPLOITS');
        console.log('========================================');

        const businessLogicExploitsTester = new BusinessLogicExploitsTester();
        const results = await businessLogicExploitsTester.runTests();
        
        this.saveResults(results);
        this.printSummary(results);
        
        return results;
    }

    // Phase 10: Zero-Day & Advanced Persistent Threats Tests
    async runPhase10Tests() {
        console.log('\n========================================');
        console.log('SECURITY MONITOR - PHASE 10 ZERO-DAY & APT');
        console.log('========================================');

        const zeroDayAPTTester = new ZeroDayAPTTester();
        const results = await zeroDayAPTTester.runTests();
        
        this.saveResults(results);
        this.printSummary(results);
        
        return results;
    }



    // Rate limiting test
    async testRateLimiting() {
        const axios = require('axios');
        const baseURL = 'https://dex-backend-prod1.defi.gala.com';
        
        const startTime = Date.now();
        const requests = [];
        
        // Send 50 requests as fast as possible
        for (let i = 0; i < 50; i++) {
            requests.push(
                axios.get(`${baseURL}/v1/trade/price`, {
                    params: { token: 'GALA$Unit$none$none' },
                    timeout: 5000
                }).then(() => ({ success: true }))
                  .catch(err => ({ 
                      success: false, 
                      status: err.response?.status 
                  }))
            );
        }
        
        const results = await Promise.all(requests);
        const duration = Date.now() - startTime;
        
        const successful = results.filter(r => r.success).length;
        const rateLimited = results.filter(r => r.status === 429).length;
        
        return {
            test: 'Rate Limiting',
            timestamp: new Date().toISOString(),
            passed: rateLimited > 0,
            severity: rateLimited === 0 ? 'CRITICAL' : 'PASS',
            details: {
                requestsSent: 50,
                successful,
                rateLimited,
                duration: `${duration}ms`,
                requestsPerSecond: Math.round((50 / duration) * 1000)
            },
            recommendation: rateLimited === 0 ? 
                'URGENT: Implement rate limiting immediately' : 
                'Rate limiting is active'
        };
    }


    // Add this method to the SecurityMonitor class

    // Liquidity drain test
    async testLiquidityDrain() {
        const axios = require('axios');
        const baseURL = 'https://dex-backend-prod1.defi.gala.com';
        
        console.log('Testing liquidity drain vulnerability...');
        
        // Test progressively larger trades to see pool impact
        const testAmounts = [
            '1000',      // Small
            '10000',     // Medium
            '100000',    // Large
            '1000000',   // Very large
            '10000000'   // Extreme
        ];
        
        const results = [];
        let previousPrice = null;
        
        for (const amount of testAmounts) {
            try {
                const response = await axios.get(`${baseURL}/v1/trade/quote`, {
                    params: {
                        tokenIn: 'GALA$Unit$none$none',
                        tokenOut: 'GUSDC$Unit$none$none',
                        amountIn: amount,
                        fee: 10000
                    },
                    timeout: 5000
                });
                
                const data = response.data.data;
                const rate = parseFloat(data.amountOut) / parseFloat(amount);
                const priceImpact = previousPrice ? 
                    ((previousPrice - rate) / previousPrice * 100) : 0;
                
                results.push({
                    amount,
                    rate,
                    priceImpact: priceImpact.toFixed(2) + '%',
                    newSqrtPrice: data.newSqrtPrice
                });
                
                previousPrice = rate;
                
            } catch (error) {
                results.push({
                    amount,
                    error: error.response?.data?.message || error.message
                });
            }
        }
        
        // Check if large trades cause concerning price impact
        const lastResult = results[results.length - 1];
        const hasExcessiveImpact = results.some(r => 
            r.priceImpact && Math.abs(parseFloat(r.priceImpact)) > 10
        );
        
        return {
            test: 'Liquidity Drain',
            timestamp: new Date().toISOString(),
            passed: !hasExcessiveImpact,
            severity: hasExcessiveImpact ? 'HIGH' : 'PASS',
            details: {
                tradeTests: results,
                maxImpact: Math.max(...results.map(r => 
                    Math.abs(parseFloat(r.priceImpact || 0))
                )).toFixed(2) + '%'
            },
            recommendation: hasExcessiveImpact ? 
                'Large trades cause excessive price impact - implement trade size limits' : 
                'Pool liquidity handles large trades appropriately'
        };
    }


    // Add this method to the SecurityMonitor class

    // Precision and rounding error test
    async testPrecisionExploits() {
        const axios = require('axios');
        const baseURL = 'https://dex-backend-prod1.defi.gala.com';
        
        console.log('Testing precision/rounding vulnerabilities...');
        
        // Test amounts designed to trigger rounding issues
        const testCases = [
            { amount: '0.000000000000000001', description: 'Minimum precision' },
            { amount: '0.999999999999999999', description: 'Just under 1' },
            { amount: '1.000000000000000001', description: 'Just over 1' },
            { amount: '333.333333333333333333', description: 'Repeating decimal' },
            { amount: '0.1', description: 'Known binary precision issue' },
            { amount: '0.2', description: 'Known binary precision issue' },
            { amount: '0.3', description: 'Known binary precision issue' },
            { amount: '1000000.000000000001', description: 'Large with dust' }
        ];
        
        const issues = [];
        
        for (const testCase of testCases) {
            try {
                // Test forward swap
                const forward = await axios.get(`${baseURL}/v1/trade/quote`, {
                    params: {
                        tokenIn: 'GALA$Unit$none$none',
                        tokenOut: 'GUSDC$Unit$none$none',
                        amountIn: testCase.amount,
                        fee: 10000
                    },
                    timeout: 5000
                });
                
                const amountOut = forward.data.data.amountOut;
                
                // Test reverse swap with the output
                const reverse = await axios.get(`${baseURL}/v1/trade/quote`, {
                    params: {
                        tokenIn: 'GUSDC$Unit$none$none',
                        tokenOut: 'GALA$Unit$none$none',
                        amountIn: amountOut,
                        fee: 10000
                    },
                    timeout: 5000
                });
                
                const finalAmount = reverse.data.data.amountOut;
                const originalAmount = parseFloat(testCase.amount);
                const returnedAmount = parseFloat(finalAmount);
                
                // Check for precision loss
                const loss = originalAmount - returnedAmount;
                const lossPercent = (loss / originalAmount) * 100;
                
                // Accounting for fees (2% total for round trip with 1% fee pools)
                const acceptableLoss = originalAmount * 0.025; // 2.5% threshold
                
                if (Math.abs(loss) > acceptableLoss && originalAmount > 0.001) {
                    issues.push({
                        test: testCase.description,
                        input: testCase.amount,
                        returned: finalAmount,
                        loss: loss.toFixed(10),
                        lossPercent: lossPercent.toFixed(2) + '%'
                    });
                }
                
            } catch (error) {
                // Some amounts might be rejected, which is actually good
                if (error.response?.status === 400) {
                    // Properly rejected - this is good
                } else {
                    issues.push({
                        test: testCase.description,
                        error: error.message
                    });
                }
            }
            
            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return {
            test: 'Precision/Rounding',
            timestamp: new Date().toISOString(),
            passed: issues.length === 0,
            severity: issues.length > 2 ? 'MEDIUM' : (issues.length > 0 ? 'LOW' : 'PASS'),
            details: {
                testCases: testCases.length,
                issuesFound: issues.length,
                issues: issues
            },
            recommendation: issues.length > 0 ? 
                'Review decimal precision handling in swap calculations' : 
                'Precision handling appears robust'
        };
    }


 

    // Print summary
    printSummary(results) {
        console.log('\n=== TEST SUMMARY ===');
        console.log(`Timestamp: ${results.timestamp}`);
        console.log(`Tests Run: ${results.tests.length}`);
        
        const critical = results.tests.filter(t => t.severity === 'CRITICAL').length;
        const passed = results.tests.filter(t => t.passed).length;
        
        console.log(`Passed: ${passed}/${results.tests.length}`);
        console.log(`Critical Issues: ${critical}`);
        
        if (critical > 0) {
            console.log('\n⚠️  CRITICAL ISSUES DETECTED:');
            results.tests
                .filter(t => t.severity === 'CRITICAL')
                .forEach(t => {
                    const testName = t.test || t.name || 'Unknown Test';
                    const recommendation = t.recommendation || 'Review and fix';
                    console.log(`  - ${testName}: ${recommendation}`);
                });
        }
    }

}


// Run if called directly
if (require.main === module) {
    const monitor = new SecurityMonitor();
    monitor.runBasicTests().catch(console.error);
}

module.exports = SecurityMonitor;