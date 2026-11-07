const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', requireAuth, achievementController.getAchievements);

module.exports = router;

