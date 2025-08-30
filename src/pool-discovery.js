const GalaSwapConnector = require('./galaswap-connection');

class PoolDiscovery {
    constructor() {
        this.connector = new GalaSwapConnector({});
        this.commonTokens = [
            'GALA$Unit$none$none',
            'GUSDC$Unit$none$none',
            'ETIME$Unit$none$none',
            'SILK$Unit$none$none',
            'GTON$Unit$none$none',
            'GOSMI$Unit$none$none'
        ];
        this.feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
    }

    // Find pools with actual liquidity
    async findActivePools() {
        console.log('=== Discovering Active Trading Pools ===\n');
        const activePools = [];

        for (let i = 0; i < this.commonTokens.length; i++) {
            for (let j = i + 1; j < this.commonTokens.length; j++) {
                const token0 = this.commonTokens[i];
                const token1 = this.commonTokens[j];
                
                for (const fee of this.feeTiers) {
                    try {
                        const poolData = await this.connector.getPool(token0, token1, fee);
                        
                        if (poolData?.data?.Data?.grossPoolLiquidity && 
                            parseFloat(poolData.data.Data.grossPoolLiquidity) > 0) {
                            
                            const pool = {
                                token0: token0.split('$')[0],
                                token1: token1.split('$')[0],
                                token0Full: token0,
                                token1Full: token1,
                                fee: fee,
                                feePercent: (fee / 10000) + '%',
                                liquidity: poolData.data.Data.grossPoolLiquidity,
                                sqrtPrice: poolData.data.Data.sqrtPrice
                            };
                            
                            activePools.push(pool);
                            console.log(`✓ Active Pool Found: ${pool.token0}/${pool.token1} (${pool.feePercent}) - Liquidity: ${parseFloat(pool.liquidity).toFixed(2)}`);
                        }
                    } catch (error) {
                        // Pool might not exist, continue checking
                    }
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
        }
        
        return activePools;
    }

    // Test quotes for active pools
    async testQuotesForPools(pools) {
        console.log('\n=== Testing Quotes for Active Pools ===\n');
        const workingPairs = [];

        for (const pool of pools) {
            try {
                // Test a small swap amount
                const testAmount = '10';
                const quote = await this.connector.getQuote(
                    pool.token0Full,
                    pool.token1Full,
                    testAmount,
                    pool.fee
                );

                if (quote?.data?.amountOut) {
                    workingPairs.push({
                        ...pool,
                        testQuote: {
                            amountIn: testAmount,
                            amountOut: quote.data.amountOut,
                            rate: parseFloat(quote.data.amountOut) / parseFloat(testAmount)
                        }
                    });
                    
                    console.log(`✓ ${pool.token0} → ${pool.token1}: ${testAmount} ${pool.token0} = ${quote.data.amountOut} ${pool.token1}`);
                }
            } catch (error) {
                console.log(`✗ ${pool.token0}/${pool.token1}: Quote failed`);
            }
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        return workingPairs;
    }

    // Main discovery function
    async discover() {
        console.log('Starting pool discovery process...\n');
        
        // First, get current prices
        console.log('=== Current Token Prices ===');
        const prices = await this.connector.getMultiplePrices(this.commonTokens);
        if (prices?.data) {
            this.commonTokens.forEach((token, index) => {
                const symbol = token.split('$')[0];
                console.log(`${symbol}: $${prices.data[index]}`);
            });
        }
        
        console.log('\n');
        
        // Find active pools
        const activePools = await this.findActivePools();
        
        if (activePools.length > 0) {
            console.log(`\nFound ${activePools.length} active pools`);
            
            // Test quotes
            const workingPairs = await this.testQuotesForPools(activePools);
            
            console.log(`\n=== Summary ===`);
            console.log(`Active Pools: ${activePools.length}`);
            console.log(`Working Trading Pairs: ${workingPairs.length}`);
            
            if (workingPairs.length > 0) {
                console.log('\nBest pairs for trading bot:');
                workingPairs.forEach(pair => {
                    console.log(`- ${pair.token0}/${pair.token1} (Fee: ${pair.feePercent}, Liquidity: ${parseFloat(pair.liquidity).toFixed(0)})`);
                });
            }
            
            return workingPairs;
        } else {
            console.log('No active pools found with the common tokens.');
            return [];
        }
    }
}

// Run discovery
async function main() {
    const discovery = new PoolDiscovery();
    const results = await discovery.discover();
    
    // Save results for later use
    const fs = require('fs');
    fs.writeFileSync(
        'active-pools.json', 
        JSON.stringify(results, null, 2)
    );
    console.log('\nResults saved to active-pools.json');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = PoolDiscovery;
