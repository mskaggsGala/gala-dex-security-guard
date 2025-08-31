const axios = require('axios');

class FlashLoanTester {
    constructor() {
        this.baseURL = 'https://dex-backend-prod1.defi.gala.com';
    }

    async testFlashLoanVulnerabilities() {
        console.log('Testing flash loan attack vectors...');
        
        const results = {
            timestamp: new Date().toISOString(),
            flashLoanRisks: []
        };

        // Test 1: Pool manipulation with large borrowed amount
        const manipulation = await this.testPoolManipulation();
        results.flashLoanRisks.push(manipulation);

        // Test 2: Oracle price manipulation
        const oracle = await this.testOraclePriceManipulation();
        results.flashLoanRisks.push(oracle);

        // Test 3: Liquidity exhaustion attack
        const exhaustion = await this.testLiquidityExhaustion();
        results.flashLoanRisks.push(exhaustion);

        return results;
    }

    async testPoolManipulation() {
        try {
            // Simulate borrowing massive amount
            const borrowAmount = '10000000'; // 10M GALA
            
            // Check impact of massive swap
            const massiveSwap = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                params: {
                    tokenIn: 'GALA$Unit$none$none',
                    tokenOut: 'GUSDC$Unit$none$none',
                    amountIn: borrowAmount,
                    fee: 10000
                }
            });

            // Check reverse swap to repay loan
            const reverseSwap = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                params: {
                    tokenIn: 'GUSDC$Unit$none$none',
                    tokenOut: 'GALA$Unit$none$none',
                    amountIn: massiveSwap.data.data.amountOut,
                    fee: 10000
                }
            });

            const returnedAmount = parseFloat(reverseSwap.data.data.amountOut);
            const borrowedAmount = parseFloat(borrowAmount);
            const loss = borrowedAmount - returnedAmount;
            const lossPercent = (loss / borrowedAmount) * 100;

            // If loss is less than flash loan fee (typically 0.09%), attack might be profitable
            const flashLoanFee = 0.09; // typical flash loan fee
            const profitable = lossPercent < flashLoanFee;

            return {
                type: 'Pool Manipulation',
                vulnerable: profitable,
                details: {
                    borrowAmount: borrowAmount,
                    returnedAmount: returnedAmount.toFixed(2),
                    loss: loss.toFixed(2),
                    lossPercent: lossPercent.toFixed(3) + '%',
                    flashLoanFeeThreshold: flashLoanFee + '%',
                    risk: profitable ? 'HIGH' : 'LOW'
                }
            };

        } catch (error) {
            return {
                type: 'Pool Manipulation',
                error: error.message
            };
        }
    }

    async testOraclePriceManipulation() {
        try {
            // Test if massive trades can manipulate oracle prices
            const amounts = ['100000', '1000000', '10000000'];
            const priceImpacts = [];

            for (const amount of amounts) {
                // Get current price
                const priceBefore = await axios.get(`${this.baseURL}/v1/trade/price`, {
                    params: { token: 'GALA$Unit$none$none' }
                });

                // Simulate large trade
                const largeTrade = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                    params: {
                        tokenIn: 'GALA$Unit$none$none',
                        tokenOut: 'GUSDC$Unit$none$none',
                        amountIn: amount,
                        fee: 10000
                    }
                });

                // Check if this would affect oracle price
                const priceAfter = largeTrade.data.data.newSqrtPrice;
                const sqrtPriceBefore = Math.sqrt(parseFloat(priceBefore.data.data));
                const impact = Math.abs(parseFloat(priceAfter) - sqrtPriceBefore) / sqrtPriceBefore * 100;

                priceImpacts.push({
                    amount,
                    impact: impact.toFixed(3) + '%'
                });
            }

            const maxImpact = Math.max(...priceImpacts.map(p => parseFloat(p.impact)));
            const vulnerable = maxImpact > 10; // >10% price impact is concerning

            return {
                type: 'Oracle Price Manipulation',
                vulnerable,
                details: {
                    priceImpacts,
                    maxImpact: maxImpact.toFixed(2) + '%',
                    risk: vulnerable ? 'HIGH' : 'LOW',
                    note: 'Large trades can move prices, but TWAP oracles mitigate instant manipulation'
                }
            };

        } catch (error) {
            return {
                type: 'Oracle Price Manipulation',
                error: error.message
            };
        }
    }

    async testLiquidityExhaustion() {
        try {
            // Check if attacker can drain liquidity from pools
            const pool = await axios.get(`${this.baseURL}/v1/trade/pool`, {
                params: {
                    token0: 'GALA$Unit$none$none',
                    token1: 'GUSDC$Unit$none$none',
                    fee: 10000
                }
            });

            const liquidity = parseFloat(pool.data.data.Data.grossPoolLiquidity);
            
            // Try to swap amount equal to significant portion of liquidity
            const drainAmount = (liquidity * 0.5).toFixed(0); // 50% of pool
            
            let drainResult;
            try {
                drainResult = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                    params: {
                        tokenIn: 'GALA$Unit$none$none',
                        tokenOut: 'GUSDC$Unit$none$none',
                        amountIn: drainAmount,
                        fee: 10000
                    }
                });
            } catch (e) {
                return {
                    type: 'Liquidity Exhaustion',
                    vulnerable: false,
                    details: {
                        poolLiquidity: liquidity.toFixed(2),
                        attemptedDrain: drainAmount,
                        result: 'Pool protected - large drain attempt rejected',
                        risk: 'LOW'
                    }
                };
            }

            const priceImpact = drainResult.data.data.newSqrtPrice;
            
            return {
                type: 'Liquidity Exhaustion',
                vulnerable: true,
                details: {
                    poolLiquidity: liquidity.toFixed(2),
                    drainAmount: drainAmount,
                    priceAfterDrain: priceImpact,
                    risk: 'MEDIUM',
                    note: 'Large trades accepted but with significant price impact'
                }
            };

        } catch (error) {
            return {
                type: 'Liquidity Exhaustion',
                error: error.message
            };
        }
    }
}

module.exports = FlashLoanTester;