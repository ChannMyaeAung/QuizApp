-- Initial schema for PostgreSQL
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cards(
    id BIGSERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    correct_answer VARCHAR(255) NOT NULL,
    wrong_answers JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quizzes(
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL,
    score INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE 
);

CREATE TABLE IF NOT EXISTS quiz_questions(
    id BIGSERIAL PRIMARY KEY,
    quiz_id BIGINT NOT NULL,
    card_id BIGINT NOT NULL,
    position INT NOT NULL,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE RESTRICT,
    UNIQUE (quiz_id, position)
);

CREATE TABLE IF NOT EXISTS quiz_answers(
    id BIGSERIAL PRIMARY KEY,
    quiz_id BIGINT NOT NULL,
    card_id BIGINT NOT NULL,
    answer_text VARCHAR(255) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE RESTRICT 
);

-- Insert sample data
INSERT INTO users (email, password_hash) VALUES ('test@example.com', 'dummy') ON CONFLICT (email) DO NOTHING;

INSERT INTO cards (question, correct_answer, wrong_answers) VALUES 
('What is 2+2?', '4', '["3", "5", "6"]'),
('Capital of France?', 'Paris', '["London", "Berlin", "Madrid"]'),
('How many continents are there?', '7', '["5", "6", "8"]'),
('What is the largest planet?', 'Jupiter', '["Saturn", "Earth", "Mars"]'),
('Who painted the Mona Lisa?', 'Leonardo da Vinci', '["Michelangelo", "Pablo Picasso", "Vincent van Gogh"]')
ON CONFLICT DO NOTHING;