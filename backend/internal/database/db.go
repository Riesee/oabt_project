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
	fmt.Println("Initializing Database and dropping old tables...")
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
		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY,
			nickname TEXT UNIQUE NOT NULL,
			emoji TEXT NOT NULL,
			streak INTEGER DEFAULT 0,
			last_active_date DATE,
			total_score INTEGER DEFAULT 0,
			level INTEGER DEFAULT 1,
			xp INTEGER DEFAULT 0,
			email TEXT UNIQUE,
			google_id TEXT UNIQUE,
			apple_id TEXT UNIQUE,
			provider TEXT DEFAULT 'local'
		)`,
		// Ensure columns exist for existing tables
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_id TEXT UNIQUE`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'local'`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'free'`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens INTEGER DEFAULT 0`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE`,
		// Explicitly ensure uniqueness for emails (case-insensitive) and provider IDs
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email)) WHERE email IS NOT NULL AND email != ''`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id) WHERE apple_id IS NOT NULL`,
		`CREATE TABLE IF NOT EXISTS tests (
			id UUID PRIMARY KEY,
			title TEXT NOT NULL,
			description TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS questions (
            id UUID PRIMARY KEY,
            test_id UUID REFERENCES tests(id),
            question_id TEXT,
            category TEXT,
            subject TEXT,
            topic TEXT,
            sub_topic TEXT,
            difficulty TEXT,
            skill_level TEXT,
            text TEXT NOT NULL,
            options JSONB NOT NULL,
            solution JSONB,
            metadata JSONB,
            image_url TEXT,
            related_concept_id TEXT
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
