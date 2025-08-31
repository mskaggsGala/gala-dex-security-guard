const axios = require('axios');
const WebSocket = require('ws');

class ExtendedSecurityTester {
    constructor() {
        this.baseURL = 'https://dex-backend-prod1.defi.gala.com';
        this.wsURL = 'wss://bundle-backend-prod1.defi.gala.com';
    }

    async testExtendedSurface() {
        console.log('Testing extended attack surface...');
        
        const results = {
            timestamp: new Date().toISOString(),
            tests: []
        };

        // Test 1: Pool creation validation
        const poolTest = await this.testPoolCreation();
        results.tests.push(poolTest);

        // Test 2: Liquidity provision endpoints
        const liquidityTest = await this.testLiquidityEndpoints();
        results.tests.push(liquidityTest);

        // Test 3: WebSocket DoS potential
        const wsTest = await this.testWebSocketDoS();
        results.tests.push(wsTest);

        // Test 4: Transaction status enumeration
        const txTest = await this.testTransactionEnumeration();
        results.tests.push(txTest);

        // Test 5: Price oracle manipulation
        const oracleTest = await this.testPriceOracle();
        results.tests.push(oracleTest);

        return results;
    }

    async testPoolCreation() {
        console.log('Testing pool creation validation...');
        
        const maliciousPoolParams = [
            {
                token0: { collection: 'FAKE', category: 'Unit', type: 'none', additionalKey: 'none' },
                token1: { collection: 'FAKE2', category: 'Unit', type: 'none', additionalKey: 'none' },
                initialSqrtPrice: '0',
                fee: 3000
            },
            {
                token0: { collection: 'GALA', category: 'Unit', type: 'none', additionalKey: 'none' },
                token1: { collection: 'GALA', category: 'Unit', type: 'none', additionalKey: 'none' },
                initialSqrtPrice: '1',
                fee: 3000
            },
            {
                token0: { collection: 'GALA', category: 'Unit', type: 'none', additionalKey: 'none' },
                token1: { collection: 'GUSDC', category: 'Unit', type: 'none', additionalKey: 'none' },
                initialSqrtPrice: '-1',
                fee: 3000
            }
        ];

        const results = [];
        
        for (const params of maliciousPoolParams) {
            try {
                await axios.post(`${this.baseURL}/v1/trade/create-pool`, params, {
                    timeout: 5000
                });
                
                results.push({
                    test: 'Pool with fake tokens',
                    result: 'Accepted - VULNERABILITY'
                });
                
            } catch (error) {
                if (error.response?.status === 400 || error.response?.status === 401) {
                    results.push({
                        test: `Pool validation`,
                        result: 'Properly rejected'
                    });
                }
            }
        }

        return {
            test: 'Pool Creation Security',
            passed: !results.some(r => r.result.includes('VULNERABILITY')),
            severity: results.some(r => r.result.includes('VULNERABILITY')) ? 'HIGH' : 'PASS',
            details: results,
            recommendation: 'Pool creation requires authentication and validation'
        };
    }

    async testLiquidityEndpoints() {
        console.log('Testing liquidity provision endpoints...');
        
        try {
            // Test add liquidity estimate with edge cases
            const edgeCases = [
                { amount: '0', description: 'Zero liquidity' },
                { amount: '999999999999999999999999', description: 'Massive liquidity' },
                { tickLower: -887272, tickUpper: -887273, description: 'Invalid tick range' }
            ];

            const results = [];
            
            for (const testCase of edgeCases) {
                try {
                    await axios.get(`${this.baseURL}/v1/trade/add-liq-estimate`, {
                        params: {
                            token0: 'GALA$Unit$none$none',
                            token1: 'GUSDC$Unit$none$none',
                            amount: testCase.amount || '1000',
                            tickLower: testCase.tickLower || -887220,
                            tickUpper: testCase.tickUpper || 887220,
                            isToken0: true,
                            fee: 10000
                        },
                        timeout: 5000
                    });
                    
                    results.push({
                        case: testCase.description,
                        result: 'Accepted'
                    });
                    
                } catch (error) {
                    results.push({
                        case: testCase.description,
                        result: 'Rejected'
                    });
                }
            }

            return {
                test: 'Liquidity Provision Security',
                passed: true,
                severity: 'PASS',
                details: results,
                recommendation: 'Monitor for unusual liquidity patterns'
            };
            
        } catch (error) {
            return {
                test: 'Liquidity Provision Security',
                error: error.message
            };
        }
    }

    async testWebSocketDoS() {
        console.log('Testing WebSocket DoS potential...');
        
        return new Promise((resolve) => {
            const connections = [];
            const maxConnections = 10; // Test with limited connections
            let successfulConnections = 0;
            let failedConnections = 0;
            
            const testTimeout = setTimeout(() => {
                // Clean up connections
                connections.forEach(ws => {
                    try { ws.close(); } catch (e) {}
                });
                
                resolve({
                    test: 'WebSocket DoS',
                    passed: failedConnections > 0 || successfulConnections < maxConnections,
                    severity: successfulConnections === maxConnections ? 'MEDIUM' : 'PASS',
                    details: {
                        attempted: maxConnections,
                        successful: successfulConnections,
                        failed: failedConnections,
                        note: 'Limited test to avoid actual DoS'
                    },
                    recommendation: successfulConnections === maxConnections ?
                        'Consider connection limits per IP' :
                        'WebSocket has connection limits'
                });
            }, 5000);

            for (let i = 0; i < maxConnections; i++) {
                try {
                    const ws = new WebSocket(this.wsURL);
                    connections.push(ws);
                    
                    ws.on('open', () => {
                        successfulConnections++;
                    });
                    
                    ws.on('error', () => {
                        failedConnections++;
                    });
                } catch (error) {
                    failedConnections++;
                }
            }
        });
    }

    async testTransactionEnumeration() {
        console.log('Testing transaction status enumeration...');
        
        // Test if we can enumerate transaction IDs
        const testIds = [
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            '00000000-0000-0000-0000-000000000000',
            'test-transaction-id',
            '../../../etc/passwd'
        ];

        const results = [];
        
        for (const id of testIds) {
            try {
                const response = await axios.get(`${this.baseURL}/v1/trade/transaction-status`, {
                    params: { id },
                    timeout: 5000
                });
                
                if (response.data) {
                    results.push({
                        id: id.substring(0, 20) + '...',
                        result: 'Returns data'
                    });
                }
                
            } catch (error) {
                // Expected - should fail for invalid IDs
            }
        }

        return {
            test: 'Transaction Enumeration',
            passed: results.length === 0,
            severity: results.length > 0 ? 'LOW' : 'PASS',
            details: {
                testedIds: testIds.length,
                dataReturned: results.length
            },
            recommendation: results.length > 0 ?
                'Validate transaction IDs belong to requesting user' :
                'Transaction IDs properly validated'
        };
    }

    async testPriceOracle() {
        console.log('Testing price oracle endpoints...');
        
        try {
            // Test subscription endpoint for DoS
            const subscribeTest = await axios.post(`${this.baseURL}/price-oracle/subscribe-token`, {
                subscribe: true,
                token: {
                    collection: 'GALA',
                    category: 'Unit',
                    type: 'none',
                    additionalKey: 'none'
                }
            }, { timeout: 5000 });

            // Test fetching historical data with large limits
            const historyTest = await axios.post(`${this.baseURL}/price-oracle/fetch-price`, {
                token: 'GALA$Unit$none$none',
                page: 1,
                limit: 10000, // Very large limit
                from: '2020-01-01T00:00:00Z'
            }, { timeout: 5000 });

            return {
                test: 'Price Oracle Security',
                passed: true,
                severity: 'INFO',
                details: {
                    subscriptionWorks: !!subscribeTest.data,
                    largeLimitAccepted: historyTest.data?.data?.length > 100,
                    note: 'Oracle endpoints accessible, monitor for abuse'
                },
                recommendation: 'Consider rate limiting on oracle queries'
            };
            
        } catch (error) {
            return {
                test: 'Price Oracle Security',
                passed: true,
                severity: 'PASS',
                error: error.message
            };
        }
    }
}

module.exports = ExtendedSecurityTester;