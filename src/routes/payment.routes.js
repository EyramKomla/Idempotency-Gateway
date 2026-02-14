
const express = require('express');
const router = express.Router();
const { handlePayment } = require('../controllers/payment.controller');
const idempotencyMiddleware = require('../middleware/idempotency.middleware');

router.post('/process-payment', idempotencyMiddleware, handlePayment);

module.exports = router;
