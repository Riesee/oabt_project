package handlers

import (
	"backend/internal/database"
	"encoding/json"
	"net/http"
)

type RewardRequest struct {
	RewardType string `json:"reward_type"` // e.g. "ad_watch", "daily_login"
}

// RewardHandler grants tokens to the user
func RewardHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req RewardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Security/Limiting logic should go here.
	// For example, verify ad signature or limit daily rewards.
	// For this phase, we'll implement a basic logic:
	// "ad_watch" -> 5 tokens
	// "daily_login" -> 10 tokens (usually handled on login, but can be explicit claim)

	tokensToAdd := 0
	switch req.RewardType {
	case "ad_watch":
		tokensToAdd = 5
	case "daily_login":
		// Check if already claimed today?
		// For simplicity, just give 10
		tokensToAdd = 10
	default:
		http.Error(w, "Invalid reward type", http.StatusBadRequest)
		return
	}

	var newBalance int
	err := database.DB.QueryRow(`
		UPDATE users 
		SET tokens = tokens + $1 
		WHERE id = $2 
		RETURNING tokens`, tokensToAdd, userID).Scan(&newBalance)

	if err != nil {
		http.Error(w, "Database error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"added":       tokensToAdd,
		"new_balance": newBalance,
		"message":     "Reward granted",
	})
}

type SpendRequest struct {
	Amount int    `json:"amount"`
	Reason string `json:"reason"`
}

func SpendTokensHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req SpendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Check if user is premium
	var isPremium bool
	database.DB.QueryRow("SELECT is_premium FROM users WHERE id=$1", userID).Scan(&isPremium)
	if isPremium {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Premium user - no tokens spent",
		})
		return
	}

	// Double check user tokens
	var tokens int
	err := database.DB.QueryRow("SELECT tokens FROM users WHERE id=$1", userID).Scan(&tokens)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	if tokens < req.Amount {
		http.Error(w, "Insufficient tokens", http.StatusPaymentRequired)
		return
	}

	var newBalance int
	err = database.DB.QueryRow(`
		UPDATE users 
		SET tokens = tokens - $1 
		WHERE id = $2 AND tokens >= $1
		RETURNING tokens`, req.Amount, userID).Scan(&newBalance)

	if err != nil {
		http.Error(w, "Insufficient tokens or update error", http.StatusPaymentRequired)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"spent":       req.Amount,
		"new_balance": newBalance,
		"message":     "Tokens deducted successfully",
	})
}
