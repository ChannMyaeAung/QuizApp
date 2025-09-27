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
	"github.com/ChannMyaeAung/QuizApp/internal/migration"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main(){
    // Load .env file from project root (1 level up from api directory)
    err := godotenv.Load("../../../.env")
    if err != nil{
        log.Printf("Warning: Could not load .env file: %v", err)
        log.Println("Continuing with existing environment variables...")
    }
    
    // Check for DATABASE_URL first (Render's preferred method)
    databaseURL := os.Getenv("DATABASE_URL")
    
    var dsn string
    if databaseURL != "" {
        dsn = databaseURL
        log.Printf("Using DATABASE_URL connection")
    } else {
        // Fallback to individual PostgreSQL environment variables
        host := os.Getenv("PGHOST")
        port := os.Getenv("PGPORT")
        user := os.Getenv("PGUSER")
        pass := os.Getenv("PGPASSWORD")
        name := os.Getenv("PGDATABASE")
        
        // Check if all PostgreSQL variables are present
        if host == "" || port == "" || user == "" || pass == "" || name == "" {
            log.Printf("PostgreSQL environment variables:")
            log.Printf("PGHOST: %s", host)
            log.Printf("PGPORT: %s", port)
            log.Printf("PGUSER: %s", user)
            log.Printf("PGPASSWORD: %s", func() string {
                if pass == "" {
                    return "(empty)"
                }
                return "(set)"
            }())
            log.Printf("PGDATABASE: %s", name)
            log.Fatal("Missing required PostgreSQL environment variables. Need: DATABASE_URL or (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE)")
        }
        
        // Build PostgreSQL DSN
        dsn = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=require",
            host, port, user, pass, name)
        
        log.Printf("Connecting to database at %s:%s", host, port)
    }
    
    database, err := sql.Open("postgres", dsn)
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

    // Run migrations using the migration package
    log.Println("Running database migrations...")
    if err := migration.RunMigrations(database); err != nil {
        log.Fatalf("Failed to run migrations: %v", err)
    }
    log.Println("Database migrations completed successfully")

    // Create queries instance
    queries := db.New(database)

    // Setup router
    r := mux.NewRouter()
    httphandlers.RegisterRoutes(r, queries)

    port := os.Getenv("PORT")
    if port == ""{
        port = "8080"
    }

    log.Printf("Server starting on port %s", port)
    log.Fatal(http.ListenAndServe(":"+port, r))
}