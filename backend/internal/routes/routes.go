package routes

import (
	"backend/internal/handlers"
	"backend/internal/middleware"
	"fmt"
	"log"
	"net/http"
)

func RegisterRoutes() *http.ServeMux {
	mux := http.NewServeMux()

	// Logging Middleware
	logger := func(h http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			log.Printf("DEBUG: Incoming Request: %s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)
			h(w, r)
		}
	}

	mux.HandleFunc("/", logger(func(w http.ResponseWriter, r *http.Request) {
		middleware.EnableCors(&w)
		fmt.Fprintf(w, "OABT Backend Running (UUID v7)")
	}))

	mux.HandleFunc("/register", logger(handlers.RegisterHandler))
	mux.HandleFunc("/auth/social-login", logger(handlers.SocialLoginHandler))
	mux.HandleFunc("/user/", logger(handlers.GetUserHandler))
	mux.HandleFunc("/user/update", logger(middleware.AuthMiddleware(handlers.UpdateUserHandler)))
	mux.HandleFunc("/user/history/", logger(handlers.GetHistoryHandler))
	mux.HandleFunc("/tests", logger(handlers.GetTestsHandler))
	mux.HandleFunc("/test/", logger(handlers.GetTestQuestionsHandler))
	mux.HandleFunc("/submit-test", logger(middleware.AuthMiddleware(handlers.SubmitTestHandler)))
	mux.HandleFunc("/leaderboard", logger(handlers.GetLeaderboardHandler))
	mux.HandleFunc("/subjects", logger(handlers.GetSubjectsHandler))

	return mux
}
