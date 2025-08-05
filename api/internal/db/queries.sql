-- name: CreateUser :exec 
INSERT INTO users(email, password_hash) VALUES (?, ?);

-- name: GetUserByEmail :one 
SELECT id, password_hash FROM users WHERE email = ?; 

-- name: CreateCard :exec 
INSERT INTO cards(question, correct_answer, wrong_answers) VALUES (?, ?, ?);

-- name: ListCards :many 
SELECT id, question, correct_answer, wrong_answers FROM cards ORDER BY id DESC LIMIT 100; 

-- name: StartQuiz :exec 
INSERT INTO quizzes(user_id) VALUES (?);

-- name: SelectRandomCards :many 
SELECT id FROM cards ORDER BY RAND() LIMIT ?;

-- name: AddQuizQuestion :exec 
INSERT INTO quiz_questions(quiz_id, card_id, position) VALUES (?, ?, ?); ADD

-- name: GetCorrectAnswer :one 
SELECT correct_answer FROM cards WHERE id = ?;

-- name: RecordAnswer :exec 
INSERT INTO quiz_answers(quiz_id, card_id, answer_text, is_correct) VALUES (?, ?, ?, ?);

-- name: UpdateScore :exec 
UPDATE quizzes SET score = score + 1 WHERE id = ?; 

-- name: GetQuiz :one 
SELECT user_id, score, started_at, finished_at FROM
quizzes WHERE id = ?;

-- name: ListQuizQuestions :many 
SELECT card_id, position FROM quiz_questions WHERE quiz_id = ? ORDER BY position;