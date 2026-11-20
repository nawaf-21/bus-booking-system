const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const feedbackController = require('../controllers/feedbackController');

router.post('/trips/:tripId', authenticate, authorize('Passenger'), feedbackController.createFeedback);
router.get('/trips/:tripId', feedbackController.getTripFeedback);
router.get('/my', authenticate, feedbackController.getMyFeedback);

module.exports = router;

