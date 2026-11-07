const { isConfigured, supabaseAdmin } = require('../config/supabase');
const { successResponse, errorResponse, localStore } = require('../utils/helpers');
const { updateStudentStreak } = require('../services/gamificationService');

async function getProfile(req, res) {
  try {
    const userId = req.user.id;
    await updateStudentStreak(userId);

    let profile = null;

    if (isConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        return errorResponse(res, 'Failed to fetch student profile', 500, error);
      }
      profile = data;
    } else {
      profile = localStore.profiles.get(userId);
    }

    if (!profile) {
      profile = {
        id: userId,
        email: req.user.email || 'student@nexalearn.ai',
        full_name: req.user.user_metadata?.full_name || 'NexaLearn Demo Student',
        avatar_url: '',
        study_streak: 1,
        points: 100,
        current_grade_level: 'Undergraduate',
        created_at: new Date().toISOString()
      };
      if (!isConfigured) {
        localStore.profiles.set(userId, profile);
      }
    }

    return successResponse(res, profile, 'Profile retrieved successfully');
  } catch (err) {
    return errorResponse(res, 'Error retrieving profile', 500, err);
  }
}

async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { full_name, current_grade_level, avatar_url } = req.body;

    const updates = {
      ...(full_name && { full_name }),
      ...(current_grade_level && { current_grade_level }),
      ...(avatar_url !== undefined && { avatar_url }),
      updated_at: new Date().toISOString()
    };

    let updatedProfile = null;

    if (isConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return errorResponse(res, 'Failed to update profile', 500, error);
      }
      updatedProfile = data;
    } else {
      const current = localStore.profiles.get(userId) || {};
      updatedProfile = { ...current, ...updates, id: userId };
      localStore.profiles.set(userId, updatedProfile);
    }

    return successResponse(res, updatedProfile, 'Profile updated successfully');
  } catch (err) {
    return errorResponse(res, 'Error updating profile', 500, err);
  }
}

module.exports = {
  getProfile,
  updateProfile
};

