package handlers

import (
	"backend/internal/middleware"
	"encoding/json"
	"net/http"
)

func RefreshTokenHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	if r.Method != "POST" {
		return
	}

	var requestBody struct {
		RefreshToken string `json:"refresh_token"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate refresh token
	claims, err := middleware.ValidateToken(requestBody.RefreshToken)
	if err != nil {
		http.Error(w, "Invalid or expired refresh token", http.StatusUnauthorized)
		return
	}

	// Generate new access token
	newToken, err := middleware.GenerateToken(claims.UserID)
	if err != nil {
		http.Error(w, "Failed to generate new token", http.StatusInternalServerError)
		return
	}

	// Generate new refresh token
	newRefreshToken, err := middleware.GenerateRefreshToken(claims.UserID)
	if err != nil {
		http.Error(w, "Failed to generate refresh token", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"access_token":  newToken,
		"refresh_token": newRefreshToken,
		"token_type":    "Bearer",
		"expires_in":    72 * 3600, // 72 hours in seconds
	})
}
