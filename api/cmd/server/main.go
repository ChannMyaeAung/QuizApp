package main

// _ to register the driver without direct use
// Gorilla Mux for routing
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
	// Connect to the database
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

	// Setup router & Pass queries to our API handlers so they can use it
	r := mux.NewRouter()
	httphandlers.RegisterRoutes(r, queries)

	port := os.Getenv("PORT")
	if port == ""{
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))

}

