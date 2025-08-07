package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	db "github.com/ChannMyaeAung/QuizApp/internal/db"
	httphandlers "github.com/ChannMyaeAung/QuizApp/internal/http"
	_ "github.com/go-sql-driver/mysql"
	"github.com/gorilla/mux"
)

func main(){
	dsn := os.Getenv("DB_DSN")
	if dsn == ""{
		log.Fatal("DB_DSN environment variable is required")
	}
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

	// Create queries instance
	queries := db.New(database)

	// Setup router
	r := mux.NewRouter()
	httphandlers.RegisterRoutes(r, queries)

	// Add CORS middleware
	r.Use(func(next http.Handler) http.Handler{
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request){
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

			if r.Method == "OPTIONS"{
				w.WriteHeader(http.StatusOK)
				return 
			}

			next.ServeHTTP(w, r)
		})
	})

	port := os.Getenv("PORT")
	if port == ""{
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))

}

