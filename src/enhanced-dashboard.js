const fs = require('fs');
const path = require('path');
const http = require('http');
const remediationGuide = require('./remediation-guide');

class EnhancedSecurityDashboard {
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

    // Aggregate results from all test files
    aggregateResults() {
        const results = {};
        
        try {
            const files = fs.readdirSync(this.resultsDir)
                .filter(f => f.endsWith('.json'))
                .sort((a, b) => b.localeCompare(a));
            
            const foundPhases = new Set();
            
            for (const file of files) {
                const content = JSON.parse(
                    fs.readFileSync(path.join(this.resultsDir, file), 'utf-8')
                );
                
                if (content.phase && content.tests) {
                    const phaseMatch = content.phase.match(/Phase \d+[A-Z]?/);
                    let phaseKey;
                    if (phaseMatch) {
                        phaseKey = phaseMatch[0];
                    } else if (content.phase.includes('Phase')) {
                        // Handle "Phase 5 - Description" format
                        const parts = content.phase.split(' - ');
                        phaseKey = parts[0];
                    } else {
                        phaseKey = content.phase;
                    }
                    
                    if (!foundPhases.has(phaseKey)) {
                        foundPhases.add(phaseKey);
                        results[phaseKey] = {
                            name: content.phase,
                            tests: content.tests.map(test => {
                                // Normalize test structure
                                const normalizedTest = {
                                    name: test.name || test.test || test.testName || 'Unknown Test',
                                    category: test.category || '',
                                    severity: test.severity || 'MEDIUM',
                                    passed: test.passed === true || test.status === 'PASS' || test.status === 'PROTECTED',
                                    status: test.status || (test.passed === true ? 'PASS' : test.passed === false ? 'FAIL' : 'UNKNOWN'),
                                    details: test.details || test.findings || test.message || test.error || '',
                                    metrics: test.metrics || null,
                                    recommendation: test.recommendation || null
                                };
                                
                                // Convert complex details to readable string
                                if (typeof normalizedTest.details === 'object') {
                                    if (Array.isArray(normalizedTest.details)) {
                                        // Handle array of details
                                        if (normalizedTest.details.length > 0 && typeof normalizedTest.details[0] === 'object') {
                                            // Array of objects - extract meaningful info
                                            // Special handling for Pool Creation Security
                                            if (normalizedTest.name === 'Pool Creation Security' && 
                                                normalizedTest.details[0].result && 
                                                normalizedTest.details[0].result.includes('VULNERABILITY')) {
                                                const uniqueIssues = [...new Set(normalizedTest.details.map(d => d.test))];
                                                normalizedTest.details = `Unauthorized pool creation allowed - ${uniqueIssues.length} vulnerability test${uniqueIssues.length > 1 ? 's' : ''} failed`;
                                            } else {
                                                const extracted = normalizedTest.details
                                                    .map(d => {
                                                        if (typeof d === 'string') return d;
                                                        if (d.result) return d.result;
                                                        if (d.message) return d.message;
                                                        if (d.case) return d.case;
                                                        if (d.finding) return d.finding;
                                                        return null;
                                                    })
                                                    .filter(d => d !== null);
                                                
                                                if (extracted.length > 0) {
                                                    // Remove duplicates and clean up
                                                    const unique = [...new Set(extracted)];
                                                    if (unique.length === 1 && unique[0].includes('VULNERABILITY')) {
                                                        normalizedTest.details = 'Security vulnerability detected';
                                                    } else {
                                                        normalizedTest.details = unique.join(', ');
                                                    }
                                                } else {
                                                    normalizedTest.details = 'Multiple issues detected';
                                                }
                                            }
                                        } else if (normalizedTest.details.length > 0 && typeof normalizedTest.details[0] === 'string') {
                                            // Array of strings - check for special patterns
                                            const joined = normalizedTest.details.join(', ');
                                            // Clean up common patterns
                                            if (joined.includes('VULNERABILITY')) {
                                                normalizedTest.details = 'Vulnerability detected in pool creation';
                                            } else {
                                                normalizedTest.details = joined;
                                            }
                                        } else {
                                            normalizedTest.details = 'Details available';
                                        }
                                    } else {
                                        // Object - extract key information
                                        if (normalizedTest.details.message) {
                                            normalizedTest.details = normalizedTest.details.message;
                                        } else if (normalizedTest.details.error) {
                                            normalizedTest.details = normalizedTest.details.error;
                                        } else if (normalizedTest.details.exposedInfo) {
                                            normalizedTest.details = normalizedTest.details.exposedInfo;
                                        } else if (normalizedTest.details.note) {
                                            normalizedTest.details = normalizedTest.details.note;
                                        } else if (normalizedTest.details.requestsSent !== undefined && normalizedTest.details.successful !== undefined) {
                                            // Rate limiting test result
                                            normalizedTest.details = `${normalizedTest.details.requestsSent} requests sent, ${normalizedTest.details.successful} succeeded - No rate limiting detected`;
                                        } else if (normalizedTest.details.testCases !== undefined && normalizedTest.details.issuesFound !== undefined) {
                                            // Precision test result
                                            normalizedTest.details = `${normalizedTest.details.issuesFound} precision issues found in ${normalizedTest.details.testCases} test cases`;
                                        } else {
                                            // Try to extract something meaningful
                                            const keys = Object.keys(normalizedTest.details);
                                            if (keys.length > 0) {
                                                // Format key-value pairs more nicely
                                                const formatted = keys.map(k => {
                                                    const value = normalizedTest.details[k];
                                                    if (k === 'requestsSent') return `${value} requests sent`;
                                                    if (k === 'successful') return `${value} succeeded`;
                                                    if (k === 'testCases') return `${value} tests`;
                                                    if (k === 'issuesFound') return `${value} issues found`;
                                                    return `${k}: ${value}`;
                                                }).slice(0, 3).join(', ');
                                                normalizedTest.details = formatted;
                                            } else {
                                                normalizedTest.details = 'Issue detected';
                                            }
                                        }
                                    }
                                }
                                
                                return normalizedTest;
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

    // Generate phase status HTML
    generatePhaseStatusHTML(results) {
        let phaseStatusHTML = '';
        
        Object.keys(results).forEach(phaseKey => {
            const phase = results[phaseKey];
            const phasePassed = phase.tests.filter(t => t.passed).length;
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
                issuesBadges = '<span style="color: #4caf50;">✅ All Tests Passing</span>';
            }

            phaseStatusHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #e0e0e0;">
                    <div style="font-weight: bold; color: #333;">${phase.name}</div>
                    <div style="display: flex; align-items: center;">
                        ${issuesBadges}
                        <span style="margin-left: 20px; font-weight: bold; color: #555;">${phasePassed}/${phaseTotal} Tests</span>
                        <span style="margin-left: 10px; font-size: 20px;">${phaseIssues.length === 0 ? '🟢' : '🔴'}</span>
                    </div>
                </div>`;
        });
        
        return phaseStatusHTML;
    }

    // Generate the enhanced HTML dashboard
    generateEnhancedHTML() {
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
                if (test.passed) {
                    passedTests++;
                } else if (test.passed === false) {
                    // Only count as failed if explicitly false, not null/undefined
                    failedTests.push({
                        phase: phase.name,
                        ...test
                    });
                    
                    if (test.severity === 'CRITICAL') criticalCount++;
                    else if (test.severity === 'HIGH') highCount++;
                    else if (test.severity === 'MEDIUM') mediumCount++;
                    else if (test.severity === 'LOW') lowCount++;
                } else if (test.severity === 'INFO' || test.status === 'UNKNOWN') {
                    // Informational tests or tests with unknown status
                    // Don't count as passed or failed
                }
            });
        });

        const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
        const securityScore = criticalCount > 0 ? 0 : Math.max(0, 10 - highCount * 2 - mediumCount * 1);

        // Sort failed tests by severity
        const severityOrder = { 'CRITICAL': 1, 'HIGH': 2, 'MEDIUM': 3, 'LOW': 4 };
        const uniqueTests = new Map();
        
        failedTests.forEach(test => {
            if (!uniqueTests.has(test.name) || 
                severityOrder[test.severity] < severityOrder[uniqueTests.get(test.name).severity]) {
                uniqueTests.set(test.name, test);
            }
        });

        const sortedTests = Array.from(uniqueTests.values()).sort((a, b) => 
            severityOrder[a.severity] - severityOrder[b.severity]
        );

        // Build issue cards with remediation data
        let issuesHTML = '';
        sortedTests.forEach((test, index) => {
            // Try to find remediation by test name, or by name without category prefix
            let remediation = remediationGuide[test.name] || {};
            
            // If not found and name includes category, try without category
            if (!remediation.description && test.name.includes(': ')) {
                const nameWithoutCategory = test.name.split(': ')[1];
                remediation = remediationGuide[nameWithoutCategory] || {};
            }
            
            // Also try the original test name from the data
            if (!remediation.description && test.category) {
                // Remove category prefix if it was added for display
                const originalName = test.name.replace(`${test.category}: `, '');
                remediation = remediationGuide[originalName] || {};
            }
            
            const severityClass = test.severity.toLowerCase();
            const bgColor = {
                'critical': '#ffebee',
                'high': '#fff3e0',
                'medium': '#fffde7',
                'low': '#f3e5f5'
            }[severityClass] || '#f5f5f5';

            const borderColor = {
                'critical': '#f44336',
                'high': '#ff9800',
                'medium': '#ffc107',
                'low': '#9c27b0'
            }[severityClass] || '#999';

            const severityIcon = {
                'critical': '🔴',
                'high': '🟠',
                'medium': '🟡',
                'low': '🟣'
            }[severityClass] || '⚪';

            const displayName = test.category && test.name !== test.category ? 
                `${test.category}: ${test.name}` : test.name;
            
            issuesHTML += `
                <div class="issue-card" style="background: ${bgColor}; border-left-color: ${borderColor};">
                    <div class="issue-header" onclick="toggleIssueDetails('issue-${index}')">
                        <div class="issue-title">
                            <span class="severity-icon">${severityIcon}</span>
                            <strong>${displayName}</strong>
                            <span class="severity-badge ${severityClass}">${test.severity}</span>
                        </div>
                        <div class="issue-summary">${test.details || test.recommendation || remediation.description || 'Issue detected'}</div>
                        <div class="expand-icon" id="expand-${index}">▼</div>
                    </div>
                    
                    <div class="issue-details" id="issue-${index}" style="display: none;">
                        ${remediation.impact || remediation.description ? `
                        <div class="detail-section">
                            <h4>🎯 Impact</h4>
                            <p>${remediation.impact || remediation.description || 'This issue requires immediate attention'}</p>
                        </div>` : `
                        <div class="detail-section">
                            <h4>ℹ️ Issue Details</h4>
                            <p><strong>Test:</strong> ${test.name}</p>
                            <p><strong>Status:</strong> ${test.status || 'Failed'}</p>
                            <p><strong>Details:</strong> ${test.details || 'No additional details available'}</p>
                            ${test.recommendation ? `<p><strong>Recommendation:</strong> ${test.recommendation}</p>` : ''}
                        </div>`}
                        
                        ${remediation.howTestWasRun ? `
                        <div class="detail-section">
                            <h4>🧪 How This Test Was Run</h4>
                            <p><strong>Method:</strong> ${remediation.howTestWasRun.method}</p>
                            <p>${remediation.howTestWasRun.details}</p>
                            ${remediation.howTestWasRun.code ? `
                            <pre class="code-block">${remediation.howTestWasRun.code}</pre>` : ''}
                            <p><strong>Expected:</strong> ${remediation.howTestWasRun.expectedBehavior}</p>
                            <p><strong>Actual:</strong> ${remediation.howTestWasRun.actualBehavior}</p>
                        </div>` : ''}
                        
                        ${remediation.remediation ? `
                        <div class="detail-section">
                            <h4>🔧 How to Fix</h4>
                            <div class="remediation-steps">
                                <h5>Immediate Actions:</h5>
                                <ul>
                                    ${remediation.remediation.immediate.map(step => `<li>${step}</li>`).join('')}
                                </ul>
                                
                                ${remediation.remediation.implementation ? `
                                <h5>Implementation Example:</h5>
                                <pre class="code-block">${remediation.remediation.implementation}</pre>` : ''}
                                
                                ${remediation.remediation.testing ? `
                                <h5>Testing Checklist:</h5>
                                <ul>
                                    ${remediation.remediation.testing.map(step => `<li>${step}</li>`).join('')}
                                </ul>` : ''}
                            </div>
                        </div>` : ''}
                        
                        ${test.metrics ? `
                        <div class="detail-section">
                            <h4>📊 Metrics</h4>
                            <pre class="metrics-block">${JSON.stringify(test.metrics, null, 2)}</pre>
                        </div>` : ''}
                    </div>
                </div>`;
        });

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>GalaSwap Security Dashboard - Enhanced</title>
                <meta http-equiv="refresh" content="30">
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                    }
                    .container { 
                        max-width: 1400px; 
                        margin: 0 auto; 
                        padding: 20px; 
                    }
                    .header { 
                        background: rgba(255,255,255,0.98); 
                        padding: 30px; 
                        border-radius: 12px; 
                        margin-bottom: 20px; 
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }
                    .header h1 {
                        color: #333;
                        margin-bottom: 10px;
                    }
                    .header-stats {
                        display: flex;
                        gap: 20px;
                        margin-top: 15px;
                        flex-wrap: wrap;
                    }
                    .stat-badge {
                        background: #f5f5f5;
                        padding: 8px 16px;
                        border-radius: 20px;
                        font-size: 14px;
                    }
                    .alert-bar { 
                        background: #f44336; 
                        color: white; 
                        padding: 15px 20px; 
                        border-radius: 8px; 
                        margin-bottom: 20px; 
                        display: flex; 
                        align-items: center;
                        animation: pulse 2s infinite;
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.9; }
                    }
                    .metrics { 
                        display: grid; 
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                        gap: 20px; 
                        margin-bottom: 30px; 
                    }
                    .metric-card { 
                        background: white; 
                        padding: 25px; 
                        border-radius: 12px; 
                        text-align: center; 
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        transition: transform 0.2s;
                    }
                    .metric-card:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 12px rgba(0,0,0,0.15);
                    }
                    .metric-label {
                        font-size: 14px;
                        color: #666;
                        margin-bottom: 10px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .metric-value {
                        font-size: 42px;
                        font-weight: bold;
                        line-height: 1;
                    }
                    .issues-container { 
                        background: white; 
                        padding: 30px; 
                        border-radius: 12px; 
                        margin-bottom: 20px; 
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }
                    .phase-status { 
                        background: white; 
                        padding: 30px; 
                        border-radius: 12px; 
                        margin-bottom: 20px; 
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }
                    .phase-status h2 {
                        margin-top: 0;
                        margin-bottom: 20px;
                        color: #333;
                    }
                    .issue-card {
                        margin: 15px 0;
                        padding: 0;
                        border-left: 4px solid;
                        border-radius: 8px;
                        overflow: hidden;
                        transition: all 0.3s;
                    }
                    .issue-card:hover {
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    }
                    .issue-header {
                        padding: 20px;
                        cursor: pointer;
                        position: relative;
                        user-select: none;
                    }
                    .issue-header:hover {
                        background: rgba(0,0,0,0.02);
                    }
                    .issue-title {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        margin-bottom: 8px;
                    }
                    .severity-icon {
                        font-size: 24px;
                    }
                    .severity-badge {
                        padding: 4px 12px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: bold;
                        text-transform: uppercase;
                    }
                    .severity-badge.critical { background: #f44336; color: white; }
                    .severity-badge.high { background: #ff9800; color: white; }
                    .severity-badge.medium { background: #ffc107; color: #333; }
                    .severity-badge.low { background: #9c27b0; color: white; }
                    .issue-summary {
                        color: #666;
                        margin-left: 36px;
                    }
                    .expand-icon {
                        position: absolute;
                        right: 20px;
                        top: 50%;
                        transform: translateY(-50%);
                        font-size: 18px;
                        color: #666;
                        transition: transform 0.3s;
                    }
                    .expand-icon.expanded {
                        transform: translateY(-50%) rotate(180deg);
                    }
                    .issue-details {
                        padding: 0 20px 20px 20px;
                        background: rgba(255,255,255,0.8);
                    }
                    .detail-section {
                        margin: 20px 0;
                        padding: 15px;
                        background: white;
                        border-radius: 8px;
                    }
                    .detail-section h4 {
                        color: #333;
                        margin-bottom: 12px;
                        font-size: 16px;
                    }
                    .detail-section h5 {
                        color: #555;
                        margin: 15px 0 10px 0;
                        font-size: 14px;
                    }
                    .detail-section p {
                        color: #666;
                        line-height: 1.6;
                        margin: 8px 0;
                    }
                    .detail-section ul {
                        margin-left: 20px;
                        color: #666;
                        line-height: 1.8;
                    }
                    .code-block {
                        background: #f5f5f5;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        padding: 15px;
                        font-family: 'Courier New', monospace;
                        font-size: 13px;
                        overflow-x: auto;
                        margin: 10px 0;
                    }
                    .metrics-block {
                        background: #f9f9f9;
                        border: 1px solid #e0e0e0;
                        border-radius: 4px;
                        padding: 12px;
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        overflow-x: auto;
                    }
                    .remediation-steps {
                        background: #f0f7ff;
                        padding: 15px;
                        border-radius: 6px;
                        border: 1px solid #cce0ff;
                    }
                    .footer { 
                        text-align: center; 
                        color: white; 
                        padding: 20px;
                        font-size: 14px;
                    }
                    .no-issues {
                        text-align: center;
                        padding: 40px;
                        color: #4caf50;
                        font-size: 18px;
                    }
                </style>
                <script>
                    function toggleIssueDetails(issueId) {
                        const details = document.getElementById(issueId);
                        const expandIcon = document.getElementById('expand-' + issueId.split('-')[1]);
                        
                        if (details.style.display === 'none') {
                            details.style.display = 'block';
                            expandIcon.classList.add('expanded');
                        } else {
                            details.style.display = 'none';
                            expandIcon.classList.remove('expanded');
                        }
                    }
                </script>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔒 GalaSwap Security Dashboard - Enhanced</h1>
                        <div class="header-stats">
                            <span class="stat-badge">📅 ${new Date().toLocaleString()}</span>
                            <span class="stat-badge">🔄 Auto-refresh: 30s</span>
                            <span class="stat-badge">📊 ${totalTests} tests analyzed</span>
                            <span class="stat-badge">✅ ${passedTests} passing</span>
                            <span class="stat-badge">❌ ${totalTests - passedTests} failing</span>
                        </div>
                    </div>
                    
                    ${criticalCount > 0 ? `
                    <div class="alert-bar">
                        <span style="font-size: 24px; margin-right: 15px;">⚠️</span>
                        <div>
                            <strong>CRITICAL SECURITY ISSUES DETECTED</strong>
                            <div style="font-size: 14px; margin-top: 4px;">
                                ${sortedTests.find(t => t.severity === 'CRITICAL')?.name || 'Security Issue'}: 
                                ${sortedTests.find(t => t.severity === 'CRITICAL')?.details || 'Immediate action required'}
                            </div>
                        </div>
                    </div>` : ''}
                    
                    <div class="metrics">
                        <div class="metric-card">
                            <div class="metric-label">Security Score</div>
                            <div class="metric-value" style="color: ${securityScore < 5 ? '#f44336' : '#4caf50'};">
                                ${securityScore}/10
                            </div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Critical Issues</div>
                            <div class="metric-value" style="color: ${criticalCount > 0 ? '#f44336' : '#4caf50'};">
                                ${criticalCount}
                            </div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">High Severity</div>
                            <div class="metric-value" style="color: ${highCount > 0 ? '#ff9800' : '#4caf50'};">
                                ${highCount}
                            </div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Pass Rate</div>
                            <div class="metric-value" style="color: ${passRate > 80 ? '#4caf50' : '#ff9800'};">
                                ${passRate}%
                            </div>
                        </div>
                    </div>
                    
                    <div class="issues-container">
                        <h2 style="margin-bottom: 20px;">🎯 Security Issues - Click for Details & Remediation</h2>
                        ${issuesHTML || '<div class="no-issues">✅ All security tests passing - No issues detected!</div>'}
                    </div>
                    
                    <div class="phase-status">
                        <h2 style="margin-top: 0;">📊 Test Phase Status</h2>
                        ${this.generatePhaseStatusHTML(results)}
                    </div>
                    
                    <div class="footer">
                        <p>GalaSwap Security Monitor v2.0 | Enhanced Dashboard with Remediation Guidance</p>
                        <p>Click on any issue to see detailed testing methodology and step-by-step fixes</p>
                    </div>
                </div>
            </body>
            </html>`;
    }

    // API endpoint for issue details
    getIssueDetails(issueName) {
        return remediationGuide[issueName] || {
            description: 'No detailed information available for this issue',
            remediation: {
                immediate: ['Review the test results', 'Investigate the issue', 'Implement appropriate fixes']
            }
        };
    }

    // Start web server
    start() {
        const server = http.createServer((req, res) => {
            if (req.url === '/') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(this.generateEnhancedHTML());
            } else if (req.url.startsWith('/api/issue/')) {
                const issueName = decodeURIComponent(req.url.replace('/api/issue/', ''));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(this.getIssueDetails(issueName)));
            } else if (req.url === '/api/status') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    latest: this.getLatestResults(1)[0],
                    totalIssues: Object.keys(remediationGuide).length,
                    timestamp: new Date().toISOString()
                }));
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });

        server.listen(this.port, () => {
            console.log(`\n🚀 Enhanced Security Dashboard running at http://localhost:${this.port}`);
            console.log('📋 Features:');
            console.log('  - Click any issue for detailed remediation guidance');
            console.log('  - See how each test was run and what was expected');
            console.log('  - Get code examples for implementing fixes');
            console.log('  - Testing checklists for verification');
            console.log('\nPress Ctrl+C to stop\n');
        });
        
        return server;
    }
}

// Run if called directly
if (require.main === module) {
    const dashboard = new EnhancedSecurityDashboard(3001);
    const server = dashboard.start();
    
    // Handle shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down enhanced dashboard...');
        server.close();
        process.exit(0);
    });
}

module.exports = EnhancedSecurityDashboard;