
const store = require('../store/memoryStore');
const { hashBody } = require('../utils/hash');
const idempotencyEmitter = require('../utils/emitter');

// TTL: Records expire after 1 hour to prevent memory bloat
const TTL_MS = 60 * 60 * 1000; // 1 hour in milliseconds

const idempotencyMiddleware = async (req, res, next) => {
    const key = req.header('Idempotency-Key');

    if (!key) {
        return res.status(400).json({ error: 'Idempotency-Key header is missing' });
    }

    const currentHash = hashBody(req.body);
    const existingRecord = store.get(key);

    if (existingRecord) {
        // Check if record has expired (older than 1 hour)
        const recordAge = Date.now() - existingRecord.timestamp;
        if (recordAge > TTL_MS) {
            // Record expired, delete it and treat as new request
            store.delete(key);
            // Continue to "New Request" logic below
        } else {
            // Record is still valid, process normally
            if (existingRecord.status === 'COMPLETED') {
                if (existingRecord.hash !== currentHash) {
                    return res.status(422).json({
                        error: 'Idempotency key already used for a different request body.'
                    });
                }
                res.set('X-Cache-Hit', 'true');
                return res.status(existingRecord.statusCode).json(existingRecord.body);
            }

            if (existingRecord.status === 'PROCESSING') {
                // Wait for completion
                return new Promise((resolve) => {
                    const listener = (data) => {
                        if (data.key === key) {
                            idempotencyEmitter.removeListener('completed', listener);
                            res.set('X-Cache-Hit', 'true');
                            res.status(data.statusCode).json(data.body);
                            resolve();
                        }
                    };
                    idempotencyEmitter.on('completed', listener);
                });
            }
        }
    }

    // New Request
    store.set(key, { status: 'PROCESSING', hash: currentHash, timestamp: Date.now() });

    // Intercept response methods to save to store
    const originalJson = res.json;

    res.json = function (body) {
        store.set(key, {
            status: 'COMPLETED',
            hash: currentHash,
            statusCode: res.statusCode,
            body: body,
            timestamp: Date.now()
        });
        idempotencyEmitter.emit('completed', {
            key,
            statusCode: res.statusCode,
            body: body
        });
        return originalJson.call(this, body);
    };

    next();
};

module.exports = idempotencyMiddleware;
