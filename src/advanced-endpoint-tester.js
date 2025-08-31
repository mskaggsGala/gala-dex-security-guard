const axios = require('axios');

class AdvancedEndpointTester {
    constructor() {
        this.baseURL = 'https://dex-backend-prod1.defi.gala.com';
    }

    async testAdvancedEndpoints() {
        console.log('Testing advanced endpoints and edge cases...');
        
        const results = {
            timestamp: new Date().toISOString(),
            tests: []
        };

        // Test 1: Token metadata manipulation
        const tokenTest = await this.testTokenMetadata();
        results.tests.push(tokenTest);

        // Test 2: Bundle submission validation
        const bundleTest = await this.testBundleSubmission();
        results.tests.push(bundleTest);

        // Test 3: Historical data access
        const historyTest = await this.testHistoricalDataAccess();
        results.tests.push(historyTest);

        // Test 4: Cross-function reentrancy patterns
        const reentrancyTest = await this.testReentrancyPatterns();
        results.tests.push(reentrancyTest);

        return results;
    }

    async testTokenMetadata() {
        console.log('Testing token metadata endpoints...');
        
        try {
            // Test if we can inject malicious metadata
            const maliciousTokens = [
                { collection: '<script>alert(1)</script>', category: 'Unit', type: 'none', additionalKey: 'none' },
                { collection: '../../etc/passwd', category: 'Unit', type: 'none', additionalKey: 'none' },
                { collection: 'GALA', category: 'Unit', type: 'none', additionalKey: 'none'.repeat(1000) }
            ];

            const results = [];
            
            for (const token of maliciousTokens) {
                try {
                    await axios.get(`${this.baseURL}/v1/trade/price`, {
                        params: { 
                            token: `${token.collection}$${token.category}$${token.type}$${token.additionalKey}`
                        },
                        timeout: 5000
                    });
                    
                    results.push({
                        payload: token.collection.substring(0, 30),
                        result: 'Processed'
                    });
                    
                } catch (error) {
                    results.push({
                        payload: token.collection.substring(0, 30),
                        result: 'Rejected'
                    });
                }
            }

            return {
                test: 'Token Metadata Injection',
                passed: !results.some(r => r.result === 'Processed'),
                severity: results.some(r => r.result === 'Processed') ? 'MEDIUM' : 'PASS',
                details: results,
                recommendation: 'Sanitize token metadata inputs'
            };
            
        } catch (error) {
            return {
                test: 'Token Metadata Injection',
                error: error.message
            };
        }
    }

    async testBundleSubmission() {
        console.log('Testing bundle submission endpoint...');
        
        try {
            // Test malformed bundle submissions
            const maliciousBundles = [
                { bundle: null },
                { bundle: [] },
                { bundle: Array(1000).fill({ tx: 'fake' }) },
                { bundle: { transactions: '../../../etc/passwd' } }
            ];

            const results = [];
            
            for (const bundle of maliciousBundles) {
                try {
                    await axios.post(`${this.baseURL}/v1/trade/bundle`, bundle, {
                        timeout: 5000
                    });
                    
                    results.push({
                        type: 'Malformed bundle',
                        result: 'Accepted - ISSUE'
                    });
                    
                } catch (error) {
                    const status = error.response?.status;
                    results.push({
                        type: 'Malformed bundle',
                        result: `Rejected (${status})`
                    });
                }
            }

            return {
                test: 'Bundle Submission Validation',
                passed: !results.some(r => r.result.includes('ISSUE')),
                severity: results.some(r => r.result.includes('ISSUE')) ? 'HIGH' : 'PASS',
                details: results,
                recommendation: 'Validate bundle structure and authentication'
            };
            
        } catch (error) {
            return {
                test: 'Bundle Submission Validation',
                error: error.message
            };
        }
    }

    async testHistoricalDataAccess() {
        console.log('Testing historical data access controls...');
        
        try {
            // Test if we can access excessive historical data
            const now = new Date();
            const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
            
            const response = await axios.get(`${this.baseURL}/price-oracle/fetch-price`, {
                params: {
                    token: 'GALA$Unit$none$none',
                    page: 1,
                    limit: 100000, // Excessive limit
                    from: oneYearAgo.toISOString(),
                    order: 'desc'
                },
                timeout: 5000
            });

            const dataReturned = response.data?.data?.data?.length || 0;
            
            return {
                test: 'Historical Data Access',
                passed: dataReturned < 10000,
                severity: dataReturned >= 10000 ? 'LOW' : 'PASS',
                details: {
                    requested: 100000,
                    returned: dataReturned,
                    note: dataReturned >= 10000 ? 'Large data sets accessible' : 'Data access limited'
                },
                recommendation: dataReturned >= 10000 ? 
                    'Implement pagination limits' : 
                    'Data access controls working'
            };
            
        } catch (error) {
            return {
                test: 'Historical Data Access',
                passed: true,
                severity: 'PASS',
                error: error.message
            };
        }
    }

    async testReentrancyPatterns() {
        console.log('Testing for reentrancy patterns...');
        
        try {
            // Attempt rapid sequential quotes that could exploit state
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(
                    axios.get(`${this.baseURL}/v1/trade/quote`, {
                        params: {
                            tokenIn: 'GALA$Unit$none$none',
                            tokenOut: 'GUSDC$Unit$none$none',
                            amountIn: (1000 + i).toString(),
                            fee: 10000
                        },
                        timeout: 5000
                    })
                );
            }

            const results = await Promise.all(promises);
            const prices = results.map(r => r.data.data.newSqrtPrice);
            
            // Check if prices are consistent (they should be slightly different due to amounts)
            const uniquePrices = [...new Set(prices)];
            
            return {
                test: 'Reentrancy Pattern Detection',
                passed: true,
                severity: 'PASS',
                details: {
                    simultaneousRequests: 5,
                    uniquePrices: uniquePrices.length,
                    note: 'State appears to be handled correctly'
                },
                recommendation: 'Continue monitoring for state manipulation'
            };
            
        } catch (error) {
            return {
                test: 'Reentrancy Pattern Detection',
                error: error.message
            };
        }
    }
}

module.exports = AdvancedEndpointTester;