const express = require('express');
const request = require('supertest');
const idempotencyMiddleware = require('../../src/middleware/idempotency.middleware');
const store = require('../../src/store/memoryStore');
const idempotencyEmitter = require('../../src/utils/emitter');

describe('Idempotency Middleware', () => {
    let app;

    beforeEach(() => {
        store.clear();
        app = express();
        app.use(express.json());
        app.use(idempotencyMiddleware);

        app.post('/test', (req, res) => {
            res.status(200).json({ message: 'Success', data: req.body });
        });
    });

    test('should return 400 if Idempotency-Key is missing', async () => {
        const response = await request(app)
            .post('/test')
            .send({ amount: 100 });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Idempotency-Key header is missing');
    });

    test('should process a new request and cache it', async () => {
        const response = await request(app)
            .post('/test')
            .set('Idempotency-Key', 'key-1')
            .send({ amount: 100 });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Success');
        expect(response.header['x-cache-hit']).toBeUndefined();

        // Verify it was stored
        expect(store.has('key-1')).toBe(true);
        const record = store.get('key-1');
        expect(record.status).toBe('COMPLETED');
        expect(record.body).toEqual({ message: 'Success', data: { amount: 100 } });
    });

    test('should return cached response for repeated request', async () => {
        // First request
        await request(app)
            .post('/test')
            .set('Idempotency-Key', 'key-2')
            .send({ amount: 100 });

        // Repeated request
        const response = await request(app)
            .post('/test')
            .set('Idempotency-Key', 'key-2')
            .send({ amount: 100 });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Success');
        expect(response.header['x-cache-hit']).toBe('true');
    });

    test('should return 422 for repeated key with different body', async () => {
        // First request
        await request(app)
            .post('/test')
            .set('Idempotency-Key', 'key-3')
            .send({ amount: 100 });

        // Repeated key, different body
        const response = await request(app)
            .post('/test')
            .set('Idempotency-Key', 'key-3')
            .send({ amount: 200 });

        expect(response.status).toBe(422);
        expect(response.body.error).toContain('different request body');
    });

    test('should wait for in-progress request (concurrent)', async () => {
        // Setup a slow route to test concurrency
        const slowApp = express();
        slowApp.use(express.json());
        slowApp.use(idempotencyMiddleware);
        slowApp.post('/slow', (req, res) => {
            setTimeout(() => {
                res.status(200).json({ status: 'done' });
            }, 100);
        });

        const key = 'concurrent-key';

        // Start two requests
        const [res1, res2] = await Promise.all([
            request(slowApp).post('/slow').set('Idempotency-Key', key).send({}),
            request(slowApp).post('/slow').set('Idempotency-Key', key).send({})
        ]);

        expect(res1.status).toBe(200);
        expect(res2.status).toBe(200);
        expect(res1.body.status).toBe('done');
        expect(res2.body.status).toBe('done');

        // One should be original, one should be cache hit
        const cacheHits = [res1.header['x-cache-hit'], res2.header['x-cache-hit']];
        expect(cacheHits).toContain('true');
        expect(cacheHits).toContain(undefined);
    });

    test('should expire old records (TTL)', async () => {
        const key = 'expire-key';
        const now = Date.now();
        const past = now - (61 * 60 * 1000); // 61 minutes ago

        // Manually inject an expired record
        store.set(key, {
            status: 'COMPLETED',
            hash: 'some-hash',
            statusCode: 200,
            body: { old: true },
            timestamp: past
        });

        // This request should be treated as NEW because the old one expired
        const response = await request(app)
            .post('/test')
            .set('Idempotency-Key', key)
            .send({ amount: 200 });

        expect(response.status).toBe(200);
        expect(response.header['x-cache-hit']).toBeUndefined();
        expect(response.body.data.amount).toBe(200); // New body

        // Verify store was updated with new timestamp
        const record = store.get(key);
        expect(record.timestamp).toBeGreaterThan(now - 1000);
    });
});
