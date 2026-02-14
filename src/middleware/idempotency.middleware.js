
const store = require('../store/memoryStore');
const { hashBody } = require('../utils/hash');
const idempotencyEmitter = require('../utils/emitter');

const idempotencyMiddleware = async (req, res, next) => {
    const key = req.header('Idempotency-Key');

    if (!key) {
        return res.status(400).json({ error: 'Idempotency-Key header is missing' });
    }

    const currentHash = hashBody(req.body);
    const existingRecord = store.get(key);

    if (existingRecord) {
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

    // New Request
    store.set(key, { status: 'PROCESSING', hash: currentHash });

    // Intercept response methods to save to store
    const originalSend = res.send;
    const originalJson = res.json;

    res.json = function (body) {
        store.set(key, {
            status: 'COMPLETED',
            hash: currentHash,
            statusCode: res.statusCode,
            body: body
        });
        idempotencyEmitter.emit('completed', {
            key,
            statusCode: res.statusCode,
            body: body
        });
        return originalJson.call(this, body);
    };

    // Note: express res.json calls res.send, so intercepting one might be enough or tricky depending on implementation.
    // But usually overriding res.json is safer if we know we only send JSON.
    // If we want to be safe, we can override res.send too, but parsing body might be needed.
    // Given the requirements "The response body accepts a JSON object", intercepting res.json is appropriate.

    next();
};

module.exports = idempotencyMiddleware;
