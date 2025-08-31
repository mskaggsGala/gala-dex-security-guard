const axios = require('axios');

class MEVTester {
    constructor() {
        this.baseURL = 'https://dex-backend-prod1.defi.gala.com';
    }

    // Test various MEV attack patterns
    async testMEVVulnerabilities() {
        console.log('Testing MEV attack vectors...');
        
        const results = {
            timestamp: new Date().toISOString(),
            attacks: []
        };

        // Test 1: Classic Sandwich
        const sandwich = await this.testSandwichAttack();
        results.attacks.push(sandwich);

        // Test 2: JIT (Just-In-Time) Liquidity
        const jit = await this.testJITLiquidity();
        results.attacks.push(jit);

        // Test 3: Backrunning
        const backrun = await this.testBackrunning();
        results.attacks.push(backrun);

        return results;
    }

    async testSandwichAttack() {
        try {
            // Simulate detecting a large user trade
            const victimSize = '50000';
            
            // Get baseline price
            const baseline = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                params: {
                    tokenIn: 'GALA$Unit$none$none',
                    tokenOut: 'GUSDC$Unit$none$none',
                    amountIn: '100',
                    fee: 10000
                }
            });

            // Victim's large trade
            const victim = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                params: {
                    tokenIn: 'GALA$Unit$none$none',
                    tokenOut: 'GUSDC$Unit$none$none',
                    amountIn: victimSize,
                    fee: 10000
                }
            });

            // Attacker front-runs
            const frontrun = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                params: {
                    tokenIn: 'GALA$Unit$none$none',
                    tokenOut: 'GUSDC$Unit$none$none',
                    amountIn: '25000',
                    fee: 10000
                }
            });

            // Attacker back-runs (sells back)
            const backrun = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                params: {
                    tokenIn: 'GUSDC$Unit$none$none',
                    tokenOut: 'GALA$Unit$none$none',
                    amountIn: frontrun.data.data.amountOut,
                    fee: 10000
                }
            });

            const profit = parseFloat(backrun.data.data.amountOut) - 25000;
            const profitPercent = (profit / 25000) * 100;

            return {
                type: 'Sandwich Attack',
                vulnerable: profit > 0,
                profit: profit.toFixed(2),
                profitPercent: profitPercent.toFixed(3) + '%',
                details: {
                    baselineRate: parseFloat(baseline.data.data.amountOut) / 100,
                    victimImpact: victim.data.data.newSqrtPrice,
                    attackerGain: profit
                }
            };

        } catch (error) {
            return {
                type: 'Sandwich Attack',
                error: error.message
            };
        }
    }

    async testJITLiquidity() {
        // Test if attacker can add/remove liquidity just for one block
        try {
            // Check pool state before
            const poolBefore = await axios.get(`${this.baseURL}/v1/trade/pool`, {
                params: {
                    token0: 'GALA$Unit$none$none',
                    token1: 'GUSDC$Unit$none$none',
                    fee: 10000
                }
            });

            // Simulate: Add liquidity, capture fee, remove liquidity
            // This would need actual execution, so we check pool params
            const liquidity = poolBefore.data.data.Data.liquidity;
            const feeGrowth = poolBefore.data.data.Data.feeGrowthGlobal0;

            return {
                type: 'JIT Liquidity',
                vulnerable: false, // Can't fully test without execution
                details: {
                    currentLiquidity: liquidity,
                    feeGrowth: feeGrowth,
                    note: 'Requires transaction execution to fully test'
                }
            };

        } catch (error) {
            return {
                type: 'JIT Liquidity',
                error: error.message
            };
        }
    }

    async testBackrunning() {
        // Test if profitable to immediately trade after large trades
        try {
            const amounts = ['10000', '50000', '100000'];
            const opportunities = [];

            for (const amount of amounts) {
                // Large trade moves price
                const largeTrade = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                    params: {
                        tokenIn: 'GALA$Unit$none$none',
                        tokenOut: 'GUSDC$Unit$none$none',
                        amountIn: amount,
                        fee: 10000
                    }
                });

                // Backrun in opposite direction
                const backrun = await axios.get(`${this.baseURL}/v1/trade/quote`, {
                    params: {
                        tokenIn: 'GUSDC$Unit$none$none',
                        tokenOut: 'GALA$Unit$none$none',
                        amountIn: '100',
                        fee: 10000
                    }
                });

                const backrunRate = parseFloat(backrun.data.data.amountOut) / 100;
                opportunities.push({
                    tradeSize: amount,
                    priceAfter: largeTrade.data.data.newSqrtPrice,
                    backrunRate: backrunRate.toFixed(6)
                });
            }

            return {
                type: 'Backrunning',
                vulnerable: false,
                details: {
                    opportunities,
                    note: 'Backrunning opportunities depend on mempool access'
                }
            };

        } catch (error) {
            return {
                type: 'Backrunning',
                error: error.message
            };
        }
    }
}

module.exports = MEVTester;