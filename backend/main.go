package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

// --- Structs ---

type User struct {
	ID             string `json:"id"`
	Nickname       string `json:"nickname"`
	Emoji          string `json:"emoji"`
	Streak         int    `json:"streak"`
	LastActiveDate string `json:"last_active_date"` // YYYY-MM-DD
	TotalScore     int    `json:"total_score"`
}

type Test struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

type Question struct {
	ID            string   `json:"id"`
	TestID        string   `json:"test_id"`
	Text          string   `json:"text"`
	Options       []string `json:"options"`
	CorrectAnswer string   `json:"correct_answer"`
}

type TestResult struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	TestID      string    `json:"test_id"`
	Score       int       `json:"score"`
	CompletedAt time.Time `json:"completed_at"`
}

// --- DB Global ---
var db *sql.DB

func initDB() {
	var err error
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://postgres:postgres@localhost:5432/oabt_db?sslmode=disable"
		fmt.Println("DATABASE_URL not set, using default.")
	}

	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}

	if err = db.Ping(); err != nil {
		log.Printf("Warning: Could not connect to database: %v\n", err)
		return
	}

	createTables()
	seedData()
}

func createTables() {
	// Note: For dev/prototype, we are dropping tables to ensure schema changes (int -> uuid) apply cleanly.
	// In production, use proper migrations.
	queries := []string{
		`DROP TABLE IF EXISTS questions CASCADE`,
		`DROP TABLE IF EXISTS tests CASCADE`,
		`DROP TABLE IF EXISTS users CASCADE`,
		`DROP TABLE IF EXISTS test_results CASCADE`,
		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY,
			nickname TEXT UNIQUE NOT NULL,
			emoji TEXT NOT NULL,
			streak INTEGER DEFAULT 0,
			last_active_date DATE,
			total_score INTEGER DEFAULT 0
		)`,
		`CREATE TABLE IF NOT EXISTS tests (
			id UUID PRIMARY KEY,
			title TEXT NOT NULL,
			description TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS questions (
			id UUID PRIMARY KEY,
			test_id UUID REFERENCES tests(id),
			text TEXT NOT NULL,
			options JSONB NOT NULL,
			correct_answer TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS test_results (
			id UUID PRIMARY KEY,
			user_id UUID REFERENCES users(id),
			test_id UUID REFERENCES tests(id),
			score INTEGER,
			completed_at TIMESTAMP
		)`,
	}

	for _, query := range queries {
		_, err := db.Exec(query)
		if err != nil {
			log.Printf("Error creating table: %v\nQuery: %s", err, query)
		}
	}
}

// --- Seeding ---

// Import structs for JSON file
type ImportData struct {
	Sorular []ImportQuestion `json:"sorular"`
}
type ImportQuestion struct {
	Soru       string            `json:"soru"`
	Secenekler map[string]string `json:"secenekler"`
	DogruCevap string            `json:"dogru_cevap"`
}

func seedData() {
	// Check if tests exist
	var count int
	db.QueryRow("SELECT COUNT(*) FROM tests").Scan(&count)
	if count > 0 {
		fmt.Println("Data likely already seeded. Skipping...")
		return
	}

	fmt.Println("Seeding Database...")

	// 1. Create Tests Programmatically (e.g. Test 1, Test 2...)
	// We will create chunks later. For now, let's just prep logic.

	// 2. Load Questions
	importQuestions := []ImportQuestion{}

	// Try loading from JSON
	filename := "questions.json"
	if data, err := os.ReadFile(filename); err == nil {
		var importData ImportData
		if err := json.Unmarshal(data, &importData); err == nil {
			importQuestions = importData.Sorular
		}
	}

	// Fallback dummy data if file empty/fail
	if len(importQuestions) == 0 {
		importQuestions = []ImportQuestion{
			{Soru: "Sample Q1", Secenekler: map[string]string{"a": "A1", "b": "A2"}, DogruCevap: "a"},
			{Soru: "Sample Q2", Secenekler: map[string]string{"a": "B1", "b": "B2"}, DogruCevap: "b"},
			// ... add more dummies if needed
		}
	}

	// 3. Distribute Questions into Tests (e.g. 10 questions per test)
	questionsPerTest := 10
	currentTestID := ""

	for i, q := range importQuestions {
		// New Test every 'questionsPerTest' or at start
		if i%questionsPerTest == 0 {
			testNum := (i / questionsPerTest) + 1
			testID, _ := uuid.NewV7()
			currentTestID = testID.String()

			title := fmt.Sprintf("Deneme Sınavı %d", testNum)
			desc := "Genel Yetenek ve Alan Bilgisi"

			_, err := db.Exec("INSERT INTO tests (id, title, description) VALUES ($1, $2, $3)",
				currentTestID, title, desc)
			if err != nil {
				log.Printf("Error creating test: %v", err)
			}
		}

		// Insert Question
		qID, _ := uuid.NewV7()

		// Map options
		options := []string{}
		keys := []string{"a", "b", "c", "d", "e"}
		correctText := ""
		for _, k := range keys {
			if val, ok := q.Secenekler[k]; ok {
				options = append(options, val)
				if k == q.DogruCevap {
					correctText = val
				}
			}
		}
		if correctText == "" {
			correctText = options[0]
		} // Fallback

		optsJson, _ := json.Marshal(options)
		_, err := db.Exec("INSERT INTO questions (id, test_id, text, options, correct_answer) VALUES ($1, $2, $3, $4, $5)",
			qID.String(), currentTestID, q.Soru, string(optsJson), correctText)
		if err != nil {
			log.Printf("Error inserting question: %v", err)
		}
	}
	fmt.Println("Seeding complete.")
}

// --- Handlers ---

func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
	(*w).Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
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

	// Check existing
	var existingID string
	err := db.QueryRow("SELECT id FROM users WHERE nickname=$1", payload.Nickname).Scan(&existingID)
	if err == nil {
		// User exists, return login info
		// In a real app, do auth check. Here just return ID.
		json.NewEncoder(w).Encode(map[string]string{"id": existingID, "message": "Login successful"})
		return
	}

	// Create new
	newID, _ := uuid.NewV7()
	_, err = db.Exec("INSERT INTO users (id, nickname, emoji, last_active_date) VALUES ($1, $2, $3, CURRENT_DATE)",
		newID.String(), payload.Nickname, payload.Emoji)

	if err != nil {
		http.Error(w, "Error creating user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"id": newID.String(), "message": "Registered successfully"})
}

func getUserHandler(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	idStr := strings.TrimPrefix(r.URL.Path, "/user/")

	var u User

	// Actually scan into string for date to keep simple, or time.Time
	// LastActiveDate in DB is DATE.
	err := db.QueryRow("SELECT id, nickname, emoji, streak, COALESCE(last_active_date::text, ''), total_score FROM users WHERE id=$1", idStr).
		Scan(&u.ID, &u.Nickname, &u.Emoji, &u.Streak, &u.LastActiveDate, &u.TotalScore)

	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(u)
}

func getTestsHandler(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	rows, err := db.Query("SELECT id, title, description FROM tests ORDER BY title")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tests []Test
	for rows.Next() {
		var t Test
		rows.Scan(&t.ID, &t.Title, &t.Description)
		tests = append(tests, t)
	}
	json.NewEncoder(w).Encode(tests)
}

func getTestQuestionsHandler(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	// /test/{id}/questions
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 3 {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	testID := parts[2]

	rows, err := db.Query("SELECT id, test_id, text, options, correct_answer FROM questions WHERE test_id=$1", testID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var questions []Question
	for rows.Next() {
		var q Question
		var optsStr string
		rows.Scan(&q.ID, &q.TestID, &q.Text, &optsStr, &q.CorrectAnswer)
		json.Unmarshal([]byte(optsStr), &q.Options)
		questions = append(questions, q)
	}
	json.NewEncoder(w).Encode(questions)
}

func submitTestHandler(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method != "POST" {
		return
	}

	var res TestResult
	if err := json.NewDecoder(r.Body).Decode(&res); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Check if this test was already submitted by this user
	var existingScore int
	err := db.QueryRow("SELECT score FROM test_results WHERE user_id=$1 AND test_id=$2", res.UserID, res.TestID).Scan(&existingScore)

	alreadyTaken := err == nil
	scoreDiff := 0

	resultID, _ := uuid.NewV7()

	if alreadyTaken {
		// If already taken, we update the result ONLY if the new score is higher?
		// Or strictly follow "score shouldn't increase".
		// Let's assume we just log the new attempt but don't give extra "Total Score" points.
		// Actually, if they improved their score, maybe give the difference?
		// User said: "aynı sınavı tekrar tekrar çözdüğünde skoru artmamalı".
		// This likely means: Don't give +100 points every time.
		// If I got 80 before and now 90, maybe +10?
		// For simplicity/safety based on request: Do not change total score if already taken.
		// Just insert a new record for history? Or update the existing one?
		// The requirement says "skoru artmamalı" (total score).

		// Strategy: Always save the attempt in a new table?
		// Current DB schema has test_results. PK is ID.
		// So we can insert multiple results for same user/test.
		// We should just SKIP the "UPDATE users SET total_score" step if they have ANY previous result.

		db.Exec("INSERT INTO test_results (id, user_id, test_id, score, completed_at) VALUES ($1, $2, $3, $4, NOW())",
			resultID.String(), res.UserID, res.TestID, res.Score)

	} else {
		// First time taking this test
		// 1. Save Result
		_, err := db.Exec("INSERT INTO test_results (id, user_id, test_id, score, completed_at) VALUES ($1, $2, $3, $4, NOW())",
			resultID.String(), res.UserID, res.TestID, res.Score)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// 2. Update User Total Score
		db.Exec("UPDATE users SET total_score = total_score + $1 WHERE id = $2", res.Score, res.UserID)
		scoreDiff = res.Score
	}

	// 3. Streak Logic
	var streak int
	var lastActiveStr string
	// Fetch current streak and last active date. Handle NULL last_active_date.
	db.QueryRow("SELECT streak, COALESCE(TO_CHAR(last_active_date, 'YYYY-MM-DD'), '') FROM users WHERE id=$1", res.UserID).Scan(&streak, &lastActiveStr)

	today := time.Now().Format("2006-01-02")
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")

	newStreak := streak

	// Only update streak if not active today
	fmt.Printf("DEBUG: UserID=%s LastActive=%s Today=%s Yesterday=%s\n", res.UserID, lastActiveStr, today, yesterday)

	if lastActiveStr != today {
		if lastActiveStr == yesterday {
			// Continued streak
			newStreak++
		} else {
			// Broken streak or first time (if lastActiveStr is empty or older)
			// But wait, if they strictly want "daily streak", broken means reset to 1.
			// Unless it's the very first day.
			if lastActiveStr == "" {
				newStreak = 1
			} else {
				// reset to 1
				newStreak = 1
			}
		}
		// Update DB with today as last_active
		// CRITICAL FIX: Use 'today' string explicitly instead of CURRENT_DATE to match Go's time
		_, err := db.Exec("UPDATE users SET streak=$1, last_active_date=$2 WHERE id=$3", newStreak, today, res.UserID)
		if err != nil {
			fmt.Println("Error updating streak:", err)
		}
	} else {
		fmt.Println("DEBUG: Already active today, skipping streak update.")
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":        true,
		"streak_updated": newStreak > streak,
		"current_streak": newStreak,
		"score_added":    scoreDiff,
	})
}

func getLeaderboardHandler(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	// Top 10 by total_score
	rows, err := db.Query("SELECT nickname, emoji, total_score, streak FROM users ORDER BY total_score DESC LIMIT 10")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type LeaderboardEntry struct {
		Nickname string `json:"nickname"`
		Emoji    string `json:"emoji"`
		Score    int    `json:"score"`
		Streak   int    `json:"streak"`
	}
	var list []LeaderboardEntry
	for rows.Next() {
		var e LeaderboardEntry
		rows.Scan(&e.Nickname, &e.Emoji, &e.Score, &e.Streak)
		list = append(list, e)
	}
	json.NewEncoder(w).Encode(list)
}

func getHistoryHandler(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	// /user/history/{id} OR /history/{id}
	// We just want the last part of the path (the ID)
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 3 {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	userID := parts[len(parts)-1]
	if userID == "" { // Handle trailing slash case if any
		if len(parts) > 1 {
			userID = parts[len(parts)-2]
		}
	}

	rows, err := db.Query(`
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
	var history []HistoryEntry
	for rows.Next() {
		var h HistoryEntry
		rows.Scan(&h.Score, &h.Date, &h.Title)
		history = append(history, h)
	}
	// Initial empty slice if nil to return [] instead of null
	if history == nil {
		history = []HistoryEntry{}
	}
	json.NewEncoder(w).Encode(history)
}

func main() {
	initDB()
	defer db.Close()

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		enableCors(&w)
		fmt.Fprintf(w, "OABT Backend Running (UUID v7)")
	})

	http.HandleFunc("/register", registerHandler)        // POST
	http.HandleFunc("/user/", getUserHandler)            // GET
	http.HandleFunc("/user/history/", getHistoryHandler) // GET for user history

	http.HandleFunc("/tests", getTestsHandler)             // GET
	http.HandleFunc("/test/", getTestQuestionsHandler)     // GET /test/{id}/questions
	http.HandleFunc("/submit-test", submitTestHandler)     // POST
	http.HandleFunc("/leaderboard", getLeaderboardHandler) // GET
	http.HandleFunc("/history/", getHistoryHandler)        // Extra Alias

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Printf("Server starting on port %s...\n", port)
	http.ListenAndServe(":"+port, nil)
}
