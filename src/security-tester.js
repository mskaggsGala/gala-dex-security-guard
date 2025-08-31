const GalaSwapConnector = require('./galaswap-connection');
const fs = require('fs');

class SecurityTester {
    constructor() {
        this.connector = new GalaSwapConnector({});
        this.testResults = [];
        this.criticalIssues = [];
    }

    // Log test results
    logResult(test, result, severity = 'info') {
        const entry = {
            timestamp: new Date().toISOString(),
            test,
            result,
            severity
        };
        
        this.testResults.push(entry);
        
        if (severity === 'critical' || severity === 'high') {
            this.criticalIssues.push(entry);
        }
        
        console.log(`[${severity.toUpperCase()}] ${test}: ${result}`);
    }

    // Test 1: Input Validation Boundaries
    async testInputValidation() {
        console.log('\n=== Testing Input Validation ===\n');
        
        const testCases = [
            { amount: '0', description: 'Zero amount' },
            { amount: '-100', description: 'Negative amount' },
            { amount: '0.000000000000000001', description: 'Dust amount' },
            { amount: '999999999999999999999', description: 'Extremely large amount' },
            { amount: 'NaN', description: 'Not a number' },
            { amount: 'null', description: 'Null value' },
            { amount: '1e308', description: 'Scientific notation overflow' },
            { amount: '0x1234', description: 'Hex value' },
            { amount: '../etc/passwd', description: 'Path traversal attempt' },
            { amount: '1; DROP TABLE pools;', description: 'SQL injection attempt' }
        ];

        for (const testCase of testCases) {
            try {
                console.log(`Testing: ${testCase.description} (${testCase.amount})`);
                
                const response = await this.connector.axios.get('/v1/trade/quote', {
                    params: {
                        tokenIn: 'GALA$Unit$none$none',
                        tokenOut: 'GUSDC$Unit$none$none',
                        amountIn: testCase.amount,
                        fee: 10000
                    }
                });
                
                this.logResult(
                    `Input validation - ${testCase.description}`,
                    `Accepted value: ${testCase.amount}, Response: ${response.status}`,
                    'medium'
                );
                
            } catch (error) {
                const status = error.response?.status || 'network error';
                const message = error.response?.data?.message || error.message;
                
                // Check if proper validation is happening
                if (status === 400) {
                    this.logResult(
                        `Input validation - ${testCase.description}`,
                        `Properly rejected with 400`,
                        'info'
                    );
                } else {
                    this.logResult(
                        `Input validation - ${testCase.description}`,
                        `Unexpected response: ${status} - ${message}`,
                        'high'
                    );
                }
            }
            
            // Rate limit protection
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // Test 2: Rate Limiting
    async testRateLimiting() {
        console.log('\n=== Testing Rate Limiting ===\n');
        
        const requests = [];
        const startTime = Date.now();
        
        // Fire 100 requests rapidly
        for (let i = 0; i < 100; i++) {
            requests.push(
                this.connector.axios.get('/v1/trade/price', {
                    params: { token: 'GALA$Unit$none$none' }
                }).catch(err => ({ error: err, index: i }))
            );
        }
        
        const results = await Promise.all(requests);
        const endTime = Date.now();
        
        const successful = results.filter(r => !r.error).length;
        const rateLimited = results.filter(r => r.error?.response?.status === 429).length;
        const errors = results.filter(r => r.error && r.error.response?.status !== 429).length;
        
        this.logResult(
            'Rate limiting test',
            `100 requests in ${endTime - startTime}ms: ${successful} success, ${rateLimited} rate limited, ${errors} errors`,
            rateLimited > 0 ? 'info' : 'high'
        );
        
        if (rateLimited === 0) {
            this.logResult(
                'Rate limiting',
                'No rate limiting detected - vulnerable to DoS attacks',
                'critical'
            );
        }
    }

    // Test 3: Token/Pool Manipulation
    async testPoolManipulation() {
        console.log('\n=== Testing Pool Manipulation Vectors ===\n');
        
        // Test non-existent tokens
        const fakeTokens = [
            'FAKE$Unit$none$none',
            'GALA$Unit$none$../../',
            'GALA$Unit$<script>alert(1)</script>$none',
            'GALA$Unit$none$none; DROP TABLE;',
            'GALA$Unit$' + 'A'.repeat(1000) + '$none'
        ];
        
        for (const token of fakeTokens) {
            try {
                const response = await this.connector.axios.get('/v1/trade/price', {
                    params: { token }
                });
                
                this.logResult(
                    'Token validation',
                    `Accepted invalid token: ${token.substring(0, 50)}...`,
                    'high'
                );
                
            } catch (error) {
                const status = error.response?.status;
                
                if (status === 400 || status === 404) {
                    this.logResult(
                        'Token validation',
                        `Properly rejected invalid token`,
                        'info'
                    );
                } else {
                    this.logResult(
                        'Token validation',
                        `Unexpected error for invalid token: ${status}`,
                        'medium'
                    );
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // Test 4: Slippage and MEV Attack Vectors
    async testSlippageManipulation() {
        console.log('\n=== Testing Slippage/MEV Vulnerabilities ===\n');
        
        // Get baseline quote
        try {
            const baseline = await this.connector.axios.get('/v1/trade/quote', {
                params: {
                    tokenIn: 'GALA$Unit$none$none',
                    tokenOut: 'GUSDC$Unit$none$none',
                    amountIn: '1000',
                    fee: 10000
                }
            });
            
            // Test extreme slippage parameters
            const slippageTests = [
                { sqrtPriceLimit: '0', description: 'Zero price limit' },
                { sqrtPriceLimit: '999999999999', description: 'Extreme price limit' },
                { amountOutMinimum: '-1000', description: 'Negative minimum' },
                { amountOutMinimum: '999999999', description: 'Impossible minimum' }
            ];
            
            for (const test of slippageTests) {
                console.log(`Testing: ${test.description}`);
                // Would need swap endpoint to fully test
                this.logResult(
                    'Slippage protection',
                    `Test case: ${test.description} - Needs swap endpoint`,
                    'info'
                );
            }
            
        } catch (error) {
            this.logResult(
                'Slippage testing',
                `Could not establish baseline: ${error.message}`,
                'medium'
            );
        }
    }

    // Test 5: Concurrent Operation Testing
    async testConcurrency() {
        console.log('\n=== Testing Concurrency Issues ===\n');
        
        // Try to get same quote simultaneously
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(
                this.connector.axios.get('/v1/trade/quote', {
                    params: {
                        tokenIn: 'GALA$Unit$none$none',
                        tokenOut: 'GUSDC$Unit$none$none',
                        amountIn: '1000',
                        fee: 10000
                    }
                })
            );
        }
        
        try {
            const results = await Promise.all(promises);
            const prices = results.map(r => r.data.data.amountOut);
            const uniquePrices = [...new Set(prices)];
            
            if (uniquePrices.length > 1) {
                this.logResult(
                    'Concurrency test',
                    `Inconsistent quotes in parallel requests: ${uniquePrices.join(', ')}`,
                    'medium'
                );
            } else {
                this.logResult(
                    'Concurrency test',
                    'Consistent quotes in parallel requests',
                    'info'
                );
            }
        } catch (error) {
            this.logResult(
                'Concurrency test',
                `Failed with error: ${error.message}`,
                'high'
            );
        }
    }

    // Test 6: Error Response Information Leakage
    async testErrorLeakage() {
        console.log('\n=== Testing Error Information Leakage ===\n');
        
        const probes = [
            '/v1/trade/../../../etc/passwd',
            '/v1/admin/pools',
            '/v1/trade/quote?test=<script>alert(1)</script>',
            '/v1/trade/quote?tokenIn=SELECT * FROM pools'
        ];
        
        for (const probe of probes) {
            try {
                await this.connector.axios.get(probe);
            } catch (error) {
                const response = error.response?.data;
                
                // Check for sensitive information in errors
                if (response) {
                    const sensitivePatterns = [
                        /\/home\//i,
                        /\/usr\//i,
                        /stack trace/i,
                        /at \w+\s*\(/i,
                        /sql/i,
                        /database/i,
                        /table/i,
                        /column/i,
                        /internal server/i
                    ];
                    
                    const responseStr = JSON.stringify(response);
                    const leaks = sensitivePatterns.filter(pattern => 
                        pattern.test(responseStr)
                    );
                    
                    if (leaks.length > 0) {
                        this.logResult(
                            'Information leakage',
                            `Error reveals sensitive info: ${leaks.length} patterns found`,
                            'high'
                        );
                    }
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // Generate report
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            totalTests: this.testResults.length,
            criticalIssues: this.criticalIssues.length,
            results: this.testResults,
            summary: {
                critical: this.testResults.filter(r => r.severity === 'critical').length,
                high: this.testResults.filter(r => r.severity === 'high').length,
                medium: this.testResults.filter(r => r.severity === 'medium').length,
                info: this.testResults.filter(r => r.severity === 'info').length
            }
        };
        
        fs.writeFileSync(
            `security-test-${Date.now()}.json`,
            JSON.stringify(report, null, 2)
        );
        
        console.log('\n=== Security Test Summary ===');
        console.log(`Total Tests: ${report.totalTests}`);
        console.log(`Critical Issues: ${report.summary.critical}`);
        console.log(`High Severity: ${report.summary.high}`);
        console.log(`Medium Severity: ${report.summary.medium}`);
        console.log(`Info: ${report.summary.info}`);
        
        if (this.criticalIssues.length > 0) {
            console.log('\n⚠️  CRITICAL ISSUES FOUND:');
            this.criticalIssues.forEach(issue => {
                console.log(`  - ${issue.test}: ${issue.result}`);
            });
        }
        
        return report;
    }

    // Run all tests
    async runAllTests() {
        console.log('Starting GalaSwap Security Testing Suite...\n');
        
        await this.testInputValidation();
        await this.testRateLimiting();
        await this.testPoolManipulation();
        await this.testSlippageManipulation();
        await this.testConcurrency();
        await this.testErrorLeakage();
        
        return this.generateReport();
    }
}

// Run tests
async function main() {
    const tester = new SecurityTester();
    await tester.runAllTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SecurityTester;
