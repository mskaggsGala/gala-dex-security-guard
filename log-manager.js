#!/usr/bin/env node

/**
 * Log Management System for Gala DEX Security Guard
 * 
 * Manages the growing number of security test results to prevent disk space issues
 * while maintaining important records for compliance and analysis
 */

const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class LogManager {
    constructor(options = {}) {
        this.config = {
            resultsDir: options.resultsDir || './security-results',
            archiveDir: options.archiveDir || './security-archives',
            
            // Retention policies (in days)
            keepRawDays: options.keepRawDays || 7,        // Keep raw JSON for 7 days
            keepCompressedDays: options.keepCompressedDays || 30,  // Keep compressed for 30 days
            keepSummaryDays: options.keepSummaryDays || 90,  // Keep summaries for 90 days
            
            // Archive settings
            compressAfterDays: options.compressAfterDays || 3,  // Compress after 3 days
            
            // Disk space limits
            maxDiskUsageGB: options.maxDiskUsageGB || 5,  // Max 5GB for all logs
            warningThresholdGB: options.warningThresholdGB || 3,  // Warn at 3GB
            
            // What to keep
            keepCriticalAlways: true,  // Always keep critical findings
            keepFailedTests: true,      // Keep all failed tests longer
        };
        
        this.stats = {
            filesProcessed: 0,
            filesCompressed: 0,
            filesDeleted: 0,
            spaceFreedMB: 0,
            criticalFindingsSaved: 0
        };
    }

    async manage() {
        console.log('🔄 Starting Log Management Process...\n');
        
        try {
            // Ensure directories exist
            await this.ensureDirectories();
            
            // Get current disk usage
            const usage = await this.checkDiskUsage();
            
            // Process based on retention policies
            await this.processRawFiles();
            await this.processCompressedFiles();
            await this.cleanupOldSummaries();
            
            // Generate summary report
            await this.generateManagementReport(usage);
            
            console.log('✅ Log management complete!\n');
            return this.stats;
            
        } catch (error) {
            console.error('❌ Log management failed:', error);
            throw error;
        }
    }

    async ensureDirectories() {
        const dirs = [
            this.config.archiveDir,
            path.join(this.config.archiveDir, 'compressed'),
            path.join(this.config.archiveDir, 'summaries'),
            path.join(this.config.archiveDir, 'critical')
        ];
        
        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    async checkDiskUsage() {
        let totalSize = 0;
        const results = {};
        
        // Check raw files
        const rawFiles = await this.getFiles(this.config.resultsDir, '.json');
        for (const file of rawFiles) {
            const stats = await fs.stat(file);
            totalSize += stats.size;
        }
        results.rawCount = rawFiles.length;
        results.rawSizeMB = Math.round(totalSize / 1024 / 1024);
        
        // Check compressed files
        const compressedFiles = await this.getFiles(
            path.join(this.config.archiveDir, 'compressed'), 
            '.gz'
        );
        let compressedSize = 0;
        for (const file of compressedFiles) {
            const stats = await fs.stat(file);
            compressedSize += stats.size;
        }
        results.compressedCount = compressedFiles.length;
        results.compressedSizeMB = Math.round(compressedSize / 1024 / 1024);
        
        results.totalSizeMB = results.rawSizeMB + results.compressedSizeMB;
        results.totalSizeGB = (results.totalSizeMB / 1024).toFixed(2);
        
        console.log('📊 Current Disk Usage:');
        console.log(`  Raw files: ${results.rawCount} files (${results.rawSizeMB} MB)`);
        console.log(`  Compressed: ${results.compressedCount} files (${results.compressedSizeMB} MB)`);
        console.log(`  Total: ${results.totalSizeGB} GB\n`);
        
        if (results.totalSizeGB > this.config.warningThresholdGB) {
            console.log(`⚠️  WARNING: Approaching disk limit (${this.config.maxDiskUsageGB} GB)\n`);
        }
        
        return results;
    }

    async processRawFiles() {
        console.log('Processing raw JSON files...');
        
        const files = await this.getFiles(this.config.resultsDir, '.json');
        const now = Date.now();
        
        for (const filePath of files) {
            const stats = await fs.stat(filePath);
            const ageInDays = (now - stats.mtime) / (1000 * 60 * 60 * 24);
            
            // Read file to check for critical findings
            const content = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            const hasCritical = this.hasCriticalFindings(data);
            
            if (hasCritical && this.config.keepCriticalAlways) {
                // Save critical findings separately
                await this.saveCriticalFinding(filePath, data);
                this.stats.criticalFindingsSaved++;
            }
            
            if (ageInDays > this.config.keepRawDays) {
                // Delete old raw files
                await fs.unlink(filePath);
                this.stats.filesDeleted++;
                this.stats.spaceFreedMB += stats.size / 1024 / 1024;
                
            } else if (ageInDays > this.config.compressAfterDays) {
                // Compress files older than 3 days
                await this.compressFile(filePath);
                await fs.unlink(filePath);  // Delete original after compression
                this.stats.filesCompressed++;
                this.stats.spaceFreedMB += (stats.size * 0.7) / 1024 / 1024; // ~70% compression
            }
            
            this.stats.filesProcessed++;
        }
        
        console.log(`  Processed ${this.stats.filesProcessed} files`);
        console.log(`  Compressed ${this.stats.filesCompressed} files`);
        console.log(`  Deleted ${this.stats.filesDeleted} old files\n`);
    }

    async processCompressedFiles() {
        console.log('Processing compressed files...');
        
        const compressedDir = path.join(this.config.archiveDir, 'compressed');
        const files = await this.getFiles(compressedDir, '.gz');
        const now = Date.now();
        let deleted = 0;
        
        for (const filePath of files) {
            const stats = await fs.stat(filePath);
            const ageInDays = (now - stats.mtime) / (1000 * 60 * 60 * 24);
            
            if (ageInDays > this.config.keepCompressedDays) {
                // Create summary before deleting
                await this.createSummaryFromCompressed(filePath);
                
                // Delete old compressed file
                await fs.unlink(filePath);
                deleted++;
                this.stats.spaceFreedMB += stats.size / 1024 / 1024;
            }
        }
        
        console.log(`  Deleted ${deleted} old compressed files\n`);
    }

    async compressFile(filePath) {
        const content = await fs.readFile(filePath);
        const compressed = await gzip(content);
        
        const filename = path.basename(filePath);
        const compressedPath = path.join(
            this.config.archiveDir, 
            'compressed', 
            filename + '.gz'
        );
        
        await fs.writeFile(compressedPath, compressed);
    }

    async createSummaryFromCompressed(compressedPath) {
        try {
            const compressed = await fs.readFile(compressedPath);
            const content = await gunzip(compressed);
            const data = JSON.parse(content.toString());
            
            // Create summary with just key information
            const summary = {
                timestamp: data.timestamp,
                phase: data.phase,
                totalTests: data.tests ? data.tests.length : 0,
                passed: data.tests ? data.tests.filter(t => t.passed).length : 0,
                failed: data.tests ? data.tests.filter(t => !t.passed).length : 0,
                criticalIssues: data.tests ? data.tests.filter(t => t.severity === 'CRITICAL').length : 0,
                // Just store test names and results, not full details
                results: data.tests ? data.tests.map(t => ({
                    test: t.test,
                    passed: t.passed,
                    severity: t.severity
                })) : []
            };
            
            const filename = path.basename(compressedPath, '.gz');
            const summaryPath = path.join(
                this.config.archiveDir,
                'summaries',
                filename.replace('.json', '-summary.json')
            );
            
            await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
            
        } catch (error) {
            console.error(`Failed to create summary for ${compressedPath}:`, error.message);
        }
    }

    async cleanupOldSummaries() {
        console.log('Cleaning up old summaries...');
        
        const summaryDir = path.join(this.config.archiveDir, 'summaries');
        const files = await this.getFiles(summaryDir, '.json');
        const now = Date.now();
        let deleted = 0;
        
        for (const filePath of files) {
            const stats = await fs.stat(filePath);
            const ageInDays = (now - stats.mtime) / (1000 * 60 * 60 * 24);
            
            if (ageInDays > this.config.keepSummaryDays) {
                await fs.unlink(filePath);
                deleted++;
            }
        }
        
        console.log(`  Deleted ${deleted} old summaries\n`);
    }

    hasCriticalFindings(data) {
        if (!data.tests) return false;
        return data.tests.some(test => 
            test.severity === 'CRITICAL' || 
            (test.passed === false && test.severity === 'HIGH')
        );
    }

    async saveCriticalFinding(filePath, data) {
        const filename = path.basename(filePath);
        const criticalPath = path.join(
            this.config.archiveDir,
            'critical',
            filename
        );
        
        // Keep only critical/high severity failed tests
        const critical = {
            ...data,
            tests: data.tests.filter(t => 
                t.severity === 'CRITICAL' || 
                (t.passed === false && t.severity === 'HIGH')
            )
        };
        
        await fs.writeFile(criticalPath, JSON.stringify(critical, null, 2));
    }

    async getFiles(dir, extension) {
        try {
            const files = await fs.readdir(dir);
            return files
                .filter(f => f.endsWith(extension))
                .map(f => path.join(dir, f));
        } catch (error) {
            return [];
        }
    }

    async generateManagementReport(beforeUsage) {
        const afterUsage = await this.checkDiskUsage();
        
        const report = {
            timestamp: new Date().toISOString(),
            before: beforeUsage,
            after: afterUsage,
            actions: this.stats,
            spaceSaved: {
                MB: Math.round(this.stats.spaceFreedMB),
                GB: (this.stats.spaceFreedMB / 1024).toFixed(2)
            },
            policies: this.config
        };
        
        const reportPath = path.join(
            this.config.archiveDir,
            `management-report-${Date.now()}.json`
        );
        
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        console.log('📋 Management Summary:');
        console.log(`  Space freed: ${report.spaceSaved.MB} MB`);
        console.log(`  Critical findings preserved: ${this.stats.criticalFindingsSaved}`);
        console.log(`  Report saved to: ${reportPath}\n`);
        
        return report;
    }

    // Analyze growth rate and predict when disk will be full
    async predictDiskUsage() {
        const files = await this.getFiles(this.config.resultsDir, '.json');
        if (files.length < 2) return null;
        
        // Get file creation times and sizes
        const fileData = [];
        for (const file of files.slice(-100)) { // Last 100 files
            const stats = await fs.stat(file);
            fileData.push({
                time: stats.mtime.getTime(),
                size: stats.size
            });
        }
        
        // Calculate average file size and creation rate
        const avgSize = fileData.reduce((sum, f) => sum + f.size, 0) / fileData.length;
        const timeSpan = fileData[fileData.length - 1].time - fileData[0].time;
        const filesPerDay = (fileData.length / (timeSpan / (1000 * 60 * 60 * 24)));
        const mbPerDay = (avgSize * filesPerDay) / 1024 / 1024;
        
        const currentUsage = await this.checkDiskUsage();
        const remainingGB = this.config.maxDiskUsageGB - parseFloat(currentUsage.totalSizeGB);
        const daysUntilFull = (remainingGB * 1024) / mbPerDay;
        
        console.log('📈 Growth Prediction:');
        console.log(`  Files per day: ${Math.round(filesPerDay)}`);
        console.log(`  Growth rate: ${mbPerDay.toFixed(1)} MB/day`);
        console.log(`  Days until full: ${Math.round(daysUntilFull)}`);
        console.log(`  Estimated full date: ${new Date(Date.now() + daysUntilFull * 24 * 60 * 60 * 1000).toLocaleDateString()}\n`);
        
        return {
            filesPerDay,
            mbPerDay,
            daysUntilFull
        };
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'manage';
    
    const manager = new LogManager();
    
    switch (command) {
        case 'manage':
            manager.manage().catch(console.error);
            break;
            
        case 'check':
            manager.checkDiskUsage().catch(console.error);
            break;
            
        case 'predict':
            manager.predictDiskUsage().catch(console.error);
            break;
            
        case 'help':
            console.log('Usage: node log-manager.js [command]');
            console.log('Commands:');
            console.log('  manage   - Run full management process (default)');
            console.log('  check    - Check current disk usage');
            console.log('  predict  - Predict when disk will be full');
            console.log('  help     - Show this help');
            break;
            
        default:
            console.error('Unknown command:', command);
            process.exit(1);
    }
}

module.exports = LogManager;