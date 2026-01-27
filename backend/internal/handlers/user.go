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
		json.NewEncoder(w).Encode(map[string]string{"id": existingID, "message": "Login successful"})
		return
	}

	newID, _ := uuid.NewV7()
	_, err = database.DB.Exec("INSERT INTO users (id, nickname, emoji, streak, last_active_date) VALUES ($1, $2, $3, 1, CURRENT_DATE)",
		newID.String(), payload.Nickname, payload.Emoji)

	if err != nil {
		http.Error(w, "Error creating user: "+err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]string{"id": newID.String(), "message": "Registered successfully"})
}

func GetUserHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	idStr := strings.TrimPrefix(r.URL.Path, "/user/")
	var u models.User
	err := database.DB.QueryRow("SELECT id, nickname, emoji, streak, COALESCE(last_active_date::text, ''), total_score FROM users WHERE id=$1", idStr).
		Scan(&u.ID, &u.Nickname, &u.Emoji, &u.Streak, &u.LastActiveDate, &u.TotalScore)

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
