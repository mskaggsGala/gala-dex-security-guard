const GalaSwapConnector = require('./galaswap-connection');
const fs = require('fs');

class CleanPoolDiscovery {
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
        this.feeTiers = [
            { value: 500, name: '0.05%' },
            { value: 3000, name: '0.3%' },
            { value: 10000, name: '1%' }
        ];
    }

    // Get token symbol from full key
    getSymbol(tokenKey) {
        return tokenKey.split('$')[0];
    }

    // Format number with commas
    formatNumber(num) {
        return parseFloat(num).toLocaleString('en-US', { maximumFractionDigits: 2 });
    }

    // Silently check if pool exists
    async checkPool(token0, token1, fee) {
        try {
            const response = await this.connector.axios.get('/v1/trade/pool', {
                params: { token0, token1, fee: fee.value }
            });
            
            if (response?.data?.data?.Data?.grossPoolLiquidity) {
                const liquidity = parseFloat(response.data.data.Data.grossPoolLiquidity);
                if (liquidity > 0) {
                    return {
                        exists: true,
                        data: response.data.data.Data
                    };
                }
            }
            return { exists: false };
        } catch (error) {
            return { exists: false };
        }
    }

    // Test quote for a pool
    async testQuote(token0, token1, fee, amount = '100') {
        try {
            const response = await this.connector.axios.get('/v1/trade/quote', {
                params: {
                    tokenIn: token0,
                    tokenOut: token1,
                    amountIn: amount,
                    fee: fee.value
                }
            });
            
            if (response?.data?.data?.amountOut) {
                return {
                    success: true,
                    amountIn: amount,
                    amountOut: response.data.data.amountOut,
                    rate: parseFloat(response.data.data.amountOut) / parseFloat(amount)
                };
            }
            return { success: false };
        } catch (error) {
            return { success: false };
        }
    }

    // Get current prices
    async getCurrentPrices() {
        try {
            const response = await this.connector.axios.post('/v1/trade/price-multiple', {
                tokens: this.commonTokens
            });
            
            if (response?.data?.data) {
                const prices = {};
                this.commonTokens.forEach((token, index) => {
                    const symbol = this.getSymbol(token);
                    prices[symbol] = response.data.data[index];
                });
                return prices;
            }
        } catch (error) {
            console.log('Failed to fetch prices');
        }
        return {};
    }

    // Main discovery function
    async discover() {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║              GalaSwap Pool Discovery (Clean)               ║
╚════════════════════════════════════════════════════════════╝
        `);

        // Get current prices
        console.log('📊 Fetching current token prices...\n');
        const prices = await this.getCurrentPrices();
        
        console.log('┌─────────────────────────────┐');
        console.log('│     Current Token Prices    │');
        console.log('├─────────────────────────────┤');
        Object.entries(prices).forEach(([symbol, price]) => {
            if (price) {
                const priceStr = `$${parseFloat(price).toFixed(6)}`;
                console.log(`│ ${symbol.padEnd(6)} ${priceStr.padStart(20)} │`);
            }
        });
        console.log('└─────────────────────────────┘\n');

        // Discover pools
        console.log('🔍 Scanning for active pools...\n');
        console.log('Checking', this.commonTokens.length, 'tokens across', this.feeTiers.length, 'fee tiers...\n');
        
        const activePools = [];
        let poolsChecked = 0;
        const totalChecks = (this.commonTokens.length * (this.commonTokens.length - 1) / 2) * this.feeTiers.length;

        // Progress indicator
        process.stdout.write(`Progress: 0/${totalChecks} pools checked...`);

        for (let i = 0; i < this.commonTokens.length; i++) {
            for (let j = i + 1; j < this.commonTokens.length; j++) {
                const token0 = this.commonTokens[i];
                const token1 = this.commonTokens[j];
                const symbol0 = this.getSymbol(token0);
                const symbol1 = this.getSymbol(token1);

                for (const fee of this.feeTiers) {
                    poolsChecked++;
                    process.stdout.write(`\rProgress: ${poolsChecked}/${totalChecks} pools checked...`);
                    
                    const pool = await this.checkPool(token0, token1, fee);
                    
                    if (pool.exists) {
                        const poolInfo = {
                            token0: symbol0,
                            token1: symbol1,
                            token0Full: token0,
                            token1Full: token1,
                            fee: fee.value,
                            feeName: fee.name,
                            liquidity: pool.data.grossPoolLiquidity,
                            sqrtPrice: pool.data.sqrtPrice,
                            tickSpacing: pool.data.tickSpacing
                        };
                        
                        // Test a quote
                        const quote = await this.testQuote(token0, token1, fee);
                        if (quote.success) {
                            poolInfo.testQuote = quote;
                        }
                        
                        activePools.push(poolInfo);
                    }
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        }

        process.stdout.write(`\rProgress: ${poolsChecked}/${totalChecks} pools checked... Done!\n\n`);

        // Display results
        if (activePools.length > 0) {
            console.log(`✅ Found ${activePools.length} active pools:\n`);
            
            console.log('┌────────────────────┬──────────┬────────────────────┬──────────────┐');
            console.log('│       Pair         │   Fee    │     Liquidity      │  Exchange    │');
            console.log('├────────────────────┼──────────┼────────────────────┼──────────────┤');
            
            // Sort by liquidity
            activePools.sort((a, b) => parseFloat(b.liquidity) - parseFloat(a.liquidity));
            
            activePools.forEach(pool => {
                const pair = `${pool.token0}/${pool.token1}`;
                const liquidity = this.formatNumber(pool.liquidity);
                const rate = pool.testQuote ? 
                    `1:${pool.testQuote.rate.toFixed(4)}` : 
                    'N/A';
                
                console.log(`│ ${pair.padEnd(18)} │ ${pool.feeName.padStart(7)}  │ ${liquidity.padStart(18)} │ ${rate.padStart(12)} │`);
            });
            
            console.log('└────────────────────┴──────────┴────────────────────┴──────────────┘');
            
            // Summary statistics
            console.log('\n📈 Summary Statistics:\n');
            
            // Group by pair
            const pairMap = new Map();
            activePools.forEach(pool => {
                const pairKey = `${pool.token0}/${pool.token1}`;
                if (!pairMap.has(pairKey)) {
                    pairMap.set(pairKey, []);
                }
                pairMap.get(pairKey).push(pool);
            });
            
            console.log(`   Unique pairs: ${pairMap.size}`);
            console.log(`   Total pools: ${activePools.length}`);
            console.log(`   Most liquid pool: ${activePools[0].token0}/${activePools[0].token1} (${activePools[0].feeName})`);
            console.log(`   Total liquidity value: $${this.formatNumber(
                activePools.reduce((sum, pool) => sum + parseFloat(pool.liquidity), 0)
            )}`);
            
            // Arbitrage opportunities
            console.log('\n💡 Potential Arbitrage Pairs (same tokens, different fees):\n');
            let arbFound = false;
            pairMap.forEach((pools, pair) => {
                if (pools.length > 1) {
                    arbFound = true;
                    console.log(`   ${pair}:`);
                    pools.forEach(pool => {
                        const rate = pool.testQuote ? pool.testQuote.rate.toFixed(6) : 'N/A';
                        console.log(`     - ${pool.feeName} fee: Rate ${rate}, Liquidity: ${this.formatNumber(pool.liquidity)}`);
                    });
                }
            });
            
            if (!arbFound) {
                console.log('   No multi-fee tier pairs found');
            }
            
            // Save results
            const outputFile = 'active-pools-clean.json';
            fs.writeFileSync(outputFile, JSON.stringify(activePools, null, 2));
            console.log(`\n💾 Results saved to ${outputFile}`);
            
            // Trading recommendations
            console.log('\n🎯 Trading Recommendations:\n');
            const topPools = activePools.slice(0, 3);
            topPools.forEach((pool, index) => {
                console.log(`   ${index + 1}. ${pool.token0}/${pool.token1} (${pool.feeName})`);
                console.log(`      Liquidity: ${this.formatNumber(pool.liquidity)}`);
                if (pool.testQuote) {
                    console.log(`      Current rate: 1 ${pool.token0} = ${pool.testQuote.rate.toFixed(6)} ${pool.token1}`);
                }
                console.log('');
            });
            
        } else {
            console.log('❌ No active pools found');
        }
        
        console.log('\n✨ Discovery complete!\n');
    }
}

// Main execution
async function main() {
    const discovery = new CleanPoolDiscovery();
    await discovery.discover();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = CleanPoolDiscovery;
