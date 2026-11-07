const crypto = require('crypto');

function successResponse(res, data, message = 'Success', status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data
  });
}

function errorResponse(res, message = 'An error occurred', status = 500, error = null) {
  const payload = {
    success: false,
    message
  };
  if (error && process.env.NODE_ENV === 'development') {
    payload.error = typeof error === 'string' ? error : error.message;
  }
  return res.status(status).json(payload);
}

function generateId() {
  return crypto.randomUUID();
}

/**
 * Local in-memory persistent store when Supabase isn't connected yet.
 * Allows complete zero-setup testing of the full adaptive learning cycle.
 */
class LocalStore {
  constructor() {
    this.profiles = new Map();
    this.notes = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.quizzes = new Map();
    this.questions = new Map();
    this.quiz_attempts = new Map();
    this.answers = new Map();
    this.topic_mastery = new Map();
    this.flashcards = new Map();
    this.study_plans = new Map();
    this.study_tasks = new Map();
    this.achievements = new Map();
    this.student_achievements = new Map();

    // Seed default achievements
    const defaults = [
      { id: '1', code: 'FIRST_STEP', title: 'First Steps', description: 'Completed your first assessment quiz', icon: 'footprints', points: 50, condition_type: 'quiz_count', condition_threshold: 1 },
      { id: '2', code: 'QUICK_LEARNER', title: 'Quick Learner', description: 'Achieved an 80%+ score on any quiz', icon: 'zap', points: 75, condition_type: 'quiz_score', condition_threshold: 80 },
      { id: '3', code: 'CONSISTENCY_CHAMP', title: 'Consistency Champion', description: 'Maintained a 3-day study streak', icon: 'flame', points: 100, condition_type: 'streak', condition_threshold: 3 },
      { id: '4', code: 'TOPIC_MASTER', title: 'Topic Master', description: 'Achieved 85%+ mastery in a subject topic', icon: 'award', points: 150, condition_type: 'mastery', condition_threshold: 85 },
      { id: '5', code: 'KNOWLEDGE_EXPLORER', title: 'Knowledge Explorer', description: 'Generated 5 or more study notes', icon: 'compass', points: 100, condition_type: 'notes_count', condition_threshold: 5 },
      { id: '6', code: 'PRACTICE_PRO', title: 'Practice Pro', description: 'Completed 10 practice quizzes', icon: 'target', points: 200, condition_type: 'quiz_count', condition_threshold: 10 },
      { id: '7', code: 'FLASHCARD_WIZARD', title: 'Flashcard Wizard', description: 'Reviewed and mastered 15 flashcards', icon: 'layers', points: 100, condition_type: 'flashcards_mastered', condition_threshold: 15 }
    ];
    defaults.forEach(a => this.achievements.set(a.id, a));
  }
}

const localStore = new LocalStore();

module.exports = {
  successResponse,
  errorResponse,
  generateId,
  localStore
};

