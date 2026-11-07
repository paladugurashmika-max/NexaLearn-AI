const { isConfigured, supabaseAdmin } = require('../config/supabase');
const { localStore, generateId } = require('../utils/helpers');

/**
 * Checks student achievements and awards badges deterministically.
 */
async function checkAndAwardAchievements(userId, metrics = {}) {
  const newUnlocked = [];

  // 1. Fetch available achievements
  let allAchievements = [];
  let userUnlockedIds = new Set();

  if (isConfigured && supabaseAdmin) {
    try {
      const { data: achievements } = await supabaseAdmin.from('achievements').select('*');
      allAchievements = achievements || [];

      const { data: studentAchs } = await supabaseAdmin
        .from('student_achievements')
        .select('achievement_id')
        .eq('user_id', userId);

      if (studentAchs) {
        studentAchs.forEach(sa => userUnlockedIds.add(sa.achievement_id));
      }
    } catch (err) {
      console.warn('[Gamification] Error querying Supabase achievements:', err.message);
    }
  } else {
    allAchievements = Array.from(localStore.achievements.values());
    for (const [id, sa] of localStore.student_achievements.entries()) {
      if (sa.user_id === userId) {
        userUnlockedIds.add(sa.achievement_id);
      }
    }
  }

  // 2. Evaluate conditions
  for (const ach of allAchievements) {
    if (userUnlockedIds.has(ach.id)) continue; // Already unlocked

    let eligible = false;
    switch (ach.condition_type) {
      case 'quiz_count':
        if ((metrics.quizCount || 0) >= ach.condition_threshold) eligible = true;
        break;
      case 'quiz_score':
        if ((metrics.latestScore || 0) >= ach.condition_threshold) eligible = true;
        break;
      case 'streak':
        if ((metrics.streak || 0) >= ach.condition_threshold) eligible = true;
        break;
      case 'mastery':
        if ((metrics.maxMastery || 0) >= ach.condition_threshold) eligible = true;
        break;
      case 'notes_count':
        if ((metrics.notesCount || 0) >= ach.condition_threshold) eligible = true;
        break;
      case 'flashcards_mastered':
        if ((metrics.flashcardsMastered || 0) >= ach.condition_threshold) eligible = true;
        break;
      default:
        break;
    }

    if (eligible) {
      newUnlocked.push(ach);

      // Save unlock
      if (isConfigured && supabaseAdmin) {
        try {
          await supabaseAdmin.from('student_achievements').insert({
            user_id: userId,
            achievement_id: ach.id,
            unlocked_at: new Date().toISOString()
          });

          // Award bonus points to profile
          await supabaseAdmin.rpc('increment_points', {
            user_id: userId,
            amount: ach.points || 50
          }).catch(async () => {
            // Fallback direct update
            const { data: p } = await supabaseAdmin.from('profiles').select('points').eq('id', userId).single();
            if (p) {
              await supabaseAdmin.from('profiles').update({ points: (p.points || 0) + (ach.points || 50) }).eq('id', userId);
            }
          });
        } catch (e) {
          console.error('[Gamification] Failed to insert student achievement:', e.message);
        }
      } else {
        const saId = generateId();
        localStore.student_achievements.set(saId, {
          id: saId,
          user_id: userId,
          achievement_id: ach.id,
          unlocked_at: new Date().toISOString()
        });

        // Award points in localStore
        const profile = localStore.profiles.get(userId);
        if (profile) {
          profile.points = (profile.points || 0) + (ach.points || 50);
        }
      }
    }
  }

  return newUnlocked;
}

/**
 * Updates student study streak safely based on last_active_date.
 */
async function updateStudentStreak(userId) {
  const today = new Date().toISOString().split('T')[0];

  if (isConfigured && supabaseAdmin) {
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('study_streak, last_active_date')
        .eq('id', userId)
        .single();

      if (!profile) return 1;

      const lastDate = profile.last_active_date;
      let newStreak = profile.study_streak || 1;

      if (!lastDate) {
        newStreak = 1;
      } else {
        const last = new Date(lastDate);
        const curr = new Date(today);
        const diffDays = Math.round((curr - last) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1; // Streak reset
        }
        // diffDays === 0 means same day, keep current streak
      }

      await supabaseAdmin.from('profiles').update({
        study_streak: newStreak,
        last_active_date: today,
        updated_at: new Date().toISOString()
      }).eq('id', userId);

      return newStreak;
    } catch (e) {
      console.warn('[Gamification] Streak update warning:', e.message);
      return 1;
    }
  } else {
    const profile = localStore.profiles.get(userId);
    if (!profile) return 1;

    const lastDate = profile.last_active_date;
    let newStreak = profile.study_streak || 1;

    if (lastDate !== today) {
      const last = new Date(lastDate);
      const curr = new Date(today);
      const diffDays = Math.round((curr - last) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
      profile.study_streak = newStreak;
      profile.last_active_date = today;
    }
    return newStreak;
  }
}

module.exports = {
  checkAndAwardAchievements,
  updateStudentStreak
};

