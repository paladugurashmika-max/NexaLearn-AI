/**
 * NexaLearn AI - Frontend Configuration & Core Utilities
 */

const CONFIG = {
  // Use relative URL when served from Express backend, or fallback to localhost:5000
  API_BASE_URL: window.location.origin.includes('5000') || window.location.protocol === 'file:'
    ? 'http://localhost:5000/api'
    : '/api',

  // Supabase Configuration (Populated from backend or env)
  SUPABASE_URL: window.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: window.SUPABASE_ANON_KEY || '',
  
  DEMO_TOKEN: 'demo-student-token-001'
};

/**
 * Toast Notification System
 */
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle-2';
  if (type === 'error') iconName = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${iconName}" style="width: 18px; height: 18px;"></i>
    <div style="flex: 1; font-size: 0.875rem;">${message}</div>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Global authenticated API Fetch wrapper
 */
async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem('nexalearn_token') || CONFIG.DEMO_TOKEN;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(options.headers || {})
  };

  // If payload is FormData (file upload), remove Content-Type so browser sets boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const url = endpoint.startsWith('http') ? endpoint : `${CONFIG.API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        // Session expired
        console.warn('Session expired or unauthorized');
      }
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error on [${endpoint}]:`, error);
    showToast(error.message, 'error');
    throw error;
  }
}

/**
 * Format date string into human friendly format
 */
function formatDate(dateStr) {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Auto-bind mobile menu toggle when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('mobile-toggle-btn');
  const sidebar = document.querySelector('.sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggleBtn && !toggleBtn?.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
});

window.CONFIG = CONFIG;
window.showToast = showToast;
window.fetchWithAuth = fetchWithAuth;
window.formatDate = formatDate;

