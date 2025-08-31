// TEST CONFIGURATION - More sensitive for testing
module.exports = {
    targetPairs: [
        {
            name: 'GALA/GUSDC-1%',
            token0: 'GALA$Unit$none$none',
            token1: 'GUSDC$Unit$none$none',
            fee: 10000,
            minTradeSize: '100',
            maxTradeSize: '1000',  // Reduced for testing
            targetProfit: 0.0001,  // Much lower: 0.01% (was 0.2%)
            enabled: true
        },
        {
            name: 'GALA/GOSMI-1%',
            token0: 'GALA$Unit$none$none',
            token1: 'GOSMI$Unit$none$none', 
            fee: 10000,
            minTradeSize: '100',
            maxTradeSize: '500',   // Reduced for testing
            targetProfit: 0.0001,  // Much lower: 0.01%
            enabled: true
        }
    ],
    
    trading: {
        checkIntervalMs: 5000,       // Faster: every 5 seconds
        maxSlippage: 0.01,          // More tolerant: 1% slippage
        emergencyStopLoss: 0.05,
        maxConcurrentTrades: 1,
        dryRun: true                 // Still simulation!
    },
    
    risk: {
        maxPositionSize: 0.1,
        dailyLossLimit: 0.02,
        requiredConfirmations: 1,
        cooldownPeriodMs: 10000      // Reduced to 10 seconds
    },
    
    arbitrage: {
        minProfitPercent: 0.00001,   // VERY low: 0.001%
        priceUpdateThreshold: 0.00001, // VERY sensitive: 0.001%
        includeGasFees: false         // Ignore gas for testing
    }
};
