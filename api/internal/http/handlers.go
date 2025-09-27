package http

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/ChannMyaeAung/QuizApp/internal/auth"
	"github.com/ChannMyaeAung/QuizApp/internal/db"
	"github.com/gorilla/mux"
)

// Add CORS middleware
func corsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        
        // Handle preflight requests
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }
        
        next.ServeHTTP(w, r)
    })
}

func RegisterRoutes(r *mux.Router, q *db.Queries){
    // Apply CORS middleware to all routes
    r.Use(corsMiddleware)


	r.HandleFunc("/login", login(q)).Methods("POST", "OPTIONS")
    r.HandleFunc("/cards", createCard(q)).Methods("POST", "OPTIONS")
    r.HandleFunc("/cards", listCards(q)).Methods("GET", "OPTIONS")
    r.HandleFunc("/cards/{id}", deleteCard(q)).Methods("DELETE", "OPTIONS")
    r.HandleFunc("/quizzes", startQuiz(q)).Methods("POST", "OPTIONS")
    r.HandleFunc("/quizzes/{id}/answer", submitAnswer(q)).Methods("POST", "OPTIONS")
    r.HandleFunc("/quizzes/{id}", getQuiz(q)).Methods("GET", "OPTIONS")
}

func writeJSON(w http.ResponseWriter, v interface{}){
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func login(q *db.Queries) http.HandlerFunc{
    type req struct{
        Email string `json:"email"`
        Password string `json:"password"`
    }

    type resp struct{
        Token string `json:"token"`
    }

    return func(w http.ResponseWriter, r *http.Request){
        var in req 
        if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
            http.Error(w, "invalid credentials", http.StatusUnauthorized)
            return
        }

        user, err := q.GetUserByEmail(r.Context(), in.Email)
        if err == sql.ErrNoRows {  
            http.Error(w, "invalid credentials", http.StatusUnauthorized)
            return
        } else if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        // TODO: verify password hash here 
        token, err := auth.Generate(uint64(user.ID))
        if err != nil {
            http.Error(w, err.Error(), 500)
            return 
        }
        writeJSON(w, resp{Token: token})
    }
}

func createCard(q *db.Queries) http.HandlerFunc{
    type in struct{
        Question string `json:"question"`
        CorrectAnswer string `json:"correct_answer"`
        WrongAnswers []string `json:"wrong_answers"`
    }

    type out struct{
        Message string `json:"message"`
    }

    return func(w http.ResponseWriter, r *http.Request){
        var ci in 
        if err := json.NewDecoder(r.Body).Decode(&ci); err != nil{
            http.Error(w, err.Error(), 400)
            return 
        }
        wrongJSON, _ := json.Marshal(ci.WrongAnswers)
        err := q.CreateCard(r.Context(), db.CreateCardParams{
            Question: ci.Question,
            CorrectAnswer: ci.CorrectAnswer,
            WrongAnswers: json.RawMessage(wrongJSON),
        })
        if err != nil {
            http.Error(w, err.Error(), 500)
            return
        }
        writeJSON(w, out{Message: "Card created successfully"})
    }
}


func listCards(q *db.Queries) http.HandlerFunc{
	type card struct{
		ID int64 `json:"id"`
		Question string `json:"question"`
		CorrectAnswer string `json:"correct_answer"`
		WrongAnswers json.RawMessage `json:"wrong_answers"`
	}

	return func(w http.ResponseWriter, r *http.Request){
		rows, err := q.ListCards(r.Context())
		if err != nil {
			http.Error(w, err.Error(), 500)
			return 
		}
		var out []card
		for _, row := range rows{
			out = append(out, card{
				ID: int64(row.ID),
				Question: row.Question,
				CorrectAnswer: row.CorrectAnswer,
				WrongAnswers: json.RawMessage(row.WrongAnswers),
			})
		}
		writeJSON(w, out)
	}
}

func startQuiz(q *db.Queries) http.HandlerFunc{
    type in struct{
        UserID int64 `json:"user_id"`
        NumQuestions int32 `json:"num_questions"`
    }
    type out struct{
        QuizID int64 `json:"quiz_id"`
    }
    return func(w http.ResponseWriter, r *http.Request){
        var si in 
        if err := json.NewDecoder(r.Body).Decode(&si); err != nil{
            http.Error(w, err.Error(), 400)
            return 
        }

        // Default to 10 questions if not specified
        if si.NumQuestions == 0 {
            si.NumQuestions = 10
        }

        // Start the quiz
        quizID, err := q.StartQuiz(r.Context(), int64(si.UserID))
        if err != nil {
            http.Error(w, err.Error(), 500)
            return 
        }

        // Select random cards
        cardIDs, err := q.SelectRandomCards(r.Context(), si.NumQuestions)
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        // Add quiz questions
        for i, cardID := range cardIDs {
            err = q.AddQuizQuestion(r.Context(), db.AddQuizQuestionParams{
                QuizID:   int64(quizID),
                CardID:   cardID,
                Position: int32(i + 1),
            })
            if err != nil {
                http.Error(w, err.Error(), 500)
                return 
            }
        }

        writeJSON(w, out{QuizID: quizID})
    }
}

func deleteCard(q *db.Queries) http.HandlerFunc{
    return func(w http.ResponseWriter, r *http.Request){
        vars := mux.Vars(r)
        cardIDStr := vars["id"]
        cardID, err := strconv.ParseInt(cardIDStr, 10, 64)
        if err != nil {
            http.Error(w, "invalid card ID", http.StatusBadRequest)
            return 
        }

        err = q.DeleteCard(r.Context(), int64(cardID))
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return 
        }

        writeJSON(w, map[string]string{"message": "Card deleted successfully"})
    }
}


func submitAnswer(q *db.Queries) http.HandlerFunc{
	type in struct{
		CardID int64 `json:"card_id"`
		AnswerText string `json:"answer_text"`
	}
	type out struct{
		Correct bool `json:"correct"`
	}

	return func(w http.ResponseWriter, r *http.Request){
		quizID, err := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)
		if err != nil {
			http.Error(w, "invalid quiz id", 400)
			return 
		}

		var ai in 
		if err := json.NewDecoder(r.Body).Decode(&ai); err != nil {
			http.Error(w, err.Error(), 400)
			return 
		}

		// fetch correct answer 
		ca, err := q.GetCorrectAnswer(r.Context(), int64(ai.CardID))
		if err != nil {
			http.Error(w, err.Error(), 500)
			return 
		}

		isCorrect := ai.AnswerText == ca 

		// Record the answer
        err = q.RecordAnswer(r.Context(), db.RecordAnswerParams{
            QuizID: int64(quizID),
            CardID: int64(ai.CardID),
            AnswerText: ai.AnswerText,
            IsCorrect: isCorrect,
        })
		if err != nil {
			http.Error(w, err.Error(), 500)
			return 
		}

		// Update score if correct 
		if isCorrect{
			err = q.UpdateScore(r.Context(), int64(quizID))
			if err != nil {
				http.Error(w, err.Error(), 500)
				return
			}
		}
		writeJSON(w, out{Correct: isCorrect})
	}
}

func getQuiz(q *db.Queries) http.HandlerFunc{
	type out struct{
		UserID uint64 `json:"user_id"`
		Score int32 `json:"score"`
		StartedAt string `json:"started_at"`
        FinishedAt *string `json:"finished_at,omitempty"`
		Questions []db.ListQuizQuestionsRow `json:"questions"`
	}

	return func(w http.ResponseWriter, r *http.Request){
		quizID, err := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)
		if err != nil {
			http.Error(w, "invalid quiz id", 400)
			return 
		}

		qz, err := q.GetQuiz(r.Context(), int64(quizID))
		if err != nil{
			http.Error(w, "quiz not found", 404)
			return 
		}

		questions, err := q.ListQuizQuestions(r.Context(), int64(quizID))
		if err != nil {
            http.Error(w, err.Error(), 500)
            return 
        }

        resp := out{
            UserID: uint64(qz.UserID),
            Score: func() int32 {
                if qz.Score.Valid {
                    return qz.Score.Int32
                }
                return 0
            }(),
            StartedAt: qz.StartedAt.Time.Format(time.RFC3339),
            FinishedAt: func() *string{
                if qz.FinishedAt.Valid{
                    s := qz.FinishedAt.Time.Format(time.RFC3339)
                    return &s 
                }
                return nil 
            }(),
            Questions: questions, 
        }
        writeJSON(w, resp)
	}
}