const axios = require('axios');

class CrossPoolArbitrage {
    constructor() {
        this.baseURL = 'https://dex-backend-prod1.defi.gala.com';
    }

    async testCrossPoolArbitrage() {
        console.log('Testing cross-pool arbitrage opportunities...');
        
        const results = {
            timestamp: new Date().toISOString(),
            arbitrageOpportunities: []
        };

        // Test different pool pairs for price discrepancies
        const poolPairs = [
            {
                tokenA: 'GALA$Unit$none$none',
                tokenB: 'GUSDC$Unit$none$none',
                fees: [500, 3000, 10000] // Different fee tiers
            }
        ];

        for (const pair of poolPairs) {
            const prices = [];
            
            // Check prices across different fee tiers
            for (const fee of pair.fees) {
                try {
                    const response = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                        params: {
                            tokenIn: pair.tokenA,
                            tokenOut: pair.tokenB,
                            amountIn: '1000',
                            fee: fee
                        },
                        timeout: 5000
                    });
                    
                    const rate = parseFloat(response.data.data.amountOut) / 1000;
                    prices.push({ fee, rate });
                    
                } catch (error) {
                    prices.push({ fee, error: error.message });
                }
            }
            
            // Check for arbitrage opportunities
            const validPrices = prices.filter(p => p.rate);
            if (validPrices.length > 1) {
                const maxRate = Math.max(...validPrices.map(p => p.rate));
                const minRate = Math.min(...validPrices.map(p => p.rate));
                const spread = ((maxRate - minRate) / minRate * 100).toFixed(2);
                
                results.arbitrageOpportunities.push({
                    pair: `${pair.tokenA}/${pair.tokenB}`,
                    prices,
                    spread: spread + '%',
                    profitable: parseFloat(spread) > 0.5,
                    details: parseFloat(spread) > 0.5 ? 
                        `${spread}% price difference between pools` : 
                        'Price difference too small for profitable arbitrage'
                });
            }
        }

        return results;
    }
}

module.exports = CrossPoolArbitrage;