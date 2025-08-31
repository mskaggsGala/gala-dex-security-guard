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

        // Test 1: Same pair, different fee tiers
        const feeTierArb = await this.testFeeTierArbitrage();
        results.arbitrageOpportunities.push(feeTierArb);

        // Test 2: Triangular arbitrage
        const triangular = await this.testTriangularArbitrage();
        results.arbitrageOpportunities.push(triangular);

        // Test 3: Multi-hop arbitrage
        const multiHop = await this.testMultiHopArbitrage();
        results.arbitrageOpportunities.push(multiHop);

        return results;
    }

    async testFeeTierArbitrage() {
        try {
            // Test GALA/GUSDC with different fee tiers
            const amount = '10000';
            
            // Get quotes from 0.05% pool
            const lowFeeQuote = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                params: {
                    tokenIn: 'GALA$Unit$none$none',
                    tokenOut: 'GUSDC$Unit$none$none',
                    amountIn: amount,
                    fee: 500  // 0.05%
                }
            });

            // Get quotes from 1% pool
            const highFeeQuote = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                params: {
                    tokenIn: 'GALA$Unit$none$none',
                    tokenOut: 'GUSDC$Unit$none$none',
                    amountIn: amount,
                    fee: 10000  // 1%
                }
            });

            const lowFeeOutput = parseFloat(lowFeeQuote.data.data.amountOut);
            const highFeeOutput = parseFloat(highFeeQuote.data.data.amountOut);
            const difference = Math.abs(lowFeeOutput - highFeeOutput);
            const differencePercent = (difference / Math.max(lowFeeOutput, highFeeOutput)) * 100;

            // Check if we can arbitrage between pools
            const profitable = differencePercent > 1.05; // Need >1.05% difference to cover fees

            return {
                type: 'Fee Tier Arbitrage',
                pair: 'GALA/GUSDC',
                profitable,
                details: {
                    lowFeeOutput: lowFeeOutput.toFixed(6),
                    highFeeOutput: highFeeOutput.toFixed(6),
                    difference: difference.toFixed(6),
                    differencePercent: differencePercent.toFixed(3) + '%',
                    profitableThreshold: '1.05%'
                }
            };

        } catch (error) {
            return {
                type: 'Fee Tier Arbitrage',
                error: error.message
            };
        }
    }

    async testTriangularArbitrage() {
        try {
            const startAmount = '1000';
            
            // Path: GALA -> GUSDC -> SILK -> GALA
            console.log('Testing triangular path: GALA -> GUSDC -> SILK -> GALA');

            // Leg 1: GALA -> GUSDC
            const leg1 = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                params: {
                    tokenIn: 'GALA$Unit$none$none',
                    tokenOut: 'GUSDC$Unit$none$none',
                    amountIn: startAmount,
                    fee: 10000
                }
            });

            // Leg 2: GUSDC -> SILK (need to check if pool exists)
            const gusdcAmount = leg1.data.data.amountOut;
            let leg2, silkAmount;
            
            try {
                leg2 = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                    params: {
                        tokenIn: 'GUSDC$Unit$none$none',
                        tokenOut: 'SILK$Unit$none$none',
                        amountIn: gusdcAmount,
                        fee: 10000
                    }
                });
                silkAmount = leg2.data.data.amountOut;
            } catch (e) {
                // If direct GUSDC->SILK doesn't exist, try reverse
                return {
                    type: 'Triangular Arbitrage',
                    path: 'GALA -> GUSDC -> SILK -> GALA',
                    profitable: false,
                    details: {
                        note: 'GUSDC/SILK pool not available for testing'
                    }
                };
            }

            // Leg 3: SILK -> GALA
            const leg3 = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                params: {
                    tokenIn: 'SILK$Unit$none$none',
                    tokenOut: 'GALA$Unit$none$none',
                    amountIn: silkAmount,
                    fee: 3000
                }
            });

            const finalAmount = parseFloat(leg3.data.data.amountOut);
            const profit = finalAmount - parseFloat(startAmount);
            const profitPercent = (profit / parseFloat(startAmount)) * 100;

            return {
                type: 'Triangular Arbitrage',
                path: 'GALA -> GUSDC -> SILK -> GALA',
                profitable: profit > 0,
                details: {
                    startAmount,
                    finalAmount: finalAmount.toFixed(6),
                    profit: profit.toFixed(6),
                    profitPercent: profitPercent.toFixed(3) + '%',
                    legs: [
                        `GALA to GUSDC: ${gusdcAmount}`,
                        `GUSDC to SILK: ${silkAmount}`,
                        `SILK to GALA: ${finalAmount.toFixed(6)}`
                    ]
                }
            };

        } catch (error) {
            return {
                type: 'Triangular Arbitrage',
                error: error.message
            };
        }
    }

    async testMultiHopArbitrage() {
        try {
            // Test if multi-hop is more efficient than direct swap
            const amount = '1000';

            // Direct route: GALA -> GOSMI
            const direct = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                params: {
                    tokenIn: 'GALA$Unit$none$none',
                    tokenOut: 'GOSMI$Unit$none$none',
                    amountIn: amount,
                    fee: 10000
                }
            });

            // Multi-hop route: GALA -> GUSDC -> GOSMI
            // First hop
            const hop1 = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                params: {
                    tokenIn: 'GALA$Unit$none$none',
                    tokenOut: 'GUSDC$Unit$none$none',
                    amountIn: amount,
                    fee: 10000
                }
            });

            // Check if GUSDC/GOSMI pool exists
            let hop2;
            try {
                hop2 = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                    params: {
                        tokenIn: 'GUSDC$Unit$none$none',
                        tokenOut: 'GOSMI$Unit$none$none',
                        amountIn: hop1.data.data.amountOut,
                        fee: 10000
                    }
                });
            } catch (e) {
                return {
                    type: 'Multi-Hop Arbitrage',
                    route: 'GALA -> GOSMI',
                    profitable: false,
                    details: {
                        note: 'Multi-hop path not available (no GUSDC/GOSMI pool)'
                    }
                };
            }

            const directOutput = parseFloat(direct.data.data.amountOut);
            const multiHopOutput = parseFloat(hop2.data.data.amountOut);
            const improvement = multiHopOutput - directOutput;
            const improvementPercent = (improvement / directOutput) * 100;

            return {
                type: 'Multi-Hop Arbitrage',
                route: 'GALA -> GOSMI',
                profitable: improvement > 0,
                details: {
                    directOutput: directOutput.toFixed(6),
                    multiHopOutput: multiHopOutput.toFixed(6),
                    improvement: improvement.toFixed(6),
                    improvementPercent: improvementPercent.toFixed(3) + '%',
                    recommendation: improvement > 0 ? 
                        'Multi-hop routing more efficient' : 
                        'Direct swap more efficient'
                }
            };

        } catch (error) {
            return {
                type: 'Multi-Hop Arbitrage',
                error: error.message
            };
        }
    }
}

module.exports = CrossPoolArbitrage;