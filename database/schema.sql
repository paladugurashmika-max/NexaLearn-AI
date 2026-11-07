-- ====================================================================
-- NexaLearn AI - Database Schema for Supabase PostgreSQL
-- Platform: AI-Powered Personalized & Adaptive Learning Platform
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. Profiles (Linked to Supabase Auth)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    study_streak INT DEFAULT 1,
    points INT DEFAULT 100,
    current_grade_level TEXT DEFAULT 'Undergraduate',
    last_active_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, study_streak, points)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        1,
        100
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------------------
-- 2. Notes (AI Study Studio)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    original_content TEXT,
    summary TEXT,
    structured_notes JSONB DEFAULT '[]'::jsonb,
    definitions JSONB DEFAULT '[]'::jsonb,
    key_points JSONB DEFAULT '[]'::jsonb,
    difficulty_level TEXT DEFAULT 'intermediate',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_subject_topic ON public.notes(subject, topic);

-- --------------------------------------------------------------------
-- 3. Conversations & Messages (Ask StudyAI)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    subject TEXT DEFAULT 'General Studies',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    difficulty_level TEXT DEFAULT 'intermediate',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);

-- --------------------------------------------------------------------
-- 4. Quizzes & Questions (Smart Practice Zone)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    difficulty TEXT DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    total_questions INT DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON public.quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_topic ON public.quizzes(topic);

CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of 4 string options
    correct_answer TEXT NOT NULL, -- Stored securely; only returned upon score calculation
    explanation TEXT,
    topic TEXT,
    difficulty TEXT DEFAULT 'intermediate',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);

-- --------------------------------------------------------------------
-- 5. Quiz Attempts & Answers
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INT NOT NULL,
    total_questions INT NOT NULL,
    percentage NUMERIC(5,2) NOT NULL,
    passed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);

CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    selected_option TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_answers_attempt_id ON public.answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_answers_user_id ON public.answers(user_id);

-- --------------------------------------------------------------------
-- 6. Topic Mastery (Adaptive Learning Engine)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.topic_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    mastery_score NUMERIC(5,2) DEFAULT 0.00, -- 0.00 to 100.00
    total_attempts INT DEFAULT 0,
    total_correct INT DEFAULT 0,
    total_questions INT DEFAULT 0,
    status TEXT DEFAULT 'weak' CHECK (status IN ('weak', 'moderate', 'strong')),
    last_assessed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_subject_topic UNIQUE (user_id, subject, topic)
);

CREATE INDEX IF NOT EXISTS idx_topic_mastery_user ON public.topic_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_status ON public.topic_mastery(user_id, status);

-- --------------------------------------------------------------------
-- 7. Flashcards
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    mastery_level TEXT DEFAULT 'learning' CHECK (mastery_level IN ('learning', 'reviewing', 'mastered')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic ON public.flashcards(topic);

-- --------------------------------------------------------------------
-- 8. AI Study Planner
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    plan_type TEXT DEFAULT 'daily' CHECK (plan_type IN ('daily', 'weekly')),
    goals JSONB DEFAULT '[]'::jsonb,
    generated_by_ai BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON public.study_plans(user_id);

CREATE TABLE IF NOT EXISTS public.study_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT,
    topic TEXT,
    duration_minutes INT DEFAULT 30,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    is_completed BOOLEAN DEFAULT false,
    due_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_tasks_plan_id ON public.study_tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_study_tasks_user_id ON public.study_tasks(user_id);

-- --------------------------------------------------------------------
-- 9. Gamification & Achievements
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    points INT DEFAULT 50,
    condition_type TEXT NOT NULL,
    condition_threshold INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.student_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_achievement UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_student_achievements_user ON public.student_achievements(user_id);

-- Seed default achievements
INSERT INTO public.achievements (code, title, description, icon, points, condition_type, condition_threshold)
VALUES
    ('FIRST_STEP', 'First Steps', 'Completed your first assessment quiz', 'footprints', 50, 'quiz_count', 1),
    ('QUICK_LEARNER', 'Quick Learner', 'Achieved an 80%+ score on any quiz', 'zap', 75, 'quiz_score', 80),
    ('CONSISTENCY_CHAMP', 'Consistency Champion', 'Maintained a 3-day study streak', 'flame', 100, 'streak', 3),
    ('TOPIC_MASTER', 'Topic Master', 'Achieved 85%+ mastery in a subject topic', 'award', 150, 'mastery', 85),
    ('KNOWLEDGE_EXPLORER', 'Knowledge Explorer', 'Generated 5 or more study notes', 'compass', 100, 'notes_count', 5),
    ('PRACTICE_PRO', 'Practice Pro', 'Completed 10 practice quizzes', 'target', 200, 'quiz_count', 10),
    ('FLASHCARD_WIZARD', 'Flashcard Wizard', 'Reviewed and mastered 15 flashcards', 'layers', 100, 'flashcards_mastered', 15)
ON CONFLICT (code) DO NOTHING;

-- --------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Notes: Users manage their own notes
CREATE POLICY "Users can manage notes" ON public.notes FOR ALL USING (auth.uid() = user_id);

-- Conversations & Messages
CREATE POLICY "Users can manage conversations" ON public.conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage messages" ON public.messages FOR ALL USING (auth.uid() = user_id);

-- Quizzes: Users manage their quizzes
CREATE POLICY "Users can manage quizzes" ON public.quizzes FOR ALL USING (auth.uid() = user_id);

-- Questions: Accessible by owner of the quiz
CREATE POLICY "Users can view own quiz questions" ON public.questions FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid()));
CREATE POLICY "Users can manage own quiz questions" ON public.questions FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid()));

-- Quiz Attempts & Answers
CREATE POLICY "Users can manage quiz attempts" ON public.quiz_attempts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage answers" ON public.answers FOR ALL USING (auth.uid() = user_id);

-- Topic Mastery
CREATE POLICY "Users can manage topic mastery" ON public.topic_mastery FOR ALL USING (auth.uid() = user_id);

-- Flashcards
CREATE POLICY "Users can manage flashcards" ON public.flashcards FOR ALL USING (auth.uid() = user_id);

-- Study Plans & Tasks
CREATE POLICY "Users can manage study plans" ON public.study_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage study tasks" ON public.study_tasks FOR ALL USING (auth.uid() = user_id);

-- Achievements: All authenticated users can view achievements list
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view own unlocked achievements" ON public.student_achievements FOR ALL USING (auth.uid() = user_id);

