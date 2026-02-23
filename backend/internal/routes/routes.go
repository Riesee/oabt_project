package routes

import (
	"backend/internal/database"
	"backend/internal/handlers"
	"backend/internal/middleware"
	"fmt"
	"net/http"
)

func RegisterRoutes() *http.ServeMux {
	mux := http.NewServeMux()

	// CORS and Logging Middleware
	wrap := func(h http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			middleware.EnableCors(&w)
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			h(w, r)
		}
	}

	mux.HandleFunc("/", wrap(func(w http.ResponseWriter, r *http.Request) {
		var testCount, questionCount int
		database.DB.QueryRow("SELECT COUNT(*) FROM tests").Scan(&testCount)
		database.DB.QueryRow("SELECT COUNT(*) FROM questions").Scan(&questionCount)
		fmt.Fprintf(w, "OABT Backend Running (UUID v7)\nDatabase Stats:\n- Total Tests: %d\n- Total Questions: %d\n\nTo perform a fresh sync, visit /api/v1/debug/sync-public?clean=true", testCount, questionCount)
	}))

	mux.HandleFunc("/register", wrap(handlers.RegisterHandler))
	mux.HandleFunc("/auth/social-login", wrap(handlers.SocialLoginHandler))
	mux.HandleFunc("/user/", wrap(handlers.GetUserHandler))
	mux.HandleFunc("/user/update", wrap(middleware.AuthMiddleware(handlers.UpdateUserHandler)))
	mux.HandleFunc("/user/history/", wrap(handlers.GetHistoryHandler))
	mux.HandleFunc("/tests", wrap(handlers.GetTestsHandler))
	mux.HandleFunc("/test/", wrap(handlers.GetTestQuestionsHandler))
	mux.HandleFunc("/submit-test", wrap(middleware.AuthMiddleware(handlers.SubmitTestHandler)))
	mux.HandleFunc("/leaderboard", wrap(handlers.GetLeaderboardHandler))
	mux.HandleFunc("/subjects", wrap(handlers.GetSubjectsHandler))
	mux.HandleFunc("/questions", wrap(handlers.GetQuestionsHandler))
	mux.HandleFunc("/api/v1/user/reward", wrap(middleware.AuthMiddleware(handlers.RewardHandler)))
	mux.HandleFunc("/api/v1/user/spend-tokens", wrap(middleware.AuthMiddleware(handlers.SpendTokensHandler)))

	// Admin Routes (Protected)
	mux.HandleFunc("/api/v1/admin/questions", wrap(middleware.AuthMiddleware(middleware.RequireAdmin(handlers.CreateQuestionHandler))))
	mux.HandleFunc("/api/v1/admin/questions/bulk", wrap(middleware.AuthMiddleware(middleware.RequireAdmin(handlers.BulkCreateQuestionsHandler))))
	mux.HandleFunc("/api/v1/admin/questions/", wrap(middleware.AuthMiddleware(middleware.RequireAdmin(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			handlers.UpdateQuestionHandler(w, r)
		} else if r.Method == http.MethodDelete {
			handlers.DeleteQuestionHandler(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))))
	mux.HandleFunc("/api/v1/admin/sync", wrap(middleware.AuthMiddleware(middleware.RequireAdmin(handlers.SyncQuestionsHandler))))
	mux.HandleFunc("/api/v1/debug/db-stats", wrap(handlers.DBStatsHandler))
	mux.HandleFunc("/api/v1/debug/sync-public", wrap(handlers.SyncQuestionsHandler))

	return mux
}
