# NexaLearn AI

### **Tagline**: *Your Intelligence. Your Learning. Your Future.*
### **Project Theme**: *Smart Education*
### **Project Type**: *AI-Powered Personalized and Adaptive Learning Platform*

---

## 🌟 Executive Summary

**NexaLearn AI** is an intelligent, full-stack educational technology platform combining real AI-powered study assistance with a deterministic **Adaptive Learning Intelligence Engine**. 

Unlike conventional study platforms that stop at delivering static notes, NexaLearn AI continuously analyses how well each student understands academic concepts and dynamically prescribes what they should learn, review, or practise next.

> **Core Vision**: Every student deserves a learning experience that adapts dynamically to their individual needs.

---

## 🚀 Key Features

1. **AI Study Studio**:
   - Ingests PDF study materials (with OCR detection for scanned documents) or pasted text.
   - Generates structured revision notes, topic breakdowns, core definitions, and key takeaways.
   - Summarizes material into short, detailed, chapter, or high-yield exam-revision formats.
   - Explains complex concepts with **Beginner (ELI5 + everyday analogies)**, **Intermediate (step-by-step logic)**, and **Advanced (mathematical/architectural depth)** modes with follow-up Q&A.
   - Personal Study Library to save, filter, and organize notes.

2. **Ask StudyAI Tutor**:
   - Interactive conversational AI learning mentor powered by Google Gemini3.5 Flash. API.
   - Preserves conversation histories and adjusts pedagogical depth dynamically.

3. **Smart Practice Zone**:
   - AI-generated multiple-choice diagnostic quizzes with 4 plausible options.
   - **Strict Server-Side Scoring**: Correct answers are protected until submission; the backend evaluates answers deterministically.
   - Explanations for correct answers and common distractors.
   - Comprehensive quiz history, attempt comparisons, and retake workflows.

4. **AI Flashcards Studio**:
   - Interactive 3D flip revision flashcards.
   - Tracks spaced repetition status (`learning`, `reviewing`, `mastered`).

5. **Signature Innovation: Adaptive Learning Intelligence Engine**:
   - **Knowledge Gap Detection**: Classifies topics into **Strong (≥ 80%)**, **Moderate (50–79%)**, and **Weak (< 50%)**.
   - **Transparent Weighted Mastery Formula**:
     $$\text{New Mastery} = 0.60 \times (\text{Recent Score}) + 0.30 \times (\text{Historical Avg}) + \text{Consistency Bonus}$$
   - **Actionable Interventions**: Automatically schedules beginner analogies, remedial quizzes, or advanced extensions.
   - **Continuous Learning Cycle Visualizer**: Telemetry tracking students through 6 continuous learning stages.

6. **AI Study Planner**:
   - Generates daily and weekly study schedules automatically prioritizing identified knowledge gaps and upcoming exam deadlines.
   - Interactive task checklists with real-time completion tracking.

7. **Learning Analytics & Gamification**:
   - Chart.js visualizations: Score Trajectory Growth Line Chart and Topic Mastery Bar Chart.
   - Deterministic achievement badges (*First Steps*, *Quick Learner*, *Consistency Champion*, *Topic Master*, *Knowledge Explorer*, *Practice Pro*, *Flashcard Wizard*).
   - Daily study streak and XP tracking.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript, Fetch API, Chart.js, Lucide Icons |
| **Backend** | Node.js, Express.js, REST API Architecture, dotenv, cors, helmet, multer, pdf-parse |
| **Database & Auth** | Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS) |
| **Artificial Intelligence**| Google Gemini3.5 Flash. API (`@google/generative-ai`) via secure backend integration |

---

## 📂 Project Organization

```text
smart education/
├── frontend/
│   ├── index.html                   # Landing Page with 6-stage cycle visualizer
│   ├── login.html                    # Student Authentication (Email/Password & 1-Click Demo)
│   ├── register.html                 # Student Profile Registration
│   ├── dashboard.html                # Real-Time Telemetry Dashboard
│   ├── pages/
│   │   ├── study-studio.html         # Notes Generator, Summarizer, Concept Simplifier
│   │   ├── assistant.html            # Ask StudyAI Conversational Tutor
│   │   ├── quiz.html                 # Smart Practice Zone & Server-Side Scoring
│   │   ├── flashcards.html           # 3D Flip Flashcards Studio
│   │   ├── adaptive-learning.html    # Adaptive Intelligence Hub & Mastery Matrix
│   │   ├── planner.html              # AI Study Planner & Task Tracker
│   │   ├── progress.html             # Chart.js Visual Analytics & Badges
│   │   └── profile.html              # Student Profile & RLS Settings
│   ├── css/
│   │   ├── style.css                 # Core Design Tokens, Buttons, Glassmorphism
│   │   ├── dashboard.css             # Layouts, Topbar, Sidebar, 3D Flashcards
│   │   └── responsive.css            # Media Queries for Mobile, Tablet, Desktop
│   └── js/
│       ├── config.js                 # API Endpoints & Toast Notifications
│       ├── auth.js                   # Supabase Auth & Session Management
│       ├── dashboard.js              # Dashboard Telemetry & Recommendations
│       ├── study-studio.js           # PDF Upload, Notes & Simplifier Logic
│       ├── assistant.js              # Chat Tutor & Markdown Formatter
│       ├── quiz.js                   # Assessment Engine & Evaluation Review
│       ├── flashcards.js             # 3D Flip Controls & Mastery Tracking
│       ├── adaptive.js               # Knowledge Gaps & Learning Cycle
│       ├── planner.js                # AI Study Planner & Task Completion
│       └── progress.js               # Chart.js Analytics & Badges Showcase
├── backend/
│   ├── server.js                     # Express Server & Static File Serving
│   ├── package.json                  # Dependencies & Scripts
│   ├── .env.example                  # Environment Variables Template
│   ├── .env                          # Local Environment Config
│   ├── config/
│   │   └── supabase.js               # Supabase Client & RLS Token Scoping
│   ├── routes/
│   │   ├── authRoutes.js             # Profile endpoints
│   │   ├── aiRoutes.js               # Notes, Summarizer, Concept Simplifier, Chat
│   │   ├── quizRoutes.js             # Quizzes, Taking, Scoring, History
│   │   ├── flashcardRoutes.js        # Flashcards Generation & Decks
│   │   ├── adaptiveRoutes.js         # Knowledge Gaps, Mastery, Recommendations
│   │   ├── plannerRoutes.js          # Schedules & Task CRUD
│   │   ├── progressRoutes.js         # Progress Summary & Trajectory
│   │   └── achievementRoutes.js      # Gamification Badges
│   ├── controllers/                  # Clean Controller Business Logic
│   ├── services/
│   │   ├── geminiService.js          # Google Gemini3.5 Flash. AI Integration
│   │   ├── adaptiveEngine.js         # Deterministic Mastery & Gap Detection
│   │   ├── pdfService.js             # PDF Text Extraction & OCR Detection
│   │   └── gamificationService.js    # Streaks & Achievement Unlocks
│   ├── middleware/
│   │   ├── authMiddleware.js         # Bearer JWT Verification
│   │   └── errorHandler.js          # Unified Error & 404 Handlers
│   └── utils/
│       └── helpers.js                # Response Formatters & Resilient Store
├── database/
│   └── schema.sql                    # Complete PostgreSQL Schema & RLS Policies
├── .gitignore
└── README.md
```

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Node.js**: v18 or higher (tested with v24.22)
- **npm**: v9 or higher

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` in `backend/`:
```bash
cp .env.example .env
```
Edit `backend/.env`:
```env
PORT=5000
NODE_ENV=development

# Google Gemini3.5 Flash. API (Get free key from https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Supabase (Get from https://supabase.com/dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

> **Zero-Friction Hackathon Mode**: NexaLearn AI features built-in fallback resilience! If `GEMINI_API_KEY` or `SUPABASE_URL` are not yet set, the platform will seamlessly run in local mode with intelligent curriculum templates and memory persistence, allowing judges and developers to test the complete user journey out of the box.

### Step 3: Set up Supabase Database Schema
1. Open your Supabase Dashboard -> **SQL Editor**.
2. Paste the contents of `database/schema.sql`.
3. Click **Run** to create all tables, indexes, RLS policies, and seeded achievements.

### Step 4: Run the Backend Application
```bash
cd backend
npm start
```
The server will start at:
- **Web Platform & Frontend**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🎯 Hackathon Live Demonstration Scenario

Follow these steps for an impressive evaluation demonstration:

1. **Login**:
   - Open [http://localhost:5000](http://localhost:5000).
   - Click **Get Started** or **Log In**.
   - Use the **1-Click Hackathon Demo Login** button (logs in as Alex Johnson).

2. **Generate Study Material**:
   - Navigate to **AI Study Studio**.
   - Enter Topic: `"Python Recursion"`, Subject: `"Computer Science"`.
   - Click **Generate Structured Notes**. View the title, structured breakdowns, definitions, and takeaways.
   - Click **Save to Library** (+20 XP).

3. **Concept Simplification**:
   - Switch to the **Concept Simplifier** tab.
   - Enter `"Call Stack in Recursion"`, select level **Beginner**.
   - View the Russian Matryoshka doll analogy, step-by-step logic, and common misconceptions.

4. **Conversational AI Tutor**:
   - Navigate to **Ask StudyAI**.
   - Ask: *"What is the difference between recursion and iteration?"*
   - Observe the formatted markdown response with code reasoning.

5. **Diagnostic Assessment (Smart Practice Zone)**:
   - Navigate to **Smart Practice Zone**.
   - Click **Generate New Quiz** -> Topic: `"Python Recursion"`, 5 Questions.
   - Take the quiz, deliberately choosing 1-2 incorrect answers to test adaptive gap detection.
   - Click **Submit Assessment**.
   - The backend validates each answer securely, returns score review, and updates mastery!

6. **Adaptive Intelligence & Knowledge Gap Detection**:
   - Go to **Adaptive Intelligence**.
   - Observe how Python Recursion is categorized based on your score.
   - Review the personalized remediation pathway and review cards.

7. **Visual Analytics & Achievements**:
   - Navigate to **Learning Analytics**.
   - View your Score Trajectory Line Chart and Topic Mastery Bar Chart.
   - Check the **Gamification & Milestone Badges** section to see *First Steps* or *Quick Learner* unlocked!

---

## 🔒 Security & Privacy Practices

- **Zero Key Leaks**: Neither the Gemini3.5 Flash. API key nor the Supabase Service Role key are exposed to client JavaScript.
- **Trusted Server-Side Scoring**: Quiz answers are never verified on the frontend. The server evaluates each question against database truth.
- **Row Level Security (RLS)**: PostgreSQL policies restrict access to user-owned data via `auth.uid() = user_id`.
- **Content Validation**: File uploads are capped at 10MB and checked for PDF mime-type. Scanned image PDFs are properly flagged for OCR.

---

## 👥 Team Collaboration

- **Frontend Development**: Landing page, dashboard, study studio, quiz interface, flashcards, responsive CSS.
- **Backend & Database**: Express REST API, Supabase PostgreSQL schema, RLS policies, authentication middleware.
- **AI & Intelligence Engine**: Gemini3.5 Flash API prompt engineering, adaptive mastery formula, knowledge gap detection, analytics.

---

## 📜 License
This project is licensed under the MIT License.

