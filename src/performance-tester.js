const axios = require('axios');
const { performance } = require('perf_hooks');

class PerformanceTester {
    constructor() {
        this.baseURL = 'https://dex-backend-prod1.defi.gala.com';
        this.metrics = [];
    }

    async runPerformanceTests() {
        console.log('Starting Performance & Load Testing...\n');
        
        const results = {
            timestamp: new Date().toISOString(),
            phase: 'Phase 4C - Performance Testing',
            tests: []
        };

        // Test 1: Response Time Baseline
        const baselineTest = await this.testResponseTimeBaseline();
        results.tests.push(baselineTest);

        // Test 2: Concurrent Load Test
        const loadTest = await this.testConcurrentLoad();
        results.tests.push(loadTest);

        // Test 3: Sustained Load Test
        const sustainedTest = await this.testSustainedLoad();
        results.tests.push(sustainedTest);

        // Test 4: Large Payload Performance
        const payloadTest = await this.testLargePayloads();
        results.tests.push(payloadTest);

        // Test 5: API Degradation Under Load
        const degradationTest = await this.testDegradation();
        results.tests.push(degradationTest);

        return results;
    }

    async testResponseTimeBaseline() {
        console.log('Testing baseline response times...');
        
        const endpoints = [
            { path: '/v1/trade/price', params: { token: 'GALA$Unit$none$none' }, name: 'Price' },
            { path: '/v1/trade/quote', params: { tokenIn: 'GALA$Unit$none$none', tokenOut: 'GUSDC$Unit$none$none', amountIn: '1000', fee: 10000 }, name: 'Quote' },
            { path: '/v1/trade/pool', params: { token0: 'GALA$Unit$none$none', token1: 'GUSDC$Unit$none$none', fee: 10000 }, name: 'Pool' }
        ];

        const timings = [];

        for (const endpoint of endpoints) {
            const times = [];
            
            // Test each endpoint 10 times
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
                    times.push(-1); // Mark failed requests
                }
                
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const validTimes = times.filter(t => t > 0);
            const avg = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
            const max = Math.max(...validTimes);
            const min = Math.min(...validTimes);

            timings.push({
                endpoint: endpoint.name,
                avgMs: avg.toFixed(2),
                minMs: min.toFixed(2),
                maxMs: max.toFixed(2),
                failures: times.filter(t => t === -1).length
            });
        }

        return {
            test: 'Response Time Baseline',
            passed: timings.every(t => parseFloat(t.avgMs) < 1000),
            severity: timings.some(t => parseFloat(t.avgMs) > 1000) ? 'MEDIUM' : 'PASS',
            details: timings,
            recommendation: timings.some(t => parseFloat(t.avgMs) > 1000) ? 
                'Some endpoints exceed 1 second response time' : 
                'Response times acceptable'
        };
    }

    async testConcurrentLoad() {
        console.log('Testing concurrent load handling...');
        
        const concurrentRequests = [10, 25, 50];
        const results = [];

        for (const concurrent of concurrentRequests) {
            const start = performance.now();
            const promises = [];
            
            for (let i = 0; i < concurrent; i++) {
                promises.push(
                    axios.get(`${this.baseURL}/v1/trade/price`, {
                        params: { token: 'GALA$Unit$none$none' },
                        timeout: 10000
                    }).then(() => ({ success: true }))
                      .catch(() => ({ success: false }))
                );
            }

            const responses = await Promise.all(promises);
            const duration = performance.now() - start;
            const successful = responses.filter(r => r.success).length;

            results.push({
                concurrent,
                successful,
                failed: concurrent - successful,
                totalTimeMs: duration.toFixed(2),
                avgTimeMs: (duration / concurrent).toFixed(2)
            });
        }

        return {
            test: 'Concurrent Load Handling',
            passed: results.every(r => r.successful === r.concurrent),
            severity: results.some(r => r.failed > 0) ? 'HIGH' : 'PASS',
            details: results,
            recommendation: results.some(r => r.failed > 0) ?
                'API drops requests under concurrent load' :
                'Handles concurrent load well'
        };
    }

    async testSustainedLoad() {
        console.log('Testing sustained load performance...');
        
        const duration = 30000; // 30 seconds
        const requestsPerSecond = 5;
        const start = performance.now();
        let successCount = 0;
        let failCount = 0;
        const responseTimes = [];

        const endTime = Date.now() + duration;
        
        while (Date.now() < endTime) {
            const requestStart = performance.now();
            
            try {
                await axios.get(`${this.baseURL}/v1/trade/price`, {
                    params: { token: 'GALA$Unit$none$none' },
                    timeout: 5000
                });
                successCount++;
                responseTimes.push(performance.now() - requestStart);
            } catch (error) {
                failCount++;
            }
            
            // Wait to maintain rate
            await new Promise(resolve => setTimeout(resolve, 1000 / requestsPerSecond));
        }

        const totalTime = performance.now() - start;
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

        return {
            test: 'Sustained Load Performance',
            passed: failCount === 0 && avgResponseTime < 500,
            severity: failCount > 0 ? 'MEDIUM' : (avgResponseTime > 500 ? 'LOW' : 'PASS'),
            details: {
                durationMs: totalTime.toFixed(2),
                totalRequests: successCount + failCount,
                successful: successCount,
                failed: failCount,
                avgResponseMs: avgResponseTime.toFixed(2),
                requestsPerSecond: ((successCount + failCount) / (totalTime / 1000)).toFixed(2)
            },
            recommendation: failCount > 0 ? 
                'API fails under sustained load' : 
                'Handles sustained load acceptably'
        };
    }

    async testLargePayloads() {
        console.log('Testing large payload handling...');
        
        const payloadSizes = [
            { size: 100, description: 'Small batch' },
            { size: 1000, description: 'Medium batch' },
            { size: 10000, description: 'Large batch' }
        ];

        const results = [];

        for (const payload of payloadSizes) {
            const tokens = Array(payload.size).fill('GALA$Unit$none$none');
            const start = performance.now();
            
            try {
                await axios.post(`${this.baseURL}/v1/trade/price-multiple`, {
                    tokens
                }, {
                    timeout: 30000
                });
                
                const duration = performance.now() - start;
                results.push({
                    size: payload.size,
                    description: payload.description,
                    timeMs: duration.toFixed(2),
                    status: 'Success'
                });
                
            } catch (error) {
                results.push({
                    size: payload.size,
                    description: payload.description,
                    status: `Failed: ${error.response?.status || error.message}`
                });
            }
        }

        return {
            test: 'Large Payload Performance',
            passed: results.every(r => r.status === 'Success'),
            severity: results.some(r => r.status !== 'Success') ? 'MEDIUM' : 'PASS',
            details: results,
            recommendation: 'Monitor payload size limits and processing time'
        };
    }

    async testDegradation() {
        console.log('Testing performance degradation patterns...');
        
        const phases = [];
        
        // Test in 3 phases with increasing load
        for (let phase = 1; phase <= 3; phase++) {
            const concurrent = phase * 10;
            const times = [];
            
            for (let i = 0; i < 5; i++) {
                const start = performance.now();
                const promises = Array(concurrent).fill(null).map(() =>
                    axios.get(`${this.baseURL}/v1/trade/price`, {
                        params: { token: 'GALA$Unit$none$none' },
                        timeout: 10000
                    }).catch(() => null)
                );
                
                await Promise.all(promises);
                times.push(performance.now() - start);
                
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            phases.push({
                phase,
                concurrent,
                avgTimeMs: avgTime.toFixed(2)
            });
        }

        // Check if response time increases linearly or exponentially
        const degradationRate = (parseFloat(phases[2].avgTimeMs) - parseFloat(phases[0].avgTimeMs)) / parseFloat(phases[0].avgTimeMs);

        return {
            test: 'Performance Degradation',
            passed: degradationRate < 2, // Less than 200% degradation
            severity: degradationRate > 2 ? 'HIGH' : (degradationRate > 1 ? 'MEDIUM' : 'PASS'),
            details: {
                phases,
                degradationPercent: (degradationRate * 100).toFixed(2) + '%'
            },
            recommendation: degradationRate > 1 ?
                'Performance degrades significantly under load' :
                'Performance scales acceptably'
        };
    }
}

module.exports = PerformanceTester;
