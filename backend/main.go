package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	_ "github.com/lib/pq"
)

type Question struct {
	ID            int      `json:"id"`
	Text          string   `json:"text"`
	Options       []string `json:"options"`
	CorrectAnswer string   `json:"correct_answer"`
}

// Helper to handle JSON array for Options in DB
type QuestionDB struct {
	ID            int
	Text          string
	OptionsJSON   string
	CorrectAnswer string
}

var db *sql.DB

func initDB() {
	var err error
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		// Default for testing if not set, though user should set it
		connStr = "postgres://postgres:postgres@localhost:5432/oabt_db?sslmode=disable"
		fmt.Println("DATABASE_URL not set, using default:", connStr)
	}

	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}

	if err = db.Ping(); err != nil {
		log.Printf("Warning: Could not connect to database: %v\n", err)
		log.Println("Server will start but API requests might fail until DB is reachable.")
		return
	}

	createTable()
	seedData()
}

func createTable() {
	query := `
	CREATE TABLE IF NOT EXISTS questions (
		id SERIAL PRIMARY KEY,
		text TEXT NOT NULL,
		options JSONB NOT NULL,
		correct_answer TEXT NOT NULL
	)`

	_, err := db.Exec(query)
	if err != nil {
		log.Printf("Error creating table: %v", err)
	}
}

func seedData() {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM questions").Scan(&count)
	if err != nil {
		log.Printf("Error checking row count: %v", err)
		return
	}

	if count == 0 {
		fmt.Println("Seeding dummy data...")
		questions := []Question{
			{
				Text:          "React Native'de kullanılan dil hangisidir?",
				Options:       []string{"Java", "Swift", "JavaScript/TypeScript", "Python"},
				CorrectAnswer: "JavaScript/TypeScript",
			},
			{
				Text:          "Go dilini kim geliştirmiştir?",
				Options:       []string{"Facebook", "Google", "Microsoft", "Apple"},
				CorrectAnswer: "Google",
			},
			{
				Text:          "Expo nedir?",
				Options:       []string{"Bir veritabanı", "React Native framework'ü", "Bir CSS kütüphanesi", "Bir işletim sistemi"},
				CorrectAnswer: "React Native framework'ü",
			},
			{
				Text:          "PostgreSQL nedir?",
				Options:       []string{"Bir programlama dili", "İlişkisel veritabanı sistemi", "Bir web sunucusu", "Bir işletim sistemi"},
				CorrectAnswer: "İlişkisel veritabanı sistemi",
			},
			{
				Text:          "Hangisi bir HTTP metodudur?",
				Options:       []string{"GET", "FETCH", "PULL", "PUSH"},
				CorrectAnswer: "GET",
			},
		}

		for _, q := range questions {
			optionsJSON, _ := json.Marshal(q.Options)
			_, err := db.Exec("INSERT INTO questions (text, options, correct_answer) VALUES ($1, $2, $3)",
				q.Text, string(optionsJSON), q.CorrectAnswer)
			if err != nil {
				log.Printf("Error seeding question: %v", err)
			}
		}
	}
}

func getQuestions(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" {
		return
	}

	if db == nil {
		http.Error(w, "Database connection not initialized", http.StatusInternalServerError)
		return
	}

	rows, err := db.Query("SELECT id, text, options, correct_answer FROM questions ORDER BY id")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var questions []Question
	for rows.Next() {
		var q Question
		var optionsStr string
		if err := rows.Scan(&q.ID, &q.Text, &optionsStr, &q.CorrectAnswer); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		json.Unmarshal([]byte(optionsStr), &q.Options)
		questions = append(questions, q)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(questions)
}

func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
	(*w).Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

// Structs for the new JSON format
type ImportData struct {
	TestAdi string           `json:"test_adi"`
	Sorular []ImportQuestion `json:"sorular"`
}

type ImportQuestion struct {
	Soru       string            `json:"soru"`
	Secenekler map[string]string `json:"secenekler"`
	DogruCevap string            `json:"dogru_cevap"`
}

func importQuestions() {
	filename := "questions.json"
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		return // File does not exist, nothing to import
	}

	fmt.Println("Found questions.json, importing...")

	file, err := os.ReadFile(filename)
	if err != nil {
		log.Printf("Error reading questions.json: %v", err)
		return
	}

	// Try parsing as the new format first
	var importData ImportData
	if err := json.Unmarshal(file, &importData); err != nil {
		// Fallback or error handling if it doesn't match
		log.Printf("Error parsing questions.json as new format: %v", err)
		return
	}

	for _, q := range importData.Sorular {
		// Convert map options to slice, ensuring order a,b,c,d,e
		keys := []string{"a", "b", "c", "d", "e"}
		var options []string
		var correctAnswerText string

		for _, k := range keys {
			if val, ok := q.Secenekler[k]; ok {
				options = append(options, val)
				if k == q.DogruCevap {
					correctAnswerText = val
				}
			}
		}

		// If correct answer wasn't found in keys (e.g. upper case or typo), try to find it directly
		if correctAnswerText == "" {
			if val, ok := q.Secenekler[q.DogruCevap]; ok {
				correctAnswerText = val
			}
		}

		optionsJSON, _ := json.Marshal(options)
		_, err := db.Exec("INSERT INTO questions (text, options, correct_answer) VALUES ($1, $2, $3)",
			q.Soru, string(optionsJSON), correctAnswerText)
		if err != nil {
			log.Printf("Error importing question '%s': %v", q.Soru, err)
		} else {
			fmt.Printf("Imported: %s\n", q.Soru)
		}
	}

	// Rename file to prevent re-importing on next run
	if err := os.Rename(filename, filename+".imported"); err != nil {
		log.Printf("Error renaming imported file: %v", err)
	} else {
		fmt.Println("Import successful. Renamed questions.json to questions.json.imported")
	}
}

func main() {
	initDB()
	importQuestions() // Check for and import new questions
	defer db.Close()

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		enableCors(&w)
		fmt.Fprintf(w, "Hello from Go Backend with PostgreSQL!")
	})

	http.HandleFunc("/questions", getQuestions)

	fmt.Println("Server starting on port 8080...")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Printf("Error starting server: %s\n", err)
	}
}
