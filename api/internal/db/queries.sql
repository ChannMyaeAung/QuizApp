-- name: CreateUser :exec 
INSERT INTO users(email, password_hash) VALUES ($1, $2);

-- name: GetUserByEmail :one 
SELECT id, password_hash FROM users WHERE email = $1; 

-- name: CreateCard :exec 
INSERT INTO cards(question, correct_answer, wrong_answers) VALUES ($1, $2, $3);

-- name: ListCards :many 
SELECT id, question, correct_answer, wrong_answers FROM cards ORDER BY id DESC LIMIT 100; 

-- name: StartQuiz :one
INSERT INTO quizzes(user_id) VALUES ($1) RETURNING id;

-- name: SelectRandomCards :many 
SELECT id FROM cards ORDER BY RANDOM() LIMIT $1;

-- name: AddQuizQuestion :exec 
INSERT INTO quiz_questions(quiz_id, card_id, position) VALUES ($1, $2, $3); 

-- name: GetCorrectAnswer :one 
SELECT correct_answer FROM cards WHERE id = $1;

-- name: RecordAnswer :exec 
INSERT INTO quiz_answers(quiz_id, card_id, answer_text, is_correct) VALUES ($1, $2, $3, $4);

-- name: UpdateScore :exec 
UPDATE quizzes SET score = score + 1 WHERE id = $1; 

-- name: GetQuiz :one 
SELECT user_id, score, started_at, finished_at FROM quizzes WHERE id = $1;

-- name: DeleteCard :exec
DELETE FROM cards WHERE id = $1;

-- name: ListQuizQuestions :many 
SELECT card_id, position FROM quiz_questions WHERE quiz_id = $1 ORDER BY position;