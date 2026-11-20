const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const tripsController = require('../controllers/tripsController');

router.get('/search', tripsController.searchTrips);
router.get('/:id', tripsController.getTripById);
router.get('/:id/seats', tripsController.getTripSeats);
router.post('/', authenticate, authorize('Admin', 'BusCompany'), tripsController.createTrip);
router.put('/:id', authenticate, authorize('Admin', 'BusCompany'), tripsController.updateTrip);
router.delete('/:id', authenticate, authorize('Admin', 'BusCompany'), tripsController.deleteTrip);

module.exports = router;

