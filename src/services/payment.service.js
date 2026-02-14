
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const processPayment = async (amount, currency) => {
    // Simulate processing delay
    await delay(2000);
    return {
        success: true,
        message: `Charged ${amount} ${currency}`,
        transactionId: `txn_${Date.now()}`
    };
};

module.exports = { processPayment };
