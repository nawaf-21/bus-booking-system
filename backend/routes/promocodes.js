const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const promocodesController = require('../controllers/promocodesController');

router.post('/validate', promocodesController.validatePromoCode);
router.get('/', authenticate, authorize('Admin'), promocodesController.getAllPromoCodes);
router.post('/', authenticate, authorize('Admin'), promocodesController.createPromoCode);
router.put('/:id', authenticate, authorize('Admin'), promocodesController.updatePromoCode);
router.delete('/:id', authenticate, authorize('Admin'), promocodesController.deletePromoCode);

module.exports = router;

