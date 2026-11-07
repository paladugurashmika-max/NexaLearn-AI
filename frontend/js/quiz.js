/**
 * NexaLearn AI - Smart Practice Zone & Assessment Controller
 */

let activeQuiz = null;
let activeQuestions = [];
let currentQuestionIndex = 0;
let studentAnswers = {}; // Map of question_id -> selected_option

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuthProtection()) return;

  if (window.lucide) window.lucide.createIcons();

  await loadQuizzesList();
  await loadQuizHistory();

  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const quizIdParam = urlParams.get('quizId');
  const autoTopicParam = urlParams.get('autoTopic');
  const difficultyParam = urlParams.get('difficulty');

  if (quizIdParam) {
    startQuizById(quizIdParam);
  } else if (autoTopicParam) {
    document.getElementById('quiz-topic').value = autoTopicParam;
    if (difficultyParam) {
      document.getElementById('quiz-difficulty').value = difficultyParam;
    }
    openGenerateModal();
  }

  // Setup generate quiz form listener
  const form = document.getElementById('generate-quiz-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const topic = document.getElementById('quiz-topic').value.trim();
      const subject = document.getElementById('quiz-subject').value.trim();
      const difficulty = document.getElementById('quiz-difficulty').value;
      const numQuestions = document.getElementById('quiz-num').value;

      const btn = document.getElementById('modal-gen-btn');
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader"></i> <span>Formulating questions with Gemini3.5 Flash AI...</span>';
      if (window.lucide) window.lucide.createIcons();

      try {
        const res = await fetchWithAuth('/quizzes/generate', {
          method: 'POST',
          body: JSON.stringify({ topic, subject, difficulty, numQuestions })
        });

        if (res.success && res.data) {
          closeGenerateModal();
          showToast('Assessment quiz generated successfully!', 'success');
          // Start the generated quiz immediately
          startQuiz(res.data.quiz, res.data.questions);
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="sparkles"></i> <span>Generate Quiz with Gemini3.5 Flash AI</span>';
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }
});

function openGenerateModal() {
  document.getElementById('generate-modal').classList.add('active');
}

function closeGenerateModal() {
  document.getElementById('generate-modal').classList.remove('active');
}

function openReviewModal() {
  document.getElementById('review-modal').classList.add('active');
}

function closeReviewModal() {
  document.getElementById('review-modal').classList.remove('active');
  // Return to dashboard view & reload history
  document.getElementById('active-quiz-view').style.display = 'none';
  document.getElementById('quiz-dashboard-view').style.display = 'block';
  loadQuizzesList();
  loadQuizHistory();
}

async function loadQuizzesList() {
  const container = document.getElementById('quizzes-list-container');
  try {
    const res = await fetchWithAuth('/quizzes');
    if (!res.success) return;

    const quizzes = res.data || [];
    if (quizzes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="check-square"></i></div>
          <div class="empty-title">No Quizzes Generated Yet</div>
          <div class="empty-desc">Click "Generate New Quiz" to start testing your knowledge.</div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = quizzes.map(q => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1rem; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 0.65rem;">
        <div>
          <div style="font-weight: 600; color: #fff;">${q.title}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
            ${q.subject} • ${q.total_questions} Questions • <span style="text-transform: capitalize; color: var(--primary-light);">${q.difficulty}</span>
          </div>
        </div>
        <button onclick="startQuizById('${q.id}')" class="btn btn-secondary btn-sm">
          <span>Start</span>
          <i data-lucide="play" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.warn('Failed to load quizzes:', err);
  }
}

async function loadQuizHistory() {
  const container = document.getElementById('quiz-history-container');
  try {
    const res = await fetchWithAuth('/quizzes/history');
    if (!res.success) return;

    const history = res.data || [];
    if (history.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="clock"></i></div>
          <div class="empty-title">No Attempts Recorded</div>
          <div class="empty-desc">Complete a quiz to track accuracy trends.</div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = history.slice(0, 6).map(att => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1rem; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 0.65rem;">
        <div>
          <div style="font-weight: 600; color: #fff;">${att.title || att.topic || 'Assessment'}</div>
          <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 0.2rem;">
            Score: ${att.score}/${att.total_questions} (${att.percentage}%) • ${formatDate(att.created_at)}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="badge ${att.passed ? 'badge-strong' : 'badge-weak'}">
            ${att.passed ? 'PASSED' : 'RETRY'}
          </span>
          <button onclick="viewAttemptReview('${att.id}')" class="btn btn-secondary btn-sm" title="Review Answers">
            <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.warn('Failed to load quiz history:', err);
  }
}

async function startQuizById(quizId) {
  try {
    const res = await fetchWithAuth(`/quizzes/${quizId}`);
    if (res.success && res.data) {
      startQuiz(res.data.quiz, res.data.questions);
    }
  } catch (err) {
    showToast('Failed to load quiz: ' + err.message, 'error');
  }
}

function startQuiz(quiz, questions) {
  activeQuiz = quiz;
  activeQuestions = questions;
  currentQuestionIndex = 0;
  studentAnswers = {};

  document.getElementById('quiz-dashboard-view').style.display = 'none';
  document.getElementById('active-quiz-view').style.display = 'block';

  document.getElementById('active-quiz-title').innerText = quiz.title;
  document.getElementById('active-quiz-badge').innerText = (quiz.difficulty || 'Intermediate').toUpperCase();

  renderCurrentQuestion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderCurrentQuestion() {
  if (!activeQuestions || activeQuestions.length === 0) return;

  const q = activeQuestions[currentQuestionIndex];
  const total = activeQuestions.length;

  document.getElementById('quiz-question-counter').innerText = `Question ${currentQuestionIndex + 1} of ${total}`;
  document.getElementById('quiz-progress-fill').style.width = `${((currentQuestionIndex + 1) / total) * 100}%`;
  document.getElementById('question-text').innerText = `${currentQuestionIndex + 1}. ${q.question_text}`;

  const optionsContainer = document.getElementById('options-container');
  const selected = studentAnswers[q.id];

  const optionLetters = ['A', 'B', 'C', 'D'];
  optionsContainer.innerHTML = (q.options || []).map((opt, idx) => `
    <div class="option-item ${selected === opt ? 'selected' : ''}" onclick="selectQuizOption('${q.id}', '${encodeURIComponent(opt)}')">
      <div class="option-indicator">${optionLetters[idx] || (idx + 1)}</div>
      <div style="font-size: 0.95rem; color: #fff;">${opt}</div>
    </div>
  `).join('');

  // Update navigation buttons
  document.getElementById('prev-question-btn').disabled = currentQuestionIndex === 0;

  if (currentQuestionIndex === total - 1) {
    document.getElementById('next-question-btn').style.display = 'none';
    document.getElementById('submit-quiz-btn').style.display = 'inline-flex';
  } else {
    document.getElementById('next-question-btn').style.display = 'inline-flex';
    document.getElementById('submit-quiz-btn').style.display = 'none';
  }
}

function selectQuizOption(questionId, encodedOption) {
  const option = decodeURIComponent(encodedOption);
  studentAnswers[questionId] = option;
  renderCurrentQuestion();
}

function goToPrevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex -= 1;
    renderCurrentQuestion();
  }
}

function goToNextQuestion() {
  if (currentQuestionIndex < activeQuestions.length - 1) {
    currentQuestionIndex += 1;
    renderCurrentQuestion();
  }
}

function confirmQuizSubmission() {
  const answeredCount = Object.keys(studentAnswers).length;
  const total = activeQuestions.length;

  if (answeredCount < total) {
    const proceed = confirm(`You have answered ${answeredCount} of ${total} questions. Are you sure you want to submit?`);
    if (!proceed) return;
  }

  submitActiveQuiz();
}

async function submitActiveQuiz() {
  const submitBtn = document.getElementById('submit-quiz-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i data-lucide="loader"></i> <span>Scoring Assessment...</span>';
  if (window.lucide) window.lucide.createIcons();

  const formattedAnswers = Object.entries(studentAnswers).map(([qId, opt]) => ({
    question_id: qId,
    selected_option: opt
  }));

  try {
    const res = await fetchWithAuth(`/quizzes/${activeQuiz.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers: formattedAnswers })
    });

    if (res.success && res.data) {
      showToast(`Quiz completed! You scored ${res.data.percentage}%`, res.data.passed ? 'success' : 'info');
      renderSubmissionReview(res.data);
    }
  } catch (err) {
    showToast('Failed to submit quiz: ' + err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i data-lucide="check-circle-2"></i> <span>Submit Assessment</span>';
    if (window.lucide) window.lucide.createIcons();
  }
}

function renderSubmissionReview(data) {
  const container = document.getElementById('review-modal-content');

  let reviewItemsHtml = (data.detailedReview || []).map((rev, idx) => `
    <div style="padding: 1.25rem; border-radius: var(--radius-md); background: var(--bg-surface); border: 1px solid ${rev.is_correct ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}; margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <span style="font-weight: 700; color: #fff;">Question ${idx + 1}</span>
        <span class="badge ${rev.is_correct ? 'badge-strong' : 'badge-weak'}">
          ${rev.is_correct ? '✓ Correct' : '✗ Incorrect'}
        </span>
      </div>
      <p style="font-size: 0.95rem; margin-bottom: 0.75rem; color: #fff;">${rev.question_text}</p>

      <div style="font-size: 0.85rem; margin-bottom: 0.35rem;">
        <span style="color: var(--text-dim);">Your Answer:</span>
        <span style="color: ${rev.is_correct ? '#34d399' : '#f87171'}; font-weight: 600; margin-left: 0.3rem;">${rev.selected_option || 'None'}</span>
      </div>

      ${!rev.is_correct ? `
        <div style="font-size: 0.85rem; margin-bottom: 0.5rem;">
          <span style="color: var(--text-dim);">Correct Answer:</span>
          <span style="color: #34d399; font-weight: 600; margin-left: 0.3rem;">${rev.correct_answer}</span>
        </div>
      ` : ''}

      ${rev.explanation ? `
        <div style="margin-top: 0.5rem; padding: 0.65rem 0.85rem; background: rgba(255, 255, 255, 0.03); border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-muted); border-left: 3px solid var(--primary-light);">
          💡 <strong style="color: #fff;">Explanation:</strong> ${rev.explanation}
        </div>
      ` : ''}
    </div>
  `).join('');

  container.innerHTML = `
    <!-- Top Score Summary Banner -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%); border-radius: var(--radius-lg); margin-bottom: 1.5rem; border: 1px solid rgba(139, 92, 246, 0.3);">
      <div>
        <div style="font-size: 2.25rem; font-weight: 800; color: #fff;">
          ${data.score} / ${data.totalQuestions}
          <span style="font-size: 1.25rem; font-weight: 600; color: ${data.passed ? '#34d399' : '#f87171'}; margin-left: 0.5rem;">(${data.percentage}%)</span>
        </div>
        <p style="font-size: 0.9rem; margin-top: 0.25rem;">
          ${data.passed ? '🎉 Solid performance! You met the passing threshold.' : '⚠️ Knowledge gaps identified. Review the explanations below.'}
        </p>
      </div>
      <div>
        <span class="badge ${data.updatedMastery?.status === 'strong' ? 'badge-strong' : data.updatedMastery?.status === 'moderate' ? 'badge-moderate' : 'badge-weak'}" style="font-size: 0.85rem; padding: 0.5rem 1rem;">
          Updated Mastery: ${data.updatedMastery?.score || 0}%
        </span>
      </div>
    </div>

    ${data.newlyUnlockedAchievements && data.newlyUnlockedAchievements.length > 0 ? `
      <div style="padding: 1rem; background: rgba(245, 158, 11, 0.15); border: 1px solid var(--warning); border-radius: var(--radius-md); margin-bottom: 1.5rem;">
        <h4 style="color: #fbbf24; margin-bottom: 0.25rem;">🏆 Achievement Unlocked!</h4>
        ${data.newlyUnlockedAchievements.map(ach => `<p style="font-size: 0.9rem; color: #fff;"><strong>${ach.title}</strong> — ${ach.description} (+${ach.points} XP)</p>`).join('')}
      </div>
    ` : ''}

    <h3 style="font-size: 1.15rem; margin-bottom: 1rem;">Question-by-Question Review</h3>
    <div style="max-height: 400px; overflow-y: auto; padding-right: 0.5rem;">
      ${reviewItemsHtml}
    </div>

    <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
      <a href="adaptive-learning.html" class="btn btn-secondary">
        <i data-lucide="cpu"></i>
        <span>Check Adaptive Recommendations</span>
      </a>
      <button onclick="closeReviewModal()" class="btn btn-primary">Done</button>
    </div>
  `;

  openReviewModal();
  if (window.lucide) window.lucide.createIcons();
}

async function viewAttemptReview(attemptId) {
  try {
    const res = await fetchWithAuth(`/quizzes/attempts/${attemptId}`);
    if (res.success && res.data) {
      const { attempt, answers } = res.data;
      const detailedReview = answers.map(a => ({
        question_text: a.questions?.question_text,
        selected_option: a.selected_option,
        correct_answer: a.questions?.correct_answer,
        is_correct: a.is_correct,
        explanation: a.questions?.explanation
      }));

      renderSubmissionReview({
        score: attempt.score,
        totalQuestions: attempt.total_questions,
        percentage: attempt.percentage,
        passed: attempt.passed,
        detailedReview,
        updatedMastery: null
      });
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.openGenerateModal = openGenerateModal;
window.closeGenerateModal = closeGenerateModal;
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.startQuizById = startQuizById;
window.selectQuizOption = selectQuizOption;
window.goToPrevQuestion = goToPrevQuestion;
window.goToNextQuestion = goToNextQuestion;
window.confirmQuizSubmission = confirmQuizSubmission;
window.viewAttemptReview = viewAttemptReview;

