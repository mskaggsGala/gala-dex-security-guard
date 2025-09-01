// Remediation guidance for security issues
const remediationGuide = {
    // Rate Limiting Issues (multiple test name variations)
    'Rate Limit Detection': {
        description: 'API endpoints accept unlimited requests without throttling',
        impact: 'Allows DDoS attacks, resource exhaustion, and potential system overload',
        howTestWasRun: {
            method: 'Burst Testing',
            details: 'Sent 100 rapid concurrent requests to /v1/trade/price endpoint',
            code: `// Test implementation
for (let i = 0; i < 100; i++) {
    requests.push(axios.get('/v1/trade/price', {
        params: { tokenIn: 'GALA', tokenOut: 'GUSDC' }
    }));
}
const results = await Promise.all(requests);`,
            expectedBehavior: 'Should receive 429 (Too Many Requests) after ~10-20 requests',
            actualBehavior: 'All 100 requests succeeded with 200 status'
        },
        remediation: {
            immediate: [
                'Implement rate limiting middleware (e.g., express-rate-limit)',
                'Set limits: 20 requests per minute for public endpoints',
                'Return 429 status with Retry-After header'
            ],
            implementation: `// Example using express-rate-limit
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests per windowMs
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/v1/trade', limiter);`,
            testing: [
                'Verify rate limits are applied per IP address',
                'Test that legitimate users are not blocked',
                'Ensure proper error messages and headers'
            ]
        }
    },

    // Input Validation Issues
    'Input Validation': {
        description: 'Endpoints accept invalid or malicious input without proper validation',
        impact: 'Can lead to system errors, injection attacks, or unexpected behavior',
        howTestWasRun: {
            method: 'Boundary Testing',
            details: 'Tested with negative numbers, overflow values, SQL injection attempts',
            code: `// Test cases
const testCases = [
    { amount: '-100', test: 'Negative amount' },
    { amount: '999999999999999999999', test: 'Overflow' },
    { amount: '1; DROP TABLE pools;', test: 'SQL injection' },
    { amount: '../etc/passwd', test: 'Path traversal' }
];`,
            expectedBehavior: 'Should reject with 400 Bad Request and clear error message',
            actualBehavior: 'Some invalid inputs are processed or cause errors'
        },
        remediation: {
            immediate: [
                'Add input validation middleware',
                'Sanitize all user inputs',
                'Use parameterized queries for database operations'
            ],
            implementation: `// Input validation example
const validateAmount = (req, res, next) => {
    const { amount } = req.query;
    
    // Check if amount is a valid positive number
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > MAX_AMOUNT) {
        return res.status(400).json({
            error: 'Invalid amount',
            details: 'Amount must be a positive number less than ' + MAX_AMOUNT
        });
    }
    
    req.validatedAmount = numAmount;
    next();
};`,
            testing: [
                'Test all boundary conditions',
                'Verify error messages are informative but not revealing',
                'Ensure validation is consistent across all endpoints'
            ]
        }
    },

    // Pool Creation Authorization
    'Pool Creation Without Auth': {
        description: 'Pool creation endpoint lacks proper authentication/authorization',
        impact: 'Allows unauthorized users to create malicious pools, manipulate markets',
        howTestWasRun: {
            method: 'Authorization Testing',
            details: 'Attempted to create pool without authentication headers',
            code: `// Test unauthorized pool creation
const response = await axios.post('/v1/pool/create', {
    tokenA: 'FAKE',
    tokenB: 'GUSDC',
    fee: 10000
}, {
    // No auth headers
});`,
            expectedBehavior: 'Should return 401 Unauthorized or 403 Forbidden',
            actualBehavior: 'Pool creation succeeds or returns non-auth error'
        },
        remediation: {
            immediate: [
                'Implement authentication middleware',
                'Require admin role for pool creation',
                'Add pool creation approval workflow'
            ],
            implementation: `// Authentication middleware
const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

app.post('/v1/pool/create', requireAuth, requireAdmin, createPool);`,
            testing: [
                'Verify unauthenticated requests are rejected',
                'Test role-based access control',
                'Ensure tokens expire appropriately'
            ]
        }
    },

    // Precision and Rounding Issues
    'Precision/Rounding': {
        description: 'Mathematical operations may have precision errors affecting trades',
        impact: 'Can lead to fund loss, arbitrage opportunities, or unfair trades',
        howTestWasRun: {
            method: 'Precision Testing',
            details: 'Tested with very small amounts and checked for rounding errors',
            code: `// Test precision handling
const dustAmount = '0.000000000000000001';
const response = await axios.get('/v1/trade/quote', {
    params: { amountIn: dustAmount }
});`,
            expectedBehavior: 'Should handle decimal precision correctly or reject dust amounts',
            actualBehavior: 'May have rounding errors or accept dust that causes issues'
        },
        remediation: {
            immediate: [
                'Use decimal libraries for precise calculations',
                'Define minimum trade amounts',
                'Implement consistent rounding rules'
            ],
            implementation: `// Using decimal.js for precision
const Decimal = require('decimal.js');

const calculateOutput = (amountIn, reserveIn, reserveOut, fee) => {
    const decimalAmountIn = new Decimal(amountIn);
    const decimalReserveIn = new Decimal(reserveIn);
    const decimalReserveOut = new Decimal(reserveOut);
    const decimalFee = new Decimal(fee).div(10000);
    
    const amountInWithFee = decimalAmountIn.mul(
        Decimal(1).minus(decimalFee)
    );
    const numerator = amountInWithFee.mul(decimalReserveOut);
    const denominator = decimalReserveIn.plus(amountInWithFee);
    
    return numerator.div(denominator).toFixed(8); // 8 decimal places
};`,
            testing: [
                'Test with extreme values',
                'Verify rounding is consistent',
                'Check that dust amounts are properly handled'
            ]
        }
    },

    // MEV Vulnerability
    'MEV Vulnerability': {
        description: 'System vulnerable to Maximum Extractable Value attacks',
        impact: 'Allows front-running, sandwich attacks, and value extraction from users',
        howTestWasRun: {
            method: 'MEV Simulation',
            details: 'Simulated front-running and sandwich attacks on pending transactions',
            code: `// Simulate sandwich attack
// 1. Monitor mempool for large trade
// 2. Front-run with buy order
// 3. Let victim trade execute
// 4. Back-run with sell order`,
            expectedBehavior: 'Should have MEV protection mechanisms',
            actualBehavior: 'Transactions can be front-run without protection'
        },
        remediation: {
            immediate: [
                'Implement commit-reveal scheme',
                'Add slippage protection',
                'Use flashbots or private mempools'
            ],
            implementation: `// Slippage protection
const executeSwap = async (params) => {
    const { amountIn, minAmountOut, deadline } = params;
    
    // Check deadline
    if (Date.now() > deadline) {
        throw new Error('Transaction deadline exceeded');
    }
    
    // Calculate actual output
    const actualOutput = await calculateOutput(amountIn);
    
    // Check slippage
    if (actualOutput < minAmountOut) {
        throw new Error('Slippage tolerance exceeded');
    }
    
    // Execute trade
    return performSwap(amountIn, actualOutput);
};`,
            testing: [
                'Test slippage protection',
                'Verify deadline enforcement',
                'Simulate MEV attacks to confirm protection'
            ]
        }
    },

    // Bridge Security Tests
    'Bridge Configuration Enumeration': {
        description: 'Bridge configurations are publicly accessible without authentication',
        impact: 'Information disclosure that could aid attackers in planning targeted attacks',
        howTestWasRun: {
            method: 'Configuration Discovery',
            details: 'Attempted to enumerate bridge configurations without authentication',
            code: `// Test bridge config enumeration
const response = await axios.get('/v1/bridge/configs');
// Check what information is exposed`,
            expectedBehavior: 'Should require authentication or limit exposed information',
            actualBehavior: 'All bridge configurations publicly accessible'
        },
        remediation: {
            immediate: [
                'Review what bridge information must be public',
                'Implement authentication for sensitive configs',
                'Rate limit configuration endpoints'
            ],
            implementation: `// Limit exposed bridge information
app.get('/v1/bridge/configs', rateLimiter, (req, res) => {
    // Only return necessary public information
    const publicConfigs = configs.map(config => ({
        chainId: config.chainId,
        name: config.name,
        // Omit sensitive details
    }));
    res.json(publicConfigs);
});`,
            testing: [
                'Verify sensitive information is not exposed',
                'Test authentication requirements',
                'Check rate limiting is applied'
            ]
        }
    },

    'Bridge Input Validation': {
        description: 'Bridge endpoints may not properly validate input parameters',
        impact: 'Could allow invalid bridge operations or cause system errors',
        howTestWasRun: {
            method: 'Input Fuzzing',
            details: 'Tested bridge endpoints with invalid chain IDs, addresses, and amounts',
            code: `// Test cases for bridge validation
const tests = [
    { chainId: -1, test: 'Negative chain ID' },
    { chainId: 999999, test: 'Invalid chain ID' },
    { address: '0x0000000000000000000000000000000000000000', test: 'Zero address' },
    { amount: '-100', test: 'Negative amount' }
];`,
            expectedBehavior: 'Should reject all invalid inputs with proper error messages',
            actualBehavior: 'Some inputs may be accepted or cause errors'
        },
        remediation: {
            immediate: [
                'Validate all bridge parameters',
                'Check chain ID against whitelist',
                'Validate addresses and amounts'
            ],
            implementation: `// Bridge input validation
const validateBridgeRequest = (req, res, next) => {
    const { chainId, address, amount } = req.body;
    
    // Validate chain ID
    if (!SUPPORTED_CHAINS.includes(chainId)) {
        return res.status(400).json({ error: 'Unsupported chain' });
    }
    
    // Validate address
    if (!ethers.utils.isAddress(address)) {
        return res.status(400).json({ error: 'Invalid address' });
    }
    
    // Validate amount
    if (amount <= 0 || amount > MAX_BRIDGE_AMOUNT) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    
    next();
};`,
            testing: [
                'Test all validation rules',
                'Verify error messages are clear',
                'Ensure no bypasses exist'
            ]
        }
    },

    'Bridge Status Disclosure': {
        description: 'Bridge status endpoint may expose sensitive operational information',
        impact: 'Could reveal system vulnerabilities or aid in timing attacks',
        howTestWasRun: {
            method: 'Information Gathering',
            details: 'Accessed bridge status endpoint to check exposed information',
            code: `// Check bridge status information
const response = await axios.get('/v1/bridge/status');
console.log('Exposed info:', response.data);`,
            expectedBehavior: 'Should only expose necessary status information',
            actualBehavior: 'May expose detailed internal state'
        },
        remediation: {
            immediate: [
                'Limit status information to essentials',
                'Implement rate limiting',
                'Consider authentication for detailed status'
            ],
            implementation: `// Limited status endpoint
app.get('/v1/bridge/status', rateLimiter, (req, res) => {
    res.json({
        operational: true,
        // Avoid exposing internal details
        lastUpdate: Date.now()
    });
});`,
            testing: [
                'Verify no sensitive data exposed',
                'Test rate limiting',
                'Check different user roles'
            ]
        }
    },

    'Pool Creation Security': {
        description: 'Pool creation endpoint may lack proper authorization checks',
        impact: 'Unauthorized users could create malicious pools to manipulate markets',
        howTestWasRun: {
            method: 'Authorization Testing',
            details: 'Attempted to create pools without proper authentication',
            code: `// Test unauthorized pool creation
const response = await axios.post('/v1/pool/create', {
    tokenA: 'FAKE',
    tokenB: 'GUSDC',
    fee: 10000
});`,
            expectedBehavior: 'Should require authentication and authorization',
            actualBehavior: 'May allow unauthorized pool creation'
        },
        remediation: {
            immediate: [
                'Implement authentication checks',
                'Add role-based access control',
                'Validate token pairs'
            ],
            implementation: `// Pool creation security
app.post('/v1/pool/create', requireAuth, requireAdmin, async (req, res) => {
    const { tokenA, tokenB, fee } = req.body;
    
    // Validate tokens exist
    if (!await tokenExists(tokenA) || !await tokenExists(tokenB)) {
        return res.status(400).json({ error: 'Invalid tokens' });
    }
    
    // Check if pool already exists
    if (await poolExists(tokenA, tokenB, fee)) {
        return res.status(409).json({ error: 'Pool already exists' });
    }
    
    // Create pool with admin approval
    const pool = await createPool(tokenA, tokenB, fee, req.user.id);
    res.json(pool);
});`,
            testing: [
                'Test authentication requirements',
                'Verify role checks',
                'Test duplicate pool prevention'
            ]
        }
    },

    'Pool with fake tokens': {
        description: 'System allows creation or interaction with pools containing non-existent tokens',
        impact: 'Could enable market manipulation or user fund loss',
        howTestWasRun: {
            method: 'Token Validation Testing',
            details: 'Attempted to create/query pools with fake token symbols',
            code: `// Test with fake tokens
const fakeTokens = ['FAKE', 'NOTREAL', 'SCAM'];
for (const token of fakeTokens) {
    const response = await axios.get('/v1/pool', {
        params: { tokenA: token, tokenB: 'GUSDC' }
    });
}`,
            expectedBehavior: 'Should reject operations with non-existent tokens',
            actualBehavior: 'May accept fake tokens in some operations'
        },
        remediation: {
            immediate: [
                'Maintain whitelist of valid tokens',
                'Validate all token parameters',
                'Reject unknown tokens immediately'
            ],
            implementation: `// Token validation
const VALID_TOKENS = new Set(['GALA', 'GUSDC', 'GMUSIC', ...]);

const validateTokens = (req, res, next) => {
    const { tokenA, tokenB } = req.query;
    
    if (!VALID_TOKENS.has(tokenA) || !VALID_TOKENS.has(tokenB)) {
        return res.status(400).json({ 
            error: 'Invalid token pair',
            validTokens: Array.from(VALID_TOKENS)
        });
    }
    
    next();
};`,
            testing: [
                'Test all endpoints with fake tokens',
                'Verify whitelist is comprehensive',
                'Check error messages are helpful'
            ]
        }
    },

    // Additional test name variations
    'Rate Limiting': {
        description: 'API endpoints accept unlimited requests without throttling',
        impact: 'Allows DDoS attacks, resource exhaustion, and potential system overload',
        howTestWasRun: {
            method: 'Burst Testing',
            details: 'Sent multiple rapid requests to test rate limiting',
            code: `// Test implementation
for (let i = 0; i < 50; i++) {
    requests.push(axios.get('/v1/trade/price'));
}
const results = await Promise.all(requests);`,
            expectedBehavior: 'Should receive 429 (Too Many Requests) after threshold',
            actualBehavior: 'All requests succeeded without throttling'
        },
        remediation: {
            immediate: [
                'Implement rate limiting middleware immediately',
                'Set appropriate limits per endpoint',
                'Monitor for abuse patterns'
            ],
            implementation: `// Express rate limit implementation
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests
    message: 'Too many requests, please try again later'
});

app.use('/v1/', limiter);`,
            testing: [
                'Verify rate limits work correctly',
                'Test different endpoints have appropriate limits',
                'Ensure legitimate users are not blocked'
            ]
        }
    },

    // Replay Attack Protection
    'Replay Attack Protection': {
        description: 'Transactions may be replayed without proper nonce management',
        impact: 'Allows attackers to repeat transactions, double-spending',
        howTestWasRun: {
            method: 'Replay Testing',
            details: 'Attempted to replay the same transaction multiple times',
            code: `// Capture transaction
const tx = await captureTransaction();
// Attempt replay
const replay1 = await sendTransaction(tx);
const replay2 = await sendTransaction(tx);`,
            expectedBehavior: 'Second submission should be rejected',
            actualBehavior: 'Transaction may be accepted multiple times'
        },
        remediation: {
            immediate: [
                'Implement nonce tracking',
                'Add transaction expiry',
                'Use unique transaction IDs'
            ],
            implementation: `// Nonce management
const nonceTracker = new Map();

const validateTransaction = (tx) => {
    const { sender, nonce, expiry } = tx;
    
    // Check expiry
    if (Date.now() > expiry) {
        throw new Error('Transaction expired');
    }
    
    // Check nonce
    const lastNonce = nonceTracker.get(sender) || 0;
    if (nonce <= lastNonce) {
        throw new Error('Invalid nonce');
    }
    
    // Update nonce
    nonceTracker.set(sender, nonce);
    return true;
};`,
            testing: [
                'Test nonce increment',
                'Verify replay prevention',
                'Check expiry enforcement'
            ]
        }
    }
};

module.exports = remediationGuide;