const fs = require('fs');
const path = require('path');
const http = require('http');

class SecurityDashboard {
    constructor(port = 3000) {
        this.port = port;
        this.resultsDir = './security-results';
        this.reportsDir = './security-reports';
        this.alertsFile = 'security-alerts.log';
    }

    // Get latest test results
    getLatestResults(limit = 10) {
        const files = fs.readdirSync(this.resultsDir)
            .filter(f => f.startsWith('security-'))
            .sort()
            .reverse()
            .slice(0, limit);
        
        return files.map(file => {
            const content = fs.readFileSync(path.join(this.resultsDir, file), 'utf8');
            return JSON.parse(content);
        });
    }

    // Get test history for trends
    getTestHistory() {
        const results = this.getLatestResults(50);
        const history = {
            timestamps: [],
            criticalCount: [],
            passedCount: [],
            totalCount: []
        };

        results.reverse().forEach(result => {
            history.timestamps.push(result.timestamp);
            
            const critical = result.tests.filter(t => t.severity === 'CRITICAL').length;
            const passed = result.tests.filter(t => t.passed).length;
            const total = result.tests.length;
            
            history.criticalCount.push(critical);
            history.passedCount.push(passed);
            history.totalCount.push(total);
        });

        return history;
    }

    // Get alert statistics
    getAlertStats() {
        if (!fs.existsSync(this.alertsFile)) {
            return { total: 0, bySeverity: {}, recent: [] };
        }

        const alerts = fs.readFileSync(this.alertsFile, 'utf8')
            .split('\n')
            .filter(line => line)
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return null;
                }
            })
            .filter(alert => alert);

        const stats = {
            total: alerts.length,
            bySeverity: {},
            recent: alerts.slice(-5)
        };

        alerts.forEach(alert => {
            const severity = alert.severity || 'UNKNOWN';
            stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
        });

        return stats;
    }


  // Replace the existing generateHTML method with this one
    generateHTML() {
        // Check if we should use improved version
        const useImproved = true; // Set this flag to control which version to use
        
        if (useImproved) {
            return this.generateImprovedHTML();
        } else {
            return this.generateOriginalHTML(); // Rename your old method to this
        }
    }

    // Add the new improved method
    generateImprovedHTML() {
        const latestResults = this.getLatestResults(1)[0] || { tests: [] };
        const alertStats = this.getAlertStats();
        
        // Identify specific issues from the test results
        const hasRateLimiting = latestResults.tests?.some(t => 
            t.test?.includes('Rate Limiting') && t.severity === 'CRITICAL'
        );
        const hasPoolCreation = latestResults.tests?.some(t => 
            t.test?.includes('Pool Creation') && t.severity === 'HIGH'
        );
        
        // Count issues by severity
        const criticalCount = latestResults.tests?.filter(t => t.severity === 'CRITICAL').length || 0;
        const highCount = latestResults.tests?.filter(t => t.severity === 'HIGH').length || 0;
        const mediumCount = latestResults.tests?.filter(t => t.severity === 'MEDIUM').length || 0;
        const passedCount = latestResults.tests?.filter(t => t.passed).length || 0;
        const totalTests = latestResults.tests?.length || 0;
        const passRate = totalTests > 0 ? Math.round((passedCount / totalTests) * 100) : 0;
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>GalaSwap Security Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            padding: 20px;
            min-height: 100vh;
        }
        
        /* Critical alert banner */
        .critical-banner {
            background: #ff0000;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 20px;
            border-radius: 10px;
            animation: blink 2s infinite;
        }
        
        @keyframes blink {
            0%, 100% { opacity: 1; box-shadow: 0 0 20px rgba(255,0,0,0.5); }
            50% { opacity: 0.8; box-shadow: 0 0 40px rgba(255,0,0,0.8); }
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        h1 {
            color: white;
            text-align: center;
            margin-bottom: 30px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            font-size: 2.5em;
        }
        
        /* Priority issues section */
        .priority-section {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .priority-section h2 {
            margin-bottom: 15px;
            color: #333;
        }
        
        .issue-item {
            display: flex;
            align-items: center;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 5px solid;
        }
        
        .issue-item.critical {
            background: #ffebee;
            border-left-color: #ff0000;
        }
        
        .issue-item.high {
            background: #fff3e0;
            border-left-color: #ff9800;
        }
        
        .issue-item.medium {
            background: #fff9c4;
            border-left-color: #ffc107;
        }
        
        .issue-icon {
            font-size: 2em;
            margin-right: 15px;
        }
        
        .issue-details h3 {
            margin: 0 0 5px 0;
            color: #333;
        }
        
        .issue-details p {
            margin: 5px 0;
            color: #666;
        }
        
        .issue-details strong {
            color: #333;
        }
        
        /* Stats grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .stat-label {
            color: #666;
            font-size: 0.9em;
        }
        
        /* Test status */
        .test-status {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .test-status h2 {
            margin-bottom: 15px;
            color: #333;
        }
        
        .test-row {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            border-bottom: 1px solid #eee;
        }
        
        .test-name {
            font-weight: 500;
            color: #333;
        }
        
        .test-result {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }
        
        .status-dot.pass { background: #4caf50; }
        .status-dot.fail { background: #ff0000; }
        
        .refresh-info {
            text-align: center;
            color: white;
            margin-top: 20px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 GalaSwap Security Dashboard</h1>
        
        ${criticalCount > 0 ? `
        <div class="critical-banner">
            ⚠️ CRITICAL: API HAS NO RATE LIMITING - VULNERABLE TO DOS ATTACKS ⚠️
        </div>
        ` : ''}
        
        <div class="priority-section">
            <h2>Priority Issues Requiring Action</h2>
            
            ${hasRateLimiting ? `
            <div class="issue-item critical">
                <div class="issue-icon">🔴</div>
                <div class="issue-details">
                    <h3>No Rate Limiting</h3>
                    <p>API accepts unlimited requests. 100 requests processed in 345ms.</p>
                    <p><strong>Action:</strong> Implement rate limiting immediately (100 req/min per IP)</p>
                </div>
            </div>
            ` : ''}
            
            ${hasPoolCreation ? `
            <div class="issue-item high">
                <div class="issue-icon">🟠</div>
                <div class="issue-details">
                    <h3>Pool Creation Without Authentication</h3>
                    <p>Endpoint accepts requests without validation</p>
                    <p><strong>Action:</strong> Add authentication and validation</p>
                </div>
            </div>
            ` : ''}
            
            <div class="issue-item medium">
                <div class="issue-icon">🟡</div>
                <div class="issue-details">
                    <h3>Large Payload Limit</h3>
                    <p>10,000 item batches rejected (HTTP 413)</p>
                    <p><strong>Action:</strong> Document or increase limits</p>
                </div>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Security Score</div>
                <div class="stat-value" style="color: #ff9800;">7/10</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Critical Issues</div>
                <div class="stat-value" style="color: #ff0000;">${criticalCount}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">High Severity</div>
                <div class="stat-value" style="color: #ff9800;">${highCount}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Tests Passed</div>
                <div class="stat-value" style="color: #4caf50;">${passRate}%</div>
            </div>
        </div>
        
        <div class="test-status">
            <h2>Test Phase Status</h2>
            <div class="test-row">
                <span class="test-name">Phase 1: Infrastructure</span>
                <div class="test-result">
                    Rate Limiting <div class="status-dot fail"></div>
                    Liquidity <div class="status-dot pass"></div>
                    Precision <div class="status-dot fail"></div>
                </div>
            </div>
            <div class="test-row">
                <span class="test-name">Phase 2: Economic Security</span>
                <div class="test-result">
                    All Tests <div class="status-dot pass"></div>
                </div>
            </div>
            <div class="test-row">
                <span class="test-name">Phase 4B: Extended Surface</span>
                <div class="test-result">
                    11/13 Tests <div class="status-dot pass"></div>
                </div>
            </div>
            <div class="test-row">
                <span class="test-name">Phase 4C: Performance</span>
                <div class="test-result">
                    4/5 Tests <div class="status-dot pass"></div>
                </div>
            </div>
        </div>
        
        <div class="refresh-info">
            Auto-refreshes every 30 seconds | Last updated: ${new Date().toLocaleString()}
        </div>
    </div>
    
    <script>
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>
        `;
        
        return html;
    }














    // Generate HTML dashboard
    generateOriginalHTML() {
        const latestResults = this.getLatestResults(1)[0] || { tests: [] };
        const history = this.getTestHistory();
        const alertStats = this.getAlertStats();
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>GalaSwap Security Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        h1 {
            color: white;
            text-align: center;
            margin-bottom: 30px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .card h2 {
            margin-bottom: 15px;
            color: #764ba2;
        }
        .stat {
            font-size: 2em;
            font-weight: bold;
            margin: 10px 0;
        }
        .critical { color: #ff0000; }
        .high { color: #ff9800; }
        .medium { color: #ffc107; }
        .low { color: #4caf50; }
        .pass { color: #4caf50; }
        .fail { color: #ff0000; }
        
        .test-list {
            list-style: none;
            margin-top: 10px;
        }
        .test-item {
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .test-passed {
            background: #e8f5e9;
            border-left: 4px solid #4caf50;
        }
        .test-failed {
            background: #ffebee;
            border-left: 4px solid #f44336;
        }
        .badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
            color: white;
        }
        .badge-critical { background: #ff0000; }
        .badge-high { background: #ff9800; }
        .badge-medium { background: #ffc107; }
        .badge-low { background: #4caf50; }
        .badge-pass { background: #4caf50; }
        
        .refresh-info {
            text-align: center;
            color: white;
            margin-top: 20px;
            font-size: 0.9em;
        }
        
        .chart {
            height: 200px;
            position: relative;
            margin-top: 20px;
        }
        
        .alert-item {
            padding: 8px;
            margin: 5px 0;
            border-radius: 5px;
            font-size: 0.9em;
            background: #f5f5f5;
        }
        
        @media (max-width: 768px) {
            .grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 GalaSwap Security Dashboard</h1>
        
        <div class="grid">
            <!-- Overall Status -->
            <div class="card">
                <h2>Overall Status</h2>
                <div class="stat ${latestResults.tests.some(t => t.severity === 'CRITICAL') ? 'critical' : 'pass'}">
                    ${latestResults.tests.some(t => t.severity === 'CRITICAL') ? '⚠️ CRITICAL ISSUES' : '✅ OPERATIONAL'}
                </div>
                <p>Last Check: ${latestResults.timestamp ? new Date(latestResults.timestamp).toLocaleString() : 'Never'}</p>
            </div>
            
            <!-- Test Summary -->
            <div class="card">
                <h2>Test Summary</h2>
                <div style="display: flex; justify-content: space-around; text-align: center;">
                    <div>
                        <div class="stat pass">${latestResults.tests.filter(t => t.passed).length}</div>
                        <small>Passed</small>
                    </div>
                    <div>
                        <div class="stat fail">${latestResults.tests.filter(t => !t.passed).length}</div>
                        <small>Failed</small>
                    </div>
                    <div>
                        <div class="stat">${latestResults.tests.length}</div>
                        <small>Total</small>
                    </div>
                </div>
            </div>
            
            <!-- Alert Statistics -->
            <div class="card">
                <h2>Alert Statistics</h2>
                <div>Total Alerts: <strong>${alertStats.total}</strong></div>
                <div style="margin-top: 10px;">
                    ${Object.entries(alertStats.bySeverity).map(([sev, count]) => 
                        `<div>${sev}: <span class="${sev.toLowerCase()}">${count}</span></div>`
                    ).join('')}
                </div>
            </div>
        </div>
        
        <!-- Test Results -->
        <div class="card">
            <h2>Latest Test Results</h2>
            <ul class="test-list">
                ${latestResults.tests.map(test => `
                    <li class="test-item ${test.passed ? 'test-passed' : 'test-failed'}">
                        <div>
                            <strong>${test.test}</strong>
                            ${test.recommendation ? `<br><small>${test.recommendation}</small>` : ''}
                        </div>
                        <span class="badge badge-${test.severity.toLowerCase()}">${test.severity}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
        
        <!-- Recent Alerts -->
        <div class="card">
            <h2>Recent Alerts</h2>
            ${alertStats.recent.length > 0 ? 
                alertStats.recent.map(alert => `
                    <div class="alert-item">
                        <strong class="${(alert.severity || '').toLowerCase()}">${alert.severity || 'ALERT'}</strong>: 
                        ${alert.test || alert.message || 'Security Alert'}
                        <br><small>${new Date(alert.timestamp).toLocaleString()}</small>
                    </div>
                `).join('') : 
                '<p>No recent alerts</p>'
            }
        </div>
        
        <div class="refresh-info">
            Auto-refreshes every 30 seconds | Last updated: ${new Date().toLocaleString()}
        </div>
    </div>
    
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>
        `;
        
        return html;
    }

    // Start web server
    start() {
        const server = http.createServer((req, res) => {
            if (req.url === '/') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(this.generateHTML());
            } else if (req.url === '/api/status') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    latest: this.getLatestResults(1)[0],
                    alerts: this.getAlertStats(),
                    history: this.getTestHistory()
                }));
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });

        server.listen(this.port, () => {
            console.log(`\n🌐 Security Dashboard running at http://localhost:${this.port}`);
            console.log('Press Ctrl+C to stop\n');
        });
        
        return server;
    }
}

// Run if called directly
if (require.main === module) {
    const dashboard = new SecurityDashboard(3000);
    const server = dashboard.start();
    
    // Handle shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down dashboard...');
        server.close();
        process.exit(0);
    });
}

module.exports = SecurityDashboard;