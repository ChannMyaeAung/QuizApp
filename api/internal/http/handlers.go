package http

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/ChannMyaeAung/QuizApp/internal/auth"
	"github.com/ChannMyaeAung/QuizApp/internal/db"
	"github.com/gorilla/mux"
)

func RegisterRoutes(r *mux.Router, q *db.Queries){
	r.HandleFunc("/login", login(q)).Methods("POST")
	r.HandleFunc("/cards", createCard(q)).Methods("POST")
	r.HandleFunc("/cards", listCards(q)).Methods("GET")
	r.HandleFunc("/quizzes", startQuiz(q)).Methods("POST")
	r.HandleFunc("/quizzes/{id}/answer", submitAnswer(q)).Methods("POST")
	r.HandleFunc("/quizzes/{id}", getQuiz(q)).Methods("GET")
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
			http.Error(w, "invalid credentials", 401)
			return
		}

		user, err := q.GetUserByEmail(r.Context(), in.Email)
		if err != sql.ErrNoRows {
			http.Error(w, "invalid credentials", 401)
			return 
		}else if err != nil{
			http.Error(w, err.Error(), 500)
			return 
		}

		// TODO: verify password hash here 
		token, err := auth.Generate(user.ID)
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
            WrongAnswers: wrongJSON,
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
		tx, err := q.DB().BeginTx(r.Context(), nil)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return 
		}
		defer tx.Rollback()
	}
}