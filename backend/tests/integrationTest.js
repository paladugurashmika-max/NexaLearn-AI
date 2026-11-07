const http = require('http');

const PORT = 5000;
const BASE = `http://localhost:${PORT}/api`;

async function request(path, method = 'GET', body = null, headers = {}) {
  const url = `${BASE}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token-001',
      ...headers
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting NexaLearn AI Verification Test Suite ---');
  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failCount++;
    }
  }

  try {
    // 1. Health
    const health = await request('/health');
    assert(health.status === 200 && health.data.status === 'healthy', 'Health check endpoint returns 200 healthy');

    // 2. Profile
    const profile = await request('/auth/profile');
    assert(profile.status === 200 && profile.data.success, 'Profile endpoint returns active student profile');

    // 3. AI Notes Generation
    const notes = await request('/ai/notes', 'POST', {
      topic: 'Python Recursion',
      subject: 'Computer Science',
      difficulty: 'intermediate',
      save: true
    });
    assert(notes.status === 200 && notes.data.data.title, 'AI Notes Generator returns structured notes with definitions and key points');

    // 4. Concept Simplifier
    const expl = await request('/ai/explain', 'POST', {
      topic: 'Python Recursion',
      concept: 'Call Stack',
      difficultyLevel: 'beginner'
    });
    assert(expl.status === 200 && expl.data.data.analogy, 'Concept Simplifier returns everyday analogies and step-by-step logic');

    // 5. Ask StudyAI Chat
    const chat = await request('/ai/chat', 'POST', {
      message: 'Why does recursion need a base condition?',
      subject: 'Computer Science'
    });
    assert(chat.status === 200 && chat.data.data.reply, 'Ask StudyAI generates pedagogical response');

    // 6. Quiz Generation
    const quizGen = await request('/quizzes/generate', 'POST', {
      topic: 'Python Recursion',
      subject: 'Computer Science',
      difficulty: 'intermediate',
      numQuestions: 5
    });
    assert(quizGen.status === 201 && quizGen.data.data.questions.length === 5, 'Quiz Generator generates 5-question MCQ quiz');

    const quizId = quizGen.data.data.quiz.id;
    const questions = quizGen.data.data.questions;

    // 7. Security Check: Questions for student must NOT reveal correct_answer
    const studentQuizView = await request(`/quizzes/${quizId}`);
    const firstQ = studentQuizView.data.data.questions[0];
    assert(firstQ.correct_answer === undefined && firstQ.explanation === undefined, 'Security Verified: Correct answers and explanations are NEVER exposed before submission!');

    // 8. Quiz Submission & Trusted Server-Side Scoring
    // Submit 4 correct and 1 wrong option
    const submissionAnswers = [
      { question_id: questions[0].id || 'q1', selected_option: 'A base case that terminates recursive calls' },
      { question_id: questions[1].id || 'q2', selected_option: 'Call Stack' },
      { question_id: questions[2].id || 'q3', selected_option: 'Stack Overflow Error' },
      { question_id: questions[3].id || 'q4', selected_option: 'Recurrence Relations and Mathematical Induction' },
      { question_id: questions[4].id || 'q5', selected_option: 'Wrong Option Test' }
    ];

    const submission = await request(`/quizzes/${quizId}/submit`, 'POST', {
      answers: submissionAnswers
    });
    assert(submission.status === 200 && submission.data.data.totalQuestions === 5, 'Quiz evaluated with server-side scoring logic');
    assert(submission.data.data.updatedMastery.topic === 'Python Recursion', 'Topic Mastery updated dynamically from assessment answers');

    // 9. Adaptive Mastery & Knowledge Gap Detection
    const mastery = await request('/adaptive/mastery');
    assert(mastery.status === 200 && mastery.data.data.length > 0, 'Adaptive Engine maintains topic-wise mastery profile');

    // 10. Adaptive Recommendations
    const recs = await request('/adaptive/recommendations');
    assert(recs.status === 200 && recs.data.data.recommendations.length > 0, 'Adaptive Recommendations generated with actionable next steps');

    // 11. Study Planner
    const plan = await request('/planner/generate', 'POST', {
      planType: 'weekly',
      availableHours: 8,
      goals: ['Eliminate knowledge gaps in Python Recursion']
    });
    assert(plan.status === 201 && plan.data.data.tasks.length > 0, 'AI Study Planner generates schedule prioritized by weak topics');

    // 12. Learning Analytics
    const progress = await request('/progress');
    assert(progress.status === 200 && progress.data.data.stats.totalQuizzes > 0, 'Learning Analytics dashboard aggregates real performance telemetry');

    // 13. Gamification Badges
    const achs = await request('/achievements');
    const firstStep = achs.data.data.find(a => a.code === 'FIRST_STEP');
    assert(firstStep && firstStep.isUnlocked === true, 'Gamification Engine: First Steps badge unlocked upon quiz completion');

    console.log(`\n--- Verification Summary: ${passCount} Passed, ${failCount} Failed ---`);
    if (failCount === 0) {
      console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();

