// Save this as: verify-dashboard.js (replace the existing one)
// This verifies your dashboard is working correctly

const fs = require('fs');
const path = require('path');

class DashboardVerifier {
    constructor() {
        this.resultsDir = './security-results';
    }

    verify() {
        console.log('=====================================');
        console.log('DASHBOARD VERIFICATION');
        console.log('=====================================\n');

        // Check if results directory exists
        if (!fs.existsSync(this.resultsDir)) {
            console.log('❌ ERROR: security-results directory not found!');
            console.log('   Run: node run-all-tests.js first');
            return;
        }

        // Get all result files
        const files = fs.readdirSync(this.resultsDir)
            .filter(f => f.endsWith('.json'))
            .sort((a, b) => b.localeCompare(a));

        console.log(`Found ${files.length} test result files\n`);

        if (files.length === 0) {
            console.log('❌ ERROR: No test results found!');
            console.log('   Run: node run-all-tests.js first');
            return;
        }

        // Check multiple recent files to get complete picture
        console.log('Checking recent test results...\n');
        
        const allTests = new Map();
        const filesToCheck = Math.min(10, files.length);
        
        // Aggregate tests from recent files
        for (let i = 0; i < filesToCheck; i++) {
            const content = fs.readFileSync(path.join(this.resultsDir, files[i]), 'utf8');
            const results = JSON.parse(content);
            
            if (results.tests) {
                results.tests.forEach(test => {
                    const testName = test.test || test.name || 'Unknown';
                    // Store the most recent version of each test
                    if (!allTests.has(testName)) {
                        allTests.set(testName, test);
                    }
                });
            }
        }

        // Expected issues that MUST appear
        const expectedIssues = [
            {
                name: 'Rate Limiting',
                severity: 'CRITICAL',
                phase: 'Phase 1',
                searchTerms: ['Rate Limiting', 'rate limit', 'Rate Limit']
            },
            {
                name: 'Precision',
                severity: 'LOW',
                phase: 'Phase 1',
                searchTerms: ['Precision', 'Rounding', 'precision']
            },
            {
                name: 'Large Payload',
                severity: 'MEDIUM',
                phase: 'Phase 4C',
                searchTerms: ['Large Payload', 'Payload', 'payload']
            }
        ];

        console.log('Looking for expected issues:\n');

        let allFound = true;
        const foundIssues = {
            critical: [],
            high: [],
            medium: [],
            low: []
        };

        expectedIssues.forEach(expected => {
            let found = false;
            let foundTest = null;
            
            // Search through all tests
            allTests.forEach((test, testName) => {
                if (!found) {
                    // Check if test name matches any search term
                    const nameMatches = expected.searchTerms.some(term => 
                        testName.toLowerCase().includes(term.toLowerCase())
                    );
                    
                    // Check if it's a failing test
                    const isFailing = !test.passed && test.severity !== 'PASS';
                    
                    if (nameMatches && isFailing) {
                        found = true;
                        foundTest = test;
                    }
                }
            });

            if (found) {
                console.log(`✅ ${expected.name} (${expected.severity}) - Found`);
                
                // Track found issues by severity
                const severity = foundTest.severity?.toUpperCase() || 'UNKNOWN';
                if (severity === 'CRITICAL') foundIssues.critical.push(foundTest);
                else if (severity === 'HIGH') foundIssues.high.push(foundTest);
                else if (severity === 'MEDIUM') foundIssues.medium.push(foundTest);
                else if (severity === 'LOW') foundIssues.low.push(foundTest);
            } else {
                console.log(`❌ ${expected.name} (${expected.severity}) - MISSING!`);
                allFound = false;
            }
        });

        // Show all found tests for debugging
        console.log('\n=====================================');
        console.log('All Tests Found:');
        console.log(`Total unique tests: ${allTests.size}`);
        
        let passCount = 0;
        let failCount = 0;
        
        allTests.forEach((test, name) => {
            if (test.passed) passCount++;
            else failCount++;
        });
        
        console.log(`Passed: ${passCount} | Failed: ${failCount}`);
        
        console.log('\nFailing Tests by Severity:');
        console.log(`  CRITICAL: ${foundIssues.critical.length}`);
        console.log(`  HIGH: ${foundIssues.high.length}`);
        console.log(`  MEDIUM: ${foundIssues.medium.length}`);
        console.log(`  LOW: ${foundIssues.low.length}`);

        console.log('\n=====================================');
        
        if (allFound) {
            console.log('✅ All expected issues are present in test results');
            console.log('\nYour dashboard should show:');
            console.log('  - Critical banner for Rate Limiting');
            console.log('  - Phase 1: Critical: 1, Low: 1 (or just Low: 1 if Precision is passing)');
            console.log('  - Phase 4C: Medium: 1 (4/5 Tests)');
        } else {
            console.log('⚠️  Some expected issues are missing from recent test results');
            console.log('\nThis might be because:');
            console.log('  1. The continuous monitor toggled them to passing');
            console.log('  2. You need to run: node run-all-tests.js');
            console.log('\nTo ensure all issues are present:');
            console.log('  1. Stop continuous monitor (Ctrl+C)');
            console.log('  2. Run: node run-all-tests.js');
            console.log('  3. Restart dashboard: node src/dashboard.js');
        }

        // Check if dashboard is running
        console.log('\n=====================================');
        console.log('Dashboard Status:');
        
        const http = require('http');
        http.get('http://localhost:3000', (res) => {
            console.log('✅ Dashboard is running at http://localhost:3000');
            console.log('\nNote: Dashboard auto-refreshes every 30 seconds');
        }).on('error', (err) => {
            console.log('❌ Dashboard is not running');
            console.log('   Start it with: node src/dashboard.js');
        });
    }
}

// Run verification
const verifier = new DashboardVerifier();
verifier.verify();