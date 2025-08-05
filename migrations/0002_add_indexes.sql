ALTER TABLE quiz_answers ADD INDEX idx_quiz_answers_quiz_id (quiz_id);

ALTER TABLE quiz_questions ADD INDEX idx_quiz_questions_quiz_id (quiz_id);