/**
 * NexaLearn AI - Student Dashboard Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuthProtection()) return;

  if (window.lucide) window.lucide.createIcons();

  await loadDashboardData();
  await loadRecommendations();
  await loadDashboardTasks();
});

let weeklyChart = null;

async function loadDashboardData() {
  try {
    const res = await fetchWithAuth('/progress');
    if (!res.success) return;

    const { profile, stats, knowledgeGaps, weeklyActivity, recentAttempts } = res.data;

    // Update Topbar & Sidebar Profile
    if (profile) {
      document.getElementById('sidebar-name').innerText = profile.fullName || 'Student';
      document.getElementById('sidebar-grade').innerText = profile.gradeLevel || 'Undergraduate';
      document.getElementById('sidebar-avatar').innerText = (profile.fullName || 'S').charAt(0).toUpperCase();
      document.getElementById('streak-counter').innerText = `${profile.streak}-Day Streak`;
      document.getElementById('points-counter').innerText = `${profile.points} XP`;
      document.getElementById('welcome-heading').innerText = `Welcome back, ${profile.fullName ? profile.fullName.split(' ')[0] : 'Student'}! 👋`;
    }

    // Update Stats Cards
    if (stats) {
      document.getElementById('stat-notes').innerText = stats.totalNotes || 0;
      document.getElementById('stat-quizzes').innerText = stats.totalQuizzes || 0;
      document.getElementById('stat-avg-score').innerText = `${stats.averageScore || 0}%`;
      document.getElementById('stat-mastery').innerText = `${stats.overallMastery || 0}%`;
    }

    // Render Weakest and Strongest Topics
    renderMasterySummary(knowledgeGaps);

    // Render Weekly Activity Chart
    renderWeeklyChart(weeklyActivity);

    // Render Recent Quiz Attempts Table
    renderRecentAttempts(recentAttempts);

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
  }
}

function renderMasterySummary(gaps) {
  const weakContainer = document.getElementById('weak-topics-list');
  const strongContainer = document.getElementById('strong-topics-list');

  if (gaps && gaps.weak && gaps.weak.length > 0) {
    weakContainer.innerHTML = gaps.weak.slice(0, 3).map(w => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: rgba(239, 68, 68, 0.08); border-radius: var(--radius-sm); margin-bottom: 0.35rem; border: 1px solid rgba(239, 68, 68, 0.2);">
        <span style="font-size: 0.85rem; font-weight: 500;">${w.topic}</span>
        <span class="badge badge-weak">${w.mastery_score}%</span>
      </div>
    `).join('');
  } else {
    weakContainer.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-dim);">No knowledge gaps detected.</p>';
  }

  if (gaps && gaps.strong && gaps.strong.length > 0) {
    strongContainer.innerHTML = gaps.strong.slice(0, 3).map(s => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: rgba(16, 185, 129, 0.08); border-radius: var(--radius-sm); margin-bottom: 0.35rem; border: 1px solid rgba(16, 185, 129, 0.2);">
        <span style="font-size: 0.85rem; font-weight: 500;">${s.topic}</span>
        <span class="badge badge-strong">${s.mastery_score}%</span>
      </div>
    `).join('');
  } else {
    strongContainer.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-dim);">Complete quizzes to establish strong topics.</p>';
  }
}

function renderWeeklyChart(weekly) {
  const ctx = document.getElementById('weeklyActivityChart');
  if (!ctx) return;

  const labels = weekly?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data = weekly?.data || [0, 0, 0, 0, 0, 0, 0];

  if (weeklyChart) weeklyChart.destroy();

  weeklyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Assessments & Sessions',
        data,
        backgroundColor: 'rgba(139, 92, 246, 0.65)',
        borderColor: '#8b5cf6',
        borderWidth: 1.5,
        borderRadius: 6,
        hoverBackgroundColor: '#a78bfa'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { stepSize: 1, color: '#94a3b8' }
        }
      }
    }
  });
}

function renderRecentAttempts(attempts) {
  const tbody = document.getElementById('recent-attempts-body');
  if (!attempts || attempts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 2.5rem; text-align: center; color: var(--text-dim);">
          No quizzes completed yet. Take your first quiz in the Smart Practice Zone!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = attempts.map(att => `
    <tr style="border-bottom: 1px solid var(--border-color);">
      <td style="padding: 0.85rem 1rem; font-weight: 600; color: #fff;">
        ${att.topic || att.quizzes?.topic || 'General Assessment'}
      </td>
      <td style="padding: 0.85rem 1rem;">
        ${att.score} / ${att.total_questions}
      </td>
      <td style="padding: 0.85rem 1rem;">
        ${att.percentage}%
      </td>
      <td style="padding: 0.85rem 1rem;">
        <span class="badge ${att.passed ? 'badge-strong' : 'badge-weak'}">
          ${att.passed ? 'PASSED' : 'RETRY'}
        </span>
      </td>
      <td style="padding: 0.85rem 1rem; color: var(--text-muted); font-size: 0.85rem;">
        ${formatDate(att.created_at)}
      </td>
      <td style="padding: 0.85rem 1rem; text-align: right;">
        <a href="pages/quiz.html?quizId=${att.quiz_id}" class="btn btn-outline btn-sm">Retake</a>
      </td>
    </tr>
  `).join('');
}

async function loadRecommendations() {
  const container = document.getElementById('recommendations-container');
  try {
    const res = await fetchWithAuth('/adaptive/recommendations');
    if (!res.success || !res.data.recommendations || res.data.recommendations.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="check-circle"></i></div>
          <div class="empty-title">All topics looking healthy!</div>
          <div class="empty-desc">Take another diagnostic assessment or explore new subjects in the Study Studio.</div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = res.data.recommendations.slice(0, 3).map(rec => {
      let badgeClass = 'badge-weak';
      if (rec.type === 'CONSOLIDATION') badgeClass = 'badge-moderate';
      if (rec.type === 'ADVANCEMENT') badgeClass = 'badge-strong';
      if (rec.type === 'ONBOARDING') badgeClass = 'badge-primary';

      return `
        <div class="recommendation-item">
          <div class="rec-header">
            <span class="rec-title">${rec.title}</span>
            <span class="badge ${badgeClass}">${rec.type}</span>
          </div>
          <p class="rec-desc">${rec.description}</p>
          <div class="rec-actions">
            ${(rec.recommendedActions || []).map(action => `
              <button onclick="handleAdaptiveAction('${action.action}', '${encodeURIComponent(JSON.stringify(action.params || {}))}')" class="btn btn-secondary btn-sm">
                <span>${action.label}</span>
                <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error('Failed to load recommendations:', err);
  }
}

async function loadDashboardTasks() {
  const container = document.getElementById('dashboard-tasks-list');
  try {
    const res = await fetchWithAuth('/planner');
    if (!res.success || !res.data.tasks || res.data.tasks.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const tasks = res.data.tasks.filter(t => t.due_date === todayStr || !t.is_completed).slice(0, 4);

    if (tasks.length === 0) return;

    container.innerHTML = tasks.map(t => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.75rem; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 0.4rem;">
        <div style="display: flex; align-items: center; gap: 0.65rem; overflow: hidden;">
          <input type="checkbox" ${t.is_completed ? 'checked' : ''} onchange="toggleTaskStatus('${t.id}', this.checked)" style="cursor: pointer; accent-color: var(--primary);">
          <span style="font-size: 0.875rem; ${t.is_completed ? 'text-decoration: line-through; color: var(--text-dim);' : 'color: #fff;'} text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            ${t.title}
          </span>
        </div>
        <span class="badge ${t.priority === 'high' ? 'badge-weak' : 'badge-primary'}" style="font-size: 0.65rem;">${t.duration_minutes}m</span>
      </div>
    `).join('');
  } catch (err) {
    console.warn('Failed to load tasks:', err);
  }
}

async function toggleTaskStatus(taskId, isCompleted) {
  try {
    await fetchWithAuth(`/planner/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_completed: isCompleted })
    });
    showToast(isCompleted ? 'Task marked complete! +25 XP' : 'Task updated', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleAdaptiveAction(actionType, paramsEncoded) {
  const params = JSON.parse(decodeURIComponent(paramsEncoded));

  switch (actionType) {
    case 'EXPLAIN_CONCEPT':
      window.location.href = `pages/study-studio.html?topic=${encodeURIComponent(params.topic)}&tab=simplifier&level=${params.level || 'beginner'}`;
      break;
    case 'PRACTICE_FLASHCARDS':
      window.location.href = `pages/flashcards.html?topic=${encodeURIComponent(params.topic)}`;
      break;
    case 'TAKE_REMEDIAL_QUIZ':
    case 'TAKE_PRACTICE_QUIZ':
    case 'TAKE_ADVANCED_QUIZ':
    case 'TAKE_DIAGNOSTIC_QUIZ':
      window.location.href = `pages/quiz.html?autoTopic=${encodeURIComponent(params.topic)}&difficulty=${params.difficulty || 'intermediate'}`;
      break;
    case 'ASK_STUDY_AI':
      window.location.href = `pages/assistant.html?query=${encodeURIComponent(params.query || '')}`;
      break;
    case 'GOTO_STUDY_STUDIO':
      window.location.href = `pages/study-studio.html?topic=${encodeURIComponent(params.topic || '')}`;
      break;
    default:
      window.location.href = 'pages/study-studio.html';
      break;
  }
}

window.toggleTaskStatus = toggleTaskStatus;
window.handleAdaptiveAction = handleAdaptiveAction;

