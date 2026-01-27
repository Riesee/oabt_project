package handlers

import (
	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/models"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

func GetTestsHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	rows, err := database.DB.Query("SELECT id, title, description FROM tests ORDER BY title")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tests []models.Test
	for rows.Next() {
		var t models.Test
		rows.Scan(&t.ID, &t.Title, &t.Description)
		tests = append(tests, t)
	}
	json.NewEncoder(w).Encode(tests)
}

func GetTestQuestionsHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 3 {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	testID := parts[2]

	rows, err := database.DB.Query("SELECT id, test_id, text, options, correct_answer FROM questions WHERE test_id=$1", testID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var questions []models.Question
	for rows.Next() {
		var q models.Question
		var optsStr string
		rows.Scan(&q.ID, &q.TestID, &q.Text, &optsStr, &q.CorrectAnswer)
		json.Unmarshal([]byte(optsStr), &q.Options)
		questions = append(questions, q)
	}
	json.NewEncoder(w).Encode(questions)
}

func SubmitTestHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	if r.Method != "POST" {
		return
	}
	var res models.TestResult
	if err := json.NewDecoder(r.Body).Decode(&res); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var existingScore int
	err := database.DB.QueryRow("SELECT score FROM test_results WHERE user_id=$1 AND test_id=$2", res.UserID, res.TestID).Scan(&existingScore)
	alreadyTaken := err == nil
	scoreDiff := 0
	resultID, _ := uuid.NewV7()

	if alreadyTaken {
		database.DB.Exec("INSERT INTO test_results (id, user_id, test_id, score, completed_at) VALUES ($1, $2, $3, $4, NOW())",
			resultID.String(), res.UserID, res.TestID, res.Score)
	} else {
		_, _ = database.DB.Exec("INSERT INTO test_results (id, user_id, test_id, score, completed_at) VALUES ($1, $2, $3, $4, NOW())",
			resultID.String(), res.UserID, res.TestID, res.Score)
		database.DB.Exec("UPDATE users SET total_score = total_score + $1 WHERE id = $2", res.Score, res.UserID)
		scoreDiff = res.Score
	}

	var streak int
	var lastActiveStr string
	database.DB.QueryRow("SELECT streak, COALESCE(TO_CHAR(last_active_date, 'YYYY-MM-DD'), '') FROM users WHERE id=$1", res.UserID).Scan(&streak, &lastActiveStr)
	today := time.Now().Format("2006-01-02")
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	newStreak := streak

	if lastActiveStr != today || streak == 0 {
		if lastActiveStr == yesterday && streak > 0 {
			newStreak++
		} else {
			newStreak = 1
		}
		_, _ = database.DB.Exec("UPDATE users SET streak=$1, last_active_date=$2 WHERE id=$3", newStreak, today, res.UserID)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":        true,
		"streak_updated": newStreak > streak,
		"current_streak": newStreak,
		"score_added":    scoreDiff,
	})
}
