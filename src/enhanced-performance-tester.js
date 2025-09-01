// Enhanced Performance Tester - Completing Phase 4C
const config = require('./config');
const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

class EnhancedPerformanceTester {
    constructor() {
        this.baseURL = config.api.galaSwapUrl || 'https://dex-backend-prod1.defi.gala.com';
        this.metrics = [];
        this.rateLimitDetected = false;
        this.testResults = {
            phase: 'Phase 4C - Performance Testing',
            timestamp: new Date().toISOString(),
            tests: [],
            criticalFindings: []
        };
    }

    async runComprehensiveTests() {
        console.log('🚀 Starting Enhanced Performance & Rate Limit Testing...\n');
        
        // Test 1: Rate Limit Detection (Critical)
        await this.testRateLimiting();
        
        // Test 2: Response Time Baseline
        await this.testResponseTimeBaseline();
        
        // Test 3: Concurrent Load Test
        await this.testConcurrentLoad();
        
        // Test 4: Sustained Load Test
        await this.testSustainedLoad();
        
        // Test 5: Large Payload Performance (Fixed)
        await this.testLargePayloadPerformance();
        
        // Test 6: API Degradation Under Load
        await this.testDegradationUnderLoad();
        
        // Generate comprehensive report
        await this.generateReport();
        
        return this.testResults;
    }

    async testRateLimiting() {
        console.log('🔍 Testing Rate Limiting (CRITICAL)...');
        
        const testResult = {
            name: 'Rate Limit Detection',
            severity: 'CRITICAL',
            status: 'TESTING',
            findings: []
        };

        try {
            // Rapid fire requests to detect rate limiting
            const requests = [];
            const startTime = Date.now();
            
            // Send 100 requests as fast as possible
            for (let i = 0; i < 100; i++) {
                requests.push(
                    axios.get(`${this.baseURL}/v1/trade/price`, {
                        params: { token: 'GALA$Unit$none$none' },
                        timeout: 5000,
                        validateStatus: () => true // Accept any status
                    }).then(response => ({
                        status: response.status,
                        headers: response.headers,
                        timestamp: Date.now()
                    })).catch(error => ({
                        error: error.message,
                        timestamp: Date.now()
                    }))
                );
            }

            const responses = await Promise.all(requests);
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Analyze responses for rate limiting indicators
            const rateLimitIndicators = {
                status429: responses.filter(r => r.status === 429).length,
                status503: responses.filter(r => r.status === 503).length,
                errors: responses.filter(r => r.error).length,
                rateLimitHeaders: responses.filter(r => 
                    r.headers && (
                        r.headers['x-ratelimit-limit'] ||
                        r.headers['x-rate-limit-limit'] ||
                        r.headers['retry-after']
                    )
                ).length
            };

            const totalRequests = responses.length;
            const successfulRequests = responses.filter(r => r.status === 200).length;
            const requestsPerSecond = (totalRequests / (duration / 1000)).toFixed(2);

            if (rateLimitIndicators.status429 > 0 || rateLimitIndicators.rateLimitHeaders > 0) {
                testResult.status = 'PROTECTED';
                testResult.findings.push('✅ Rate limiting detected - API is protected');
            } else if (successfulRequests === totalRequests) {
                testResult.status = 'VULNERABLE';
                testResult.findings.push(`⚠️ NO RATE LIMITING DETECTED - All ${totalRequests} requests succeeded`);
                testResult.findings.push(`📊 Achieved ${requestsPerSecond} requests/second without any throttling`);
                this.rateLimitDetected = false;
                
                // Add to critical findings
                this.testResults.criticalFindings.push({
                    issue: 'No API Rate Limiting',
                    severity: 'CRITICAL',
                    impact: 'API can be overwhelmed with requests, enabling DoS attacks and resource exhaustion',
                    recommendation: 'Implement rate limiting immediately (e.g., 100 requests per minute per IP)',
                    evidence: `Successfully sent ${totalRequests} requests in ${duration}ms without any throttling`
                });
            }

            console.log(`Rate Limit Test: ${testResult.status}`);
            console.log(`Requests: ${successfulRequests}/${totalRequests} successful`);
            console.log(`Rate: ${requestsPerSecond} req/s\n`);

        } catch (error) {
            testResult.status = 'ERROR';
            testResult.findings.push(`Error during test: ${error.message}`);
        }

        this.testResults.tests.push(testResult);
    }

    async testResponseTimeBaseline() {
        console.log('📏 Testing Response Time Baseline...');
        
        const endpoints = [
            { path: '/v1/trade/price', params: { token: 'GALA$Unit$none$none' }, name: 'Price' },
            { path: '/v1/trade/quote', params: { 
                tokenIn: 'GALA$Unit$none$none', 
                tokenOut: 'GUSDC$Unit$none$none', 
                amountIn: '1000', 
                fee: 10000 
            }, name: 'Quote' },
            { path: '/v1/trade/pool', params: { 
                token0: 'GALA$Unit$none$none', 
                token1: 'GUSDC$Unit$none$none', 
                fee: 10000 
            }, name: 'Pool' }
        ];

        const testResult = {
            name: 'Response Time Baseline',
            status: 'PASS',
            metrics: {}
        };

        for (const endpoint of endpoints) {
            const times = [];
            
            for (let i = 0; i < 10; i++) {
                const start = performance.now();
                try {
                    await axios.get(`${this.baseURL}${endpoint.path}`, {
                        params: endpoint.params,
                        timeout: 10000
                    });
                    const duration = performance.now() - start;
                    times.push(duration);
                } catch (error) {
                    console.log(`Error testing ${endpoint.name}: ${error.message}`);
                }
            }

            if (times.length > 0) {
                const avg = times.reduce((a, b) => a + b, 0) / times.length;
                const max = Math.max(...times);
                const min = Math.min(...times);
                
                testResult.metrics[endpoint.name] = {
                    avg: avg.toFixed(2),
                    min: min.toFixed(2),
                    max: max.toFixed(2)
                };

                if (avg > 2000) {
                    testResult.status = 'WARNING';
                    testResult.findings = testResult.findings || [];
                    testResult.findings.push(`${endpoint.name} endpoint slow: ${avg.toFixed(2)}ms average`);
                }
            }
        }

        console.log('Baseline response times collected\n');
        this.testResults.tests.push(testResult);
    }

    async testConcurrentLoad() {
        console.log('🔄 Testing Concurrent Load Handling...');
        
        const concurrencyLevels = [10, 25, 50, 100];
        const testResult = {
            name: 'Concurrent Load Test',
            status: 'PASS',
            metrics: []
        };

        for (const level of concurrencyLevels) {
            const requests = [];
            const start = Date.now();
            
            for (let i = 0; i < level; i++) {
                requests.push(
                    axios.get(`${this.baseURL}/v1/trade/price`, {
                        params: { token: 'GALA$Unit$none$none' },
                        timeout: 10000,
                        validateStatus: () => true
                    }).catch(e => ({ error: e.message }))
                );
            }

            const results = await Promise.all(requests);
            const duration = Date.now() - start;
            const successful = results.filter(r => !r.error && r.status === 200).length;
            const failed = level - successful;
            
            testResult.metrics.push({
                concurrency: level,
                successful,
                failed,
                duration: `${duration}ms`,
                avgResponseTime: `${(duration / level).toFixed(2)}ms`
            });

            if (failed > level * 0.1) { // More than 10% failure
                testResult.status = 'WARNING';
                testResult.findings = testResult.findings || [];
                testResult.findings.push(`High failure rate at ${level} concurrent requests: ${failed} failed`);
            }

            console.log(`Concurrency ${level}: ${successful}/${level} successful in ${duration}ms`);
        }

        console.log('Concurrent load testing complete\n');
        this.testResults.tests.push(testResult);
    }

    async testSustainedLoad() {
        console.log('⏱️ Testing Sustained Load (30 seconds)...');
        
        const testResult = {
            name: 'Sustained Load Test',
            status: 'PASS',
            metrics: {
                duration: '30s',
                totalRequests: 0,
                successful: 0,
                failed: 0,
                avgResponseTime: 0
            }
        };

        const startTime = Date.now();
        const duration = 30000; // 30 seconds
        const responses = [];
        let requestCount = 0;

        while (Date.now() - startTime < duration) {
            const reqStart = Date.now();
            try {
                const response = await axios.get(`${this.baseURL}/v1/trade/price`, {
                    params: { token: 'GALA$Unit$none$none' },
                    timeout: 5000
                });
                
                responses.push({
                    success: true,
                    duration: Date.now() - reqStart,
                    status: response.status
                });
                testResult.metrics.successful++;
            } catch (error) {
                responses.push({
                    success: false,
                    duration: Date.now() - reqStart,
                    error: error.message
                });
                testResult.metrics.failed++;
            }
            
            requestCount++;
            testResult.metrics.totalRequests = requestCount;
            
            // Small delay to avoid overwhelming
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (responses.length > 0) {
            const avgTime = responses.reduce((sum, r) => sum + r.duration, 0) / responses.length;
            testResult.metrics.avgResponseTime = `${avgTime.toFixed(2)}ms`;
            
            const errorRate = (testResult.metrics.failed / testResult.metrics.totalRequests) * 100;
            if (errorRate > 5) {
                testResult.status = 'WARNING';
                testResult.findings = [`Error rate ${errorRate.toFixed(2)}% exceeds 5% threshold`];
            }
        }

        console.log(`Sustained load: ${testResult.metrics.successful}/${testResult.metrics.totalRequests} successful\n`);
        this.testResults.tests.push(testResult);
    }

    async testLargePayloadPerformance() {
        console.log('📦 Testing Large Payload Performance...');
        
        const testResult = {
            name: 'Large Payload Performance',
            status: 'PASS',
            findings: []
        };

        // Test with increasingly large token amounts
        const testAmounts = [
            '1000000000', // 1 billion
            '1000000000000', // 1 trillion
            '1000000000000000', // 1 quadrillion
            '999999999999999999999999' // Near max
        ];

        for (const amount of testAmounts) {
            try {
                const start = performance.now();
                const response = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                    params: {
                        tokenIn: 'GALA$Unit$none$none',
                        tokenOut: 'GUSDC$Unit$none$none',
                        amountIn: amount,
                        fee: 10000
                    },
                    timeout: 10000
                });
                
                const duration = performance.now() - start;
                
                if (duration > 5000) {
                    testResult.status = 'WARNING';
                    testResult.findings.push(`Slow response for amount ${amount}: ${duration.toFixed(2)}ms`);
                }

                // Check for precision issues
                if (response.data && response.data.amountOut) {
                    const outAmount = response.data.amountOut;
                    if (outAmount.includes('e') || outAmount.includes('E')) {
                        testResult.findings.push(`Potential precision issue with amount ${amount}`);
                    }
                }
                
            } catch (error) {
                if (error.response && error.response.status === 413) {
                    testResult.findings.push(`Payload limit reached at amount: ${amount}`);
                } else {
                    testResult.findings.push(`Error with amount ${amount}: ${error.message}`);
                }
            }
        }

        console.log(`Large payload test: ${testResult.status}\n`);
        this.testResults.tests.push(testResult);
    }

    async testDegradationUnderLoad() {
        console.log('📉 Testing Performance Degradation Under Load...');
        
        const testResult = {
            name: 'Performance Degradation Test',
            status: 'PASS',
            metrics: {
                baseline: 0,
                underLoad: 0,
                degradation: 0
            }
        };

        // Get baseline
        const baselineTimes = [];
        for (let i = 0; i < 5; i++) {
            const start = performance.now();
            try {
                await axios.get(`${this.baseURL}/v1/trade/price`, {
                    params: { token: 'GALA$Unit$none$none' },
                    timeout: 5000
                });
                baselineTimes.push(performance.now() - start);
            } catch (error) {
                console.log('Baseline request failed:', error.message);
            }
        }

        if (baselineTimes.length > 0) {
            testResult.metrics.baseline = baselineTimes.reduce((a, b) => a + b, 0) / baselineTimes.length;
        }

        // Create load
        const loadPromises = [];
        for (let i = 0; i < 50; i++) {
            loadPromises.push(
                axios.get(`${this.baseURL}/v1/trade/price`, {
                    params: { token: 'GALA$Unit$none$none' },
                    timeout: 10000,
                    validateStatus: () => true
                }).catch(() => null)
            );
        }

        // Measure under load
        const underLoadTimes = [];
        const loadTest = Promise.all(loadPromises);
        
        for (let i = 0; i < 5; i++) {
            const start = performance.now();
            try {
                await axios.get(`${this.baseURL}/v1/trade/price`, {
                    params: { token: 'GALA$Unit$none$none' },
                    timeout: 5000
                });
                underLoadTimes.push(performance.now() - start);
            } catch (error) {
                console.log('Under-load request failed:', error.message);
            }
        }

        await loadTest; // Wait for load to complete

        if (underLoadTimes.length > 0 && baselineTimes.length > 0) {
            testResult.metrics.underLoad = underLoadTimes.reduce((a, b) => a + b, 0) / underLoadTimes.length;
            testResult.metrics.degradation = ((testResult.metrics.underLoad - testResult.metrics.baseline) / testResult.metrics.baseline * 100).toFixed(2);
            
            if (testResult.metrics.degradation > 200) {
                testResult.status = 'WARNING';
                testResult.findings = [`Performance degraded by ${testResult.metrics.degradation}% under load`];
            }
        }

        console.log(`Degradation test: ${testResult.metrics.degradation}% slower under load\n`);
        this.testResults.tests.push(testResult);
    }

    async generateReport() {
        console.log('📊 Generating Comprehensive Report...\n');
        
        // Calculate summary statistics
        const totalTests = this.testResults.tests.length;
        const passedTests = this.testResults.tests.filter(t => t.status === 'PASS' || t.status === 'PROTECTED').length;
        const warningTests = this.testResults.tests.filter(t => t.status === 'WARNING').length;
        const failedTests = this.testResults.tests.filter(t => t.status === 'VULNERABLE' || t.status === 'ERROR').length;
        
        this.testResults.summary = {
            totalTests,
            passed: passedTests,
            warnings: warningTests,
            failed: failedTests,
            passRate: `${(passedTests / totalTests * 100).toFixed(1)}%`,
            criticalIssues: this.testResults.criticalFindings.length
        };

        // Save to file
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const reportPath = path.join(config.paths.resultsDir, `security-Phase-4C--Performance-${timestamp}.json`);
        await fs.mkdir(config.paths.resultsDir, { recursive: true });

        await fs.writeFile(reportPath, JSON.stringify(this.testResults, null, 2));
        
        console.log('=================================');
        console.log('PERFORMANCE TEST RESULTS SUMMARY');
        console.log('=================================');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`⚠️  Warnings: ${warningTests}`);
        console.log(`❌ Failed: ${failedTests}`);
        console.log(`Pass Rate: ${this.testResults.summary.passRate}`);
        console.log(`🚨 Critical Issues: ${this.testResults.criticalFindings.length}`);
        
        if (this.testResults.criticalFindings.length > 0) {
            console.log('\n🚨 CRITICAL FINDINGS:');
            this.testResults.criticalFindings.forEach((finding, i) => {
                console.log(`\n${i + 1}. ${finding.issue}`);
                console.log(`   Severity: ${finding.severity}`);
                console.log(`   Impact: ${finding.impact}`);
                console.log(`   Recommendation: ${finding.recommendation}`);
            });
        }
        
        console.log(`\nReport saved to: ${reportPath}`);
    }
}

// Run the enhanced tests
async function main() {
    const tester = new EnhancedPerformanceTester();
    const results = await tester.runComprehensiveTests();
    
    // Update monitoring dashboard
    console.log('\nUpdating monitoring dashboard...');
    const monitoringData = {
        timestamp: new Date().toISOString(),
        phase: 'Phase 4C',
        results: results,
        criticalAlerts: results.criticalFindings
    };
    
    // Save for dashboard consumption
    await fs.mkdir(config.paths.resultsDir, { recursive: true });
    await fs.writeFile(
        path.join(config.paths.resultsDir, 'latest-Phase-4C--Performance.json'),

        JSON.stringify(monitoringData, null, 2)
    );
    
    console.log('✅ Dashboard updated with latest results');
    console.log('🌐 View at: http://localhost:3000');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = EnhancedPerformanceTester;