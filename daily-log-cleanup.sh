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
