const express = require('express');
const router = express.Router();
const adaptiveController = require('../controllers/adaptiveController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/mastery', requireAuth, adaptiveController.getTopicMastery);
router.get('/weak-topics', requireAuth, adaptiveController.getWeakTopics);
router.get('/recommendations', requireAuth, adaptiveController.getRecommendations);
router.get('/cycle', requireAuth, adaptiveController.getLearningCycleStatus);

module.exports = router;

