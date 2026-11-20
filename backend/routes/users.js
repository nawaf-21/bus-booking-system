const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const usersController = require('../controllers/usersController');

router.get('/', authenticate, authorize('Admin'), usersController.getAllUsers);
router.post('/', authenticate, authorize('Admin'), usersController.createUser);
router.get('/:id', authenticate, usersController.getUserById);
router.put('/:id', authenticate, usersController.updateUser);
router.delete('/:id', authenticate, authorize('Admin'), usersController.deleteUser);

module.exports = router;

