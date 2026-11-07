const express = require('express');
const router = express.Router();
const multer = require('multer');
const aiController = require('../controllers/aiController');
const { requireAuth } = require('../middleware/authMiddleware');

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are supported'), false);
    }
  }
});

router.post('/extract-pdf', requireAuth, upload.single('file'), aiController.extractPdfText);
router.post('/notes', requireAuth, aiController.generateNotes);
router.get('/notes', requireAuth, aiController.listNotes);
router.post('/notes/save', requireAuth, aiController.saveNote);
router.delete('/notes/:id', requireAuth, aiController.deleteNote);

router.post('/summarize', requireAuth, aiController.summarize);
router.post('/explain', requireAuth, aiController.simplifyConcept);

router.post('/chat', requireAuth, aiController.chat);
router.get('/conversations', requireAuth, aiController.listConversations);
router.get('/conversations/:id/messages', requireAuth, aiController.getConversationMessages);
router.delete('/conversations/:id', requireAuth, aiController.deleteConversation);

module.exports = router;

