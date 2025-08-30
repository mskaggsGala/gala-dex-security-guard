# GalaSwap Trading Bot

An automated trading bot for GalaSwap V3 protocol with arbitrage detection and pool discovery capabilities.

## Features

- 🔍 **Pool Discovery**: Automatically find active trading pools with liquidity
- 📊 **Arbitrage Detection**: Monitor for profitable opportunities across different fee tiers
- 🤖 **Automated Trading**: Execute trades based on configurable strategies
- 🧪 **Simulation Mode**: Test strategies without risking real funds
- 📈 **Real-time Monitoring**: Track price movements and market conditions
- 💰 **Risk Management**: Built-in safety features and position limits

## Installation

Clone the repository and install dependencies:

    git clone [your-repo-url]
    cd galaswap-trading-bot
    npm install

## Configuration

### 1. Environment Variables

Copy the example environment file and update with your values:

    cp .env.example .env

Edit .env with your wallet credentials (keep these secret!)

### 2. Trading Configuration

Edit src/trading-config.js to customize:
- Target trading pairs
- Minimum profit thresholds
- Trade sizes
- Risk parameters

## Usage

### Discover Active Pools

Find all pools with liquidity:

    npm run discover

### Monitor for Arbitrage

Watch for profitable opportunities:

    npm run arbitrage

### Run Trading Bot

Start automated trading (simulation mode by default):

    npm run trade

### Other Commands

    npm run help              # Show all available commands
    npm run discover-verbose  # Detailed pool discovery
    npm run dev              # Run with auto-restart on changes

## Current Active Pools

Based on the latest discovery, these pools have significant liquidity:

| Pair | Fee | Liquidity | Exchange Rate |
|------|-----|-----------|---------------|
| GALA/GUSDC | 1% | $211B | 1 GALA = 0.0179 GUSDC |
| GALA/GOSMI | 1% | $168B | 1 GALA = 1.1927 GOSMI |
| GALA/SILK | 0.3% | $24M | 1 GALA = 0.7614 SILK |
| ETIME/SILK | 0.05% | $12M | 1 ETIME = 2.4976 SILK |

### Arbitrage Opportunities

The GALA/GUSDC pair has different rates at different fee tiers:
- 1% fee pool: 1 GALA = 0.017859 GUSDC
- 0.05% fee pool: 1 GALA = 0.017933 GUSDC

## Safety Features

- **Dry Run Mode**: Test strategies without real trades
- **Slippage Protection**: Maximum acceptable price deviation
- **Position Limits**: Maximum percentage of wallet per trade
- **Daily Loss Limits**: Stop trading if losses exceed threshold
- **Trade Cooldowns**: Prevent rapid-fire trading

## Project Structure

    galaswap-trading-bot/
    ├── src/
    │   ├── config.js              # Environment configuration
    │   ├── trading-config.js      # Trading parameters
    │   ├── galaswap-connection.js # API connection handler
    │   ├── pool-discovery.js      # Pool discovery logic
    │   ├── pool-discovery-clean.js # Clean discovery output
    │   ├── arbitrage-detector.js  # Arbitrage detection
    │   └── trading-bot.js         # Main bot logic
    ├── index.js                   # Entry point
    ├── .env                       # Your credentials (git-ignored)
    ├── .env.example              # Example environment file
    └── package.json              # Dependencies

## Risk Warning

⚠️ **IMPORTANT**: Cryptocurrency trading carries significant risk. This bot is provided as-is with no guarantees. Always:

1. Start with simulation mode
2. Test with small amounts
3. Monitor the bot closely
4. Never invest more than you can afford to lose
5. Keep your private keys secure

## Going Live

When ready to trade with real funds:

1. Set `dryRun: false` in `src/trading-config.js`
2. Update `.env` with real wallet credentials
3. Start with small `minTradeSize` values
4. Monitor closely for the first few hours
5. Adjust parameters based on performance

## Logs and Output

- Trade logs: `trades.log` (JSON format, one trade per line)
- Active pools: `active-pools-clean.json`
- Console output: Real-time status and trades

## Disclaimer

This software is for educational purposes. Users are responsible for their own trading decisions and any losses incurred.
