package handlers

import (
	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/models"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

func GetTestsHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	userID := r.URL.Query().Get("userId")
	category := r.URL.Query().Get("category")

	var rows *sql.Rows
	var err error

	query := `SELECT t.id, t.title, t.description, COALESCE(t.category, ''), 
			  EXISTS(SELECT 1 FROM test_results r WHERE r.test_id = t.id AND r.user_id = $1) as completed
			  FROM tests t`

	if category != "" {
		rows, err = database.DB.Query(query+" WHERE t.category = $2 ORDER BY t.title", userID, category)
	} else {
		rows, err = database.DB.Query(query+" ORDER BY t.title", userID)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	tests := []models.Test{}
	for rows.Next() {
		var t models.Test
		rows.Scan(&t.ID, &t.Title, &t.Description, &t.Category, &t.Completed)
		tests = append(tests, t)
	}
	json.NewEncoder(w).Encode(tests)
}

func GetCategoriesHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	rows, err := database.DB.Query("SELECT DISTINCT category FROM tests WHERE category IS NOT NULL AND category != '' ORDER BY category")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	categories := []string{}
	for rows.Next() {
		var c string
		rows.Scan(&c)
		categories = append(categories, c)
	}
	json.NewEncoder(w).Encode(categories)
}

func GetQuestionsHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	rows, err := database.DB.Query(`
        SELECT id, test_id, question_id, category, subject, topic, sub_topic, difficulty, skill_level, text, options, solution, metadata, image_url, related_concept_id 
        FROM questions LIMIT 100`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	questions := []models.Question{}
	for rows.Next() {
		var q models.Question
		var optsStr, solStr, metaStr []byte

		err := rows.Scan(
			&q.ID, &q.TestID, &q.QuestionID, &q.Category, &q.Subject, &q.Topic, &q.SubTopic,
			&q.Difficulty, &q.SkillLevel, &q.Text, &optsStr, &solStr, &metaStr, &q.ImageURL, &q.RelatedConceptID,
		)
		if err != nil {
			log.Printf("Error scanning question: %v", err)
			continue
		}

		json.Unmarshal(optsStr, &q.Options)
		json.Unmarshal(solStr, &q.Solution)
		json.Unmarshal(metaStr, &q.Metadata)

		questions = append(questions, q)
	}
	json.NewEncoder(w).Encode(questions)
}

func GetTestQuestionsHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 2 {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	// URL can be /test/<id> or /test/<id>/questions
	testID := parts[1]
	log.Printf("Fetching questions for testID: %s", testID)

	rows, err := database.DB.Query(`
		SELECT id, test_id, question_id, category, subject, topic, sub_topic, difficulty, skill_level, text, options, solution, metadata, image_url, related_concept_id 
		FROM questions WHERE test_id=$1`, testID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	questions := []models.Question{}
	for rows.Next() {
		var q models.Question
		var optsStr, solStr, metaStr []byte

		err := rows.Scan(
			&q.ID, &q.TestID, &q.QuestionID, &q.Category, &q.Subject, &q.Topic, &q.SubTopic,
			&q.Difficulty, &q.SkillLevel, &q.Text, &optsStr, &solStr, &metaStr, &q.ImageURL, &q.RelatedConceptID,
		)
		if err != nil {
			log.Printf("Error scanning question: %v", err)
			continue
		}

		json.Unmarshal(optsStr, &q.Options)
		json.Unmarshal(solStr, &q.Solution)
		json.Unmarshal(metaStr, &q.Metadata)

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

	// Use authenticated UserID
	res.UserID, _ = r.Context().Value("userID").(string)
	if res.UserID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var existingScore int
	err := database.DB.QueryRow("SELECT score FROM test_results WHERE user_id=$1 AND test_id=$2", res.UserID, res.TestID).Scan(&existingScore)
	alreadyTaken := err == nil
	scoreDiff := 0
	resultID, _ := uuid.NewV7()

	if alreadyTaken {
		_, _ = database.DB.Exec("INSERT INTO test_results (id, user_id, test_id, score, completed_at) VALUES ($1, $2, $3, $4, NOW())",
			resultID.String(), res.UserID, res.TestID, res.Score)
		// No total_score increase for retakes (or maybe half? let's keep it 0 for now)
		scoreDiff = 0
	} else {
		_, _ = database.DB.Exec("INSERT INTO test_results (id, user_id, test_id, score, completed_at) VALUES ($1, $2, $3, $4, NOW())",
			resultID.String(), res.UserID, res.TestID, res.Score)
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

	// Level & XP Logic
	var currentXP int
	var currentLevel int
	database.DB.QueryRow("SELECT xp, level FROM users WHERE id=$1", res.UserID).Scan(&currentXP, &currentLevel)

	// Users always gain XP for solving tests!
	newXP := currentXP + res.Score
	newLevel := currentLevel
	for newXP >= 100 {
		newXP -= 100
		newLevel++
	}

	// Update everything in ONE query
	_, err = database.DB.Exec("UPDATE users SET xp=$1, level=$2, total_score = total_score + $3 WHERE id=$4",
		newXP, newLevel, scoreDiff, res.UserID)
	if err != nil {
		log.Printf("Error updating user stats: %v", err)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":        true,
		"streak_updated": newStreak > streak,
		"current_streak": newStreak,
		"score_added":    scoreDiff,
		"new_level":      newLevel,
		"new_xp":         newXP,
		"leveled_up":     newLevel > currentLevel,
	})
}

func DBStatsHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	var testCount, questionCount int
	database.DB.QueryRow("SELECT COUNT(*) FROM tests").Scan(&testCount)
	database.DB.QueryRow("SELECT COUNT(*) FROM questions").Scan(&questionCount)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"tests_count":     testCount,
		"questions_count": questionCount,
	})
}

func GetRandomUnsolvedTestHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	w.Header().Set("Content-Type", "application/json")
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		http.Error(w, "UserID required", http.StatusBadRequest)
		return
	}

	var t models.Test
	err := database.DB.QueryRow(`
		SELECT id, title, description 
		FROM tests 
		WHERE id NOT IN (SELECT test_id FROM test_results WHERE user_id = $1)
		ORDER BY RANDOM() 
		LIMIT 1`, userID).Scan(&t.ID, &t.Title, &t.Description)

	if err != nil {
		if err == sql.ErrNoRows {
			// If all tests solved, just return any random test
			err = database.DB.QueryRow("SELECT id, title, description FROM tests ORDER BY RANDOM() LIMIT 1").Scan(&t.ID, &t.Title, &t.Description)
		}
		if err != nil {
			http.Error(w, "No tests available", http.StatusNotFound)
			return
		}
	}

	json.NewEncoder(w).Encode(t)
}
