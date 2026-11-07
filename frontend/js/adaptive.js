/**
 * NexaLearn AI - Adaptive Intelligence Hub Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuthProtection()) return;

  if (window.lucide) window.lucide.createIcons();

  await loadLearningCycle();
  await loadKnowledgeGaps();
  await loadMasteryMatrix();
  await loadAdaptiveRecommendations();
});

async function loadLearningCycle() {
  const container = document.getElementById('cycle-stages-grid');
  const statusHeader = document.getElementById('cycle-current-status');

  try {
    const res = await fetchWithAuth('/adaptive/cycle');
    if (!res.success || !res.data) return;

    const { currentStep, stepTitle, stages } = res.data;
    statusHeader.innerHTML = `<strong style="color: var(--primary-light);">${stepTitle}</strong>`;

    container.innerHTML = stages.map(s => {
      const isCurrent = s.step === currentStep;
      const isCompleted = s.completed;

      return `
        <div class="cycle-step-card" style="${isCurrent ? 'border-color: var(--primary); box-shadow: 0 0 15px rgba(139, 92, 246, 0.35); background: rgba(139, 92, 246, 0.1);' : ''}">
          <div class="cycle-num" style="${isCompleted ? 'background: var(--success); color: #fff;' : isCurrent ? 'background: var(--primary); color: #fff;' : ''}">
            ${isCompleted ? '✓' : s.step}
          </div>
          <h4 style="color: #fff;">${s.name}</h4>
          <p style="font-size: 0.775rem;">${s.description}</p>
          ${isCurrent ? '<span class="badge badge-primary" style="margin-top: 0.5rem; font-size: 0.65rem;">ACTIVE STAGE</span>' : ''}
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.warn('Failed to load learning cycle:', err);
  }
}

async function loadKnowledgeGaps() {
  try {
    const res = await fetchWithAuth('/adaptive/weak-topics');
    if (!res.success || !res.data) return;

    const { strong, moderate, weak } = res.data;

    document.getElementById('count-weak').innerText = weak.length;
    document.getElementById('count-moderate').innerText = moderate.length;
    document.getElementById('count-strong').innerText = strong.length;

    // 1. Weak Topics Bucket
    const weakBucket = document.getElementById('weak-topics-bucket');
    if (weak.length > 0) {
      weakBucket.innerHTML = weak.map(w => `
        <div style="padding: 0.75rem; background: rgba(239, 68, 68, 0.08); border-radius: var(--radius-md); border: 1px solid rgba(239, 68, 68, 0.2);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <strong style="color: #fff; font-size: 0.9rem;">${w.topic}</strong>
            <span class="badge badge-weak">${w.mastery_score}%</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 0.5rem;">
            ${w.subject} • ${w.total_attempts} attempts recorded
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <a href="study-studio.html?topic=${encodeURIComponent(w.topic)}&tab=simplifier&level=beginner" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
              <span>Beginner Analogy</span>
            </a>
            <a href="quiz.html?autoTopic=${encodeURIComponent(w.topic)}&difficulty=beginner" class="btn btn-primary btn-sm" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
              <span>Remedial Quiz</span>
            </a>
          </div>
        </div>
      `).join('');
    } else {
      weakBucket.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-dim);">No severe knowledge gaps detected.</p>';
    }

    // 2. Moderate Topics Bucket
    const modBucket = document.getElementById('moderate-topics-bucket');
    if (moderate.length > 0) {
      modBucket.innerHTML = moderate.map(m => `
        <div style="padding: 0.75rem; background: rgba(245, 158, 11, 0.08); border-radius: var(--radius-md); border: 1px solid rgba(245, 158, 11, 0.2);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <strong style="color: #fff; font-size: 0.9rem;">${m.topic}</strong>
            <span class="badge badge-moderate">${m.mastery_score}%</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 0.5rem;">
            ${m.subject} • ${m.total_attempts} attempts recorded
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <a href="flashcards.html?topic=${encodeURIComponent(m.topic)}" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
              <span>Spaced Cards</span>
            </a>
            <a href="quiz.html?autoTopic=${encodeURIComponent(m.topic)}&difficulty=intermediate" class="btn btn-primary btn-sm" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
              <span>Challenge Quiz</span>
            </a>
          </div>
        </div>
      `).join('');
    } else {
      modBucket.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-dim);">No moderate topics recorded.</p>';
    }

    // 3. Strong Topics Bucket
    const strongBucket = document.getElementById('strong-topics-bucket');
    if (strong.length > 0) {
      strongBucket.innerHTML = strong.map(s => `
        <div style="padding: 0.75rem; background: rgba(16, 185, 129, 0.08); border-radius: var(--radius-md); border: 1px solid rgba(16, 185, 129, 0.2);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <strong style="color: #fff; font-size: 0.9rem;">${s.topic}</strong>
            <span class="badge badge-strong">${s.mastery_score}%</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 0.5rem;">
            ${s.subject} • ${s.total_attempts} attempts recorded
          </div>
          <div>
            <a href="quiz.html?autoTopic=${encodeURIComponent(s.topic)}&difficulty=advanced" class="btn btn-outline btn-sm" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
              <span>Take Advanced Exam</span>
            </a>
          </div>
        </div>
      `).join('');
    } else {
      strongBucket.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-dim);">Complete quizzes to establish strong topics.</p>';
    }

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.warn('Failed to load knowledge gaps:', err);
  }
}

async function loadMasteryMatrix() {
  const tbody = document.getElementById('mastery-table-body');
  try {
    const res = await fetchWithAuth('/adaptive/mastery');
    if (!res.success) return;

    const list = res.data || [];
    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="padding: 2.5rem; text-align: center; color: var(--text-dim);">
            No topic assessments recorded yet. Complete your first quiz in the Smart Practice Zone to start tracking mastery!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(item => `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 0.85rem 1rem; color: var(--text-muted);">${item.subject}</td>
        <td style="padding: 0.85rem 1rem; font-weight: 600; color: #fff;">${item.topic}</td>
        <td style="padding: 0.85rem 1rem;">${item.total_attempts}</td>
        <td style="padding: 0.85rem 1rem;">${item.total_questions || 0}</td>
        <td style="padding: 0.85rem 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="width: 80px; height: 6px; background: var(--bg-surface); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${item.mastery_score}%; background: ${item.mastery_score >= 80 ? 'var(--success)' : item.mastery_score >= 50 ? 'var(--warning)' : 'var(--danger)'};"></div>
            </div>
            <strong style="color: #fff; font-size: 0.85rem;">${item.mastery_score}%</strong>
          </div>
        </td>
        <td style="padding: 0.85rem 1rem;">
          <span class="badge ${item.status === 'strong' ? 'badge-strong' : item.status === 'moderate' ? 'badge-moderate' : 'badge-weak'}">
            ${(item.status || 'weak').toUpperCase()}
          </span>
        </td>
        <td style="padding: 0.85rem 1rem; color: var(--text-dim); font-size: 0.825rem;">
          ${formatDate(item.last_assessed_at)}
        </td>
        <td style="padding: 0.85rem 1rem; text-align: right;">
          <a href="quiz.html?autoTopic=${encodeURIComponent(item.topic)}&difficulty=${item.status === 'strong' ? 'advanced' : item.status === 'moderate' ? 'intermediate' : 'beginner'}" class="btn btn-secondary btn-sm">
            <span>Practice</span>
            <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
          </a>
        </td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.warn('Failed to load mastery table:', err);
  }
}

async function loadAdaptiveRecommendations() {
  const container = document.getElementById('adaptive-feed-container');
  try {
    const res = await fetchWithAuth('/adaptive/recommendations');
    if (!res.success || !res.data.recommendations || res.data.recommendations.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="check-circle-2"></i></div>
          <div class="empty-title">All topics looking healthy!</div>
          <div class="empty-desc">Your topic mastery metrics are strong across all recorded subjects.</div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = res.data.recommendations.map(rec => {
      let badgeClass = 'badge-weak';
      if (rec.type === 'CONSOLIDATION') badgeClass = 'badge-moderate';
      if (rec.type === 'ADVANCEMENT') badgeClass = 'badge-strong';
      if (rec.type === 'ONBOARDING') badgeClass = 'badge-primary';
      if (rec.type === 'MISCONCEPTION_ALERT') badgeClass = 'badge-weak';

      return `
        <div class="recommendation-item" style="padding: 1.25rem; margin-bottom: 1rem;">
          <div class="rec-header">
            <span class="rec-title" style="font-size: 1.05rem;">${rec.title}</span>
            <span class="badge ${badgeClass}">${rec.type}</span>
          </div>
          <p class="rec-desc" style="font-size: 0.9rem; line-height: 1.6;">${rec.description}</p>
          <div class="rec-actions" style="margin-top: 1rem;">
            ${(rec.recommendedActions || []).map(action => `
              <button onclick="handleAdaptiveAction('${action.action}', '${encodeURIComponent(JSON.stringify(action.params || {}))}')" class="btn btn-primary btn-sm">
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
    console.warn('Failed to load adaptive feed:', err);
  }
}

function handleAdaptiveAction(actionType, paramsEncoded) {
  const params = JSON.parse(decodeURIComponent(paramsEncoded));

  switch (actionType) {
    case 'EXPLAIN_CONCEPT':
      window.location.href = `study-studio.html?topic=${encodeURIComponent(params.topic)}&tab=simplifier&level=${params.level || 'beginner'}`;
      break;
    case 'PRACTICE_FLASHCARDS':
      window.location.href = `flashcards.html?topic=${encodeURIComponent(params.topic)}`;
      break;
    case 'TAKE_REMEDIAL_QUIZ':
    case 'TAKE_PRACTICE_QUIZ':
    case 'TAKE_ADVANCED_QUIZ':
    case 'TAKE_DIAGNOSTIC_QUIZ':
      window.location.href = `quiz.html?autoTopic=${encodeURIComponent(params.topic)}&difficulty=${params.difficulty || 'intermediate'}`;
      break;
    case 'ASK_STUDY_AI':
      window.location.href = `assistant.html?query=${encodeURIComponent(params.query || '')}`;
      break;
    case 'GOTO_STUDY_STUDIO':
      window.location.href = `study-studio.html?topic=${encodeURIComponent(params.topic || '')}`;
      break;
    default:
      window.location.href = 'study-studio.html';
      break;
  }
}

window.handleAdaptiveAction = handleAdaptiveAction;

