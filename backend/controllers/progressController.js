const { isConfigured, supabaseAdmin } = require('../config/supabase');
const adaptiveEngine = require('../services/adaptiveEngine');
const { successResponse, errorResponse, localStore } = require('../utils/helpers');

async function getProgressSummary(req, res) {
  try {
    const userId = req.user.id;

    let notesCount = 0;
    let quizAttempts = [];
    let topicMasteryList = [];
    let profile = null;
    let studyTasks = [];

    if (isConfigured && supabaseAdmin) {
      const { count: nc } = await supabaseAdmin.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      notesCount = nc || 0;

      const { data: attempts } = await supabaseAdmin
        .from('quiz_attempts')
        .select('*, quizzes(title, subject, topic)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      quizAttempts = attempts || [];

      const { data: tm } = await supabaseAdmin.from('topic_mastery').select('*').eq('user_id', userId);
      topicMasteryList = tm || [];

      const { data: prof } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
      profile = prof;

      const { data: tasks } = await supabaseAdmin.from('study_tasks').select('*').eq('user_id', userId);
      studyTasks = tasks || [];
    } else {
      notesCount = Array.from(localStore.notes.values()).filter(n => n.user_id === userId).length;
      quizAttempts = Array.from(localStore.quiz_attempts.values())
        .filter(a => a.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      topicMasteryList = Array.from(localStore.topic_mastery.values()).filter(tm => tm.user_id === userId);
      profile = localStore.profiles.get(userId);
      studyTasks = Array.from(localStore.study_tasks.values()).filter(t => t.user_id === userId);
    }

    const totalQuizzes = quizAttempts.length;
    const avgScore = totalQuizzes > 0
      ? Math.round(quizAttempts.reduce((sum, a) => sum + Number(a.percentage || 0), 0) / totalQuizzes)
      : 0;

    const gaps = adaptiveEngine.detectKnowledgeGaps(topicMasteryList);

    // Calculate weekly learning activity (past 7 days)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyActivity = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();

    quizAttempts.forEach(att => {
      const attDate = new Date(att.created_at);
      const diffTime = now - attDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        const dayIdx = attDate.getDay();
        weeklyActivity[dayIdx] += 1;
      }
    });

    // Reorder so current day is last
    const currentDayIdx = now.getDay();
    const orderedLabels = [];
    const orderedData = [];
    for (let i = 6; i >= 0; i--) {
      const idx = (currentDayIdx - i + 7) % 7;
      orderedLabels.push(dayNames[idx]);
      orderedData.push(weeklyActivity[idx]);
    }

    // Tasks completion
    const completedTasks = studyTasks.filter(t => t.is_completed).length;
    const taskCompletionRate = studyTasks.length > 0
      ? Math.round((completedTasks / studyTasks.length) * 100)
      : 0;

    return successResponse(res, {
      profile: {
        streak: profile?.study_streak || 1,
        points: profile?.points || 100,
        fullName: profile?.full_name || 'NexaLearn Demo Student',
        gradeLevel: profile?.current_grade_level || 'Undergraduate'
      },
      stats: {
        totalNotes: notesCount,
        totalQuizzes,
        averageScore: avgScore,
        studyStreak: profile?.study_streak || 1,
        overallMastery: gaps.overallAverageMastery,
        strongTopicsCount: gaps.strong.length,
        weakTopicsCount: gaps.weak.length,
        tasksCompleted: completedTasks,
        totalTasks: studyTasks.length,
        taskCompletionRate
      },
      knowledgeGaps: gaps,
      weeklyActivity: {
        labels: orderedLabels,
        data: orderedData
      },
      recentAttempts: quizAttempts.slice(0, 5)
    }, 'Progress summary retrieved');
  } catch (err) {
    return errorResponse(res, 'Error calculating progress', 500, err);
  }
}

async function getProgressHistory(req, res) {
  try {
    const userId = req.user.id;
    let attempts = [];

    if (isConfigured && supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('quiz_attempts')
        .select('created_at, percentage, score, total_questions')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      attempts = data || [];
    } else {
      attempts = Array.from(localStore.quiz_attempts.values())
        .filter(a => a.user_id === userId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    const trajectory = attempts.map((a, idx) => ({
      attemptNumber: idx + 1,
      date: new Date(a.created_at).toLocaleDateString(),
      percentage: Number(a.percentage) || 0
    }));

    return successResponse(res, trajectory, 'Progress history retrieved');
  } catch (err) {
    return errorResponse(res, 'Error fetching progress history', 500, err);
  }
}

module.exports = {
  getProgressSummary,
  getProgressHistory
};

