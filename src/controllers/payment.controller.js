
const { processPayment } = require('../services/payment.service');

const handlePayment = async (req, res) => {
    const { amount, currency } = req.body;

    if (!amount || !currency) {
        return res.status(400).json({ error: 'Amount and currency are required' });
    }

    try {
        const result = await processPayment(amount, currency);
        return res.status(201).json(result);
    } catch (error) {
        return res.status(500).json({ error: 'Payment processing failed' });
    }
};

module.exports = { handlePayment };
