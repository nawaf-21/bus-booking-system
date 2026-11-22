const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const companyController = require('../controllers/companyController');

router.get('/overview', authenticate, authorize('BusCompany'), companyController.getOverview);
router.get('/trips', authenticate, authorize('BusCompany'), companyController.getCompanyTrips);
router.get('/bookings', authenticate, authorize('BusCompany'), companyController.getCompanyBookings);
router.get('/feedback', authenticate, authorize('BusCompany'), companyController.getCompanyFeedback);
router.get('/routes', authenticate, authorize('BusCompany'), require('../controllers/routesController').getCompanyRoutes);
router.get('/buses', authenticate, authorize('BusCompany'), require('../controllers/busesController').getCompanyBuses);

module.exports = router;

