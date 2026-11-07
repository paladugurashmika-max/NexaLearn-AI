const { isConfigured, supabaseAdmin } = require('../config/supabase');
const { successResponse, errorResponse, localStore } = require('../utils/helpers');

async function getAchievements(req, res) {
  try {
    const userId = req.user.id;

    let allAchievements = [];
    let unlockedMap = new Map();

    if (isConfigured && supabaseAdmin) {
      const { data: achs } = await supabaseAdmin.from('achievements').select('*');
      allAchievements = achs || [];

      const { data: studentAchs } = await supabaseAdmin
        .from('student_achievements')
        .select('*')
        .eq('user_id', userId);

      (studentAchs || []).forEach(sa => unlockedMap.set(sa.achievement_id, sa.unlocked_at));
    } else {
      allAchievements = Array.from(localStore.achievements.values());
      for (const [id, sa] of localStore.student_achievements.entries()) {
        if (sa.user_id === userId) {
          unlockedMap.set(sa.achievement_id, sa.unlocked_at);
        }
      }
    }

    const result = allAchievements.map(ach => ({
      ...ach,
      isUnlocked: unlockedMap.has(ach.id),
      unlockedAt: unlockedMap.get(ach.id) || null
    }));

    return successResponse(res, result, 'Achievements retrieved');
  } catch (err) {
    return errorResponse(res, 'Error fetching achievements', 500, err);
  }
}

module.exports = {
  getAchievements
};

