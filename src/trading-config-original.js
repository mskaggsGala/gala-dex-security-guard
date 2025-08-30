// Trading bot configuration
module.exports = {
    // Focus on the most liquid pairs
    targetPairs: [
        {
            name: 'GALA/GUSDC-1%',
            token0: 'GALA$Unit$none$none',
            token1: 'GUSDC$Unit$none$none',
            fee: 10000,
            minTradeSize: '100',  // Minimum GALA to trade
            maxTradeSize: '10000', // Maximum GALA to trade
            targetProfit: 0.002,   // 0.2% profit target (after fees)
            enabled: true
        },
        {
            name: 'GALA/GOSMI-1%',
            token0: 'GALA$Unit$none$none',
            token1: 'GOSMI$Unit$none$none', 
            fee: 10000,
            minTradeSize: '100',
            maxTradeSize: '5000',
            targetProfit: 0.003,   // 0.3% profit target
            enabled: true
        },
        {
            name: 'GALA/SILK-0.3%',
            token0: 'GALA$Unit$none$none',
            token1: 'SILK$Unit$none$none',
            fee: 3000,
            minTradeSize: '100',
            maxTradeSize: '5000',
            targetProfit: 0.002,
            enabled: true
        }
    ],
    
    // Trading parameters
    trading: {
        checkIntervalMs: 10000,      // Check prices every 10 seconds
        maxSlippage: 0.005,          // 0.5% max slippage
        emergencyStopLoss: 0.05,     // 5% emergency stop
        maxConcurrentTrades: 1,       // One trade at a time initially
        dryRun: true                  // Start in simulation mode
    },
    
    // Risk management
    risk: {
        maxPositionSize: 0.1,         // Max 10% of wallet in one trade
        dailyLossLimit: 0.02,         // Stop if down 2% for the day
        requiredConfirmations: 1,     // Wait for 1 confirmation
        cooldownPeriodMs: 30000       // 30 second cooldown between trades
    },
    
    // Arbitrage detection
    arbitrage: {
        minProfitPercent: 0.001,      // Minimum 0.1% profit to consider
        priceUpdateThreshold: 0.0005, // 0.05% price change to trigger check
        includeGasFees: true          // Consider gas in profit calculation
    }
};
