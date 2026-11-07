/**
 * NexaLearn AI - Adaptive Learning Intelligence Engine
 * 
 * Signature Innovation:
 * Implements deterministic mastery calculations, knowledge gap detection,
 * misconception analysis, and personalized adaptive recommendations based on
 * actual student performance data.
 */

/**
 * Calculates updated topic mastery score using transparent weighted factors:
 * - Current attempt score (60% weight)
 * - Historical average performance (30% weight)
 * - Attempt consistency and volume factor (10% weight)
 */
function calculateUpdatedMastery({
  currentAttemptPercentage,
  previousMastery = null,
  previousAttemptsCount = 0,
  historicalTotalCorrect = 0,
  historicalTotalQuestions = 0,
  currentCorrect = 0,
  currentTotal = 0
}) {
  const newAttemptsCount = previousAttemptsCount + 1;
  const newTotalCorrect = historicalTotalCorrect + currentCorrect;
  const newTotalQuestions = historicalTotalQuestions + currentTotal;

  // Cumulative historical average
  const historicalAvg = newTotalQuestions > 0 ? (newTotalCorrect / newTotalQuestions) * 100 : currentAttemptPercentage;

  let newMasteryScore = 0;

  if (previousMastery === null || previousAttemptsCount === 0) {
    // First attempt: blend initial score with conservative baseline
    // (A single quiz is not definitive proof of 100% mastery)
    newMasteryScore = currentAttemptPercentage * 0.85;
  } else {
    // Weighted formula:
    // 60% recent attempt, 30% historical average, 10% consistency bonus (up to 5 attempts)
    const consistencyBonus = Math.min(newAttemptsCount * 2, 10); // Rewards sustained practice
    const weightedScore = (0.60 * currentAttemptPercentage) + (0.30 * historicalAvg) + consistencyBonus;
    
    // Smooth transition from previous mastery to avoid sudden wild swings
    newMasteryScore = (0.35 * previousMastery) + (0.65 * weightedScore);
  }

  // Cap mastery strictly between 0 and 100
  newMasteryScore = Math.max(0, Math.min(100, Math.round(newMasteryScore * 10) / 10));

  // Determine status classification
  let status = 'weak';
  if (newMasteryScore >= 80) {
    status = 'strong';
  } else if (newMasteryScore >= 50) {
    status = 'moderate';
  }

  return {
    masteryScore: newMasteryScore,
    status,
    totalAttempts: newAttemptsCount,
    totalCorrect: newTotalCorrect,
    totalQuestions: newTotalQuestions
  };
}

/**
 * Detects knowledge gaps across all assessed topics for a student.
 */
function detectKnowledgeGaps(topicMasteryList = []) {
  const strong = [];
  const moderate = [];
  const weak = [];
  const revisionNeeded = [];

  const now = new Date();

  topicMasteryList.forEach(item => {
    const daysSinceAssessed = item.last_assessed_at
      ? (now - new Date(item.last_assessed_at)) / (1000 * 60 * 60 * 24)
      : 0;

    const data = {
      id: item.id,
      subject: item.subject,
      topic: item.topic,
      mastery_score: Number(item.mastery_score) || 0,
      total_attempts: item.total_attempts || 0,
      status: item.status,
      days_since_assessed: Math.round(daysSinceAssessed),
      last_assessed_at: item.last_assessed_at
    };

    if (item.mastery_score >= 80) {
      strong.push(data);
      // If mastered but not practiced in 14+ days, schedule for spaced review
      if (daysSinceAssessed >= 14) {
        revisionNeeded.push({
          ...data,
          reason: 'Spaced Retrieval: High mastery achieved, but 14+ days since last practice.'
        });
      }
    } else if (item.mastery_score >= 50) {
      moderate.push(data);
      if (daysSinceAssessed >= 7) {
        revisionNeeded.push({
          ...data,
          reason: 'Consolidation: Moderate mastery requires periodic assessment to prevent decay.'
        });
      }
    } else {
      weak.push(data);
      revisionNeeded.push({
        ...data,
        reason: 'Immediate Remediation: Mastery score is below 50% threshold.'
      });
    }
  });

  // Sort weak by lowest mastery first
  weak.sort((a, b) => a.mastery_score - b.mastery_score);
  strong.sort((a, b) => b.mastery_score - a.mastery_score);

  return {
    strong,
    moderate,
    weak,
    revisionNeeded,
    totalTopicsTracked: topicMasteryList.length,
    overallAverageMastery: topicMasteryList.length > 0
      ? Math.round(topicMasteryList.reduce((acc, t) => acc + Number(t.mastery_score || 0), 0) / topicMasteryList.length)
      : 0
  };
}

/**
 * Generates personalized, actionable adaptive recommendations based on actual performance.
 */
function generateAdaptiveRecommendations({ topicMasteryList = [], recentAttempts = [], wrongAnswers = [] }) {
  const gaps = detectKnowledgeGaps(topicMasteryList);
  const recommendations = [];

  // 1. Weak Topics Remediation
  gaps.weak.forEach(topicItem => {
    recommendations.push({
      id: `rec-weak-${topicItem.topic.replace(/\s+/g, '-').toLowerCase()}`,
      type: 'REMEDIATION',
      priority: 'high',
      topic: topicItem.topic,
      subject: topicItem.subject,
      currentMastery: topicItem.mastery_score,
      title: `Critical Gap: Review Foundations of ${topicItem.topic}`,
      description: `Your mastery is currently at ${topicItem.mastery_score}%. We recommend breaking this down with beginner-level analogies and 5 targeted review flashcards before attempting another test.`,
      recommendedActions: [
        {
          action: 'EXPLAIN_CONCEPT',
          label: 'Concept Simplifier (Beginner)',
          params: { topic: topicItem.topic, level: 'beginner' }
        },
        {
          action: 'PRACTICE_FLASHCARDS',
          label: 'Review Topic Flashcards',
          params: { topic: topicItem.topic }
        },
        {
          action: 'TAKE_REMEDIAL_QUIZ',
          label: 'Targeted Remedial Quiz (Beginner)',
          params: { topic: topicItem.topic, difficulty: 'beginner', count: 5 }
        }
      ]
    });
  });

  // 2. Moderate Topics Consolidation
  gaps.moderate.forEach(topicItem => {
    recommendations.push({
      id: `rec-mod-${topicItem.topic.replace(/\s+/g, '-').toLowerCase()}`,
      type: 'CONSOLIDATION',
      priority: 'medium',
      topic: topicItem.topic,
      subject: topicItem.subject,
      currentMastery: topicItem.mastery_score,
      title: `Consolidate Mastery in ${topicItem.topic}`,
      description: `You have good fundamental understanding (${topicItem.mastery_score}%). Target practice on edge cases to break the 80% mastery threshold.`,
      recommendedActions: [
        {
          action: 'TAKE_PRACTICE_QUIZ',
          label: 'Intermediate Challenge Quiz',
          params: { topic: topicItem.topic, difficulty: 'intermediate', count: 5 }
        },
        {
          action: 'AI_STUDY_NOTES',
          label: 'Review Exam Key Points',
          params: { topic: topicItem.topic }
        }
      ]
    });
  });

  // 3. Strong Topics Extension
  gaps.strong.forEach(topicItem => {
    recommendations.push({
      id: `rec-strong-${topicItem.topic.replace(/\s+/g, '-').toLowerCase()}`,
      type: 'ADVANCEMENT',
      priority: 'low',
      topic: topicItem.topic,
      subject: topicItem.subject,
      currentMastery: topicItem.mastery_score,
      title: `Advanced Challenge: Push Frontiers in ${topicItem.topic}`,
      description: `Excellent work! With ${topicItem.mastery_score}% mastery, you are ready for advanced level synthesis, theoretical edge cases, and architectural problem solving.`,
      recommendedActions: [
        {
          action: 'TAKE_ADVANCED_QUIZ',
          label: 'Advanced Mastery Exam',
          params: { topic: topicItem.topic, difficulty: 'advanced', count: 5 }
        },
        {
          action: 'CONCEPT_DEEP_DIVE',
          label: 'Deep Dive Concept Breakdown',
          params: { topic: topicItem.topic, level: 'advanced' }
        }
      ]
    });
  });

  // 4. Misconception Detection from wrong answers
  if (wrongAnswers && wrongAnswers.length > 0) {
    const wrongCountByTopic = {};
    wrongAnswers.forEach(ans => {
      const t = ans.topic || 'General';
      wrongCountByTopic[t] = (wrongCountByTopic[t] || 0) + 1;
    });

    Object.entries(wrongCountByTopic).forEach(([t, count]) => {
      if (count >= 2) {
        recommendations.unshift({
          id: `rec-misconception-${t.replace(/\s+/g, '-').toLowerCase()}`,
          type: 'MISCONCEPTION_ALERT',
          priority: 'urgent',
          topic: t,
          title: `Pattern Detected: Recurring Errors in ${t}`,
          description: `You have missed ${count} questions related to ${t} in recent attempts. Focus on clarifying core definitions and checking edge-case assumptions.`,
          recommendedActions: [
            {
              action: 'ASK_STUDY_AI',
              label: 'Clarify with StudyAI Tutor',
              params: { query: `Why do I keep confusing key rules in ${t}? Please explain step-by-step.` }
            }
          ]
        });
      }
    });
  }

  // If no topics tracked yet (brand new student)
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'rec-onboarding',
      type: 'ONBOARDING',
      priority: 'high',
      topic: 'Getting Started',
      title: 'Welcome to NexaLearn AI! Start Your First Diagnostic',
      description: 'Generate your first study note in the Study Studio or take a 5-question diagnostic quiz. Our engine will continuously analyze your answers to tailor your learning pathway.',
      recommendedActions: [
        {
          action: 'GOTO_STUDY_STUDIO',
          label: 'Create First Study Notes',
          params: { topic: 'Python Recursion' }
        },
        {
          action: 'TAKE_DIAGNOSTIC_QUIZ',
          label: 'Take Quick 5-Question Quiz',
          params: { topic: 'Python Recursion', difficulty: 'intermediate' }
        }
      ]
    });
  }

  return {
    gaps,
    recommendations,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  calculateUpdatedMastery,
  detectKnowledgeGaps,
  generateAdaptiveRecommendations
};

