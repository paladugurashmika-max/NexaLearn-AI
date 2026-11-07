/**
 * NexaLearn AI - AI Study Planner Controller
 */

let activePlan = null;
let allTasks = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuthProtection()) return;

  if (window.lucide) window.lucide.createIcons();

  await loadPlannerData();

  // Setup Generate Plan Form Listener
  const genForm = document.getElementById('generate-plan-form');
  if (genForm) {
    genForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const planType = document.getElementById('plan-type').value;
      const availableHours = document.getElementById('available-hours').value;
      const goalsRaw = document.getElementById('plan-goals').value;
      const goals = goalsRaw.split(',').map(g => g.trim()).filter(Boolean);

      const btn = document.getElementById('plan-gen-btn');
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader"></i> <span>Synthesizing schedule with Gemini...</span>';
      if (window.lucide) window.lucide.createIcons();

      try {
        const res = await fetchWithAuth('/planner/generate', {
          method: 'POST',
          body: JSON.stringify({ planType, availableHours, goals })
        });

        if (res.success && res.data) {
          closeGeneratePlanModal();
          showToast('Adaptive study plan generated successfully!', 'success');
          await loadPlannerData();
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="sparkles"></i> <span>Generate Plan with Gemini</span>';
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Setup Add Manual Task Form Listener
  const taskForm = document.getElementById('add-task-form');
  if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('task-title').value.trim();
      const subject = document.getElementById('task-subject').value.trim();
      const duration_minutes = document.getElementById('task-duration').value;
      const priority = document.getElementById('task-priority').value;

      try {
        const res = await fetchWithAuth('/planner/tasks', {
          method: 'POST',
          body: JSON.stringify({
            title,
            subject,
            duration_minutes,
            priority,
            plan_id: activePlan ? activePlan.id : null
          })
        });

        if (res.success) {
          closeAddTaskModal();
          document.getElementById('task-title').value = '';
          showToast('Study task added!', 'success');
          await loadPlannerData();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
});

function openGeneratePlanModal() {
  document.getElementById('generate-plan-modal').classList.add('active');
}

function closeGeneratePlanModal() {
  document.getElementById('generate-plan-modal').classList.remove('active');
}

function openAddTaskModal() {
  document.getElementById('add-task-modal').classList.add('active');
}

function closeAddTaskModal() {
  document.getElementById('add-task-modal').classList.remove('active');
}

async function loadPlannerData() {
  try {
    const res = await fetchWithAuth('/planner');
    if (!res.success) return;

    const { plans, tasks } = res.data;
    allTasks = tasks || [];

    if (plans && plans.length > 0) {
      activePlan = plans[0];
      document.getElementById('active-plan-title').innerText = activePlan.title;
      document.getElementById('active-plan-badge').innerText = (activePlan.plan_type || 'Weekly').toUpperCase() + ' PLAN';

      if (activePlan.goals && activePlan.goals.length > 0) {
        document.getElementById('plan-goals-list').innerHTML = activePlan.goals.map(g => `<li>${g}</li>`).join('');
      }
    }

    renderTasksList(allTasks);
    renderSavedPlans(plans);
  } catch (err) {
    console.warn('Failed to load planner data:', err);
  }
}

function renderTasksList(tasks) {
  const container = document.getElementById('planner-tasks-container');
  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="calendar"></i></div>
        <div class="empty-title">No Study Tasks Scheduled</div>
        <div class="empty-desc">Click "Generate Adaptive Schedule" to create a personalized plan.</div>
      </div>
    `;
    document.getElementById('plan-progress-percent').innerText = '0%';
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const completed = tasks.filter(t => t.is_completed).length;
  const pct = Math.round((completed / tasks.length) * 100);
  document.getElementById('plan-progress-percent').innerText = `${pct}%`;

  container.innerHTML = tasks.map(task => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 0.75rem;">
      <div style="display: flex; align-items: center; gap: 0.85rem; flex: 1; overflow: hidden;">
        <input type="checkbox" ${task.is_completed ? 'checked' : ''} onchange="toggleTask('${task.id}', this.checked)" style="width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer;">
        <div>
          <div style="font-size: 0.95rem; font-weight: 600; ${task.is_completed ? 'text-decoration: line-through; color: var(--text-dim);' : 'color: #fff;'}">
            ${task.title}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 0.2rem;">
            ${task.subject || 'General'} • Due: ${task.due_date || 'Today'}
          </div>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span class="badge ${task.priority === 'high' ? 'badge-weak' : task.priority === 'medium' ? 'badge-moderate' : 'badge-primary'}">
          ${task.duration_minutes} MIN
        </span>
        <button onclick="deleteTaskItem('${task.id}')" class="close-btn" style="color: var(--danger);">
          <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

function renderSavedPlans(plans) {
  const container = document.getElementById('saved-plans-list');
  if (!plans || plans.length === 0) {
    container.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-dim);">No prior plans generated.</p>';
    return;
  }

  container.innerHTML = plans.map(p => `
    <div style="padding: 0.65rem 0.85rem; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
      <strong style="color: #fff; font-size: 0.85rem;">${p.title}</strong>
      <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.15rem;">
        ${p.plan_type.toUpperCase()} • ${formatDate(p.created_at)}
      </div>
    </div>
  `).join('');
}

async function toggleTask(taskId, isCompleted) {
  try {
    await fetchWithAuth(`/planner/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_completed: isCompleted })
    });
    showToast(isCompleted ? 'Task completed! +25 XP' : 'Task updated', 'success');
    const task = allTasks.find(t => t.id === taskId);
    if (task) task.is_completed = isCompleted;
    renderTasksList(allTasks);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTaskItem(taskId) {
  try {
    await fetchWithAuth(`/planner/tasks/${taskId}`, { method: 'DELETE' });
    allTasks = allTasks.filter(t => t.id !== taskId);
    renderTasksList(allTasks);
    showToast('Task removed', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.openGeneratePlanModal = openGeneratePlanModal;
window.closeGeneratePlanModal = closeGeneratePlanModal;
window.openAddTaskModal = openAddTaskModal;
window.closeAddTaskModal = closeAddTaskModal;
window.toggleTask = toggleTask;
window.deleteTaskItem = deleteTaskItem;

