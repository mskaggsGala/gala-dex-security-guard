Here's an updated README that reflects your current security monitoring system:

```markdown
# GalaSwap Security Monitor & Trading Bot

A comprehensive security monitoring system and automated trading bot for the GalaSwap DEX, featuring multi-phase vulnerability testing, real-time monitoring, and automated security assessments.

## 🛡️ Security Monitoring Features

### Four-Phase Security Testing
- **Phase 1: Infrastructure** - Rate limiting, liquidity drain protection, precision handling
- **Phase 2: Economic Security** - MEV vulnerability testing, cross-pool arbitrage detection, flash loan attack simulation
- **Phase 4B: Extended Attack Surface** - Bridge security, pool creation validation, advanced endpoint testing
- **Phase 4C: Performance & Load** - Rate limit detection, concurrent load handling, performance degradation analysis

### Real-Time Dashboard
- Live security score and test results at http://localhost:3000
- Critical issue alerts and recommendations
- Auto-refreshing status display
- Historical test result tracking

### Automated Scheduling
- Critical tests every 5 minutes
- Infrastructure tests hourly
- Economic security tests every 6 hours
- Extended surface tests every 12 hours
- Performance tests daily at 2 AM
- Automated report generation daily at 9 AM

## 🚨 Current Security Findings

| Severity | Issue | Impact | Status |
|----------|-------|--------|--------|
| CRITICAL | No API Rate Limiting | 300+ requests/second allowed | OPEN |
| HIGH | Pool Creation Without Auth | Unauthorized pool creation possible | OPEN |
| MEDIUM | Replay Attack Protection | Potential replay vulnerabilities | OPEN |
| LOW | Precision/Rounding | Mathematical precision issues | OPEN |

**Overall Security Score: 0/10** (80% tests passing)

## Installation

```bash
git clone https://github.com/mskaggsGala/galaswap-security-monitor.git
cd galaswap-security-monitor
npm install
```

## Configuration

### Environment Setup
```bash
cp .env.example .env
# Edit .env with your credentials (keep these secret!)
```

### Required Environment Variables
- `PRIVATE_KEY` - Your wallet private key
- `WALLET_ADDRESS` - Your wallet address
- `GALASWAP_API_URL` - GalaSwap API endpoint (optional)
- `CHECK_INTERVAL_MS` - Bot check interval (default: 10000)

## Usage

### Security Monitoring

#### Run All Tests Immediately
```bash
node src/test-all-phases.js
```

#### Start Automated Monitoring
```bash
node src/scheduler.js
```

#### View Live Dashboard
```bash
node src/dashboard.js
# Open http://localhost:3000 in your browser
```

#### Run Individual Test Phases
```bash
# Phase 1: Infrastructure
node -e "const m = new (require('./src/security-monitor'))(); m.runBasicTests()"

# Phase 2: Economic Security
node -e "const m = new (require('./src/security-monitor'))(); m.runPhase2Tests()"

# Phase 4B: Extended Surface
node -e "const m = new (require('./src/security-monitor'))(); m.runPhase4BTests()"

# Phase 4C: Performance
node -e "const m = new (require('./src/security-monitor'))(); m.runPhase4CTests()"
```

### Trading Bot Features

#### Pool Discovery
```bash
npm run discover          # Find active trading pools
npm run discover-verbose  # Detailed pool information
```

#### Arbitrage Detection
```bash
npm run arbitrage  # Monitor for profitable opportunities
```

#### Automated Trading
```bash
npm run trade  # Start trading bot (simulation mode by default)
```

## Project Structure

```
galaswap-security-monitor/
├── src/
│   ├── config.js                    # Central configuration
│   ├── dashboard.js                 # Live monitoring dashboard
│   ├── scheduler.js                 # Automated test scheduler
│   ├── security-monitor.js          # Core security test orchestrator
│   ├── test-all-phases.js          # Manual test runner
│   │
│   ├── Security Testers/
│   ├── enhanced-performance-tester.js  # Phase 4C with rate limit detection
│   ├── extended-security-tester.js     # Phase 4B extended surface
│   ├── mev-tester.js                   # MEV vulnerability testing
│   ├── flash-loan-tester.js           # Flash loan attack simulation
│   ├── cross-pool-arbitrage.js        # Arbitrage opportunity detection
│   ├── bridge-security-tester.js      # Bridge endpoint security
│   │
│   ├── Integration/
│   ├── phase4b-integration.js         # Phase 4B scheduler integration
│   ├── phase4c-integration.js         # Phase 4C scheduler integration
│   │
│   └── Trading/
│       ├── trading-bot.js             # Main trading logic
│       ├── pool-discovery.js          # Pool discovery engine
│       └── arbitrage-detector.js      # Arbitrage detection
│
├── security-results/        # Test results and reports
├── security-reports/        # Generated security reports
├── security-alerts.log      # Critical alert log
└── dashboard/              # Dashboard HTML and assets
```

## Monitoring Schedule

| Test Suite | Frequency | Coverage |
|------------|-----------|----------|
| Critical Tests | 5 minutes | Rate limiting |
| Phase 1 | Hourly | Infrastructure security |
| Phase 2 | 6 hours | Economic attack vectors |
| Phase 4B | 12 hours | Extended attack surface |
| Phase 4C | Daily 2 AM | Performance & load testing |
| Reports | Daily 9 AM | Comprehensive security report |

## Test Results Format

Test results are saved in `security-results/` with naming convention:
- `security-[timestamp].json` - General test results
- `security-Phase-[X]-[timestamp].json` - Phase-specific results
- `latest-Phase-[X].json` - Most recent results for each phase

## Safety Features

- **Dry Run Mode**: Test strategies without real transactions
- **Rate Limit Detection**: Identifies missing API throttling
- **Slippage Protection**: Maximum acceptable price deviation
- **Position Limits**: Maximum percentage of wallet per trade
- **Automated Alerts**: Critical issues logged to `security-alerts.log`

## Development

### Adding New Tests
1. Create test module in `src/`
2. Add to appropriate phase in `security-monitor.js`
3. Update scheduler if needed
4. Test with `test-all-phases.js`

### Dashboard Customization
Edit `src/dashboard.js` to modify:
- Display format
- Alert thresholds
- Refresh intervals
- Test categorization

## Risk Warning

⚠️ **IMPORTANT**: 
- This system identifies security vulnerabilities in the GalaSwap DEX
- Trading features carry significant financial risk
- Always start with simulation mode
- Never invest more than you can afford to lose
- Keep private keys secure and never commit them to git

## Current Status

✅ All systems operational
- 4 test phases running
- Dashboard active
- Scheduler configured
- 80% tests passing
- 1 critical issue identified

## Support

For issues or questions:
- Check test results in `security-results/`
- View alerts in `security-alerts.log`
- Monitor dashboard at http://localhost:3000
- Review console output for detailed diagnostics

## License

This software is provided as-is for security research and educational purposes. Users are responsible for compliance with all applicable laws and regulations.
```

