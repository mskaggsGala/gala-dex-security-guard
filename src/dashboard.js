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


    // Aggregate results from all test files

    aggregateResults() {
        const results = {};
        
        try {
            // Get latest file for each phase
            const files = fs.readdirSync(this.resultsDir)
                .filter(f => f.endsWith('.json'))
                .sort((a, b) => b.localeCompare(a)); // Sort newest first
            
            // Track which phases we've already found
            const foundPhases = new Set();
            
            for (const file of files) {
                const content = JSON.parse(
                    fs.readFileSync(path.join(this.resultsDir, file), 'utf-8')
                );
                
                if (content.phase && content.tests) {
                    // Extract phase number (Phase 1, Phase 2, etc.)
                    const phaseMatch = content.phase.match(/Phase \d+[A-Z]?/);
                    const phaseKey = phaseMatch ? phaseMatch[0] : content.phase;
                    
                    // Only use the first (newest) result for each phase
                    if (!foundPhases.has(phaseKey)) {
                        console.log(`Loading ${phaseKey} from ${file}`);
                        foundPhases.add(phaseKey);
                        results[phaseKey] = {
                            name: content.phase,
                            tests: content.tests.map(test => {
                                // Fix object serialization issues
                                
                                if (test.details && typeof test.details === 'object') {
                                    // Extract meaningful message from details
                                    if (test.details.message) {
                                        test.details = test.details.message;
                                    } else if (test.details.error) {
                                        test.details = test.details.error;
                                    } else if (test.details.requestsSent) {
                                        test.details = `${test.details.requestsSent} requests in ${test.details.duration}`;
                                    } else {
                                        test.details = 'Issue detected';
                                    }
                                }



                                return test;
                            })
                        };
                    }
                }
            }
            
        } catch (error) {
            console.error('Error aggregating results:', error);
        }
        
        return results;
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



    // Replace the generateImprovedHTML method in your dashboard.js with this complete version

   generateImprovedHTML() {
    const results = this.aggregateResults();
    
    // Calculate statistics
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = [];
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    Object.values(results).forEach(phase => {
        phase.tests.forEach(test => {
            totalTests++;
        // Check both formats: test.passed and test.status
            if (test.passed || test.status === 'PASS' || test.status === 'PROTECTED') {
                passedTests++;
            } else {
                failedTests.push({
                    phase: phase.name,
                    ...test
                });
                
                if (test.severity === 'CRITICAL') criticalCount++;
                else if (test.severity === 'HIGH') highCount++;
                else if (test.severity === 'MEDIUM') mediumCount++;
                else if (test.severity === 'LOW') lowCount++;
            }
        });
    });

    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    const securityScore = criticalCount > 0 ? 0 : (10 - highCount * 2 - mediumCount * 1);

    // Sort and deduplicate failed tests
    const severityOrder = { 'CRITICAL': 1, 'HIGH': 2, 'MEDIUM': 3, 'LOW': 4 };
    const uniqueTests = new Map();
    
    failedTests.forEach(test => {
        const testName = test.test || test.testName || test.name || 'Unknown Test';
        if (testName === 'Unknown Test') {
            console.log('Found Unknown Test:', test);
        }
        if (!uniqueTests.has(testName) || 
            severityOrder[test.severity] < severityOrder[uniqueTests.get(testName).severity]) {
            uniqueTests.set(testName, test);
        }
    });

    const sortedTests = Array.from(uniqueTests.values()).sort((a, b) => 
        severityOrder[a.severity] - severityOrder[b.severity]
    );

    // Build priority issues HTML
    let issuesHTML = '';
    sortedTests.forEach(test => {
        const testName = test.test || test.testName || test.name || 'Unknown Test';
        const severityClass = test.severity.toLowerCase();
        const bgColor = {
            'critical': '#ffebee',
            'high': '#fff3e0',
            'medium': '#fffde7',
            'low': '#f3e5f5'
        }[severityClass] || '#f5f5f5';

        issuesHTML += `
            <div style="background: ${bgColor}; padding: 15px; margin: 10px 0; border-left: 4px solid ${
                test.severity === 'CRITICAL' ? '#f44336' : 
                test.severity === 'HIGH' ? '#ff9800' : 
                test.severity === 'MEDIUM' ? '#ffc107' : '#9c27b0'
            };">
                <div style="display: flex; align-items: center;">
                    <span style="font-size: 24px; margin-right: 15px;">${
                        test.severity === 'CRITICAL' ? '🔴' : 
                        test.severity === 'HIGH' ? '🟠' : 
                        test.severity === 'MEDIUM' ? '🟡' : '🟣'
                    }</span>
                    <div style="flex: 1;">
                        <strong style="font-size: 16px;">${testName}</strong>
                        <div style="color: #666; margin-top: 5px;">${test.details || 'Issue detected'}</div>
                        <div style="margin-top: 5px;"><strong>Action:</strong> ${test.recommendation || 'Review and fix'}</div>
                    </div>
                </div>
            </div>`;
    });

    // Build phase status HTML
    let phaseStatusHTML = '';
    Object.keys(results).forEach(phaseKey => {
        const phase = results[phaseKey];
        const phasePassed = phase.tests.filter(t => t.passed || t.status === 'PASS' || t.status === 'PROTECTED').length;
        const phaseTotal = phase.tests.length;
        const phaseIssues = phase.tests.filter(t => !t.passed);
        
        const phaseCritical = phaseIssues.filter(t => t.severity === 'CRITICAL').length;
        const phaseHigh = phaseIssues.filter(t => t.severity === 'HIGH').length;
        const phaseMedium = phaseIssues.filter(t => t.severity === 'MEDIUM').length;
        const phaseLow = phaseIssues.filter(t => t.severity === 'LOW').length;

        let issuesBadges = '';
        if (phaseCritical > 0) issuesBadges += `<span style="background: #f44336; color: white; padding: 2px 8px; border-radius: 3px; margin-right: 5px;">Critical: ${phaseCritical}</span>`;
        if (phaseHigh > 0) issuesBadges += `<span style="background: #ff9800; color: white; padding: 2px 8px; border-radius: 3px; margin-right: 5px;">High: ${phaseHigh}</span>`;
        if (phaseMedium > 0) issuesBadges += `<span style="background: #ffc107; color: #333; padding: 2px 8px; border-radius: 3px; margin-right: 5px;">Medium: ${phaseMedium}</span>`;
        if (phaseLow > 0) issuesBadges += `<span style="background: #9c27b0; color: white; padding: 2px 8px; border-radius: 3px; margin-right: 5px;">Low: ${phaseLow}</span>`;
        
        if (!issuesBadges) {
            issuesBadges = '<span style="color: #4caf50;">All Tests ✓</span>';
        }

        phaseStatusHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #ddd;">
                <div style="font-weight: bold;">${phase.name}</div>
                <div style="display: flex; align-items: center;">
                    ${issuesBadges}
                    <span style="margin-left: 20px; font-weight: bold;">${phasePassed}/${phaseTotal} Tests</span>
                    <span style="margin-left: 10px; font-size: 20px;">${phaseIssues.length === 0 ? '🟢' : '🔴'}</span>
                </div>
            </div>`;
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>GalaSwap Security Dashboard</title>
            <meta http-equiv="refresh" content="30">
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
                .header { background: rgba(255,255,255,0.95); padding: 25px; border-radius: 10px; margin-bottom: 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .alert-bar { background: #f44336; color: white; padding: 15px; border-radius: 10px; margin-bottom: 20px; display: flex; align-items: center; }
                .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 20px; }
                .metric-card { background: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .priority-issues { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .phase-status { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .footer { text-align: center; color: white; padding: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0; color: #333;">🔒 GalaSwap Security Dashboard</h1>
                </div>
                
                ${criticalCount > 0 ? `
                <div class="alert-bar">
                    <span style="font-size: 24px; margin-right: 10px;">⚠️</span>
                    <strong>CRITICAL: ${sortedTests.find(t => t.severity === 'CRITICAL')?.test || 'Security Issue'} | ${sortedTests.find(t => t.severity === 'CRITICAL')?.details || 'Immediate action required'}</strong>
                    <span style="margin-left: 10px;">⚠️</span>
                </div>` : ''}
                
                <div class="priority-issues">
                    <h2 style="margin-top: 0;">Priority Issues Requiring Action</h2>
                    ${issuesHTML || '<p style="color: #4caf50;">✓ All tests passing - no issues detected</p>'}
                </div>
                
                <div class="metrics">
                    <div class="metric-card">
                        <div style="font-size: 14px; color: #666;">Security Score</div>
                        <div style="font-size: 36px; font-weight: bold; color: ${securityScore < 5 ? '#f44336' : '#4caf50'};">${Math.max(0, securityScore)}/10</div>
                    </div>
                    <div class="metric-card">
                        <div style="font-size: 14px; color: #666;">Critical Issues</div>
                        <div style="font-size: 36px; font-weight: bold; color: #f44336;">${criticalCount}</div>
                    </div>
                    <div class="metric-card">
                        <div style="font-size: 14px; color: #666;">High Severity</div>
                        <div style="font-size: 36px; font-weight: bold; color: #ff9800;">${highCount}</div>
                    </div>
                    <div class="metric-card">
                        <div style="font-size: 14px; color: #666;">Tests Passed</div>
                        <div style="font-size: 36px; font-weight: bold; color: ${passRate > 80 ? '#4caf50' : '#ff9800'};">${passRate}%</div>
                    </div>
                </div>
                
                <div class="phase-status">
                    <h2 style="margin-top: 0;">Test Phase Status</h2>
                    ${phaseStatusHTML}
                </div>
                
                <div class="footer">
                    <p>Auto-refreshes every 30 seconds | Last updated: ${new Date().toLocaleString()}</p>
                </div>
            </div>
        </body>
        </html>`;
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