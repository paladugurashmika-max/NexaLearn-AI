const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/generate', requireAuth, quizController.generateQuiz);
router.get('/', requireAuth, quizController.listQuizzes);
router.get('/history', requireAuth, quizController.getQuizHistory);
router.get('/attempts/:attemptId', requireAuth, quizController.getAttemptDetails);
router.get('/:id', requireAuth, quizController.getQuizById);
router.post('/:id/submit', requireAuth, quizController.submitQuiz);

module.exports = router;

