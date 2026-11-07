const { isConfigured, supabaseAdmin, supabaseAnon } = require('../config/supabase');
const { errorResponse, localStore } = require('../utils/helpers');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // In dev mode without token, allow a demo student fallback if requested
      if (process.env.NODE_ENV === 'development' || !isConfigured) {
        req.user = {
          id: 'demo-student-uuid-001',
          email: 'student@nexalearn.ai',
          user_metadata: { full_name: 'NexaLearn Demo Student' }
        };
        // Ensure profile exists in localStore
        if (!localStore.profiles.has(req.user.id)) {
          localStore.profiles.set(req.user.id, {
            id: req.user.id,
            email: req.user.email,
            full_name: 'NexaLearn Demo Student',
            avatar_url: '',
            study_streak: 3,
            points: 250,
            current_grade_level: 'Undergraduate',
            last_active_date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        return next();
      }
      return errorResponse(res, 'Authentication required. Missing Bearer token.', 401);
    }

    const token = authHeader.split(' ')[1];

    if (isConfigured && (supabaseAdmin || supabaseAnon)) {
      const client = supabaseAdmin || supabaseAnon;
      const { data: { user }, error } = await client.auth.getUser(token);

      if (error || !user) {
        return errorResponse(res, 'Invalid or expired authentication session.', 401, error);
      }

      req.user = user;
      req.token = token;
      return next();
    } else {
      // Local demo mode with token string
      req.user = {
        id: token.length > 10 ? token.substring(0, 36) : 'demo-student-uuid-001',
        email: 'student@nexalearn.ai',
        user_metadata: { full_name: 'NexaLearn Demo Student' }
      };
      if (!localStore.profiles.has(req.user.id)) {
        localStore.profiles.set(req.user.id, {
          id: req.user.id,
          email: req.user.email,
          full_name: 'NexaLearn Demo Student',
          avatar_url: '',
          study_streak: 3,
          points: 250,
          current_grade_level: 'Undergraduate',
          last_active_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      return next();
    }
  } catch (err) {
    return errorResponse(res, 'Authentication verification failed.', 401, err);
  }
}

module.exports = {
  requireAuth
};

