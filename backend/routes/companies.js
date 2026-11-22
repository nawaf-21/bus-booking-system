const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const companiesController = require('../controllers/companiesController');

router.get('/', authenticate, companiesController.getAllCompanies);
router.get('/:id', authenticate, companiesController.getCompanyById);
router.post('/', authenticate, authorize('Admin'), companiesController.createCompany);
router.put('/:id', authenticate, authorize('Admin'), companiesController.updateCompany);
router.delete('/:id', authenticate, authorize('Admin'), companiesController.deleteCompany);

module.exports = router;

