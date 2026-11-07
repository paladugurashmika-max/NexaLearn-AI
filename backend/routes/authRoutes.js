const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/profile', requireAuth, authController.getProfile);
router.patch('/profile', requireAuth, authController.updateProfile);

module.exports = router;

