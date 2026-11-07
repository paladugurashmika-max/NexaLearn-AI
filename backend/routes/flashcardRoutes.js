const express = require('express');
const router = express.Router();
const flashcardController = require('../controllers/flashcardController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/generate', requireAuth, flashcardController.generateFlashcards);
router.get('/', requireAuth, flashcardController.listFlashcards);
router.patch('/:id', requireAuth, flashcardController.updateFlashcardMastery);
router.delete('/:id', requireAuth, flashcardController.deleteFlashcard);

module.exports = router;

