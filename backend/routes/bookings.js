const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const bookingsController = require('../controllers/bookingsController');

router.post('/preview', authenticate, authorize('Passenger'), bookingsController.previewBooking);
router.post('/confirm', authenticate, authorize('Passenger'), bookingsController.confirmBooking);
router.get('/my', authenticate, bookingsController.getMyBookings);
router.get('/:id', authenticate, bookingsController.getBookingById);
router.post('/:id/cancel', authenticate, bookingsController.cancelBooking);

module.exports = router;

