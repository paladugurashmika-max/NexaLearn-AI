const express = require('express');
const router = express.Router();
const plannerController = require('../controllers/plannerController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/generate', requireAuth, plannerController.generatePlan);
router.get('/', requireAuth, plannerController.getPlanner);
router.post('/tasks', requireAuth, plannerController.addTask);
router.patch('/tasks/:id', requireAuth, plannerController.updateTask);
router.delete('/tasks/:id', requireAuth, plannerController.deleteTask);

module.exports = router;

