const axios = require('axios');

class BridgeSecurityTester {
    constructor() {
        this.baseURL = 'https://dex-backend-prod1.defi.gala.com';
    }

    async testBridgeSecurity() {
        console.log('Testing bridge security endpoints...');
        
        const results = {
            timestamp: new Date().toISOString(),
            tests: []
        };

        // Test 1: Bridge configuration enumeration
        const configTest = await this.testBridgeConfigEnumeration();
        results.tests.push(configTest);

        // Test 2: Bridge request validation
        const validationTest = await this.testBridgeValidation();
        results.tests.push(validationTest);

        // Test 3: Bridge status information disclosure
        const statusTest = await this.testBridgeStatusDisclosure();
        results.tests.push(statusTest);

        // Test 4: Cross-chain replay attacks
        const replayTest = await this.testReplayAttacks();
        results.tests.push(replayTest);

        return results;
    }

    async testBridgeConfigEnumeration() {
        try {
            console.log('Testing bridge configuration enumeration...');
            
            // Test if we can enumerate all bridge configurations
            const response = await axios.get(`${this.baseURL}/v1/connect/bridge-configurations`, {
                timeout: 5000
            });

            const configs = response.data.data?.tokens || [];
            
            return {
                test: 'Bridge Configuration Enumeration',
                passed: true,
                severity: 'INFO',
                details: {
                    totalConfigs: configs.length,
                    exposedInfo: configs.length > 0 ? 'Bridge configurations publicly accessible' : 'No configs found',
                    tokens: configs.slice(0, 5).map(t => t.symbol) // Sample of tokens
                },
                recommendation: 'Consider if all bridge configurations should be public'
            };

        } catch (error) {
            return {
                test: 'Bridge Configuration Enumeration',
                passed: false,
                severity: 'LOW',
                error: error.message
            };
        }
    }

    async testBridgeValidation() {
        console.log('Testing bridge request validation...');
        
        const maliciousInputs = [
            { destinationChainId: -1, description: 'Negative chain ID' },
            { destinationChainId: 999999999, description: 'Invalid chain ID' },
            { recipient: '0x0000000000000000000000000000000000000000', description: 'Zero address' },
            { quantity: '-1000', description: 'Negative amount' },
            { quantity: '115792089237316195423570985008687907853269984665640564039457584007913129639935', description: 'Max uint256' },
            { token: '../../../etc/passwd', description: 'Path traversal in token' }
        ];

        const validationResults = [];

        for (const input of maliciousInputs) {
            try {
                await axios.post(`${this.baseURL}/v1/connect/bridge/request`, {
                    destinationChainId: input.destinationChainId || 2,
                    recipient: input.recipient || '0x1234567890123456789012345678901234567890',
                    walletAddress: 'client|test',
                    quantity: input.quantity || '10',
                    token: input.token || { 
                        collection: 'GALA', 
                        category: 'Unit', 
                        type: 'none', 
                        additionalKey: 'none' 
                    }
                }, { timeout: 5000 });

                validationResults.push({
                    input: input.description,
                    result: 'Accepted - potential validation issue'
                });

            } catch (error) {
                const status = error.response?.status;
                if (status === 400) {
                    validationResults.push({
                        input: input.description,
                        result: 'Properly rejected'
                    });
                } else {
                    validationResults.push({
                        input: input.description,
                        result: `Unexpected error: ${status}`
                    });
                }
            }
        }

        const vulnerableInputs = validationResults.filter(r => 
            r.result.includes('Accepted') || r.result.includes('Unexpected')
        );

        return {
            test: 'Bridge Input Validation',
            passed: vulnerableInputs.length === 0,
            severity: vulnerableInputs.length > 0 ? 'MEDIUM' : 'PASS',
            details: {
                testedInputs: maliciousInputs.length,
                vulnerableInputs: vulnerableInputs.length,
                results: validationResults
            },
            recommendation: vulnerableInputs.length > 0 ? 
                'Strengthen input validation on bridge endpoints' : 
                'Input validation working correctly'
        };
    }

    async testBridgeStatusDisclosure() {
        console.log('Testing bridge status information disclosure...');
        
        try {
            // Test with invalid/random transaction hashes
            const testHashes = [
                '0x0000000000000000000000000000000000000000000000000000000000000000',
                '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                'invalid_hash',
                '../../../etc/passwd'
            ];

            const disclosures = [];

            for (const hash of testHashes) {
                try {
                    const response = await axios.post(`${this.baseURL}/v1/connect/bridge/status`, {
                        hash: hash
                    }, { timeout: 5000 });

                    if (response.data) {
                        disclosures.push({
                            hash: hash.substring(0, 20) + '...',
                            disclosed: 'Returns data for invalid hash'
                        });
                    }

                } catch (error) {
                    // Expected behavior - should error on invalid hashes
                }
            }

            return {
                test: 'Bridge Status Disclosure',
                passed: disclosures.length === 0,
                severity: disclosures.length > 0 ? 'LOW' : 'PASS',
                details: {
                    testedHashes: testHashes.length,
                    disclosures: disclosures
                },
                recommendation: disclosures.length > 0 ?
                    'Validate transaction hashes before returning status' :
                    'Status endpoint properly validates hashes'
            };

        } catch (error) {
            return {
                test: 'Bridge Status Disclosure',
                error: error.message
            };
        }
    }

    async testReplayAttacks() {
        console.log('Testing replay attack protection...');
        
        // Without actual transaction capability, we check for nonce/timestamp validation
        return {
            test: 'Replay Attack Protection',
            passed: null,
            severity: 'INFO',
            details: {
                note: 'Cannot fully test without transaction execution',
                recommendation: 'Ensure all bridge requests include nonce or timestamp validation'
            }
        };
    }
}

module.exports = BridgeSecurityTester;