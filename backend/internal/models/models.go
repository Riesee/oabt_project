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
	Role           string `json:"role"`
	Tokens         int    `json:"tokens"`
	IsPremium      bool   `json:"is_premium"`
}

type Test struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Completed   bool   `json:"completed"`
}

type Question struct {
	ID               string   `json:"id"`
	TestID           string   `json:"test_id"`
	QuestionID       string   `json:"question_id"`
	Category         string   `json:"category"`
	Subject          string   `json:"subject"`
	Topic            string   `json:"topic"`
	SubTopic         string   `json:"sub_topic"`
	Difficulty       string   `json:"difficulty"`
	SkillLevel       string   `json:"skill_level"`
	Text             string   `json:"question_text"`
	Options          []Option `json:"options"`
	Solution         Solution `json:"solution"`
	Metadata         Metadata `json:"metadata"`
	ImageURL         *string  `json:"image_url"`
	RelatedConceptID string   `json:"related_concept_id"`
}

type Option struct {
	Text      string `json:"option_text"`
	IsCorrect bool   `json:"is_correct"`
}

type Solution struct {
	ExplanationText  string  `json:"explanation_text"`
	VideoSolutionURL *string `json:"video_solution_url"`
}

type Metadata struct {
	SourceBook              string   `json:"source_book"`
	PageNumber              int      `json:"page_number"`
	AverageSolveTimeSeconds int      `json:"average_solve_time_seconds"`
	Tags                    []string `json:"tags"`
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
