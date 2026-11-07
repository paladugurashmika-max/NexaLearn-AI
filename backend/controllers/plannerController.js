const { isConfigured, supabaseAdmin } = require('../config/supabase');
const geminiService = require('../services/geminiService');
const adaptiveEngine = require('../services/adaptiveEngine');
const { successResponse, errorResponse, localStore, generateId } = require('../utils/helpers');

async function generatePlan(req, res) {
  try {
    const userId = req.user.id;
    const { goals = [], availableHours = 10, planType = 'weekly' } = req.body;

    // Fetch student's weak topics to feed into the adaptive study plan
    let weakTopics = [];
    if (isConfigured && supabaseAdmin) {
      const { data: tm } = await supabaseAdmin.from('topic_mastery').select('*').eq('user_id', userId);
      const gaps = adaptiveEngine.detectKnowledgeGaps(tm || []);
      weakTopics = gaps.weak;
    } else {
      const tm = Array.from(localStore.topic_mastery.values()).filter(t => t.user_id === userId);
      const gaps = adaptiveEngine.detectKnowledgeGaps(tm);
      weakTopics = gaps.weak;
    }

    const aiPlan = await geminiService.generateStudyPlan({
      weakTopics,
      goals,
      availableHours,
      planType
    });

    const planPayload = {
      user_id: userId,
      title: aiPlan.title || `${planType === 'weekly' ? 'Weekly' : 'Daily'} Study Plan`,
      plan_type: planType,
      goals: aiPlan.goals || goals,
      generated_by_ai: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let planId = null;
    let savedPlan = null;
    const savedTasks = [];

    if (isConfigured && supabaseAdmin) {
      const { data: pData, error: pErr } = await supabaseAdmin.from('study_plans').insert(planPayload).select().single();
      if (pErr) return errorResponse(res, 'Failed to create plan', 500, pErr);
      savedPlan = pData;
      planId = pData.id;

      const tasksToInsert = (aiPlan.tasks || []).map((t, idx) => {
        const d = new Date();
        d.setDate(d.getDate() + (t.due_date_offset_days || idx));
        return {
          plan_id: planId,
          user_id: userId,
          title: t.title,
          subject: t.subject || 'General',
          topic: t.topic || 'General',
          duration_minutes: t.duration_minutes || 30,
          priority: t.priority || 'medium',
          is_completed: false,
          due_date: d.toISOString().split('T')[0],
          created_at: new Date().toISOString()
        };
      });

      if (tasksToInsert.length > 0) {
        const { data: tData } = await supabaseAdmin.from('study_tasks').insert(tasksToInsert).select();
        savedTasks.push(...(tData || []));
      }
    } else {
      planId = generateId();
      savedPlan = { id: planId, ...planPayload };
      localStore.study_plans.set(planId, savedPlan);

      (aiPlan.tasks || []).forEach((t, idx) => {
        const tId = generateId();
        const d = new Date();
        d.setDate(d.getDate() + (t.due_date_offset_days || idx));
        const taskObj = {
          id: tId,
          plan_id: planId,
          user_id: userId,
          title: t.title,
          subject: t.subject || 'General',
          topic: t.topic || 'General',
          duration_minutes: t.duration_minutes || 30,
          priority: t.priority || 'medium',
          is_completed: false,
          due_date: d.toISOString().split('T')[0],
          created_at: new Date().toISOString()
        };
        localStore.study_tasks.set(tId, taskObj);
        savedTasks.push(taskObj);
      });
    }

    return successResponse(res, {
      plan: savedPlan,
      tasks: savedTasks,
      rationale: aiPlan.pedagogical_rationale
    }, 'Adaptive study plan generated successfully', 201);
  } catch (err) {
    return errorResponse(res, 'Error generating study plan', 500, err);
  }
}

async function getPlanner(req, res) {
  try {
    const userId = req.user.id;
    let plans = [];
    let tasks = [];

    if (isConfigured && supabaseAdmin) {
      const { data: pData } = await supabaseAdmin.from('study_plans').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      plans = pData || [];
      const { data: tData } = await supabaseAdmin.from('study_tasks').select('*').eq('user_id', userId).order('due_date', { ascending: true });
      tasks = tData || [];
    } else {
      plans = Array.from(localStore.study_plans.values()).filter(p => p.user_id === userId);
      tasks = Array.from(localStore.study_tasks.values()).filter(t => t.user_id === userId);
    }

    return successResponse(res, { plans, tasks }, 'Planner data retrieved');
  } catch (err) {
    return errorResponse(res, 'Error fetching planner data', 500, err);
  }
}

async function addTask(req, res) {
  try {
    const userId = req.user.id;
    const { title, subject = 'General', topic = 'General', duration_minutes = 30, priority = 'medium', due_date, plan_id } = req.body;

    if (!title) {
      return errorResponse(res, 'Task title is required', 400);
    }

    const taskPayload = {
      plan_id: plan_id || null,
      user_id: userId,
      title,
      subject,
      topic,
      duration_minutes: parseInt(duration_minutes, 10) || 30,
      priority,
      is_completed: false,
      due_date: due_date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    let result = null;

    if (isConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('study_tasks').insert(taskPayload).select().single();
      if (error) return errorResponse(res, 'Failed to add task', 500, error);
      result = data;
    } else {
      const id = generateId();
      result = { id, ...taskPayload };
      localStore.study_tasks.set(id, result);
    }

    return successResponse(res, result, 'Task created successfully', 201);
  } catch (err) {
    return errorResponse(res, 'Error adding task', 500, err);
  }
}

async function updateTask(req, res) {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    const { is_completed, title, duration_minutes, priority } = req.body;

    const updates = {};
    if (is_completed !== undefined) updates.is_completed = Boolean(is_completed);
    if (title !== undefined) updates.title = title;
    if (duration_minutes !== undefined) updates.duration_minutes = duration_minutes;
    if (priority !== undefined) updates.priority = priority;

    let updated = null;

    if (isConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('study_tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) return errorResponse(res, 'Failed to update task', 500, error);
      updated = data;
    } else {
      const task = localStore.study_tasks.get(taskId);
      if (!task || task.user_id !== userId) return errorResponse(res, 'Task not found', 404);
      Object.assign(task, updates);
      updated = task;
    }

    return successResponse(res, updated, 'Task updated');
  } catch (err) {
    return errorResponse(res, 'Error updating task', 500, err);
  }
}

async function deleteTask(req, res) {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;

    if (isConfigured && supabaseAdmin) {
      await supabaseAdmin.from('study_tasks').delete().eq('id', taskId).eq('user_id', userId);
    } else {
      const task = localStore.study_tasks.get(taskId);
      if (task && task.user_id === userId) {
        localStore.study_tasks.delete(taskId);
      }
    }

    return successResponse(res, { id: taskId }, 'Task deleted');
  } catch (err) {
    return errorResponse(res, 'Error deleting task', 500, err);
  }
}

module.exports = {
  generatePlan,
  getPlanner,
  addTask,
  updateTask,
  deleteTask
};

