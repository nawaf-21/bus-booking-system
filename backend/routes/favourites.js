const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const favouritesController = require('../controllers/favouritesController');

router.get('/routes', authenticate, favouritesController.getFavouriteRoutes);
router.post('/routes', authenticate, authorize('Passenger'), favouritesController.addFavouriteRoute);
router.delete('/routes/:id', authenticate, favouritesController.removeFavouriteRoute);

module.exports = router;

