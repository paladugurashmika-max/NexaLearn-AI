const { isConfigured, supabaseAdmin } = require('../config/supabase');
const adaptiveEngine = require('../services/adaptiveEngine');
const { successResponse, errorResponse, localStore } = require('../utils/helpers');

async function getTopicMastery(req, res) {
  try {
    const userId = req.user.id;
    let masteryList = [];

    if (isConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('topic_mastery')
        .select('*')
        .eq('user_id', userId)
        .order('mastery_score', { ascending: true });

      if (error) return errorResponse(res, 'Failed to fetch topic mastery', 500, error);
      masteryList = data || [];
    } else {
      masteryList = Array.from(localStore.topic_mastery.values())
        .filter(tm => tm.user_id === userId)
        .sort((a, b) => a.mastery_score - b.mastery_score);
    }

    return successResponse(res, masteryList, 'Topic mastery profile retrieved');
  } catch (err) {
    return errorResponse(res, 'Error fetching topic mastery', 500, err);
  }
}

async function getWeakTopics(req, res) {
  try {
    const userId = req.user.id;
    let masteryList = [];

    if (isConfigured && supabaseAdmin) {
      const { data } = await supabaseAdmin.from('topic_mastery').select('*').eq('user_id', userId);
      masteryList = data || [];
    } else {
      masteryList = Array.from(localStore.topic_mastery.values()).filter(tm => tm.user_id === userId);
    }

    const gaps = adaptiveEngine.detectKnowledgeGaps(masteryList);
    return successResponse(res, gaps, 'Knowledge gaps detected');
  } catch (err) {
    return errorResponse(res, 'Error detecting knowledge gaps', 500, err);
  }
}

async function getRecommendations(req, res) {
  try {
    const userId = req.user.id;
    let masteryList = [];
    let recentAttempts = [];
    let wrongAnswers = [];

    if (isConfigured && supabaseAdmin) {
      const { data: tm } = await supabaseAdmin.from('topic_mastery').select('*').eq('user_id', userId);
      masteryList = tm || [];

      const { data: attempts } = await supabaseAdmin
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      recentAttempts = attempts || [];

      const { data: wrongs } = await supabaseAdmin
        .from('answers')
        .select('*, questions(topic)')
        .eq('user_id', userId)
        .eq('is_correct', false)
        .order('created_at', { ascending: false })
        .limit(15);

      wrongAnswers = (wrongs || []).map(w => ({
        ...w,
        topic: w.questions?.topic
      }));
    } else {
      masteryList = Array.from(localStore.topic_mastery.values()).filter(tm => tm.user_id === userId);
      recentAttempts = Array.from(localStore.quiz_attempts.values())
        .filter(a => a.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      wrongAnswers = Array.from(localStore.answers.values())
        .filter(a => a.user_id === userId && a.is_correct === false)
        .map(a => {
          const quest = localStore.questions.get(a.question_id);
          return { ...a, topic: quest ? quest.topic : 'General' };
        });
    }

    const recommendations = adaptiveEngine.generateAdaptiveRecommendations({
      topicMasteryList: masteryList,
      recentAttempts,
      wrongAnswers
    });

    return successResponse(res, recommendations, 'Adaptive learning recommendations generated');
  } catch (err) {
    return errorResponse(res, 'Error generating recommendations', 500, err);
  }
}

async function getLearningCycleStatus(req, res) {
  try {
    const userId = req.user.id;
    let notesCount = 0;
    let quizAttemptsCount = 0;
    let masteryList = [];

    if (isConfigured && supabaseAdmin) {
      const { count: nc } = await supabaseAdmin.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      const { count: qc } = await supabaseAdmin.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      const { data: tm } = await supabaseAdmin.from('topic_mastery').select('*').eq('user_id', userId);
      notesCount = nc || 0;
      quizAttemptsCount = qc || 0;
      masteryList = tm || [];
    } else {
      notesCount = Array.from(localStore.notes.values()).filter(n => n.user_id === userId).length;
      quizAttemptsCount = Array.from(localStore.quiz_attempts.values()).filter(a => a.user_id === userId).length;
      masteryList = Array.from(localStore.topic_mastery.values()).filter(tm => tm.user_id === userId);
    }

    // Determine current active cycle step (1 to 6)
    let currentStep = 1;
    let stepTitle = 'Study Material Ingestion';

    if (notesCount === 0 && quizAttemptsCount === 0) {
      currentStep = 1;
      stepTitle = 'Step 1: Input Study Material or Enter Topic';
    } else if (notesCount > 0 && quizAttemptsCount === 0) {
      currentStep = 3;
      stepTitle = 'Step 3: Assessment Required (Take Diagnostic Quiz)';
    } else if (quizAttemptsCount > 0 && masteryList.length > 0) {
      const hasWeak = masteryList.some(m => m.status === 'weak');
      if (hasWeak) {
        currentStep = 5;
        stepTitle = 'Step 5: Apply Adaptive Recommendations to Remediate Gaps';
      } else {
        currentStep = 6;
        stepTitle = 'Step 6: Mastery Growth & Advanced Extension';
      }
    }

    const cycleInfo = {
      currentStep,
      stepTitle,
      stages: [
        { step: 1, name: 'Material Input', description: 'Enter topic or upload PDF in Study Studio', completed: notesCount > 0 },
        { step: 2, name: 'AI Synthesis', description: 'Structured notes, definitions, & simplified concepts', completed: notesCount > 0 },
        { step: 3, name: 'Intelligent Assessment', description: 'Complete targeted MCQs in Practice Zone', completed: quizAttemptsCount > 0 },
        { step: 4, name: 'Knowledge Gap Analysis', description: 'Server-side scoring & misconception detection', completed: quizAttemptsCount > 0 },
        { step: 5, name: 'Adaptive Recommendations', description: 'Remediation paths, flashcards, & targeted exercises', completed: quizAttemptsCount > 0 },
        { step: 6, name: 'Mastery Progression', description: 'Dynamic topic mastery tracking & difficulty scaling', completed: masteryList.some(m => m.status === 'strong') }
      ]
    };

    return successResponse(res, cycleInfo, 'Continuous learning cycle retrieved');
  } catch (err) {
    return errorResponse(res, 'Error calculating learning cycle', 500, err);
  }
}

module.exports = {
  getTopicMastery,
  getWeakTopics,
  getRecommendations,
  getLearningCycleStatus
};

