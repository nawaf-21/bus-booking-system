const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const busesController = require('../controllers/busesController');

router.get('/', busesController.getAllBuses);
router.get('/:id', busesController.getBusById);
router.post('/', authenticate, authorize('Admin', 'BusCompany'), busesController.createBus);
router.put('/:id', authenticate, authorize('Admin', 'BusCompany'), busesController.updateBus);
router.delete('/:id', authenticate, authorize('Admin', 'BusCompany'), busesController.deleteBus);

module.exports = router;

