const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', requireAuth, progressController.getProgressSummary);
router.get('/history', requireAuth, progressController.getProgressHistory);

module.exports = router;

