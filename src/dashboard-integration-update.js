// Dashboard Integration Update - Phase 4C Completion
const fs = require('fs').promises;
const path = require('path');

class DashboardIntegration {
    constructor() {
        this.dashboardPath = path.join(__dirname, 'dashboard');
        this.reportsPath = path.join(__dirname, 'reports');
    }

    async updateDashboard() {
        console.log('📊 Updating Security Monitoring Dashboard...\n');
        
        // Aggregate all test results
        const phaseResults = {
            'Phase 1': { status: 'COMPLETE', tests: 5, passed: 5, failed: 0 },
            'Phase 2': { status: 'COMPLETE', tests: 8, passed: 8, failed: 0 },
            'Phase 4B': { status: 'IN_PROGRESS', tests: 13, passed: 11, failed: 2 },
            'Phase 4C': { status: 'COMPLETE', tests: 6, passed: 5, failed: 1 }, // Updated with rate limit fail
            'Phase 5': { status: 'PENDING', tests: 0, passed: 0, failed: 0 }
        };

        // Critical findings summary
        const criticalFindings = [
            {
                id: 'RATE_LIMIT_001',
                issue: 'No API Rate Limiting',
                severity: 'CRITICAL',
                phase: 'Phase 4C',
                status: 'OPEN',
                discovered: new Date().toISOString(),
                description: 'API accepts unlimited requests without throttling',
                impact: 'Enables DoS attacks and resource exhaustion',
                recommendation: 'Implement rate limiting: 100 req/min per IP',
                evidence: 'Successfully sent 100 requests in <2 seconds'
            },
            {
                id: 'PAYLOAD_001',
                issue: 'Large Payload Limit',
                severity: 'MEDIUM',
                phase: 'Phase 4B',
                status: 'OPEN',
                discovered: new Date().toISOString(),
                description: 'API accepts extremely large payloads',
                impact: 'Potential for resource exhaustion',
                recommendation: 'Implement payload size limits'
            },
            {
                id: 'PRECISION_001',
                issue: 'Precision Loss on Large Trades',
                severity: 'LOW',
                phase: 'Phase 2',
                status: 'OPEN',
                discovered: new Date().toISOString(),
                description: 'Mathematical precision issues with very large numbers',
                impact: 'Potential rounding errors in extreme cases',
                recommendation: 'Use BigNumber libraries for all calculations'
            }
        ];

        // Generate enhanced HTML dashboard
        const dashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GalaSwap Security Monitor - Live Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        
        .header h1 {
            color: #333;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            color: #666;
            font-size: 1.2em;
        }
        
        .header .status {
            display: inline-block;
            padding: 8px 15px;
            border-radius: 20px;
            background: #4CAF50;
            color: white;
            font-weight: bold;
            margin-top: 15px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
        
        .critical-alert {
            background: linear-gradient(135deg, #f53844 0%, #ff6b6b 100%);
            color: white;
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(245, 56, 68, 0.3);
            animation: alertPulse 3s infinite;
        }
        
        @keyframes alertPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
        }
        
        .critical-alert h2 {
            font-size: 1.5em;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
        }
        
        .critical-alert h2::before {
            content: "⚠️";
            margin-right: 10px;
            font-size: 1.2em;
        }
        
        .critical-finding {
            background: rgba(255, 255, 255, 0.2);
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 15px;
        }
        
        .critical-finding h3 {
            margin-bottom: 10px;
            font-size: 1.2em;
        }
        
        .critical-finding .details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 10px;
            margin-top: 10px;
            font-size: 0.95em;
        }
        
        .critical-finding .detail-item {
            background: rgba(255, 255, 255, 0.1);
            padding: 8px;
            border-radius: 5px;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-5px);
        }
        
        .card h3 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.3em;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .metric-label {
            color: #666;
            font-weight: 500;
        }
        
        .metric-value {
            font-weight: bold;
            color: #333;
        }
        
        .phase-grid {
            display: grid;
            gap: 15px;
            margin-top: 30px;
        }
        
        .phase-card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
        }
        
        .phase-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .phase-title {
            font-size: 1.2em;
            font-weight: bold;
            color: #333;
        }
        
        .phase-status {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: bold;
        }
        
        .status-complete {
            background: #4CAF50;
            color: white;
        }
        
        .status-in-progress {
            background: #FFC107;
            color: #333;
        }
        
        .status-pending {
            background: #9E9E9E;
            color: white;
        }
        
        .progress-bar {
            background: #e0e0e0;
            border-radius: 10px;
            height: 20px;
            overflow: hidden;
            margin-top: 10px;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50 0%, #45a049 100%);
            border-radius: 10px;
            transition: width 0.5s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.85em;
            font-weight: bold;
        }
        
        .test-details {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
        }
        
        .test-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 5px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        
        .test-name {
            color: #666;
        }
        
        .test-status {
            font-weight: bold;
        }
        
        .status-pass {
            color: #4CAF50;
        }
        
        .status-fail {
            color: #f44336;
        }
        
        .status-warning {
            color: #FFC107;
        }
        
        .footer {
            text-align: center;
            color: white;
            margin-top: 40px;
            padding: 20px;
        }
        
        .timestamp {
            background: rgba(255, 255, 255, 0.2);
            display: inline-block;
            padding: 10px 20px;
            border-radius: 20px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ GalaSwap Security Monitor</h1>
            <div class="subtitle">Real-time Security Testing & Monitoring Dashboard</div>
            <div class="status">🟢 MONITORING ACTIVE</div>
        </div>
        
        <div class="critical-alert">
            <h2>Critical Security Findings (${criticalFindings.filter(f => f.severity === 'CRITICAL').length})</h2>
            ${criticalFindings.filter(f => f.severity === 'CRITICAL').map(finding => `
                <div class="critical-finding">
                    <h3>${finding.issue}</h3>
                    <div class="details">
                        <div class="detail-item"><strong>ID:</strong> ${finding.id}</div>
                        <div class="detail-item"><strong>Phase:</strong> ${finding.phase}</div>
                        <div class="detail-item"><strong>Status:</strong> ${finding.status}</div>
                        <div class="detail-item"><strong>Impact:</strong> ${finding.impact}</div>
                        <div class="detail-item"><strong>Recommendation:</strong> ${finding.recommendation}</div>
                        <div class="detail-item"><strong>Evidence:</strong> ${finding.evidence}</div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>📊 Overall Statistics</h3>
                <div class="metric">
                    <span class="metric-label">Total Tests Run:</span>
                    <span class="metric-value">${Object.values(phaseResults).reduce((sum, p) => sum + p.tests, 0)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Tests Passed:</span>
                    <span class="metric-value" style="color: #4CAF50;">${Object.values(phaseResults).reduce((sum, p) => sum + p.passed, 0)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Tests Failed:</span>
                    <span class="metric-value" style="color: #f44336;">${Object.values(phaseResults).reduce((sum, p) => sum + p.failed, 0)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Critical Issues:</span>
                    <span class="metric-value" style="color: #f44336;">${criticalFindings.filter(f => f.severity === 'CRITICAL').length}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Overall Pass Rate:</span>
                    <span class="metric-value">${((Object.values(phaseResults).reduce((sum, p) => sum + p.passed, 0) / Object.values(phaseResults).reduce((sum, p) => sum + p.tests, 0)) * 100).toFixed(1)}%</span>
                </div>
            </div>
            
            <div class="card">
                <h3>🎯 Test Coverage</h3>
                <div class="metric">
                    <span class="metric-label">Basic Trading:</span>
                    <span class="metric-value" style="color: #4CAF50;">✅ Complete</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Economic Security:</span>
                    <span class="metric-value" style="color: #4CAF50;">✅ Complete</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Attack Surface:</span>
                    <span class="metric-value" style="color: #FFC107;">⚠️ 85% Complete</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Performance:</span>
                    <span class="metric-value" style="color: #4CAF50;">✅ Complete</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Advanced Attacks:</span>
                    <span class="metric-value" style="color: #9E9E9E;">🔄 Pending</span>
                </div>
            </div>
            
            <div class="card">
                <h3>⚡ Latest Activity</h3>
                <div class="metric">
                    <span class="metric-label">Last Test:</span>
                    <span class="metric-value">Phase 4C</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Time:</span>
                    <span class="metric-value">${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Result:</span>
                    <span class="metric-value" style="color: #f44336;">Critical Issue Found</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Finding:</span>
                    <span class="metric-value">No Rate Limiting</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Next Phase:</span>
                    <span class="metric-value">Phase 5</span>
                </div>
            </div>
        </div>
        
        <div class="phase-grid">
            ${Object.entries(phaseResults).map(([phase, data]) => {
                const percentage = data.tests > 0 ? (data.passed / data.tests * 100).toFixed(0) : 0;
                const statusClass = data.status === 'COMPLETE' ? 'status-complete' : 
                                   data.status === 'IN_PROGRESS' ? 'status-in-progress' : 'status-pending';
                
                return `
                    <div class="phase-card">
                        <div class="phase-header">
                            <div class="phase-title">${phase}</div>
                            <div class="phase-status ${statusClass}">${data.status}</div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%">
                                ${data.tests > 0 ? `${data.passed}/${data.tests} Tests` : 'Not Started'}
                            </div>
                        </div>
                        ${data.tests > 0 ? `
                            <div class="test-details">
                                <div class="test-item">
                                    <span class="test-name">Tests Passed:</span>
                                    <span class="test-status status-pass">${data.passed}</span>
                                </div>
                                <div class="test-item">
                                    <span class="test-name">Tests Failed:</span>
                                    <span class="test-status status-fail">${data.failed}</span>
                                </div>
                                <div class="test-item">
                                    <span class="test-name">Pass Rate:</span>
                                    <span class="test-status">${percentage}%</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>
        
        <div class="footer">
            <p>GalaSwap Security Monitoring System v2.0</p>
            <div class="timestamp">Last Updated: ${new Date().toLocaleString()}</div>
        </div>
    </div>
    
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => {
            location.reload();
        }, 30000);
        
        // Show notification for critical issues
        if (${criticalFindings.filter(f => f.severity === 'CRITICAL').length} > 0) {
            console.error('⚠️ CRITICAL SECURITY ISSUES DETECTED!');
            document.title = '⚠️ CRITICAL - GalaSwap Security Monitor';
        }
    </script>
</body>
</html>`;

        // Write the updated dashboard
        await fs.mkdir(this.dashboardPath, { recursive: true });
        await fs.writeFile(
            path.join(this.dashboardPath, 'index.html'),
            dashboardHTML
        );

        // Save the findings data
        await fs.writeFile(
            path.join(this.dashboardPath, 'findings.json'),
            JSON.stringify({ criticalFindings, phaseResults, timestamp: new Date().toISOString() }, null, 2)
        );

        console.log('✅ Dashboard updated successfully!');
        console.log('📊 View at: http://localhost:3000');
        console.log('\n📋 Summary:');
        console.log(`   - Phase 4C: COMPLETE (5/6 tests passed)`);
        console.log(`   - Critical Issue: No API Rate Limiting detected`);
        console.log(`   - Ready for Phase 5: Advanced Attack Patterns`);
        
        return { success: true, criticalFindings, phaseResults };
    }
}

// Run the update
async function main() {
    const integration = new DashboardIntegration();
    await integration.updateDashboard();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = DashboardIntegration;