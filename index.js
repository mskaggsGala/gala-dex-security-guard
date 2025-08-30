#!/usr/bin/env node

const TradingBot = require('./src/trading-bot');
const ArbitrageDetector = require('./src/arbitrage-detector');
const PoolDiscovery = require('./src/pool-discovery');
const CleanPoolDiscovery = require('./src/pool-discovery-clean');

const args = process.argv.slice(2);
const command = args[0];

async function main() {
    console.log(`
╔════════════════════════════════════════╗
║       GalaSwap Trading Bot v1.0       ║
╚════════════════════════════════════════╝
    `);

    switch(command) {
        case 'discover':
            console.log('🔍 Running pool discovery...\n');
            const discovery = new CleanPoolDiscovery();
            await discovery.discover();
            break;
            
        case 'discover-verbose':
            console.log('🔍 Running verbose pool discovery...\n');
            const verboseDiscovery = new PoolDiscovery();
            await verboseDiscovery.discover();
            break;
            
        case 'arbitrage':
            console.log('📊 Running arbitrage detector...\n');
            const detector = new ArbitrageDetector();
            await detector.monitorPrices();
            break;
            
        case 'trade':
            console.log('💰 Starting trading bot...\n');
            const bot = new TradingBot();
            
            // Handle graceful shutdown
            process.on('SIGINT', () => {
                bot.stop();
                process.exit(0);
            });
            
            await bot.run();
            break;
            
        case 'help':
        default:
            console.log('Available commands:\n');
            console.log('  npm run discover         - Discover active pools (clean output)');
            console.log('  npm run discover-verbose - Discover pools (show all attempts)');
            console.log('  npm run arbitrage        - Monitor for arbitrage opportunities');
            console.log('  npm run trade            - Start the trading bot (simulation mode)');
            console.log('  npm run help             - Show this help message\n');
            console.log('Configuration:');
            console.log('  Edit src/trading-config.js to adjust trading parameters');
            console.log('  Edit .env to set your wallet credentials (when ready for live trading)\n');
            console.log('Current Mode: SIMULATION (dry run enabled)');
            console.log('To enable live trading: Set dryRun: false in src/trading-config.js\n');
            break;
    }
}

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
