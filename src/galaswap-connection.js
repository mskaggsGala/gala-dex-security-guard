const axios = require('axios');

class GalaSwapConnector {
    constructor(config) {
        this.config = config;
        this.baseUrl = 'https://dex-backend-prod1.defi.gala.com';
        this.axios = axios.create({
            baseURL: this.baseUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'GalaSwap-Trading-Bot/1.0'
            }
        });
    }

    // Test connection and get basic info
    async testConnection() {
        console.log('\n--- Testing GalaSwap Connection ---');
        console.log('Base URL:', this.baseUrl);
        
        try {
            // Test with a simple price fetch for GALA
            const response = await this.axios.get('/v1/trade/price', {
                params: {
                    token: 'GALA$Unit$none$none'
                }
            });
            
            console.log('✓ Connection successful!');
            console.log('GALA Price:', response.data);
            return true;
        } catch (error) {
            console.log('✗ Connection failed:', error.message);
            if (error.response) {
                console.log('Response status:', error.response.status);
                console.log('Response data:', error.response.data);
            }
            return false;
        }
    }

    // Get quote for swapping tokens
    async getQuote(tokenIn, tokenOut, amountIn, fee = 3000) {
        console.log('\n--- Getting Swap Quote ---');
        try {
            const response = await this.axios.get('/v1/trade/quote', {
                params: {
                    tokenIn,
                    tokenOut,
                    amountIn,
                    fee
                }
            });
            
            console.log('Quote received:', response.data);
            return response.data;
        } catch (error) {
            console.error('Failed to get quote:', error.message);
            return null;
        }
    }

    // Get multiple token prices
    async getMultiplePrices(tokens) {
        console.log('\n--- Fetching Multiple Token Prices ---');
        try {
            const response = await this.axios.post('/v1/trade/price-multiple', {
                tokens
            });
            
            console.log('Prices received:', response.data);
            return response.data;
        } catch (error) {
            console.error('Failed to get prices:', error.message);
            return null;
        }
    }

    // Get pool details
    async getPool(token0, token1, fee) {
        console.log('\n--- Fetching Pool Details ---');
        try {
            const response = await this.axios.get('/v1/trade/pool', {
                params: {
                    token0,
                    token1,
                    fee
                }
            });
            
            console.log('Pool details:', response.data);
            return response.data;
        } catch (error) {
            console.error('Failed to get pool:', error.message);
            return null;
        }
    }

    // Get historical price data
    async getHistoricalPrice(token, limit = 10) {
        console.log(`\n--- Fetching Historical Prices for ${token} ---`);
        try {
            const response = await this.axios.get('/price-oracle/fetch-price', {
                params: {
                    token,
                    page: 1,
                    limit,
                    order: 'desc'
                }
            });
            
            console.log('Historical prices:', response.data);
            return response.data;
        } catch (error) {
            console.error('Failed to get historical prices:', error.message);
            return null;
        }
    }
}

// Test script
async function testGalaSwap() {
    console.log('=== GalaSwap API Test Suite ===\n');
    
    const connector = new GalaSwapConnector({});
    
    // Test 1: Basic connection
    const isConnected = await connector.testConnection();
    
    if (isConnected) {
        // Test 2: Get multiple token prices
        await connector.getMultiplePrices([
            'GALA$Unit$none$none',
            'GUSDC$Unit$none$none',
            'ETIME$Unit$none$none'
        ]);
        
        // Test 3: Get quote for GALA to GUSDC swap
        await connector.getQuote(
            'GALA$Unit$none$none',
            'GUSDC$Unit$none$none',
            '100',
            3000
        );
        
        // Test 4: Get pool details
        await connector.getPool(
            'GALA$Unit$none$none',
            'GUSDC$Unit$none$none',
            3000
        );
        
        // Test 5: Get historical price data
        await connector.getHistoricalPrice('GALA$Unit$none$none', 5);
    }
}

// Run if called directly
if (require.main === module) {
    testGalaSwap().catch(console.error);
}

module.exports = GalaSwapConnector;
