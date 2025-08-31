console.log('\n📅 GalaSwap Security Monitoring Schedule');
console.log('========================================\n');

const schedule = [
    { interval: 'Every 5 minutes', test: 'Critical Tests (Rate Limiting)', cron: '*/5 * * * *' },
    { interval: 'Every hour', test: 'Phase 1 - Infrastructure', cron: '0 * * * *' },
    { interval: 'Every 6 hours', test: 'Phase 2 - Economic Attacks', cron: '0 */6 * * *' },
    { interval: 'Every 12 hours', test: 'Phase 4B - Extended Surface', cron: '0 */12 * * *' },
    { interval: 'Daily at 2 AM', test: 'Phase 4C - Performance', cron: '0 2 * * *' },
    { interval: 'Daily at 9 AM', test: 'Generate Reports', cron: '0 9 * * *' }
];

schedule.forEach(job => {
    console.log(`${job.interval.padEnd(20)} | ${job.test}`);
});

console.log('\n========================================');
console.log('Current time:', new Date().toLocaleString());
console.log('========================================\n');
