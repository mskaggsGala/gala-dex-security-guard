const GalaSwapConnector = require('./galaswap-connection');
const tradingConfig = require('./trading-config');

class ArbitrageDetector {
    constructor() {
        this.connector = new GalaSwapConnector({});
        this.lastPrices = new Map();
        this.opportunities = [];
    }

    // Calculate potential profit from arbitrage
    calculateArbitrage(quote1, quote2, pair1, pair2) {
        // For same token pairs with different fees
        if (pair1.token0 === pair2.token0 && pair1.token1 === pair2.token1) {
            const rate1 = parseFloat(quote1.data.amountOut) / parseFloat(quote1.data.amountIn);
            const rate2 = parseFloat(quote2.data.amountOut) / parseFloat(quote2.data.amountIn);
            
            const rateDiff = Math.abs(rate1 - rate2);
            const avgRate = (rate1 + rate2) / 2;
            const percentDiff = (rateDiff / avgRate) * 100;
            
            // Account for fees
            const totalFees = (pair1.fee + pair2.fee) / 10000; // Convert to percentage
            const netProfit = percentDiff - totalFees;
            
            return {
                pair1: pair1.name,
                pair2: pair2.name,
                rate1,
                rate2,
                rateDifference: rateDiff,
                percentDifference: percentDiff,
                totalFees,
                netProfitPercent: netProfit,
                profitable: netProfit > tradingConfig.arbitrage.minProfitPercent * 100
            };
        }
        return null;
    }

    // Check for triangular arbitrage opportunities
    async checkTriangularArbitrage() {
        console.log('\n=== Checking Triangular Arbitrage ===');
        
        // Example: GALA -> GUSDC -> SILK -> GALA
        try {
            // Get quotes for each leg
            const leg1 = await this.connector.getQuote(
                'GALA$Unit$none$none',
                'GUSDC$Unit$none$none',
                '1000',
                10000
            );
            
            if (!leg1?.data?.amountOut) return null;
            
            const leg2 = await this.connector.getQuote(
                'GUSDC$Unit$none$none',
                'SILK$Unit$none$none',
                leg1.data.amountOut,
                10000
            );
            
            if (!leg2?.data?.amountOut) return null;
            
            const leg3 = await this.connector.getQuote(
                'SILK$Unit$none$none',
                'GALA$Unit$none$none',
                leg2.data.amountOut,
                3000
            );
            
            if (!leg3?.data?.amountOut) {
                // Try reverse direction
                console.log('Direct SILK->GALA not available, checking reverse...');
                return null;
            }
            
            const startAmount = 1000;
            const endAmount = parseFloat(leg3.data.amountOut);
            const profit = endAmount - startAmount;
            const profitPercent = (profit / startAmount) * 100;
            
            console.log(`Triangular Arbitrage Result:`);
            console.log(`Start: 1000 GALA`);
            console.log(`After GALA->GUSDC: ${leg1.data.amountOut} GUSDC`);
            console.log(`After GUSDC->SILK: ${leg2.data.amountOut} SILK`);
            console.log(`After SILK->GALA: ${endAmount} GALA`);
            console.log(`Profit: ${profit.toFixed(2)} GALA (${profitPercent.toFixed(3)}%)`);
            
            return {
                type: 'triangular',
                path: 'GALA -> GUSDC -> SILK -> GALA',
                startAmount,
                endAmount,
                profit,
                profitPercent,
                profitable: profitPercent > 0.1 // 0.1% minimum
            };
            
        } catch (error) {
            console.log('Triangular arbitrage check failed:', error.message);
            return null;
        }
    }

    // Main detection loop
    async detectOpportunities() {
        console.log('\n=== Arbitrage Detection Starting ===');
        const results = [];
        
        // Check GALA/GUSDC different fee tiers
        console.log('\nChecking GALA/GUSDC fee tier arbitrage...');
        try {
            const quote500 = await this.connector.getQuote(
                'GALA$Unit$none$none',
                'GUSDC$Unit$none$none',
                '1000',
                500
            );
            
            const quote10000 = await this.connector.getQuote(
                'GALA$Unit$none$none',
                'GUSDC$Unit$none$none',
                '1000',
                10000
            );
            
            if (quote500?.data && quote10000?.data) {
                const arb = this.calculateArbitrage(
                    quote500,
                    quote10000,
                    { name: 'GALA/GUSDC-0.05%', token0: 'GALA', token1: 'GUSDC', fee: 500 },
                    { name: 'GALA/GUSDC-1%', token0: 'GALA', token1: 'GUSDC', fee: 10000 }
                );
                
                if (arb) {
                    console.log(`\nFee Tier Arbitrage Opportunity:`);
                    console.log(`Pairs: ${arb.pair1} vs ${arb.pair2}`);
                    console.log(`Rate difference: ${arb.percentDifference.toFixed(4)}%`);
                    console.log(`Total fees: ${arb.totalFees.toFixed(4)}%`);
                    console.log(`Net profit: ${arb.netProfitPercent.toFixed(4)}%`);
                    console.log(`Profitable: ${arb.profitable ? 'YES ✓' : 'NO ✗'}`);
                    
                    results.push(arb);
                }
            }
        } catch (error) {
            console.log('Fee tier arbitrage check failed:', error.message);
        }
        
        // Check triangular arbitrage
        const triangular = await this.checkTriangularArbitrage();
        if (triangular) {
            results.push(triangular);
        }
        
        // Check cross-pair opportunities
        console.log('\nChecking cross-pair opportunities...');
        
        // Compare GALA/GOSMI vs GALA/SILK ratios
        try {
            const galaGosmi = await this.connector.getQuote(
                'GALA$Unit$none$none',
                'GOSMI$Unit$none$none',
                '1000',
                10000
            );
            
            const galaSilk = await this.connector.getQuote(
                'GALA$Unit$none$none',
                'SILK$Unit$none$none',
                '1000',
                3000
            );
            
            if (galaGosmi?.data && galaSilk?.data) {
                const gosmiPerGala = parseFloat(galaGosmi.data.amountOut) / 1000;
                const silkPerGala = parseFloat(galaSilk.data.amountOut) / 1000;
                
                console.log(`\nCross-pair rates:`);
                console.log(`1 GALA = ${gosmiPerGala.toFixed(4)} GOSMI`);
                console.log(`1 GALA = ${silkPerGala.toFixed(4)} SILK`);
                console.log(`Implied GOSMI/SILK rate: ${(gosmiPerGala/silkPerGala).toFixed(4)}`);
            }
        } catch (error) {
            console.log('Cross-pair check failed:', error.message);
        }
        
        return results;
    }

    // Monitor prices in real-time
    async monitorPrices() {
        console.log('\n=== Starting Price Monitor ===');
        console.log(`Checking every ${tradingConfig.trading.checkIntervalMs/1000} seconds...`);
        console.log('Press Ctrl+C to stop\n');
        
        let iteration = 0;
        
        const monitor = async () => {
            iteration++;
            console.log(`\n--- Iteration ${iteration} - ${new Date().toLocaleTimeString()} ---`);
            
            // Get current prices
            const prices = await this.connector.getMultiplePrices([
                'GALA$Unit$none$none',
                'GUSDC$Unit$none$none',
                'SILK$Unit$none$none',
                'GOSMI$Unit$none$none'
            ]);
            
            if (prices?.data) {
                console.log('Current Prices:');
                console.log(`GALA: $${prices.data[0]}`);
                console.log(`GUSDC: $${prices.data[1]}`);
                console.log(`SILK: $${prices.data[2]}`);
                console.log(`GOSMI: $${prices.data[3]}`);
                
                // Check for significant price changes
                const galaPrice = parseFloat(prices.data[0]);
                const lastGalaPrice = this.lastPrices.get('GALA') || galaPrice;
                const priceChange = Math.abs(galaPrice - lastGalaPrice) / lastGalaPrice;
                
                if (priceChange > tradingConfig.arbitrage.priceUpdateThreshold) {
                    console.log(`\n⚠️ Significant price change detected: ${(priceChange * 100).toFixed(3)}%`);
                    console.log('Checking for arbitrage opportunities...');
                    
                    const opportunities = await this.detectOpportunities();
                    
                    if (opportunities.some(o => o.profitable)) {
                        console.log('\n🎯 PROFITABLE OPPORTUNITY FOUND!');
                        // In a real bot, this would trigger a trade
                    }
                }
                
                // Update last prices
                this.lastPrices.set('GALA', galaPrice);
                this.lastPrices.set('GUSDC', parseFloat(prices.data[1]));
                this.lastPrices.set('SILK', parseFloat(prices.data[2]));
                this.lastPrices.set('GOSMI', parseFloat(prices.data[3]));
            }
        };
        
        // Run immediately
        await monitor();
        
        // Then run on interval
        setInterval(monitor, tradingConfig.trading.checkIntervalMs);
    }
}

// Main execution
async function main() {
    const detector = new ArbitrageDetector();
    
    console.log('=== GalaSwap Arbitrage Detector ===\n');
    console.log('Running initial opportunity scan...');
    
    const opportunities = await detector.detectOpportunities();
    
    console.log(`\n=== Summary ===`);
    console.log(`Opportunities found: ${opportunities.length}`);
    console.log(`Profitable opportunities: ${opportunities.filter(o => o.profitable).length}`);
    
    console.log('\nStarting continuous monitoring...');
    console.log('(Press Ctrl+C to stop)\n');
    
    // Start monitoring
    await detector.monitorPrices();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ArbitrageDetector;
