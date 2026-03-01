package handlers

import (
	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/models"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != "POST" {
		return
	}

	var payload struct {
		Nickname string `json:"nickname"`
		Emoji    string `json:"emoji"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var existingID string
	err := database.DB.QueryRow("SELECT id FROM users WHERE nickname=$1", payload.Nickname).Scan(&existingID)
	if err == nil {
		token, _ := middleware.GenerateToken(existingID)
		refreshToken, _ := middleware.GenerateRefreshToken(existingID)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":            existingID,
			"access_token":  token,
			"refresh_token": refreshToken,
			"token_type":    "Bearer",
			"expires_in":    72 * 3600,
			"message":       "Login successful",
		})
		return
	}

	newID, _ := uuid.NewV7()
	_, err = database.DB.Exec("INSERT INTO users (id, nickname, emoji, streak, last_active_date, level, xp, provider) VALUES ($1, $2, $3, 1, CURRENT_DATE, 1, 0, 'local')",
		newID.String(), payload.Nickname, payload.Emoji)

	if err != nil {
		http.Error(w, "Error creating user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	token, _ := middleware.GenerateToken(newID.String())
	refreshToken, _ := middleware.GenerateRefreshToken(newID.String())
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":            newID.String(),
		"access_token":  token,
		"refresh_token": refreshToken,
		"token_type":    "Bearer",
		"expires_in":    72 * 3600,
		"message":       "Registered successfully",
	})
}

func GetUserHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	idStr := strings.TrimPrefix(r.URL.Path, "/user/")
	var u models.User
	err := database.DB.QueryRow(`
		SELECT id, nickname, emoji, streak, COALESCE(last_active_date::text, ''), total_score, level, xp, 
		COALESCE(email, ''), COALESCE(google_id, ''), COALESCE(apple_id, ''), provider 
		FROM users WHERE id=$1`, idStr).
		Scan(&u.ID, &u.Nickname, &u.Emoji, &u.Streak, &u.LastActiveDate, &u.TotalScore, &u.Level, &u.XP,
			&u.Email, &u.GoogleID, &u.AppleID, &u.Provider)

	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(u)
}

func GetHistoryHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	parts := strings.Split(r.URL.Path, "/")
	userID := parts[len(parts)-1]
	rows, err := database.DB.Query(`
		SELECT r.score, TO_CHAR(r.completed_at, 'YYYY-MM-DD HH24:MI'), t.title 
		FROM test_results r 
		JOIN tests t ON r.test_id = t.id 
		WHERE r.user_id = $1 
		ORDER BY r.completed_at DESC
	`, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type HistoryEntry struct {
		Title string `json:"title"`
		Score int    `json:"score"`
		Date  string `json:"date"`
	}
	var history []HistoryEntry = []HistoryEntry{}
	for rows.Next() {
		var h HistoryEntry
		rows.Scan(&h.Score, &h.Date, &h.Title)
		history = append(history, h)
	}
	json.NewEncoder(w).Encode(history)
}

func UpdateUserHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != "POST" {
		return
	}

	userID, _ := r.Context().Value("userID").(string)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var payload struct {
		Nickname string `json:"nickname"`
		Emoji    string `json:"emoji"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Check if nickname is taken by someone else
	var conflictID string
	err := database.DB.QueryRow("SELECT id FROM users WHERE nickname=$1 AND id != $2", payload.Nickname, userID).Scan(&conflictID)
	if err == nil {
		http.Error(w, "Nickname already taken", http.StatusConflict)
		return
	}

	_, err = database.DB.Exec("UPDATE users SET nickname=$1, emoji=$2 WHERE id=$3", payload.Nickname, payload.Emoji, userID)
	if err != nil {
		http.Error(w, "Error updating user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func SocialLoginHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != "POST" {
		return
	}

	var payload struct {
		Email    string `json:"email"`
		Nickname string `json:"nickname"`
		Emoji    string `json:"emoji"`
		OauthID  string `json:"oauth_id"`
		Provider string `json:"provider"` // "google" or "apple"
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	isNewUser := false
	var userID string
	var err error

	// Search by Provider ID first
	query := "SELECT id FROM users WHERE google_id = $1 OR apple_id = $1"
	if payload.Provider == "google" {
		query = "SELECT id FROM users WHERE google_id = $1"
	} else if payload.Provider == "apple" {
		query = "SELECT id FROM users WHERE apple_id = $1"
	}
	err = database.DB.QueryRow(query, payload.OauthID).Scan(&userID)

	if err != nil {
		// Not found by ID, try email (case-insensitive)
		err = database.DB.QueryRow("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", payload.Email).Scan(&userID)
		if err == nil {
			// Found by email, link the provider ID
			updateQuery := "UPDATE users SET " + payload.Provider + "_id = $1, provider = $2 WHERE id = $3"
			database.DB.Exec(updateQuery, payload.OauthID, payload.Provider, userID)
		} else {
			// New User
			newID, _ := uuid.NewV7()
			userID = newID.String()
			isNewUser = true
			// Use OauthID as temporary nickname to satisfy UNIQUE constraint
			safeOauthID := payload.OauthID
			if len(safeOauthID) > 8 {
				safeOauthID = safeOauthID[:8]
			}
			tempNickname := "user_" + safeOauthID + "_" + uuid.NewString()[:4]
			insertQuery := "INSERT INTO users (id, nickname, emoji, email, " + payload.Provider + "_id, provider, streak, last_active_date) VALUES ($1, $2, $3, $4, $5, $6, 1, CURRENT_DATE)"
			_, err = database.DB.Exec(insertQuery, userID, tempNickname, payload.Emoji, payload.Email, payload.OauthID, payload.Provider)
			if err != nil {

				http.Error(w, "Error creating user", http.StatusInternalServerError)
				return
			}
		}
	}

	// Double check if nickname is still temporary or empty
	var nick string
	err = database.DB.QueryRow("SELECT nickname FROM users WHERE id = $1", userID).Scan(&nick)
	if err == nil {
		if nick == "" || strings.HasPrefix(nick, "user_") {
			isNewUser = true
		}
	}

	token, _ := middleware.GenerateToken(userID)
	refreshToken, _ := middleware.GenerateRefreshToken(userID)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":            userID,
		"access_token":  token,
		"refresh_token": refreshToken,
		"token_type":    "Bearer",
		"expires_in":    72 * 3600,
		"is_new_user":   isNewUser,
		"message":       "Social login successful",
	})
}
