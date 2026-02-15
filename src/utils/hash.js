
const crypto = require('crypto');

const hashBody = (body) => {
    const deterministicStringify = (obj) => {
        if (typeof obj !== 'object' || obj === null) {
            return JSON.stringify(obj);
        }
        if (Array.isArray(obj)) {
            return '[' + obj.map(item => deterministicStringify(item)).join(',') + ']';
        }
        return '{' + Object.keys(obj).sort().map(key => {
            return JSON.stringify(key) + ':' + deterministicStringify(obj[key]);
        }).join(',') + '}';
    };
    return crypto.createHash('sha256').update(deterministicStringify(body) || '').digest('hex');
};

module.exports = { hashBody };
