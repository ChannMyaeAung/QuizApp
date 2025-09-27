-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_answers_quiz_id ON quiz_answers (quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions (quiz_id);

-- Add additional useful indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes (user_id);
CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards (created_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);