
const EventEmitter = require('events');
class IdempotencyEmitter extends EventEmitter { }
const idempotencyEmitter = new IdempotencyEmitter();

module.exports = idempotencyEmitter;
