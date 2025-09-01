// Load environment variables
require('dotenv').config();


// Validate required environment variables
const requiredEnvVars = [
    'PRIVATE_KEY',
    'WALLET_ADDRESS'
];

// Check if all required variables are present
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Error: Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}

// Export configuration
module.exports = {
    wallet: {
        privateKey: process.env.PRIVATE_KEY,
        address: process.env.WALLET_ADDRESS
    },
    api: {
        galaSwapUrl: process.env.GALASWAP_API_URL || 'https://api.galaswap.com',
        galaChainRpc: process.env.GALACHAIN_RPC_URL || 'https://rpc.galachain.com'
    },
    trading: {
        maxSlippage: parseFloat(process.env.MAX_SLIPPAGE || '0.5'),
        gasLimit: parseInt(process.env.GAS_LIMIT || '300000')
    },
    bot: {
        checkInterval: parseInt(process.env.CHECK_INTERVAL_MS || '5000'),
        minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.01')
    },
    apiUrl: process.env.GALASWAP_API_URL || 'https://dex-backend-prod1.defi.gala.com',
    paths: {
            resultsDir: './security-results',
            reportsDir: './security-reports',
            alertsFile: './security-alerts.log',
            monitoringDir: './monitoring',
            dashboardDir: './dashboard'
        },
    directories: {
        results: './security-results'
    },
        testing: {
            rateLimit: {
                requestCount: 100,
                timeout: 5000
            },
            performance: {
                sustainedLoadDuration: 30000,
                concurrencyLevels: [10, 25, 50, 100]
            }
        }

};

console.log('Configuration loaded successfully');
console.log('Wallet Address:', module.exports.wallet.address);
console.log('Check Interval:', module.exports.bot.checkInterval, 'ms');
