#!/bin/bash

# Startup script for continuous security monitoring
# This ensures proper environment setup

echo "🚀 Starting Gala DEX Security Guard - Continuous Mode"
echo "====================================================="

# Navigate to project directory
cd /Users/markskaggs/Documents/Projects/gala-dex-security-guard

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Stop any existing scheduler
echo "🛑 Stopping any existing schedulers..."
pkill -f "scheduler.js" 2>/dev/null
pkill -f "continuous-scheduler.js" 2>/dev/null
sleep 2

# Start continuous monitoring
echo "🔄 Starting continuous security monitoring..."
echo "This will run ~4,000 tests per day (12x more than standard mode)"
echo ""

# Run the continuous scheduler
node src/continuous-scheduler.js

# If continuous scheduler fails, fall back to regular scheduler
if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  Continuous scheduler failed, starting standard scheduler..."
    node src/scheduler.js
fi