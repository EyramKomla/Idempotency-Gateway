const store = require('../../src/store/memoryStore');

describe('Memory Store', () => {
    beforeEach(() => {
        store.clear();
    });

    test('should be a Map instance', () => {
        expect(store).toBeInstanceOf(Map);
    });

    test('should store and retrieve values', () => {
        store.set('key1', 'value1');
        expect(store.get('key1')).toBe('value1');
    });

    test('should delete values', () => {
        store.set('key1', 'value1');
        store.delete('key1');
        expect(store.has('key1')).toBe(false);
    });

    test('should clear values', () => {
        store.set('key1', 'value1');
        store.clear();
        expect(store.size).toBe(0);
    });
});
