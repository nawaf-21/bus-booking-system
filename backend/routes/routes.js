const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const routesController = require('../controllers/routesController');

router.get('/', routesController.getAllRoutes);
router.get('/:id', routesController.getRouteById);
router.post('/', authenticate, authorize('Admin', 'BusCompany'), routesController.createRoute);
router.put('/:id', authenticate, authorize('Admin', 'BusCompany'), routesController.updateRoute);

module.exports = router;

