const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const paymentsController = require('../controllers/paymentsController');

router.get('/booking/:bookingId', authenticate, paymentsController.getPaymentByBooking);

module.exports = router;

