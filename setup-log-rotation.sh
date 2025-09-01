#!/bin/bash

# Setup Log Rotation for Gala DEX Security Guard
# This script sets up automated log management to prevent disk space issues

echo "🔄 Setting up Log Rotation System"
echo "=================================="
echo ""

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Create the log management script that will run daily
create_daily_script() {
    cat > "$SCRIPT_DIR/daily-log-cleanup.sh" << 'EOF'
#!/bin/bash

# Daily log cleanup script
cd "$(dirname "$0")"

echo "================================================"
echo "Running daily log cleanup: $(date)"
echo "================================================"

# Run the log manager
node log-manager.js manage

# Check if we're running low on space
USAGE=$(node log-manager.js check 2>/dev/null | grep "Total:" | awk '{print $2}')
if [ ! -z "$USAGE" ]; then
    USAGE_NUM=$(echo $USAGE | sed 's/GB//')
    if (( $(echo "$USAGE_NUM > 3" | bc -l) )); then
        echo "⚠️  WARNING: Log storage exceeding 3GB!"
        # Could add email notification here
    fi
fi

echo "Cleanup complete: $(date)"
echo ""
EOF

    chmod +x "$SCRIPT_DIR/daily-log-cleanup.sh"
    echo "✅ Created daily-log-cleanup.sh"
}

# Setup cron job
setup_cron() {
    echo ""
    echo "Setting up cron job..."
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "daily-log-cleanup.sh"; then
        echo "⚠️  Cron job already exists"
    else
        # Add new cron job (runs at 3 AM daily)
        (crontab -l 2>/dev/null; echo "0 3 * * * $SCRIPT_DIR/daily-log-cleanup.sh >> $SCRIPT_DIR/log-cleanup.log 2>&1") | crontab -
        echo "✅ Added cron job to run at 3 AM daily"
    fi
}

# Create logrotate configuration (alternative to cron)
create_logrotate_config() {
    cat > "$SCRIPT_DIR/logrotate.conf" << EOF
# Logrotate configuration for security test results
$SCRIPT_DIR/security-results/*.json {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 $(whoami) $(whoami)
    maxage 30
    size 100M
}

$SCRIPT_DIR/security-alerts.log {
    weekly
    rotate 4
    compress
    delaycompress
    missingok
    notifempty
    create 0644 $(whoami) $(whoami)
}
EOF
    
    echo "✅ Created logrotate.conf"
    echo ""
    echo "To use logrotate, add to system configuration:"
    echo "  sudo cp $SCRIPT_DIR/logrotate.conf /etc/logrotate.d/gala-dex-security"
}

# Create manual cleanup script
create_manual_cleanup() {
    cat > "$SCRIPT_DIR/cleanup-now.sh" << 'EOF'
#!/bin/bash

echo "🧹 Manual Cleanup Tool"
echo "====================="
echo ""

# Function to show menu
show_menu() {
    echo "Choose cleanup option:"
    echo "1) Quick cleanup (delete files older than 7 days)"
    echo "2) Aggressive cleanup (delete files older than 3 days)"
    echo "3) Emergency cleanup (keep only last 24 hours)"
    echo "4) Compress all JSON files"
    echo "5) Delete all but critical findings"
    echo "6) Check disk usage"
    echo "7) Exit"
}

# Quick cleanup
quick_cleanup() {
    echo "Deleting files older than 7 days..."
    find security-results -name "*.json" -mtime +7 -delete
    echo "✅ Quick cleanup complete"
}

# Aggressive cleanup
aggressive_cleanup() {
    echo "Deleting files older than 3 days..."
    find security-results -name "*.json" -mtime +3 -delete
    echo "✅ Aggressive cleanup complete"
}

# Emergency cleanup
emergency_cleanup() {
    echo "⚠️  WARNING: This will delete all but the last 24 hours of data!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        find security-results -name "*.json" -mtime +1 -delete
        echo "✅ Emergency cleanup complete"
    else
        echo "Cancelled"
    fi
}

# Compress all
compress_all() {
    echo "Compressing all JSON files..."
    mkdir -p security-archives/compressed
    for file in security-results/*.json; do
        if [ -f "$file" ]; then
            gzip -c "$file" > "security-archives/compressed/$(basename $file).gz"
            rm "$file"
        fi
    done
    echo "✅ Compression complete"
}

# Main menu loop
while true; do
    show_menu
    read -p "Enter choice [1-7]: " choice
    
    case $choice in
        1) quick_cleanup ;;
        2) aggressive_cleanup ;;
        3) emergency_cleanup ;;
        4) compress_all ;;
        5) node log-manager.js manage ;;
        6) node log-manager.js check ;;
        7) echo "Goodbye!"; exit 0 ;;
        *) echo "Invalid option" ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    echo ""
done
EOF
    
    chmod +x "$SCRIPT_DIR/cleanup-now.sh"
    echo "✅ Created cleanup-now.sh for manual cleanup"
}

# Main setup
echo "1️⃣  Creating cleanup scripts..."
create_daily_script
create_manual_cleanup
create_logrotate_config

echo ""
echo "2️⃣  Setting up automation..."
echo "Would you like to set up automatic daily cleanup? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    setup_cron
else
    echo "⚠️  Skipping cron setup. You can run manually with:"
    echo "  ./daily-log-cleanup.sh"
fi

echo ""
echo "📊 Disk Space Management Strategy"
echo "================================="
echo ""
echo "Retention Policy:"
echo "  • Raw JSON files:      7 days"
echo "  • Compressed files:    30 days"
echo "  • Summary files:       90 days"
echo "  • Critical findings:   Forever"
echo ""
echo "With ~4,000 tests/day:"
echo "  • Daily growth:        ~100-200 MB"
echo "  • After compression:   ~30-60 MB"
echo "  • Monthly total:       ~1-2 GB"
echo "  • Yearly total:        ~12-24 GB"
echo ""
echo "Available Commands:"
echo "  node log-manager.js check     - Check current usage"
echo "  node log-manager.js predict   - Predict when disk will be full"
echo "  node log-manager.js manage    - Run cleanup now"
echo "  ./cleanup-now.sh              - Interactive cleanup menu"
echo "  ./daily-log-cleanup.sh        - Run daily cleanup"
echo ""
echo "✅ Log rotation setup complete!"
echo ""
echo "Next steps:"
echo "1. Run 'node log-manager.js check' to see current usage"
echo "2. Run 'node log-manager.js predict' to see growth projections"
echo "3. Optionally run './cleanup-now.sh' for immediate cleanup"