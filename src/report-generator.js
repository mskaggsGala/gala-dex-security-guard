const fs = require('fs');
const path = require('path');

class ReportGenerator {
    constructor() {
        this.resultsDir = './security-results';
        this.reportsDir = './security-reports';
        
        // Create reports directory if it doesn't exist
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir);
        }
    }

    // Load the latest test results
    loadLatestResults() {
        const files = fs.readdirSync(this.resultsDir)
            .filter(f => f.startsWith('security-'))
            .sort()
            .reverse();
        
        if (files.length === 0) {
            throw new Error('No test results found');
        }
        
        const latestFile = files[0];
        const content = fs.readFileSync(path.join(this.resultsDir, latestFile), 'utf8');
        return JSON.parse(content);
    }

    // Get status emoji/indicator
    getStatusIndicator(test) {
        if (test.passed && test.severity === 'PASS') {
            return '🟢'; // Green - Passed
        } else if (test.severity === 'CRITICAL') {
            return '🔴'; // Red - Critical
        } else if (test.severity === 'HIGH') {
            return '🔴'; // Red - High severity
        } else if (test.severity === 'MEDIUM') {
            return '🟡'; // Yellow - Medium
        } else if (test.severity === 'LOW') {
            return '🟡'; // Yellow - Low
        } else {
            return '⚪'; // Unknown
        }
    }

    // Generate human-readable report
    generateReport(results) {
        const timestamp = new Date().toISOString();
        const date = new Date().toLocaleDateString();
        
        let report = `# GalaSwap Security Test Report
Generated: ${date}
Test Phase: ${results.phase || 'Security Testing'}

## Executive Summary

`;

        // Count issues by severity
        const critical = results.tests.filter(t => t.severity === 'CRITICAL').length;
        const high = results.tests.filter(t => t.severity === 'HIGH').length;
        const medium = results.tests.filter(t => t.severity === 'MEDIUM').length;
        const low = results.tests.filter(t => t.severity === 'LOW').length;
        const passed = results.tests.filter(t => t.passed).length;
        const total = results.tests.length;

        report += `- **Tests Run**: ${total}
- **Passed**: ${passed}/${total} (${Math.round(passed/total * 100)}%)
- **Critical Issues**: ${critical}
- **High Severity**: ${high}
- **Medium Severity**: ${medium}
- **Low Severity**: ${low}

## Test Results Dashboard

| Status | Test Name | Severity | Result |
|--------|-----------|----------|--------|
`;

        // Add each test to the dashboard
        results.tests.forEach(test => {
            const indicator = this.getStatusIndicator(test);
            const result = test.passed ? 'PASSED' : 'FAILED';
            report += `| ${indicator} | ${test.test} | ${test.severity} | ${result} |\n`;
        });

        report += `

### Legend
- 🟢 **Green**: Test passed, no issues found
- 🟡 **Yellow**: Test failed with LOW/MEDIUM severity issues
- 🔴 **Red**: Test failed with HIGH/CRITICAL severity issues

`;

        // Critical issues section
        if (critical > 0) {
            report += `## 🔴 CRITICAL ISSUES - Immediate Action Required

`;
            results.tests
                .filter(t => t.severity === 'CRITICAL')
                .forEach(test => {
                    report += `### ${test.test}

**Status**: FAILED
**Impact**: Service vulnerable to DoS attacks and API abuse

**Test Results**:
`;
                    if (test.details) {
                        report += `- Requests sent: ${test.details.requestsSent || 'N/A'}
- Successful: ${test.details.successful || 'N/A'}
- Rate limited: ${test.details.rateLimited || 'N/A'}
- Duration: ${test.details.duration || 'N/A'}
- Requests/second: ${test.details.requestsPerSecond || 'N/A'}
`;
                    }
                    
                    report += `
**Action Required**:
${test.recommendation}

**Implementation Example**:
\`\`\`javascript
// Add rate limiting middleware
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  message: 'Too many requests, please try again later.'
});

app.use('/v1/trade', limiter);
\`\`\`

---

`;
                });
        }

        // Other issues
        if (high > 0 || medium > 0 || low > 0) {
            report += `## ⚠️ Other Issues Found

`;
            results.tests
                .filter(t => ['HIGH', 'MEDIUM', 'LOW'].includes(t.severity))
                .forEach(test => {
                    const indicator = this.getStatusIndicator(test);
                    report += `### ${indicator} ${test.test} (${test.severity})

**Status**: ${test.passed ? 'PASSED with warnings' : 'FAILED'}
`;
                    if (test.details && test.details.issues) {
                        report += `**Issues Found**:
`;
                        test.details.issues.forEach(issue => {
                            report += `- ${issue.test || issue.description || JSON.stringify(issue)}
`;
                        });
                    }
                    
                    if (test.recommendation) {
                        report += `
**Recommendation**: ${test.recommendation}
`;
                    }
                    report += `
---

`;
                });
        }

        // Passed tests
        if (passed > 0) {
            report += `## ✅ Security Controls Working Correctly

`;
            results.tests
                .filter(t => t.passed && t.severity === 'PASS')
                .forEach(test => {
                    report += `- **${test.test}**: ${test.recommendation || 'Operating as expected'}
`;
                });
        }

        // Test execution details
        report += `

## Test Execution Details

### Tests Performed
`;
        results.tests.forEach((test, index) => {
            const indicator = this.getStatusIndicator(test);
            report += `
#### ${index + 1}. ${indicator} ${test.test}
- **Executed**: ${test.timestamp || 'N/A'}
- **Status**: ${test.passed ? 'PASSED' : 'FAILED'}
- **Severity**: ${test.severity}
`;
            if (test.details) {
                if (test.details.testCases) {
                    report += `- **Test Cases**: ${test.details.testCases}
`;
                }
                if (test.details.issuesFound !== undefined) {
                    report += `- **Issues Found**: ${test.details.issuesFound}
`;
                }
            }
        });

        // Action priority
        report += `

## Priority Action Items

### Immediate (24 hours)
`;
        if (critical > 0) {
            report += `1. **Implement Rate Limiting**: Add rate limiting middleware to all API endpoints
2. **Set up monitoring**: Deploy alerts for unusual traffic patterns
3. **Add circuit breakers**: Prevent cascade failures under load
`;
        } else {
            report += `- No critical issues requiring immediate action
`;
        }

        report += `
### Short-term (1 week)
1. Review and fix precision handling for large amounts
2. Implement request signing for authenticated endpoints
3. Add comprehensive error logging

### Medium-term (1 month)  
1. Conduct full security audit
2. Implement automated security testing in CI/CD
3. Set up penetration testing schedule

## Technical Details

### Test Environment
- Endpoint: https://dex-backend-prod1.defi.gala.com
- Test Date: ${date}
- Test Type: Black-box API testing

### Test Coverage Summary
`;
        
        // Create a visual summary
        const passedCount = results.tests.filter(t => t.passed && t.severity === 'PASS').length;
        const failedCritical = results.tests.filter(t => t.severity === 'CRITICAL').length;
        const failedOther = results.tests.filter(t => !t.passed && t.severity !== 'CRITICAL').length;
        
        const totalTests = results.tests.length;
        const passedPercent = Math.round((passedCount / totalTests) * 20);
        const criticalPercent = Math.round((failedCritical / totalTests) * 20);
        const otherPercent = Math.round((failedOther / totalTests) * 20);
        
        let bar = '';
        for (let i = 0; i < passedPercent; i++) bar += '🟢';
        for (let i = 0; i < criticalPercent; i++) bar += '🔴';
        for (let i = 0; i < otherPercent; i++) bar += '🟡';
        
        report += `
${bar} (${Math.round(passedCount/totalTests*100)}% passed)

- 🟢 Passed: ${passedCount}
- 🔴 Critical/High: ${failedCritical}
- 🟡 Medium/Low: ${failedOther}

## Next Steps

1. Share this report with the development team
2. Create tickets for each action item
3. Schedule follow-up testing after fixes
4. Consider implementing continuous security monitoring

---
*Generated by GalaSwap Security Monitor*
`;

        return report;
    }

    // Save report to file
    saveReport(report) {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const filename = path.join(this.reportsDir, `report-${timestamp}.md`);
        fs.writeFileSync(filename, report);
        console.log(`\n📄 Report saved to: ${filename}`);
        return filename;
    }

    // Replace the generateFromLatest() method with this enhanced version

    async generateFromLatest() {
        try {
            const results = this.loadLatestResults();
            const report = this.generateReport(results);
            const filename = this.saveReport(report);
            
            // Enhanced console summary
            console.log('\n========================================');
            console.log('SECURITY REPORT SUMMARY');
            console.log('========================================\n');
            
            // Basic stats
            const critical = results.tests.filter(t => t.severity === 'CRITICAL').length;
            const high = results.tests.filter(t => t.severity === 'HIGH').length;
            const medium = results.tests.filter(t => t.severity === 'MEDIUM').length;
            const low = results.tests.filter(t => t.severity === 'LOW').length;
            const passed = results.tests.filter(t => t.passed).length;
            const total = results.tests.length;
            
            console.log(`Test Phase: ${results.phase || 'Security Testing'}`);
            console.log(`Generated: ${new Date().toLocaleDateString()}\n`);
            
            console.log('Executive Summary:');
            console.log(`- Tests Run: ${total}`);
            console.log(`- Passed: ${passed}/${total} (${Math.round(passed/total * 100)}%)`);
            console.log(`- Critical Issues: ${critical}`);
            console.log(`- High Severity: ${high}`);
            console.log(`- Medium Severity: ${medium}`);
            console.log(`- Low Severity: ${low}\n`);
            
            console.log('Test Results:');
            results.tests.forEach(test => {
                const indicator = this.getStatusIndicator(test);
                const status = test.passed ? 'PASS' : 'FAIL';
                console.log(`  ${indicator} ${test.test}: ${status} (${test.severity})`);
            });
            
            // Show critical issues details
            if (critical > 0) {
                console.log('\n⚠️  CRITICAL ISSUES REQUIRING IMMEDIATE ACTION:');
                results.tests
                    .filter(t => t.severity === 'CRITICAL')
                    .forEach(test => {
                        console.log(`\n  ${test.test}:`);
                        if (test.details) {
                            if (test.details.requestsSent) {
                                console.log(`    - Requests sent: ${test.details.requestsSent}`);
                                console.log(`    - Successful: ${test.details.successful}`);
                                console.log(`    - Requests/second: ${test.details.requestsPerSecond}`);
                            }
                        }
                        console.log(`    - Action: ${test.recommendation}`);
                    });
            }
            
            // Show other failed tests briefly
            const otherFailed = results.tests.filter(t => !t.passed && t.severity !== 'CRITICAL');
            if (otherFailed.length > 0) {
                console.log('\nOther Issues:');
                otherFailed.forEach(test => {
                    const indicator = this.getStatusIndicator(test);
                    console.log(`  ${indicator} ${test.test}: ${test.recommendation || 'See report for details'}`);
                });
            }
            
            console.log(`\n📄 Full report saved to: ${filename}\n`);
            
            return filename;
        } catch (error) {
            console.error('Error generating report:', error.message);
        }
    }    







}

// Run if called directly
if (require.main === module) {
    const generator = new ReportGenerator();
    generator.generateFromLatest();
}

module.exports = ReportGenerator;