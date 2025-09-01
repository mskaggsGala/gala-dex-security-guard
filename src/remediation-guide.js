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

    // Chaincode Security Tests
    'Access Control': {
        description: 'Chaincode functions lack proper access control mechanisms',
        impact: 'Unauthorized users could invoke restricted functions or access sensitive data',
        howTestWasRun: {
            method: 'Permission Testing',
            details: 'Attempted to invoke admin functions without proper credentials',
            code: `// Test unauthorized chaincode invocation
const response = await axios.post('/v1/chaincode/invoke', {
    chaincodeName: 'trading',
    functionName: 'adminFunction',
    args: ['unauthorized_test']
}, {
    headers: {} // No auth headers
});`,
            expectedBehavior: 'Should reject with 401/403 and proper error message',
            actualBehavior: 'Function executed without authorization check'
        },
        remediation: {
            immediate: [
                'Implement certificate-based access control',
                'Add attribute-based access control (ABAC)',
                'Verify MSP membership before function execution'
            ],
            implementation: `// Hyperledger Fabric chaincode access control
const { Context } = require('fabric-contract-api');

class TradingContract extends Contract {
    async adminFunction(ctx, ...args) {
        // Get client identity
        const clientIdentity = ctx.clientIdentity;
        
        // Check if client has admin attribute
        if (!clientIdentity.getAttributeValue('admin')) {
            throw new Error('Access denied: Admin privileges required');
        }
        
        // Check MSP membership
        const mspId = clientIdentity.getMSPID();
        if (!['AdminMSP', 'TradingMSP'].includes(mspId)) {
            throw new Error('Access denied: Invalid MSP');
        }
        
        // Execute admin function
        return await this.executeAdminOperation(args);
    }
}`,
            testing: [
                'Test with valid admin certificates',
                'Test with invalid/expired certificates',
                'Verify MSP membership validation',
                'Test cross-organization access'
            ]
        }
    },

    'State Database Security': {
        description: 'State database queries vulnerable to injection or unauthorized access',
        impact: 'Could allow data extraction, state tampering, or privilege escalation',
        howTestWasRun: {
            method: 'Database Injection Testing',
            details: 'Attempted CouchDB queries with malicious selectors and state manipulation',
            code: `// Test CouchDB injection
const maliciousQuery = {
    selector: {"_id": {"$gt": null}},
    execution_stats: true
};
const response = await axios.post('/v1/query', maliciousQuery);`,
            expectedBehavior: 'Should sanitize queries and reject malicious patterns',
            actualBehavior: 'Query executed and returned sensitive data'
        },
        remediation: {
            immediate: [
                'Sanitize all database queries',
                'Implement query validation',
                'Restrict direct state database access'
            ],
            implementation: `// Secure state queries in chaincode
async querySecure(ctx, queryString) {
    // Parse and validate query
    let query;
    try {
        query = JSON.parse(queryString);
    } catch (error) {
        throw new Error('Invalid query format');
    }
    
    // Whitelist allowed fields
    const allowedFields = ['id', 'owner', 'amount', 'status'];
    if (query.selector) {
        for (const field of Object.keys(query.selector)) {
            if (!allowedFields.includes(field)) {
                throw new Error(\`Field '\${field}' not allowed in queries\`);
            }
        }
    }
    
    // Execute validated query
    const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
    const results = await this.getAllResults(iterator);
    
    return results;
}`,
            testing: [
                'Test query injection attempts',
                'Verify field whitelisting works',
                'Test access to private collections',
                'Validate MVCC conflict handling'
            ]
        }
    },

    'Lifecycle Security': {
        description: 'Chaincode lifecycle operations lack proper authorization',
        impact: 'Malicious chaincodes could be installed or existing ones compromised',
        howTestWasRun: {
            method: 'Lifecycle Permission Testing',
            details: 'Attempted unauthorized chaincode installation and policy bypass',
            code: `// Test unauthorized chaincode operations
const installResponse = await axios.post('/v1/chaincode/install', {
    chaincodeName: 'malicious',
    version: '1.0',
    package: 'BASE64_ENCODED_MALICIOUS_CODE'
});`,
            expectedBehavior: 'Should require proper signatures and endorsement policies',
            actualBehavior: 'Operations succeeded without proper authorization'
        },
        remediation: {
            immediate: [
                'Implement strict endorsement policies',
                'Require multi-party approval for lifecycle operations',
                'Validate chaincode packages before installation'
            ],
            implementation: `// Secure chaincode lifecycle policy
{
    "sequence": 1,
    "version": "1.0",
    "endorsement_plugin": "escc",
    "validation_plugin": "vscc",
    "validation_parameter": "AND('Org1MSP.admin', 'Org2MSP.admin')",
    "collections_config": {
        "name": "privateData",
        "policy": "OR('Org1MSP.member', 'Org2MSP.member')",
        "required_peer_count": 2,
        "maximum_peer_count": 3
    }
}`,
            testing: [
                'Test installation with insufficient endorsements',
                'Verify upgrade authorization',
                'Test malicious package detection',
                'Validate policy enforcement'
            ]
        }
    },

    'Cross-Chaincode Invocation': {
        description: 'Cross-chaincode calls lack proper validation and could enable attacks',
        impact: 'Could allow unauthorized access to other chaincodes or state corruption',
        howTestWasRun: {
            method: 'Cross-Contract Testing',
            details: 'Attempted unauthorized cross-chaincode invocations and reentrancy',
            code: `// Test cross-chaincode vulnerability
const response = await axios.post('/v1/chaincode/cross-invoke', {
    fromChaincode: 'trading',
    toChaincode: 'admin',
    function: 'emergencyWithdraw',
    args: ['all_funds']
});`,
            expectedBehavior: 'Should validate permissions for cross-chaincode calls',
            actualBehavior: 'Cross-chaincode call succeeded without validation'
        },
        remediation: {
            immediate: [
                'Implement cross-chaincode access control',
                'Add reentrancy protection',
                'Validate caller permissions'
            ],
            implementation: `// Secure cross-chaincode invocation
async invokeChaincode(ctx, chaincodeName, functionName, args) {
    // Check if current chaincode is authorized to invoke target
    const currentCC = ctx.stub.getChannelId();
    const allowedInvocations = {
        'trading': ['liquidity', 'pricing'],
        'governance': ['admin', 'treasury']
    };
    
    if (!allowedInvocations[currentCC]?.includes(chaincodeName)) {
        throw new Error('Cross-chaincode invocation not authorized');
    }
    
    // Add reentrancy protection
    const reentrancyKey = \`reentrancy_\${ctx.stub.getTxID()}\`;
    const existing = await ctx.stub.getState(reentrancyKey);
    if (existing) {
        throw new Error('Reentrancy detected');
    }
    
    await ctx.stub.putState(reentrancyKey, Buffer.from('locked'));
    
    try {
        // Perform invocation
        const result = await ctx.stub.invokeChaincode(
            chaincodeName, 
            [functionName, ...args], 
            ctx.stub.getChannelId()
        );
        return result;
    } finally {
        // Clean up reentrancy lock
        await ctx.stub.delState(reentrancyKey);
    }
}`,
            testing: [
                'Test unauthorized cross-chaincode calls',
                'Verify reentrancy protection',
                'Test state consistency across calls',
                'Validate permission inheritance'
            ]
        }
    },

    'Deterministic Execution': {
        description: 'Chaincode contains non-deterministic operations that could cause consensus issues',
        impact: 'Could lead to state divergence between peers and consensus failures',
        howTestWasRun: {
            method: 'Determinism Testing',
            details: 'Executed chaincode functions multiple times to check for consistent results',
            code: `// Test for non-deterministic behavior
const responses = [];
for (let i = 0; i < 5; i++) {
    const response = await axios.post('/v1/chaincode/query', {
        function: 'getCurrentTime'
    });
    responses.push(response.data);
}
// Check if all responses are identical`,
            expectedBehavior: 'All executions should return identical results',
            actualBehavior: 'Results varied between executions due to time/random dependencies'
        },
        remediation: {
            immediate: [
                'Remove all random number generation',
                'Use transaction timestamp instead of system time',
                'Eliminate external API calls'
            ],
            implementation: `// Deterministic chaincode patterns
class DeterministicContract extends Contract {
    async transferTokens(ctx, from, to, amount) {
        // Use transaction timestamp (deterministic)
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = txTimestamp.seconds.toNumber();
        
        // Don't use Math.random() or Date.now()
        // Use deterministic sources like transaction ID
        const txId = ctx.stub.getTxID();
        const deterministicSeed = this.hashTxId(txId);
        
        // All operations must be deterministic
        const transfer = {
            from,
            to,
            amount: parseInt(amount),
            timestamp,
            txId,
            deterministicValue: deterministicSeed % 1000
        };
        
        await ctx.stub.putState(
            \`transfer_\${txId}\`, 
            Buffer.from(JSON.stringify(transfer))
        );
        
        return transfer;
    }
    
    hashTxId(txId) {
        // Simple deterministic hash
        let hash = 0;
        for (let i = 0; i < txId.length; i++) {
            const char = txId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
}`,
            testing: [
                'Run function multiple times with same inputs',
                'Verify consistent outputs across peers',
                'Test with different network conditions',
                'Validate timestamp usage patterns'
            ]
        }
    },

    // Time-Based Attack Tests
    'Timestamp Manipulation': {
        description: 'System accepts transactions with invalid or manipulated timestamps',
        impact: 'Could allow backdated transactions, deadline bypass, or timing attacks',
        howTestWasRun: {
            method: 'Timestamp Validation Testing',
            details: 'Submitted transactions with future, past, and invalid timestamps',
            code: `// Test timestamp manipulation
const tests = [
    { timestamp: Date.now() + 86400000 }, // Future
    { timestamp: Date.now() - 604800000 }, // Past week
    { timestamp: 0 }, // Zero
    { timestamp: -1 } // Negative
];`,
            expectedBehavior: 'Should reject transactions with invalid timestamps',
            actualBehavior: 'Transactions with invalid timestamps were accepted'
        },
        remediation: {
            immediate: [
                'Implement timestamp validation',
                'Set acceptable timestamp ranges',
                'Use block timestamps for validation'
            ],
            implementation: `// Timestamp validation middleware
const validateTimestamp = (req, res, next) => {
    const { timestamp } = req.body;
    const now = Date.now();
    const TOLERANCE = 5 * 60 * 1000; // 5 minutes
    
    if (!timestamp) {
        return res.status(400).json({ 
            error: 'Timestamp required' 
        });
    }
    
    if (timestamp > now + TOLERANCE) {
        return res.status(400).json({ 
            error: 'Timestamp too far in future' 
        });
    }
    
    if (timestamp < now - TOLERANCE) {
        return res.status(400).json({ 
            error: 'Timestamp too old' 
        });
    }
    
    next();
};`,
            testing: [
                'Test with various invalid timestamps',
                'Verify tolerance ranges work correctly',
                'Test edge cases around tolerance boundaries',
                'Ensure block timestamp consistency'
            ]
        }
    },

    'Deadline Bypass': {
        description: 'Transactions can execute after their specified deadline',
        impact: 'Could allow execution of expired orders or time-sensitive operations',
        howTestWasRun: {
            method: 'Deadline Enforcement Testing',
            details: 'Submitted transactions with expired deadlines',
            code: `// Test deadline bypass
const expiredDeadline = Date.now() - 3600000; // 1 hour ago
const response = await axios.post('/v1/trade/swap', {
    tokenIn: 'GALA',
    tokenOut: 'GUSDC',
    amountIn: '100',
    deadline: expiredDeadline
});`,
            expectedBehavior: 'Should reject transactions past their deadline',
            actualBehavior: 'Expired transactions were processed successfully'
        },
        remediation: {
            immediate: [
                'Implement strict deadline checking',
                'Use consistent time source',
                'Validate deadlines before execution'
            ],
            implementation: `// Deadline validation
const validateDeadline = (deadline) => {
    if (!deadline) {
        throw new Error('Deadline required');
    }
    
    const currentTime = Date.now();
    
    if (deadline <= currentTime) {
        throw new Error('Transaction deadline exceeded');
    }
    
    // Optional: Maximum deadline limit
    const MAX_DEADLINE = 24 * 60 * 60 * 1000; // 24 hours
    if (deadline > currentTime + MAX_DEADLINE) {
        throw new Error('Deadline too far in future');
    }
    
    return true;
};

// Usage in trade execution
async function executeSwap(params) {
    validateDeadline(params.deadline);
    
    // Execute trade logic
    return performSwap(params);
}`,
            testing: [
                'Test with various expired deadlines',
                'Verify current time consistency',
                'Test edge cases near deadline',
                'Validate maximum deadline limits'
            ]
        }
    },

    'Time-Lock Exploits': {
        description: 'Time-locked operations can be unlocked prematurely',
        impact: 'Could allow early access to locked funds or bypass governance delays',
        howTestWasRun: {
            method: 'Time-Lock Bypass Testing',
            details: 'Attempted to unlock funds before their release time',
            code: `// Test premature unlock
const response = await axios.post('/v1/timelock/withdraw', {
    lockId: 'test_lock_1',
    unlockTime: Date.now() + 86400000, // Should unlock tomorrow
    forceUnlock: true
});`,
            expectedBehavior: 'Should enforce time-lock periods strictly',
            actualBehavior: 'Time-locked funds were released early'
        },
        remediation: {
            immediate: [
                'Use blockchain timestamps for time-locks',
                'Implement multi-signature requirements',
                'Add governance override mechanisms'
            ],
            implementation: `// Secure time-lock implementation
class TimeLock {
    async createLock(ctx, beneficiary, amount, unlockTime) {
        const currentTime = ctx.stub.getTxTimestamp().seconds.toNumber();
        
        if (unlockTime <= currentTime) {
            throw new Error('Unlock time must be in future');
        }
        
        const lock = {
            beneficiary,
            amount,
            unlockTime,
            created: currentTime,
            txId: ctx.stub.getTxID(),
            released: false
        };
        
        await ctx.stub.putState(
            \`timelock_\${ctx.stub.getTxID()}\`, 
            Buffer.from(JSON.stringify(lock))
        );
        
        return lock;
    }
    
    async releaseLock(ctx, lockId) {
        const lockData = await ctx.stub.getState(lockId);
        if (!lockData) {
            throw new Error('Lock not found');
        }
        
        const lock = JSON.parse(lockData.toString());
        const currentTime = ctx.stub.getTxTimestamp().seconds.toNumber();
        
        if (currentTime < lock.unlockTime) {
            throw new Error(\`Lock not ready. Unlocks at \${new Date(lock.unlockTime * 1000)}\`);
        }
        
        if (lock.released) {
            throw new Error('Lock already released');
        }
        
        // Mark as released
        lock.released = true;
        lock.releasedAt = currentTime;
        
        await ctx.stub.putState(lockId, Buffer.from(JSON.stringify(lock)));
        
        return lock;
    }
}`,
            testing: [
                'Test early unlock attempts',
                'Verify blockchain timestamp usage',
                'Test governance override functions',
                'Validate multiple lock scenarios'
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