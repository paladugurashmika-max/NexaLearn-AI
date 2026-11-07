/**
 * NexaLearn AI - Learning Analytics & Gamification Controller
 */

let trajectoryChart = null;
let topicMasteryChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuthProtection()) return;

  if (window.lucide) window.lucide.createIcons();

  await loadAnalyticsSummary();
  await loadTrajectoryChart();
  await loadTopicMasteryChart();
  await loadAchievements();
});

async function loadAnalyticsSummary() {
  try {
    const res = await fetchWithAuth('/progress');
    if (!res.success || !res.data) return;

    const { stats, profile } = res.data;
    if (stats) {
      document.getElementById('analytic-avg-score').innerText = `${stats.averageScore || 0}%`;
      document.getElementById('analytic-total-quizzes').innerText = stats.totalQuizzes || 0;
      document.getElementById('analytic-streak').innerText = `${stats.studyStreak || 1} Days`;
      document.getElementById('analytic-mastery').innerText = `${stats.overallMastery || 0}%`;
    }
  } catch (err) {
    console.warn('Failed to load analytics summary:', err);
  }
}

async function loadTrajectoryChart() {
  const ctx = document.getElementById('trajectoryChart');
  if (!ctx) return;

  try {
    const res = await fetchWithAuth('/progress/history');
    const trajectory = (res.success && res.data) ? res.data : [];

    const labels = trajectory.length > 0
      ? trajectory.map(t => `Attempt ${t.attemptNumber}`)
      : ['Attempt 1', 'Attempt 2', 'Attempt 3', 'Attempt 4', 'Attempt 5'];

    const data = trajectory.length > 0
      ? trajectory.map(t => t.percentage)
      : [0, 0, 0, 0, 0];

    if (trajectoryChart) trajectoryChart.destroy();

    trajectoryChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Score Percentage',
          data,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: '#8b5cf6',
          pointBorderColor: '#fff',
          pointRadius: 5
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
            min: 0,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              stepSize: 20,
              color: '#94a3b8',
              callback: v => `${v}%`
            }
          }
        }
      }
    });
  } catch (err) {
    console.warn('Failed to render trajectory chart:', err);
  }
}

async function loadTopicMasteryChart() {
  const ctx = document.getElementById('topicMasteryChart');
  if (!ctx) return;

  try {
    const res = await fetchWithAuth('/adaptive/mastery');
    const masteryList = (res.success && res.data) ? res.data : [];

    const labels = masteryList.length > 0
      ? masteryList.map(m => m.topic)
      : ['Python Recursion', 'Base Conditions', 'Call Stack'];

    const data = masteryList.length > 0
      ? masteryList.map(m => m.mastery_score)
      : [0, 0, 0];

    const backgroundColors = data.map(val =>
      val >= 80 ? 'rgba(16, 185, 129, 0.65)' : val >= 50 ? 'rgba(245, 158, 11, 0.65)' : 'rgba(239, 68, 68, 0.65)'
    );

    if (topicMasteryChart) topicMasteryChart.destroy();

    topicMasteryChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Mastery Score (%)',
          data,
          backgroundColor: backgroundColors,
          borderWidth: 1,
          borderRadius: 6
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
            min: 0,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              stepSize: 25,
              color: '#94a3b8',
              callback: v => `${v}%`
            }
          }
        }
      }
    });
  } catch (err) {
    console.warn('Failed to render mastery chart:', err);
  }
}

async function loadAchievements() {
  const container = document.getElementById('achievements-showcase-grid');
  try {
    const res = await fetchWithAuth('/achievements');
    if (!res.success || !res.data) return;

    const achs = res.data;
    container.innerHTML = achs.map(ach => {
      const isUnlocked = ach.isUnlocked;

      return `
        <div class="card" style="padding: 1.25rem; border-color: ${isUnlocked ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.05)'}; background: ${isUnlocked ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)' : 'var(--bg-surface)'}; opacity: ${isUnlocked ? '1' : '0.6'};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: ${isUnlocked ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)'}; color: ${isUnlocked ? '#fbbf24' : 'var(--text-dim)'}; display: flex; align-items: center; justify-content: center;">
              <i data-lucide="${ach.icon || 'award'}" style="width: 22px; height: 22px;"></i>
            </div>
            <span class="badge ${isUnlocked ? 'badge-moderate' : 'badge-primary'}" style="font-size: 0.7rem;">
              ${isUnlocked ? 'UNLOCKED' : 'LOCKED'}
            </span>
          </div>

          <h4 style="color: ${isUnlocked ? '#fff' : 'var(--text-muted)'}; margin-bottom: 0.25rem; font-size: 1rem;">
            ${ach.title}
          </h4>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
            ${ach.description}
          </p>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.5rem; font-size: 0.75rem;">
            <span style="color: var(--primary-light); font-weight: 600;">+${ach.points} XP</span>
            <span style="color: var(--text-dim);">${isUnlocked ? formatDate(ach.unlockedAt) : 'In Progress'}</span>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.warn('Failed to load achievements:', err);
  }
}

