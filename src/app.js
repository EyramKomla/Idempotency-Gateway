
const express = require('express');
const paymentRoutes = require('./routes/payment.routes');

const app = express();

app.use(express.json());

app.use('/', paymentRoutes);

module.exports = app;
