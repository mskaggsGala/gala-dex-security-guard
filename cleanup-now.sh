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
