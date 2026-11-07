/**
 * NexaLearn AI - Authentication & Session State Management
 * Connects with Supabase Auth & Local Session Persistence
 */

let supabaseClient = null;

// Initialize Supabase if credentials exist
if (window.supabase && window.CONFIG?.SUPABASE_URL && window.CONFIG?.SUPABASE_ANON_KEY) {
  try {
    supabaseClient = window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);
    console.log('[Auth] Initialized Supabase client in browser');
  } catch (e) {
    console.warn('[Auth] Supabase browser init warning:', e.message);
  }
}

/**
 * Register new student
 */
async function registerStudent(email, password, fullName) {
  if (supabaseClient) {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (error) throw error;
    if (data.session) {
      localStorage.setItem('nexalearn_token', data.session.access_token);
      localStorage.setItem('nexalearn_user', JSON.stringify(data.user));
    }
    return data;
  } else {
    // Local demo signup
    const user = {
      id: 'demo-student-uuid-001',
      email,
      user_metadata: { full_name: fullName }
    };
    localStorage.setItem('nexalearn_token', 'demo-token-' + Date.now());
    localStorage.setItem('nexalearn_user', JSON.stringify(user));
    return { user };
  }
}

/**
 * Login existing student
 */
async function loginStudent(email, password) {
  if (supabaseClient) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    if (data.session) {
      localStorage.setItem('nexalearn_token', data.session.access_token);
      localStorage.setItem('nexalearn_user', JSON.stringify(data.user));
    }
    return data;
  } else {
    // Local demo login
    const user = {
      id: 'demo-student-uuid-001',
      email: email || 'student@nexalearn.ai',
      user_metadata: { full_name: 'NexaLearn Demo Student' }
    };
    localStorage.setItem('nexalearn_token', 'demo-token-001');
    localStorage.setItem('nexalearn_user', JSON.stringify(user));
    return { user };
  }
}

/**
 * Quick Guest/Demo login for immediate evaluation
 */
function quickDemoLogin() {
  const user = {
    id: 'demo-student-uuid-001',
    email: 'alex.johnson@nexalearn.ai',
    user_metadata: { full_name: 'NexaLearn Demo Student' }
  };
  localStorage.setItem('nexalearn_token', 'demo-token-001');
  localStorage.setItem('nexalearn_user', JSON.stringify(user));
  showToast('Logged in as NexaLearn Demo Student (Demo Account)', 'success');
  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 600);
}

/**
 * Logout
 */
async function logoutStudent() {
  if (supabaseClient) {
    await supabaseClient.auth.signOut().catch(() => {});
  }
  localStorage.removeItem('nexalearn_token');
  localStorage.removeItem('nexalearn_user');
  showToast('Logged out successfully', 'info');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 500);
}

/**
 * Check if session exists; redirect to login if not
 */
function checkAuthProtection() {
  const token = localStorage.getItem('nexalearn_token');
  const path = window.location.pathname;
  const isAuthPage = path.includes('login.html') || path.includes('register.html') || path.endsWith('/') || path.endsWith('index.html');

  if (!token && !isAuthPage) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

/**
 * Get cached or live student user object
 */
function getCurrentUser() {
  try {
    const userStr = localStorage.getItem('nexalearn_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

window.registerStudent = registerStudent;
window.loginStudent = loginStudent;
window.quickDemoLogin = quickDemoLogin;
window.logoutStudent = logoutStudent;
window.checkAuthProtection = checkAuthProtection;
window.getCurrentUser = getCurrentUser;

