const GalaSwapConnector = require('./galaswap-connection');
const ArbitrageDetector = require('./arbitrage-detector');
const tradingConfig = require('./trading-config');
const config = require('./config');
const fs = require('fs');

class TradingBot {
    constructor() {
        this.connector = new GalaSwapConnector({});
        this.detector = new ArbitrageDetector();
        this.isRunning = false;
        this.trades = [];
        this.balance = {
            GALA: 10000,  // Starting balance for simulation
            GUSDC: 100,
            SILK: 100,
            GOSMI: 100
        };
        this.totalProfit = 0;
        this.lastTradeTime = 0;
    }

    // Log trade to file
    logTrade(trade) {
        this.trades.push(trade);
        const logEntry = {
            ...trade,
            timestamp: new Date().toISOString(),
            balanceAfter: { ...this.balance },
            totalProfit: this.totalProfit
        };
        
        // Append to log file
        fs.appendFileSync(
            'trades.log',
            JSON.stringify(logEntry) + '\n'
        );
        
        console.log('\n📝 Trade logged:', trade.id);
    }

    // Simulate trade execution
    async executeTrade(opportunity, amount) {
        if (tradingConfig.trading.dryRun) {
            console.log('\n🔄 SIMULATION MODE - Executing trade...');
        } else {
            console.log('\n💰 LIVE MODE - Executing trade...');
        }

        // Check cooldown
        const now = Date.now();
        if (now - this.lastTradeTime < tradingConfig.risk.cooldownPeriodMs) {
            console.log('⏳ Trade cooldown active, skipping...');
            return false;
        }

        // Get fresh quote
        const quote = await this.connector.getQuote(
            opportunity.tokenIn,
            opportunity.tokenOut,
            amount.toString(),
            opportunity.fee
        );

        if (!quote?.data) {
            console.log('❌ Failed to get quote');
            return false;
        }

        const amountIn = parseFloat(amount);
        const amountOut = parseFloat(quote.data.amountOut);
        const tokenInSymbol = opportunity.tokenIn.split('$')[0];
        const tokenOutSymbol = opportunity.tokenOut.split('$')[0];

        // Check balance
        if (this.balance[tokenInSymbol] < amountIn) {
            console.log(`❌ Insufficient ${tokenInSymbol} balance`);
            return false;
        }

        // Check slippage
        const expectedRate = opportunity.expectedRate || (amountOut / amountIn);
        const actualRate = amountOut / amountIn;
        const slippage = Math.abs(actualRate - expectedRate) / expectedRate;

        if (slippage > tradingConfig.trading.maxSlippage) {
            console.log(`❌ Slippage too high: ${(slippage * 100).toFixed(3)}%`);
            return false;
        }

        // Execute trade (simulation)
        if (tradingConfig.trading.dryRun) {
            // Update simulated balances
            this.balance[tokenInSymbol] -= amountIn;
            this.balance[tokenOutSymbol] = (this.balance[tokenOutSymbol] || 0) + amountOut;

            const trade = {
                id: `SIM-${Date.now()}`,
                type: 'SWAP',
                tokenIn: tokenInSymbol,
                tokenOut: tokenOutSymbol,
                amountIn,
                amountOut,
                rate: actualRate,
                fee: opportunity.fee,
                slippage: slippage,
                profit: 0, // Will calculate based on strategy
                status: 'COMPLETED'
            };

            this.logTrade(trade);
            this.lastTradeTime = now;

            console.log('✅ Trade executed successfully!');
            console.log(`   ${amountIn} ${tokenInSymbol} → ${amountOut.toFixed(6)} ${tokenOutSymbol}`);
            console.log(`   Rate: ${actualRate.toFixed(6)}`);
            console.log(`   Slippage: ${(slippage * 100).toFixed(3)}%`);
            
            this.displayBalance();
            return true;
        } else {
            // Real trade execution would go here
            console.log('⚠️ Live trading not yet implemented');
            return false;
        }
    }

    // Display current balance
    displayBalance() {
        console.log('\n💼 Current Balance:');
        Object.entries(this.balance).forEach(([token, amount]) => {
            if (amount > 0) {
                console.log(`   ${token}: ${amount.toFixed(6)}`);
            }
        });
    }

    // Find best trading opportunity
    async findBestOpportunity() {
        const opportunities = [];

        for (const pair of tradingConfig.targetPairs) {
            if (!pair.enabled) continue;

            try {
                // Get current quote
                const quote = await this.connector.getQuote(
                    pair.token0,
                    pair.token1,
                    pair.minTradeSize,
                    pair.fee
                );

                if (quote?.data) {
                    const rate = parseFloat(quote.data.amountOut) / parseFloat(pair.minTradeSize);
                    
                    // Check if rate has improved enough
                    const lastRate = this.lastRates?.get(pair.name) || rate;
                    const rateChange = (rate - lastRate) / lastRate;

                    if (Math.abs(rateChange) > tradingConfig.arbitrage.priceUpdateThreshold) {
                        opportunities.push({
                            pair: pair.name,
                            tokenIn: pair.token0,
                            tokenOut: pair.token1,
                            fee: pair.fee,
                            rate,
                            rateChange,
                            expectedRate: rate,
                            minSize: pair.minTradeSize,
                            maxSize: pair.maxTradeSize
                        });
                    }

                    this.lastRates = this.lastRates || new Map();
                    this.lastRates.set(pair.name, rate);
                }
            } catch (error) {
                console.log(`Error checking ${pair.name}:`, error.message);
            }
        }

        // Sort by rate change magnitude
        opportunities.sort((a, b) => Math.abs(b.rateChange) - Math.abs(a.rateChange));
        
        return opportunities[0] || null;
    }

    // Main bot loop
    async run() {
        console.log('\n🤖 GalaSwap Trading Bot Starting...');
        console.log(`Mode: ${tradingConfig.trading.dryRun ? 'SIMULATION' : 'LIVE'}`);
        console.log(`Check Interval: ${tradingConfig.trading.checkIntervalMs / 1000}s`);
        console.log(`Target Pairs: ${tradingConfig.targetPairs.filter(p => p.enabled).map(p => p.name).join(', ')}`);
        
        this.displayBalance();
        this.isRunning = true;

        let iteration = 0;

        const loop = async () => {
            if (!this.isRunning) return;

            iteration++;
            console.log(`\n⏰ [${new Date().toLocaleTimeString()}] Iteration ${iteration}`);

            try {
                // Get current prices
                const prices = await this.connector.getMultiplePrices([
                    'GALA$Unit$none$none',
                    'GUSDC$Unit$none$none',
                    'SILK$Unit$none$none',
                    'GOSMI$Unit$none$none'
                ]);

                if (prices?.data) {
                    console.log('📊 Prices: GALA=$' + prices.data[0] + ', GUSDC=$' + prices.data[1]);
                }

                // Find opportunities
                const opportunity = await this.findBestOpportunity();

                if (opportunity && Math.abs(opportunity.rateChange) > tradingConfig.arbitrage.minProfitPercent) {
                    console.log('\n🎯 Opportunity detected!');
                    console.log(`   Pair: ${opportunity.pair}`);
                    console.log(`   Rate change: ${(opportunity.rateChange * 100).toFixed(3)}%`);
                    
                    // Execute trade with minimum size
                    await this.executeTrade(opportunity, opportunity.minSize);
                } else {
                    console.log('💤 No profitable opportunities');
                }

                // Show stats every 10 iterations
                if (iteration % 10 === 0) {
                    this.showStats();
                }

            } catch (error) {
                console.error('❌ Error in bot loop:', error.message);
            }

            // Schedule next iteration
            setTimeout(loop, tradingConfig.trading.checkIntervalMs);
        };

        // Start the loop
        await loop();
    }

    // Show trading statistics
    showStats() {
        console.log('\n📈 Trading Statistics:');
        console.log(`   Total Trades: ${this.trades.length}`);
        console.log(`   Successful: ${this.trades.filter(t => t.status === 'COMPLETED').length}`);
        console.log(`   Failed: ${this.trades.filter(t => t.status === 'FAILED').length}`);
        console.log(`   Total Profit: ${this.totalProfit.toFixed(6)} GALA`);
        
        if (this.trades.length > 0) {
            const avgSlippage = this.trades.reduce((acc, t) => acc + (t.slippage || 0), 0) / this.trades.length;
            console.log(`   Avg Slippage: ${(avgSlippage * 100).toFixed(3)}%`);
        }
    }

    // Stop the bot
    stop() {
        console.log('\n🛑 Stopping bot...');
        this.isRunning = false;
        this.showStats();
        this.displayBalance();
    }
}

// Main execution
async function main() {
    const bot = new TradingBot();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        bot.stop();
        process.exit(0);
    });

    // Start the bot
    await bot.run();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = TradingBot;
