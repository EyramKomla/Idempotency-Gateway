const { hashBody } = require('../../src/utils/hash');

describe('Hash Utility', () => {
    test('should produce the same hash for identical objects', () => {
        const body1 = { amount: 100, currency: 'USD' };
        const body2 = { amount: 100, currency: 'USD' };

        expect(hashBody(body1)).toBe(hashBody(body2));
    });

    test('should produce the same hash for objects with different key order', () => {
        const body1 = { amount: 100, currency: 'USD' };
        const body2 = { currency: 'USD', amount: 100 };

        expect(hashBody(body1)).toBe(hashBody(body2));
    });

    test('should produce different hashes for different objects', () => {
        const body1 = { amount: 100, currency: 'USD' };
        const body2 = { amount: 200, currency: 'USD' };

        expect(hashBody(body1)).not.toBe(hashBody(body2));
    });

    test('should handle empty objects', () => {
        expect(hashBody({})).toBe(hashBody({}));
    });

    test('should handle undefined or null bodies', () => {
        expect(hashBody(null)).toBe(hashBody(null));
        expect(hashBody(undefined)).toBe(hashBody(undefined));
    });
});
