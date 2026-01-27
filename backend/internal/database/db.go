package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func InitDB() {
	var err error
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://postgres:postgres@localhost:5432/oabt_db?sslmode=disable"
		fmt.Println("DATABASE_URL not set, using default.")
	}

	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}

	if err = DB.Ping(); err != nil {
		log.Printf("Warning: Could not connect to database: %v\n", err)
		return
	}

	CreateTables()
	SeedData()
	SeedSubjects()
}

func CreateTables() {
	queries := []string{
		`DROP TABLE IF EXISTS questions CASCADE`,
		`DROP TABLE IF EXISTS tests CASCADE`,
		`DROP TABLE IF EXISTS users CASCADE`,
		`DROP TABLE IF EXISTS test_results CASCADE`,
		`DROP TABLE IF EXISTS related_subjects CASCADE`,
		`DROP TABLE IF EXISTS subjects CASCADE`,
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
		`CREATE TABLE IF NOT EXISTS subjects (
			id UUID PRIMARY KEY,
			title TEXT UNIQUE NOT NULL,
			weight TEXT NOT NULL,
			category TEXT NOT NULL,
			content TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS related_subjects (
			subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
			related_subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
			PRIMARY KEY (subject_id, related_subject_id)
		)`,
	}

	for _, query := range queries {
		_, err := DB.Exec(query)
		if err != nil {
			log.Printf("Error creating table: %v\nQuery: %s", err, query)
		}
	}
}
