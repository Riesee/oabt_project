package middleware

import (
	"backend/internal/database"
	"context"
	"net/http"
)

// RequirePro middleware ensures the user has a 'pro' role or is_premium is true
func RequirePro(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := r.Context().Value("userID").(string)
		if !ok || userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var role string
		var isPremium bool

		err := database.DB.QueryRow("SELECT role, is_premium FROM users WHERE id=$1", userID).Scan(&role, &isPremium)
		if err != nil {
			http.Error(w, "User lookup failed", http.StatusInternalServerError)
			return
		}

		if role != "pro" && !isPremium && role != "admin" {
			http.Error(w, "Pro subscription required", http.StatusForbidden)
			return
		}

		next(w, r)
	}
}

// RequireTokens middleware ensures the user has at least 'amount' tokens
// Note: This middleware doesn't DEDUCT tokens, it just checks balance.
// To use it, you might need a way to pass the required amount.
// Since standard middleware signature doesn't allow arguments, we usually wrap the handler logic
// or use a higher-order function.
// Here is a higher-order version:
func RequireTokens(amount int, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := r.Context().Value("userID").(string)
		if !ok || userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var tokens int
		err := database.DB.QueryRow("SELECT tokens FROM users WHERE id=$1", userID).Scan(&tokens)
		if err != nil {
			http.Error(w, "User lookup failed", http.StatusInternalServerError)
			return
		}

		if tokens < amount {
			http.Error(w, "Insufficient tokens", http.StatusPaymentRequired)
			return
		}

		// Pass token balance to context if needed?
		ctx := context.WithValue(r.Context(), "userTokens", tokens)
		next(w, r.WithContext(ctx))
	}
}

// RequireAdmin middleware ensures the user has 'admin' role
func RequireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := r.Context().Value("userID").(string)
		if !ok || userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var role string
		err := database.DB.QueryRow("SELECT role FROM users WHERE id=$1", userID).Scan(&role)
		if err != nil {
			http.Error(w, "User lookup failed", http.StatusInternalServerError)
			return
		}

		if role != "admin" {
			http.Error(w, "Admin access required", http.StatusForbidden)
			return
		}

		next(w, r)
	}
}
