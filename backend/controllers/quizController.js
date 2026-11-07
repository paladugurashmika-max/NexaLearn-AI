const { isConfigured, supabaseAdmin } = require('../config/supabase');
const geminiService = require('../services/geminiService');
const adaptiveEngine = require('../services/adaptiveEngine');
const { checkAndAwardAchievements } = require('../services/gamificationService');
const { successResponse, errorResponse, localStore, generateId } = require('../utils/helpers');

/**
 * Generate a new assessment quiz using Gemini3.5 Flash and persist to DB
 */
async function generateQuiz(req, res) {
  try {
    const userId = req.user.id;
    const { subject = 'Computer Science', topic = 'Python Recursion', difficulty = 'intermediate', numQuestions = 5 } = req.body;

    if (!topic) {
      return errorResponse(res, 'Topic is required', 400);
    }

    const generatedQuestions = await geminiService.generateQuiz({
      subject,
      topic,
      difficulty,
      numQuestions: parseInt(numQuestions, 10) || 5
    });

    const quizTitle = `${topic} Assessment (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})`;
    const quizPayload = {
      user_id: userId,
      title: quizTitle,
      subject,
      topic,
      difficulty,
      total_questions: generatedQuestions.length,
      created_at: new Date().toISOString()
    };

    let quizId = null;
    let savedQuiz = null;

    if (isConfigured && supabaseAdmin) {
      const { data: qData, error: qErr } = await supabaseAdmin.from('quizzes').insert(quizPayload).select().single();
      if (qErr) return errorResponse(res, 'Failed to save quiz', 500, qErr);
      savedQuiz = qData;
      quizId = qData.id;

      const questionRows = generatedQuestions.map(q => ({
        quiz_id: quizId,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation || '',
        topic: q.topic || topic,
        difficulty: q.difficulty || difficulty,
        created_at: new Date().toISOString()
      }));

      const { error: questErr } = await supabaseAdmin.from('questions').insert(questionRows);
      if (questErr) return errorResponse(res, 'Failed to save quiz questions', 500, questErr);
    } else {
      quizId = generateId();
      savedQuiz = { id: quizId, ...quizPayload };
      localStore.quizzes.set(quizId, savedQuiz);

      generatedQuestions.forEach(q => {
        const questId = generateId();
        localStore.questions.set(questId, {
          id: questId,
          quiz_id: quizId,
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation || '',
          topic: q.topic || topic,
          difficulty: q.difficulty || difficulty,
          created_at: new Date().toISOString()
        });
      });
    }

    // Return safe quiz questions (without correct_answer & explanation)
    const sanitizedQuestions = generatedQuestions.map((q, idx) => ({
      index: idx + 1,
      question_text: q.question_text,
      options: q.options,
      topic: q.topic || topic,
      difficulty: q.difficulty || difficulty
    }));

    return successResponse(res, {
      quiz: savedQuiz,
      questions: sanitizedQuestions
    }, 'Quiz generated successfully', 201);
  } catch (err) {
    return errorResponse(res, 'Failed to generate quiz', 500, err);
  }
}

/**
 * List Student's Quizzes
 */
async function listQuizzes(req, res) {
  try {
    const userId = req.user.id;
    let quizzes = [];

    if (isConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('quizzes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) return errorResponse(res, 'Failed to fetch quizzes', 500, error);
      quizzes = data || [];
    } else {
      quizzes = Array.from(localStore.quizzes.values())
        .filter(q => q.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return successResponse(res, quizzes, 'Quizzes retrieved');
  } catch (err) {
    return errorResponse(res, 'Error fetching quizzes', 500, err);
  }
}

/**
 * Get Quiz for Taking (STRICT SECURITY: Strips out correct answers and explanations)
 */
async function getQuizById(req, res) {
  try {
    const userId = req.user.id;
    const quizId = req.params.id;
    let quiz = null;
    let questions = [];

    if (isConfigured && supabaseAdmin) {
      const { data: qData, error: qErr } = await supabaseAdmin
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .eq('user_id', userId)
        .single();

      if (qErr || !qData) return errorResponse(res, 'Quiz not found', 404, qErr);
      quiz = qData;

      // Select questions without correct_answer or explanation
      const { data: questData, error: questErr } = await supabaseAdmin
        .from('questions')
        .select('id, quiz_id, question_text, options, topic, difficulty')
        .eq('quiz_id', quizId);

      if (questErr) return errorResponse(res, 'Failed to load questions', 500, questErr);
      questions = questData || [];
    } else {
      quiz = localStore.quizzes.get(quizId);
      if (!quiz || quiz.user_id !== userId) return errorResponse(res, 'Quiz not found', 404);

      questions = Array.from(localStore.questions.values())
        .filter(q => q.quiz_id === quizId)
        .map(q => ({
          id: q.id,
          quiz_id: q.quiz_id,
          question_text: q.question_text,
          options: q.options,
          topic: q.topic,
          difficulty: q.difficulty
        }));
    }

    return successResponse(res, { quiz, questions }, 'Quiz loaded for practice');
  } catch (err) {
    return errorResponse(res, 'Error retrieving quiz', 500, err);
  }
}

/**
 * Submit Quiz Answers & Calculate Server-Side Trusted Score
 */
async function submitQuiz(req, res) {
  try {
    const userId = req.user.id;
    const quizId = req.params.id;
    const { answers: submittedAnswers } = req.body; // Array of { question_id, selected_option }

    if (!Array.isArray(submittedAnswers) || submittedAnswers.length === 0) {
      return errorResponse(res, 'Submitted answers are required', 400);
    }

    // 1. Fetch official questions with real correct_answer from DB
    let officialQuestions = [];
    let quiz = null;

    if (isConfigured && supabaseAdmin) {
      const { data: qData } = await supabaseAdmin.from('quizzes').select('*').eq('id', quizId).single();
      quiz = qData;
      const { data: questions } = await supabaseAdmin.from('questions').select('*').eq('quiz_id', quizId);
      officialQuestions = questions || [];
    } else {
      quiz = localStore.quizzes.get(quizId);
      officialQuestions = Array.from(localStore.questions.values()).filter(q => q.quiz_id === quizId);
    }

    if (!quiz || officialQuestions.length === 0) {
      return errorResponse(res, 'Quiz not found or contains no questions', 404);
    }

    // 2. Map questions by ID for deterministic verification
    const questionMap = new Map();
    officialQuestions.forEach(q => questionMap.set(q.id, q));

    let score = 0;
    const detailedReview = [];
    const answerRecords = [];
    const wrongAnswers = [];

    // Evaluate each submitted answer
    for (const sub of submittedAnswers) {
      const q = questionMap.get(sub.question_id);
      if (!q) continue;

      const isCorrect = String(sub.selected_option).trim() === String(q.correct_answer).trim();
      if (isCorrect) score += 1;

      const reviewItem = {
        question_id: q.id,
        question_text: q.question_text,
        selected_option: sub.selected_option,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        explanation: q.explanation,
        topic: q.topic || quiz.topic,
        difficulty: q.difficulty || quiz.difficulty
      };
      detailedReview.push(reviewItem);

      if (!isCorrect) {
        wrongAnswers.push(reviewItem);
      }

      answerRecords.push({
        question_id: q.id,
        user_id: userId,
        selected_option: sub.selected_option,
        is_correct: isCorrect,
        created_at: new Date().toISOString()
      });
    }

    const totalQuestions = officialQuestions.length;
    const percentage = Math.round((score / totalQuestions) * 100 * 10) / 10;
    const passed = percentage >= 60;

    // 3. Save Quiz Attempt to DB
    const attemptPayload = {
      quiz_id: quizId,
      user_id: userId,
      score,
      total_questions: totalQuestions,
      percentage,
      passed,
      created_at: new Date().toISOString()
    };

    let attemptId = null;
    let savedAttempt = null;

    if (isConfigured && supabaseAdmin) {
      const { data: attData, error: attErr } = await supabaseAdmin.from('quiz_attempts').insert(attemptPayload).select().single();
      if (attErr) return errorResponse(res, 'Failed to save quiz attempt', 500, attErr);
      savedAttempt = attData;
      attemptId = attData.id;

      const formattedAnswers = answerRecords.map(a => ({ ...a, attempt_id: attemptId }));
      await supabaseAdmin.from('answers').insert(formattedAnswers);
    } else {
      attemptId = generateId();
      savedAttempt = { id: attemptId, ...attemptPayload };
      localStore.quiz_attempts.set(attemptId, savedAttempt);

      answerRecords.forEach(a => {
        const aId = generateId();
        localStore.answers.set(aId, { id: aId, attempt_id: attemptId, ...a });
      });
    }

    // 4. Update Topic Mastery via Adaptive Intelligence Engine
    let currentMasteryRecord = null;
    if (isConfigured && supabaseAdmin) {
      const { data: tm } = await supabaseAdmin
        .from('topic_mastery')
        .select('*')
        .eq('user_id', userId)
        .eq('subject', quiz.subject)
        .eq('topic', quiz.topic)
        .maybeSingle();
      currentMasteryRecord = tm;
    } else {
      for (const tm of localStore.topic_mastery.values()) {
        if (tm.user_id === userId && tm.subject === quiz.subject && tm.topic === quiz.topic) {
          currentMasteryRecord = tm;
          break;
        }
      }
    }

    const updatedMastery = adaptiveEngine.calculateUpdatedMastery({
      currentAttemptPercentage: percentage,
      previousMastery: currentMasteryRecord ? Number(currentMasteryRecord.mastery_score) : null,
      previousAttemptsCount: currentMasteryRecord ? currentMasteryRecord.total_attempts : 0,
      historicalTotalCorrect: currentMasteryRecord ? currentMasteryRecord.total_correct : 0,
      historicalTotalQuestions: currentMasteryRecord ? currentMasteryRecord.total_questions : 0,
      currentCorrect: score,
      currentTotal: totalQuestions
    });

    const masteryPayload = {
      user_id: userId,
      subject: quiz.subject,
      topic: quiz.topic,
      mastery_score: updatedMastery.masteryScore,
      total_attempts: updatedMastery.totalAttempts,
      total_correct: updatedMastery.totalCorrect,
      total_questions: updatedMastery.totalQuestions,
      status: updatedMastery.status,
      last_assessed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isConfigured && supabaseAdmin) {
      await supabaseAdmin.from('topic_mastery').upsert(masteryPayload, { onConflict: 'user_id,subject,topic' });
    } else {
      const tmKey = `${userId}_${quiz.subject}_${quiz.topic}`;
      localStore.topic_mastery.set(tmKey, {
        id: currentMasteryRecord ? currentMasteryRecord.id : generateId(),
        ...masteryPayload,
        created_at: currentMasteryRecord ? currentMasteryRecord.created_at : new Date().toISOString()
      });
    }

    // 5. Evaluate Gamification & Badges
    let totalAttemptsCount = 1;
    if (isConfigured && supabaseAdmin) {
      const { count } = await supabaseAdmin.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      totalAttemptsCount = count || 1;
    } else {
      totalAttemptsCount = Array.from(localStore.quiz_attempts.values()).filter(a => a.user_id === userId).length;
    }

    const newlyUnlockedAchievements = await checkAndAwardAchievements(userId, {
      quizCount: totalAttemptsCount,
      latestScore: percentage,
      maxMastery: updatedMastery.masteryScore
    });

    return successResponse(res, {
      attempt: savedAttempt,
      score,
      totalQuestions,
      percentage,
      passed,
      detailedReview,
      wrongAnswers,
      updatedMastery: {
        topic: quiz.topic,
        subject: quiz.subject,
        score: updatedMastery.masteryScore,
        status: updatedMastery.status,
        totalAttempts: updatedMastery.totalAttempts
      },
      newlyUnlockedAchievements
    }, 'Quiz evaluated successfully');
  } catch (err) {
    return errorResponse(res, 'Error submitting quiz', 500, err);
  }
}

/**
 * Quiz History
 */
async function getQuizHistory(req, res) {
  try {
    const userId = req.user.id;
    let history = [];

    if (isConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('quiz_attempts')
        .select('*, quizzes(title, subject, topic, difficulty)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) return errorResponse(res, 'Failed to load history', 500, error);
      history = (data || []).map(att => ({
        ...att,
        title: att.quizzes?.title,
        subject: att.quizzes?.subject,
        topic: att.quizzes?.topic,
        difficulty: att.quizzes?.difficulty
      }));
    } else {
      history = Array.from(localStore.quiz_attempts.values())
        .filter(a => a.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map(att => {
          const q = localStore.quizzes.get(att.quiz_id);
          return {
            ...att,
            title: q ? q.title : 'Assessment',
            subject: q ? q.subject : 'General',
            topic: q ? q.topic : 'General',
            difficulty: q ? q.difficulty : 'intermediate'
          };
        });
    }

    return successResponse(res, history, 'Quiz history retrieved');
  } catch (err) {
    return errorResponse(res, 'Error fetching quiz history', 500, err);
  }
}

/**
 * Get Specific Attempt Details
 */
async function getAttemptDetails(req, res) {
  try {
    const userId = req.user.id;
    const attemptId = req.params.attemptId;

    let attempt = null;
    let answers = [];

    if (isConfigured && supabaseAdmin) {
      const { data: att } = await supabaseAdmin.from('quiz_attempts').select('*, quizzes(*)').eq('id', attemptId).eq('user_id', userId).single();
      if (!att) return errorResponse(res, 'Attempt not found', 404);
      attempt = att;

      const { data: ans } = await supabaseAdmin
        .from('answers')
        .select('*, questions(*)')
        .eq('attempt_id', attemptId);
      answers = ans || [];
    } else {
      attempt = localStore.quiz_attempts.get(attemptId);
      if (!attempt || attempt.user_id !== userId) return errorResponse(res, 'Attempt not found', 404);

      answers = Array.from(localStore.answers.values())
        .filter(a => a.attempt_id === attemptId)
        .map(a => {
          const quest = localStore.questions.get(a.question_id);
          return { ...a, questions: quest };
        });
    }

    return successResponse(res, { attempt, answers }, 'Attempt details retrieved');
  } catch (err) {
    return errorResponse(res, 'Error fetching attempt details', 500, err);
  }
}

module.exports = {
  generateQuiz,
  listQuizzes,
  getQuizById,
  submitQuiz,
  getQuizHistory,
  getAttemptDetails
};

