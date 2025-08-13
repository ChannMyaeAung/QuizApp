package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	db "github.com/ChannMyaeAung/QuizApp/internal/db"
	httphandlers "github.com/ChannMyaeAung/QuizApp/internal/http"
	_ "github.com/go-sql-driver/mysql"
	"github.com/gorilla/mux"
)

func runMigrations(database *sql.DB) error {
    migrationSQL := `
    CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARBINARY(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB; 

    CREATE TABLE IF NOT EXISTS cards(
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        correct_answer VARCHAR(255) NOT NULL,
        wrong_answers JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB; 

    CREATE TABLE IF NOT EXISTS quizzes(
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP NULL,
        score INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE 
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS quiz_questions(
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        quiz_id BIGINT UNSIGNED NOT NULL,
        card_id BIGINT UNSIGNED NOT NULL,
        position INT NOT NULL,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
        FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE RESTRICT,
        UNIQUE KEY uq_quiz_card (quiz_id, position)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS quiz_answers(
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        quiz_id BIGINT UNSIGNED NOT NULL,
        card_id BIGINT UNSIGNED NOT NULL,
        answer_text VARCHAR(255) NOT NULL,
        is_correct BOOLEAN NOT NULL,
        answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
        FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE RESTRICT 
    ) ENGINE=InnoDB;

    INSERT IGNORE INTO users (email, password_hash) VALUES ('test@example.com', 'dummy');

    INSERT IGNORE INTO cards (question, correct_answer, wrong_answers) VALUES 
    ('What is 2+2?', '4', '["3", "5", "6"]'),
    ('Capital of France?', 'Paris', '["London", "Berlin", "Madrid"]'),
    ('How many continents are there?', '7', '["5", "6", "8"]'),
    ('What is the largest planet?', 'Jupiter', '["Saturn", "Earth", "Mars"]'),
    ('Who painted the Mona Lisa?', 'Leonardo da Vinci', '["Michelangelo", "Pablo Picasso", "Vincent van Gogh"]');
    `

    _, err := database.Exec(migrationSQL)
    return err
}

func main(){
    // Build connection string from Railway environment variables
    host := os.Getenv("MYSQLHOST")
    port := os.Getenv("MYSQLPORT")
    user := os.Getenv("MYSQLUSER")
    pass := os.Getenv("MYSQLPASSWORD")
    name := os.Getenv("MYSQLDATABASE")
    
    // Check if all MySQL variables are present
    if host == "" || port == "" || user == "" || pass == "" || name == "" {
        log.Printf("MySQL environment variables:")
        log.Printf("MYSQLHOST: %s", host)
        log.Printf("MYSQLPORT: %s", port)
        log.Printf("MYSQLUSER: %s", user)
        log.Printf("MYSQLPASSWORD: %s", func() string {
            if pass == "" {
                return "(empty)"
            }
            return "(set)"
        }())
        log.Printf("MYSQLDATABASE: %s", name)
        log.Fatal("Missing required MySQL environment variables. Need: MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE")
    }
    
    // Build DSN
    dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&multiStatements=true&charset=utf8mb4",
        user, pass, host, port, name)
    
    log.Printf("Connecting to database at %s:%s", host, port)
    
    database, err := sql.Open("mysql", dsn)
    if err != nil {
        log.Fatalf("Error opening database: %v", err)
    }
    defer database.Close()

    // Retry database connection with backoff
    for i := 0; i < 30; i++{
        ctx, cancel := context.WithTimeout(context.Background(), 5 * time.Second)
        err = database.PingContext(ctx)
        cancel()

        if err == nil {
            break 
        }

        log.Printf("Database connection attempt %d failed: %v", i+1, err)
        time.Sleep(2 * time.Second)
    }

    if err != nil{
        log.Fatalf("Failed to connect to database after 30 attempts: %v", err)
    }

    log.Println("Database connected successfully")

    // Run migrations
    log.Println("Running database migrations...")
    if err := runMigrations(database); err != nil {
        log.Fatalf("Failed to run migrations: %v", err)
    }
    log.Println("Database migrations completed successfully")

    // Create queries instance
    queries := db.New(database)

    // Setup router
    r := mux.NewRouter()
    httphandlers.RegisterRoutes(r, queries)

    port = os.Getenv("PORT")
    if port == ""{
        port = "8080"
    }

    log.Printf("Server starting on port %s", port)
    log.Fatal(http.ListenAndServe(":"+port, r))
}