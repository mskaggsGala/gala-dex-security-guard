# Simulation Mode vs Live Trading

## Current Setting: dryRun = true (SIMULATION)

### What Happens in Simulation:
1. **Balance**: Uses fake balance (10,000 GALA, 100 other tokens)
2. **Trades**: Only updates internal variables
3. **Wallet**: Never touches your real wallet
4. **Transactions**: No blockchain transactions
5. **Fees**: No real gas fees paid
6. **Risk**: ZERO - cannot lose money

### When You Execute a Trade (Simulation):
- Updates simulated balance in memory
- Logs to trades.log with "SIM-" prefix
- Shows "🔄 SIMULATION MODE" in console
- No private key used
- No API calls to execute real swaps

## When dryRun = false (LIVE TRADING)

### What Would Happen:
1. **Balance**: Reads your REAL wallet balance
2. **Trades**: Executes REAL swaps on GalaSwap
3. **Wallet**: Uses your private key from .env
4. **Transactions**: Submits to GalaChain blockchain
5. **Fees**: Pays real gas and swap fees
6. **Risk**: REAL MONEY at risk

### Required for Live Trading:
1. Real private key in .env (not the placeholder)
2. Real wallet address in .env
3. Actual GALA tokens in your wallet
4. Understanding of risks
5. Start with SMALL amounts

### What the Bot Would Do (Live):
1. Sign transactions with your private key
2. Call /v1/trade/swap endpoint
3. Submit to /v1/trade/bundle for execution
4. Wait for blockchain confirmation
5. Update your real token balances

## Safety Checklist Before Going Live:
- [ ] Tested thoroughly in simulation
- [ ] Understand all parameters
- [ ] Have real wallet with funds
- [ ] Started with tiny minTradeSize (like 10 GALA)
- [ ] Monitoring closely
- [ ] Ready to stop bot quickly (Ctrl+C)
- [ ] Checked current gas fees
- [ ] Verified pool liquidity
