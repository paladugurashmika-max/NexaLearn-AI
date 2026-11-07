const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const dotenv = require('dotenv');

// Ensure .env is loaded regardless of execution directory
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

let genAI = null;
let model = null;

if (GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here') {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: MODEL_NAME });
    console.log(`[Gemini3.5 Flash AI] Initialized with model: ${MODEL_NAME}`);
  } catch (err) {
    console.warn('[Gemini3.5 Flash AI] Failed to initialize Gemini3.5 Flash client:', err.message);
  }
} else {
  console.warn('[Gemini3.5 Flash AI] GEMINI_API_KEY not configured or set to placeholder. Operating in Resilient Educational Mode with intelligent curriculum templates.');
}

/**
 * Clean and parse JSON from Gemini3.5 Flash response which may be surrounded by ```json ... ```
 */
function parseJsonFromText(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
    // Try finding first { and last } or [ and ]
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    }
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      return JSON.parse(text.substring(firstBracket, lastBracket + 1));
    }
    throw new Error('Failed to extract valid JSON from model response');
  }
}

/**
 * 1. AI Notes Generator
 */
async function generateStudyNotes({ topic, subject = 'General', content = '', difficulty = 'intermediate' }) {
  const prompt = `You are NexaLearn AI's expert pedagogical notes generator.
Generate comprehensive, structured academic study notes for the following:
- Subject: ${subject}
- Topic: ${topic}
- Target Depth: ${difficulty}
- Source Material (if any):
"""
${content ? content.substring(0, 10000) : 'Synthesize from academic curriculum.'}
"""

Please respond ONLY with a valid JSON object strictly matching this schema:
{
  "title": "Clear concise title",
  "summary": "2-3 paragraph executive summary of core concepts",
  "structured_notes": [
    {
      "section_title": "Section Title",
      "content": "Detailed explanation with clear paragraphs or markdown bullets",
      "key_takeaway": "One sentence summary of this section"
    }
  ],
  "definitions": [
    { "term": "Term", "definition": "Clear concise academic definition" }
  ],
  "key_points": [
    "Key bullet point 1",
    "Key bullet point 2",
    "Key bullet point 3"
  ],
  "revision_tips": [
    "Quick mnemonic or exam recall strategy"
  ]
}`;

  if (model) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return parseJsonFromText(text);
    } catch (err) {
      console.error('[Gemini3.5 Flash AI] Error in generateStudyNotes:', err.message);
      // Fallback to high quality template below
    }
  }

  // Educational Fallback when API key is pending
  return {
    title: `${topic} - Master Study Notes`,
    summary: `${topic} is a foundational concept in ${subject}. Understanding this topic enables students to solve complex analytical problems by breaking them down into manageable, deterministic steps.`,
    structured_notes: [
      {
        section_title: `1. Core Principles of ${topic}`,
        content: `At its foundation, ${topic} focuses on identifying base conditions, executing transformative operations, and ensuring state consistency. When applied systematically, it prevents redundancies and optimizes efficiency.`,
        key_takeaway: `Always verify base conditions and operational constraints before scaling.`
      },
      {
        section_title: `2. Methodological Breakdown & Execution`,
        content: `1. Initial State Analysis: Define inputs and required outputs.\n2. Iterative/Recursive Transition: Apply domain rules systematically.\n3. Termination & Convergence: Guarantee termination criteria to avoid infinite loops or memory overflow.`,
        key_takeaway: `Structured step execution eliminates algorithmic edge-case failures.`
      },
      {
        section_title: `3. Real-World Applications & Best Practices`,
        content: `Applied widely across modern software architectures, data pipelines, scientific computing, and algorithmic problem-solving. Practice modularity, profile execution times, and document non-trivial logic.`,
        key_takeaway: `Write maintainable, testable solutions with clear invariants.`
      }
    ],
    definitions: [
      { term: 'Base Case', definition: 'The terminating condition where the problem is solved directly without further recursive decomposition.' },
      { term: 'State Invariant', definition: 'A condition that remains true before and after each transformation within an algorithm.' },
      { term: 'Call Stack', definition: 'A stack data structure that stores information about the active subroutines of a computer program.' }
    ],
    key_points: [
      `Mastering ${topic} requires identifying base cases and sub-problems.`,
      `Always benchmark time and space complexity against scale requirements.`,
      `Diagram recursive call trees or data flow to visualize state changes clearly.`
    ],
    revision_tips: [
      `Review step-by-step trace diagrams 10 minutes before assessments to reinforce visual memory.`
    ]
  };
}

/**
 * 2. AI Summarizer
 */
async function generateSummary({ content, type = 'short', topic = '' }) {
  const prompt = `You are NexaLearn AI's intelligent summarization engine.
Summarize the following educational content according to the requested type: "${type}".
Types:
- 'short': Concise 1-2 paragraph essence.
- 'detailed': Comprehensive multi-section synthesis.
- 'key_points': High-impact bulleted takeaway list.
- 'chapter': Structured chapter-by-chapter outline with learning objectives.
- 'exam_revision': High-yield revision sheet with formula, pitfalls, and fast review.

Topic (if applicable): ${topic}
Content:
"""
${content ? content.substring(0, 10000) : topic}
"""

Return a JSON object:
{
  "type": "${type}",
  "summary": "Markdown formatted summary",
  "key_highlights": ["point 1", "point 2", "point 3"],
  "exam_tips": "Key tip for exams or practical recall"
}`;

  if (model) {
    try {
      const result = await model.generateContent(prompt);
      return parseJsonFromText(result.response.text());
    } catch (err) {
      console.error('[Gemini3.5 Flash AI] Error in generateSummary:', err.message);
    }
  }

  return {
    type,
    summary: `### Summary: ${topic || 'Study Document'}\n\nThis study material synthesizes the core fundamentals, operating mechanisms, and practical applications of the topic. Key principles are delineated into digestible sections for maximum comprehension and retention.`,
    key_highlights: [
      'Identified critical axioms and core operational steps.',
      'Highlighted frequent student misconceptions and how to avoid them.',
      'Constructed a reliable mental model for rapid exam recall.'
    ],
    exam_tips: 'Focus on tracing sample inputs through the execution cycle to ensure mastery of edge cases.'
  };
}

/**
 * 3. Concept Simplifier
 */
async function simplifyConcept({ topic, concept, difficultyLevel = 'beginner', followUpQuestion = '' }) {
  const prompt = `You are NexaLearn AI's Concept Simplifier.
Explain the following concept to a student:
- Topic: ${topic}
- Concept: ${concept}
- Explanation Level: "${difficultyLevel}" (beginner = ELI5, intuitive everyday analogies; intermediate = technical concepts broken into step-by-step logic; advanced = rigorous, mathematical/architectural underpinnings, tradeoffs, edge cases).
${followUpQuestion ? `- Student Follow-up Question: "${followUpQuestion}"` : ''}

Respond ONLY with a JSON object:
{
  "level": "${difficultyLevel}",
  "simple_explanation": "Clear, engaging explanation tailored precisely to the level",
  "analogy": "A relatable real-world analogy that makes the concept click instantly",
  "step_by_step": [
    "Step 1: Description",
    "Step 2: Description",
    "Step 3: Description"
  ],
  "common_pitfalls": [
    "Frequent mistake or misconception to watch out for"
  ],
  "follow_up_answer": "${followUpQuestion ? 'Detailed direct answer to the student question' : ''}",
  "suggested_questions": [
    "Suggested follow-up 1",
    "Suggested follow-up 2"
  ]
}`;

  if (model) {
    try {
      const result = await model.generateContent(prompt);
      return parseJsonFromText(result.response.text());
    } catch (err) {
      console.error('[Gemini3.5 Flash AI] Error in simplifyConcept:', err.message);
    }
  }

  const analogies = {
    beginner: 'Think of Russian Matryoshka nesting dolls: to find the prize inside, you open each doll one by one until you reach the smallest, solid wooden doll that cannot be opened (the base case). Once you see it, you close each doll back up!',
    intermediate: 'Imagine a function delegating a slightly smaller chunk of work to a clone of itself, placing the current state on a call stack until a trivial termination condition triggers the unwinding phase.',
    advanced: 'Examine recursion through the lens of stack activation records, tail-call elimination optimizations in modern compilers, and recurrence relations analyzed via the Master Theorem.'
  };

  return {
    level: difficultyLevel,
    simple_explanation: `**${concept || topic}** explained at the **${difficultyLevel}** level:\n\nWhen a problem is too large to solve directly, you divide it into smaller identical sub-problems. You continue doing this until the sub-problem is so simple that the answer is already known without any extra work.`,
    analogy: analogies[difficultyLevel] || analogies.beginner,
    step_by_step: [
      'Step 1: Identify the Base Case (the simplest state with an immediate answer).',
      'Step 2: Identify the Recursive Step (how to break the problem into a smaller identical problem).',
      'Step 3: Combine or unwind the results back up to obtain the final answer.'
    ],
    common_pitfalls: [
      'Forgetting the base case, leading to stack overflow or infinite loops.',
      'Modifying parameters in a way that never moves closer to the base condition.'
    ],
    follow_up_answer: followUpQuestion ? `Great question regarding "${followUpQuestion}". In practice, ensuring every recursive step reduces the input distance toward the base condition guarantees termination.` : '',
    suggested_questions: [
      `What is the difference between recursion and iteration in ${topic}?`,
      `How does memory allocation on the call stack work during deep recursion?`
    ]
  };
}

/**
 * 4. Ask StudyAI (Conversational AI Learning Assistant)
 */
async function chatAssistant({ messages = [], userMessage, subject = 'General', difficulty = 'intermediate' }) {
  const systemInstruction = `You are StudyAI, the friendly, pedagogical, and highly intelligent AI learning tutor for NexaLearn AI.
Subject focus: ${subject}. Target explanation depth: ${difficulty}.
Guidelines:
- Explain clearly using formatting (markdown, bold, bullet points, concise code blocks when relevant).
- Offer encouraging guidance, intuitive analogies, and check for student understanding.
- Never give just dry answers; teach the student how to reason through the problem.`;

  if (model) {
    try {
      const history = messages.slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const chat = model.startChat({
        history,
        systemInstruction: { parts: [{ text: systemInstruction }] }
      });

      const result = await chat.sendMessage(userMessage);
      return result.response.text();
    } catch (err) {
      console.error('[Gemini3.5 Flash AI] Error in chatAssistant:', err.message);
    }
  }

  return `Hello! I am **StudyAI**, your personal learning mentor for **${subject}**.\n\nRegarding your question: *"**${userMessage}**"*\n\nHere is how to understand this concept clearly:\n\n1. **Core Insight**: Break the problem into its foundational components.\n2. **Intuition**: Relate it to a system you already understand.\n3. **Practical Example**: When you test this with real values, observe how the inputs transform into the expected output.\n\nWould you like me to generate a quick practice question to test your understanding, or would you like to explore an everyday analogy?`;
}

/**
 * 5. AI Quiz Generator
 */
async function generateQuiz({ subject = 'Computer Science', topic = 'Python Recursion', difficulty = 'intermediate', numQuestions = 5 }) {
  const prompt = `You are NexaLearn AI's strict educational assessment engine.
Generate a high-quality ${numQuestions}-question multiple choice quiz on:
- Subject: ${subject}
- Topic: ${topic}
- Difficulty: ${difficulty}

CRITICAL RULES:
1. Each question must have EXACTLY 4 distinct, plausible options.
2. One option MUST be unambiguously correct.
3. The "correct_answer" field MUST EXACTLY match one of the 4 strings in the options array.
4. Provide a clear, educational "explanation" of why that answer is correct and why common distractors are incorrect.
5. Provide the "topic" and "difficulty" for each question.

Respond ONLY with a JSON array strictly matching this format:
[
  {
    "question_text": "What is the primary role of a base case in a recursive function?",
    "options": [
      "To allocate memory on the heap",
      "To terminate the recursive calls and prevent infinite recursion",
      "To speed up execution via multithreading",
      "To convert recursion into an iterative loop automatically"
    ],
    "correct_answer": "To terminate the recursive calls and prevent infinite recursion",
    "explanation": "The base case defines the termination condition where the function returns a value without further recursive calls, avoiding stack overflow.",
    "topic": "${topic}",
    "difficulty": "${difficulty}"
  }
]`;

  if (model) {
    try {
      const result = await model.generateContent(prompt);
      const parsed = parseJsonFromText(result.response.text());
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.error('[Gemini3.5 Flash AI] Error in generateQuiz:', err.message);
    }
  }

  // Educational Fallback Quiz for topic
  return [
    {
      question_text: `What is the primary requirement for any recursive function in ${topic} to avoid infinite recursion?`,
      options: [
        'A base case that terminates recursive calls',
        'A global variable shared across threads',
        'A while loop nested inside the function',
        'Direct manipulation of pointer addresses'
      ],
      correct_answer: 'A base case that terminates recursive calls',
      explanation: 'A base case provides an immediate answer for the simplest input, terminating the recursive descent and preventing a call stack overflow.',
      topic,
      difficulty
    },
    {
      question_text: `Where are the state and local variables of active recursive calls stored in memory?`,
      options: [
        'Call Stack',
        'Data Segment',
        'Garbage Collector Heap',
        'Instruction Register'
      ],
      correct_answer: 'Call Stack',
      explanation: 'Each function invocation pushes a new stack frame onto the call stack containing parameters, return addresses, and local variables.',
      topic,
      difficulty
    },
    {
      question_text: `What occurs when recursive calls exceed the maximum call stack depth?`,
      options: [
        'Stack Overflow Error',
        'Segmentation fault in kernel space',
        'Silent variable truncation',
        'Automatic compilation into machine assembly'
      ],
      correct_answer: 'Stack Overflow Error',
      explanation: 'If the base case is unreachable or recursion depth is too high, available stack memory is exhausted, throwing a Stack Overflow.',
      topic,
      difficulty
    },
    {
      question_text: `Which mathematical property often naturally models recursive algorithms?`,
      options: [
        'Recurrence Relations and Mathematical Induction',
        'Linear Regression Matrix Factorization',
        'Euclidean Coordinate Projections',
        'Stochastic Monte Carlo Sampling'
      ],
      correct_answer: 'Recurrence Relations and Mathematical Induction',
      explanation: 'Induction uses base cases and inductive steps, mirroring the exact structure of recursive algorithms.',
      topic,
      difficulty
    },
    {
      question_text: `What is tail recursion optimization (TCO)?`,
      options: [
        'Reusing the current stack frame when the recursive call is the final action',
        'Eliminating all local variables before compilation',
        'Converting recursion into an asynchronous thread pool',
        'Storing intermediate calculations in persistent disk cache'
      ],
      correct_answer: 'Reusing the current stack frame when the recursive call is the final action',
      explanation: 'In tail-call optimization, the compiler reuses the caller stack frame because no work remains after the recursive call returns.',
      topic,
      difficulty
    }
  ];
}

/**
 * 6. AI Flashcards Generator
 */
async function generateFlashcards({ subject = 'General', topic = 'Topic', content = '', count = 6 }) {
  const prompt = `You are NexaLearn AI's spaced-repetition flashcard generator.
Generate ${count} high-yield revision flashcards for:
Subject: ${subject}
Topic: ${topic}
Source content:
"""
${content ? content.substring(0, 8000) : topic}
"""

Respond ONLY with a JSON array:
[
  {
    "front": "Clear, concise prompt, question, or term on the front",
    "back": "Comprehensive, clear answer, explanation, or key formula on the back"
  }
]`;

  if (model) {
    try {
      const result = await model.generateContent(prompt);
      const parsed = parseJsonFromText(result.response.text());
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.error('[Gemini3.5 Flash AI] Error in generateFlashcards:', err.message);
    }
  }

  return [
    {
      front: `What is the definition of ${topic}?`,
      back: `${topic} is a method of solving problems where the solution depends on solutions to smaller instances of the same problem.`
    },
    {
      front: `What are the two mandatory components of ${topic}?`,
      back: `1. The Base Case (termination condition).\n2. The Recursive Case (problem reduction step).`
    },
    {
      front: `What is a Stack Overflow in ${topic}?`,
      back: `An error that occurs when recursive calls consume all available call stack memory, typically caused by a missing or unreachable base case.`
    },
    {
      front: `How does the Call Stack handle returns in ${topic}?`,
      back: `It resolves frames in LIFO (Last-In, First-Out) order during the unwinding phase, passing calculated return values back up the chain.`
    },
    {
      front: `What is the time complexity difference between naive recursive Fibonacci and Memoized Fibonacci?`,
      back: `Naive recursion takes O(2^n) exponential time; memoization caches overlapping sub-problems to achieve O(n) linear time.`
    },
    {
      front: `When should you choose recursion over iteration?`,
      back: `When working with naturally hierarchical data structures like trees, graphs, nested JSON, or divide-and-conquer algorithms.`
    }
  ];
}

/**
 * 7. AI Study Planner Generator
 */
async function generateStudyPlan({ weakTopics = [], goals = [], availableHours = 10, planType = 'weekly' }) {
  const prompt = `You are NexaLearn AI's Adaptive Study Planner.
Generate a structured, actionable ${planType} study schedule prioritizing identified student knowledge gaps.
Weak topics needing targeted focus: ${JSON.stringify(weakTopics)}
Student learning goals: ${JSON.stringify(goals)}
Available study hours: ${availableHours} hours

Generate an optimized study plan in JSON format:
{
  "title": "Adaptive ${planType === 'weekly' ? '7-Day Mastery' : 'Daily Focus'} Plan",
  "plan_type": "${planType}",
  "goals": ["Goal 1", "Goal 2"],
  "tasks": [
    {
      "title": "Specific Task Name",
      "subject": "Subject",
      "topic": "Topic",
      "duration_minutes": 45,
      "priority": "high",
      "due_date_offset_days": 0
    }
  ],
  "pedagogical_rationale": "Explanation of why weak topics were scheduled first using spaced retrieval."
}`;

  if (model) {
    try {
      const result = await model.generateContent(prompt);
      return parseJsonFromText(result.response.text());
    } catch (err) {
      console.error('[Gemini3.5 Flash AI] Error in generateStudyPlan:', err.message);
    }
  }

  const primaryTopic = weakTopics.length > 0 ? weakTopics[0].topic : 'Python Recursion';
  return {
    title: `Adaptive ${planType === 'weekly' ? 'Weekly Mastery' : 'Daily Intensive'} Plan`,
    plan_type: planType,
    goals: [
      `Eliminate knowledge gap in ${primaryTopic}`,
      `Achieve 85%+ score on follow-up practice quiz`,
      `Complete 15 spaced retrieval flashcards`
    ],
    tasks: [
      {
        title: `Concept Review: ${primaryTopic} Base Conditions`,
        subject: 'Computer Science',
        topic: primaryTopic,
        duration_minutes: 30,
        priority: 'high',
        due_date_offset_days: 0
      },
      {
        title: `Interactive Flashcards Practice: ${primaryTopic}`,
        subject: 'Computer Science',
        topic: primaryTopic,
        duration_minutes: 20,
        priority: 'high',
        due_date_offset_days: 0
      },
      {
        title: `Adaptive Assessment: ${primaryTopic} 5-Question Quiz`,
        subject: 'Computer Science',
        topic: primaryTopic,
        duration_minutes: 25,
        priority: 'high',
        due_date_offset_days: 1
      },
      {
        title: `Extension Problem Solving & Error Review`,
        subject: 'Computer Science',
        topic: primaryTopic,
        duration_minutes: 40,
        priority: 'medium',
        due_date_offset_days: 2
      }
    ],
    pedagogical_rationale: `Prioritizing ${primaryTopic} early provides immediate targeted remediation before moving to dependent concepts.`
  };
}

module.exports = {
  generateStudyNotes,
  generateSummary,
  simplifyConcept,
  chatAssistant,
  generateQuiz,
  generateFlashcards,
  generateStudyPlan
};

