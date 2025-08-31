const fs = require('fs');
const path = require('path');
const axios = require('axios');

class DashboardVerifier {
    constructor() {
        this.resultsDir = path.join(__dirname, '../security-results');
        this.expectedIssues = [
            { name: 'Rate Limiting Test', severity: 'CRITICAL', label: 'Rate Limiting' },
            { name: 'Precision/Rounding', severity: 'LOW', label: 'Precision' },
            { name: 'Large Payload Limit', severity: 'MEDIUM', label: 'Large Payload' }
        ];
    }

    checkResults() {
        console.log('=====================================');
        console.log('DASHBOARD VERIFICATION');
        console.log('=====================================\n');

        // Read all test result files
        if (!fs.existsSync(this.resultsDir)) {
            console.log('❌ Security results directory not found!');
            return;
        }

        const files = fs.readdirSync(this.resultsDir)
            .filter(f => f.endsWith('.json'))
            .filter(f => f.includes('comprehensive') || f.includes('security'))
            .sort((a, b) => b.localeCompare(a));

        console.log(`Found ${files.length} test result files\n`);

        if (files.length === 0) {
            console.log('❌ No test results found!');
            console.log('Run: cd scripts && node run-all-tests.js && cd ..\n');
            return;
        }

        // Track what we find
        const foundIssues = {
            'Rate Limiting Test': false,
            'Precision/Rounding': false,
            'Large Payload Limit': false
        };

        // Check the most recent comprehensive results file first
        const comprehensiveFiles = files.filter(f => f.includes('comprehensive'));
        const filesToCheck = comprehensiveFiles.length > 0 ? comprehensiveFiles.slice(0, 3) : files.slice(0, 5);

        console.log(`Checking ${filesToCheck.length} recent files...\n`);

        filesToCheck.forEach(file => {
            try {
                const filepath = path.join(this.resultsDir, file);
                const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

                // Check if it has phases structure
                if (content.phases) {
                    Object.keys(content.phases).forEach(phaseKey => {
                        const phase = content.phases[phaseKey];
                        if (phase.tests && Array.isArray(phase.tests)) {
                            phase.tests.forEach(test => {
                                const testName = test.test || test.testName;
                                if (testName && !test.passed) {
                                    if (testName in foundIssues) {
                                        foundIssues[testName] = true;
                                    }
                                }
                            });
                        }
                    });
                }
            } catch (e) {
                // Skip files that can't be parsed
            }
        });

        // Report findings
        console.log('Looking for expected issues:\n');
        this.expectedIssues.forEach(issue => {
            const found = foundIssues[issue.name];
            console.log(`${found ? '✅' : '❌'} ${issue.label} (${issue.severity}) - ${found ? 'Found' : 'MISSING!'}`);
        });

        const allFound = Object.values(foundIssues).every(v => v);
        
        console.log('\n=====================================');
        if (allFound) {
            console.log('✅ All expected issues found in test results!\n');
        } else {
            console.log('⚠️  Some expected issues are missing\n');
            console.log('This might be because:');
            console.log('  1. The continuous monitor toggled them to passing');
            console.log('  2. You need to run: cd scripts && node run-all-tests.js && cd ..');
            console.log('\nTo ensure all issues are present:');
            console.log('  1. Stop continuous monitor (Ctrl+C)');
            console.log('  2. Run: cd scripts && node run-all-tests.js && cd ..');
            console.log('  3. Restart dashboard: node src/dashboard.js');
        }

        // Check if dashboard is running
        console.log('\n=====================================');
        console.log('Dashboard Status:');
        
        axios.get('http://localhost:3000', { timeout: 2000 })
            .then(() => {
                console.log('✅ Dashboard is running at http://localhost:3000');
                console.log('=====================================\n');
            })
            .catch(() => {
                console.log('❌ Dashboard is not running');
                console.log('   Start it with: node src/dashboard.js');
                console.log('=====================================\n');
            });
    }
}

const verifier = new DashboardVerifier();
verifier.checkResults();