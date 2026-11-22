const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

router.get('/overview', authenticate, authorize('Admin'), adminController.getOverview);
router.get('/bookings', authenticate, authorize('Admin'), adminController.getAllBookings);
router.get('/bookings/search', authenticate, authorize('Admin'), adminController.searchBookings);
router.get('/trips', authenticate, authorize('Admin'), adminController.getAllTrips);
router.post('/bookings/:id/cancel', authenticate, authorize('Admin'), adminController.forceCancelBooking);
router.post('/bookings/:id/refund', authenticate, authorize('Admin'), adminController.processRefund);
router.post('/seats/reserve', authenticate, authorize('Admin'), adminController.reserveSeat);

module.exports = router;

