package models

import "time"

type User struct {
	ID             string `json:"id"`
	Nickname       string `json:"nickname"`
	Emoji          string `json:"emoji"`
	Streak         int    `json:"streak"`
	LastActiveDate string `json:"last_active_date"` // YYYY-MM-DD
	TotalScore     int    `json:"total_score"`
	Level          int    `json:"level"`
	XP             int    `json:"xp"`
	Email          string `json:"email"`
	GoogleID       string `json:"google_id"`
	AppleID        string `json:"apple_id"`
	Provider       string `json:"provider"`
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

type Subject struct {
	ID       string   `json:"id"`
	Title    string   `json:"title"`
	Weight   string   `json:"weight"`
	Category string   `json:"category"`
	Content  string   `json:"content"`
	Related  []string `json:"related"`
}

type ImportData struct {
	Sorular []ImportQuestion `json:"sorular"`
}

type ImportQuestion struct {
	Soru       string            `json:"soru"`
	Secenekler map[string]string `json:"secenekler"`
	DogruCevap string            `json:"dogru_cevap"`
}
