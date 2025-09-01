# Log Management Guide

## 📊 The Problem

With continuous testing running ~4,000 tests per day:
- **Daily generation:** 100-200 MB of JSON files
- **Monthly accumulation:** 3-6 GB
- **Yearly projection:** 36-72 GB
- **Risk:** Disk space exhaustion and system crash

## 🎯 The Solution: Smart Log Management

### Three-Tier Retention Strategy

| Age | Storage Method | What's Kept | Space Savings |
|-----|---------------|-------------|---------------|
| **0-3 days** | Raw JSON | Everything | 0% |
| **3-7 days** | Raw JSON (monitored) | Everything | 0% |
| **7-30 days** | Compressed (.gz) | Everything | 70% |
| **30-90 days** | Summary only | Key metrics | 95% |
| **90+ days** | Deleted | Only critical findings | 99% |
| **Forever** | Special archive | Critical/failed tests | Minimal |

## 🚀 Quick Start

### 1. Initial Setup
```bash
# Make scripts executable
chmod +x setup-log-rotation.sh log-manager.js

# Run setup
./setup-log-rotation.sh

# Check current disk usage
node log-manager.js check

# See growth predictions
node log-manager.js predict
```

### 2. Manual Cleanup Options
```bash
# Run full management process
node log-manager.js manage

# Interactive cleanup menu
./cleanup-now.sh

# Quick cleanup (remove >7 days)
find security-results -name "*.json" -mtime +7 -delete
```

### 3. Automatic Cleanup (Recommended)
```bash
# Option A: Cron job (runs at 3 AM daily)
crontab -e
# Add: 0 3 * * * /path/to/daily-log-cleanup.sh

# Option B: Run setup script
./setup-log-rotation.sh
# Choose 'y' when asked about automation
```

## 📁 Storage Architecture

```
gala-dex-security-guard/
├── security-results/          # Raw JSON (0-7 days)
│   └── *.json
├── security-archives/
│   ├── compressed/            # Gzipped (7-30 days)
│   │   └── *.json.gz
│   ├── summaries/             # Minimal (30-90 days)
│   │   └── *-summary.json
│   └── critical/              # Forever
│       └── *-critical.json
└── log-cleanup.log           # Cleanup history
```

## 📈 Disk Usage Projections

### With No Management
- **Week 1:** 1.4 GB
- **Month 1:** 6 GB
- **Month 3:** 18 GB
- **Month 6:** 36 GB
- **Year 1:** 72 GB ❌

### With Log Management
- **Week 1:** 1.4 GB
- **Month 1:** 2 GB (↓ 67%)
- **Month 3:** 3 GB (↓ 83%)
- **Month 6:** 4 GB (↓ 89%)
- **Year 1:** 5 GB (↓ 93%) ✅

## 🛠️ Log Manager Features

### Core Functions
1. **Automatic Compression** - Files >3 days old
2. **Smart Deletion** - Remove old files based on policy
3. **Critical Preservation** - Never delete important findings
4. **Summary Generation** - Keep metrics without raw data
5. **Growth Prediction** - Estimate when disk will be full

### Commands
```bash
# Check current usage
node log-manager.js check

# Predict growth
node log-manager.js predict

# Run management
node log-manager.js manage

# Get help
node log-manager.js help
```

## 🔧 Configuration

Edit `log-manager.js` to customize:

```javascript
{
    keepRawDays: 7,           // Days to keep raw JSON
    keepCompressedDays: 30,   // Days to keep compressed
    keepSummaryDays: 90,      // Days to keep summaries
    compressAfterDays: 3,     // When to compress
    maxDiskUsageGB: 5,        // Max total size
    warningThresholdGB: 3     // When to warn
}
```

## 📊 What Gets Preserved

### Always Kept (Critical Findings)
- Tests with severity: CRITICAL
- Failed tests with severity: HIGH
- Security breaches or vulnerabilities
- Stored in `security-archives/critical/`

### Summaries (30-90 days)
- Test counts and pass/fail rates
- Phase information
- Critical issue counts
- Just test names, not full data

### Compressed (7-30 days)
- Full test data, gzipped
- 70% space reduction
- Can be restored if needed

## 🚨 Emergency Cleanup

If disk space becomes critical:

```bash
# Interactive emergency menu
./cleanup-now.sh
# Choose option 3 for emergency cleanup

# Or direct emergency cleanup (keeps only 24 hours)
find security-results -name "*.json" -mtime +1 -delete

# Nuclear option (delete everything except critical)
rm -f security-results/*.json
node log-manager.js manage  # This will preserve critical findings
```

## 📅 Maintenance Schedule

### Daily (Automated)
- Compress files >3 days old
- Delete raw files >7 days old
- Check disk usage

### Weekly (Automated)
- Delete compressed files >30 days old
- Generate summaries for archived data

### Monthly (Manual Review)
- Review critical findings archive
- Adjust retention policies if needed
- Check growth trends

## 💡 Best Practices

1. **Set up automation immediately** - Don't wait for disk issues
2. **Monitor the monitor** - Check logs weekly
3. **Adjust policies** - Based on your disk space
4. **Keep critical findings** - Never delete security issues
5. **Use compression** - 70% space savings
6. **Regular backups** - Archive critical findings externally

## 📈 Monitoring Commands

```bash
# Quick disk check
du -sh security-results/

# File count
ls -1 security-results/*.json | wc -l

# Oldest file
ls -lt security-results/*.json | tail -1

# Growth rate (files per hour)
find security-results -name "*.json" -mmin -60 | wc -l

# Space used today
find security-results -name "*.json" -mtime -1 -exec du -ch {} + | grep total
```

## 🎯 Summary

With this log management system:
- ✅ **Prevent disk crashes** - Automatic cleanup
- ✅ **Keep important data** - Critical findings preserved
- ✅ **Save 93% space** - Through compression and rotation
- ✅ **Stay compliant** - 90-day audit trail
- ✅ **Run worry-free** - Set and forget automation

Your continuous testing can now run indefinitely without disk space concerns!