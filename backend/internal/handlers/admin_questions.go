package handlers

import (
	"backend/internal/database"
	"backend/internal/models"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

// CreateQuestionHandler adds a new question
func CreateQuestionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var q models.Question
	if err := json.NewDecoder(r.Body).Decode(&q); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if q.ID == "" {
		id, err := uuid.NewV7()
		if err != nil {
			http.Error(w, "UUID generation failed", http.StatusInternalServerError)
			return
		}
		q.ID = id.String()
	}

	// Validate TestID presence
	if q.TestID == "" {
		http.Error(w, "TestID is required", http.StatusBadRequest)
		return
	}

	optionsJson, _ := json.Marshal(q.Options)
	solutionJson, _ := json.Marshal(q.Solution)
	metadataJson, _ := json.Marshal(q.Metadata)

	_, err := database.DB.Exec(`INSERT INTO questions 
		(id, test_id, question_id, category, subject, topic, sub_topic, difficulty, skill_level, text, options, solution, metadata, image_url, related_concept_id) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
		q.ID, q.TestID, q.QuestionID, q.Category, q.Subject, q.Topic, q.SubTopic, q.Difficulty, q.SkillLevel, q.Text, optionsJson, solutionJson, metadataJson, q.ImageURL, q.RelatedConceptID)

	if err != nil {
		http.Error(w, "Database error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(q)
}

// UpdateQuestionHandler updates an existing question
func UpdateQuestionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract ID from URL path (assuming /api/v1/admin/questions/{id})
	// Current router uses simple prefix matching, so we need to parse carefully
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 6 || parts[len(parts)-1] == "" {
		http.Error(w, "ID required in URL", http.StatusBadRequest)
		return
	}
	id := parts[len(parts)-1]

	var q models.Question
	if err := json.NewDecoder(r.Body).Decode(&q); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	q.ID = id

	optionsJson, _ := json.Marshal(q.Options)
	solutionJson, _ := json.Marshal(q.Solution)
	metadataJson, _ := json.Marshal(q.Metadata)

	result, err := database.DB.Exec(`UPDATE questions SET
		test_id=$1, question_id=$2, category=$3, subject=$4, topic=$5, sub_topic=$6, difficulty=$7, skill_level=$8, text=$9, options=$10, solution=$11, metadata=$12, image_url=$13, related_concept_id=$14
		WHERE id=$15`,
		q.TestID, q.QuestionID, q.Category, q.Subject, q.Topic, q.SubTopic, q.Difficulty, q.SkillLevel, q.Text, optionsJson, solutionJson, metadataJson, q.ImageURL, q.RelatedConceptID, q.ID)

	if err != nil {
		http.Error(w, "Database error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		http.Error(w, "Question not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(q)
}

// DeleteQuestionHandler deletes a question
func DeleteQuestionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 6 || parts[len(parts)-1] == "" {
		http.Error(w, "ID required in URL", http.StatusBadRequest)
		return
	}
	id := parts[len(parts)-1]

	_, err := database.DB.Exec("DELETE FROM questions WHERE id=$1", id)
	if err != nil {
		http.Error(w, "Database error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// SyncQuestionsHandler triggers the seed logic manually (re-scans the data/questions folder)
func SyncQuestionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	database.SeedData()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "Sync completed! Checked all JSON files in data/questions folder."})
}

// BulkCreateQuestionsHandler adds multiple questions at once from a JSON array
func BulkCreateQuestionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var questions []models.Question
	if err := json.NewDecoder(r.Body).Decode(&questions); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(questions) == 0 {
		http.Error(w, "No questions provided", http.StatusBadRequest)
		return
	}

	questionsPerTest := 100
	insertedCount := 0
	skippedCount := 0
	currentTestID := ""

	for i, q := range questions {
		// Check if question already exists
		var existingID string
		err := database.DB.QueryRow("SELECT id FROM questions WHERE question_id = $1", q.QuestionID).Scan(&existingID)
		if err == nil {
			skippedCount++
			continue
		}

		if i%questionsPerTest == 0 || currentTestID == "" {
			category := q.Category
			if category == "" {
				category = "Genel"
			}
			testTitle := fmt.Sprintf("%s - Deneme %d (Bulk Upload)", category, (i/questionsPerTest)+1)

			var testID string
			err := database.DB.QueryRow("SELECT id FROM tests WHERE title = $1", testTitle).Scan(&testID)
			if err != nil {
				newUUID, _ := uuid.NewV7()
				testID = newUUID.String()
				_, _ = database.DB.Exec("INSERT INTO tests (id, title, description) VALUES ($1, $2, $3)",
					testID, testTitle, "ÖABT "+category+" Alan Bilgisi (Uploaded)")
			}
			currentTestID = testID
		}

		qID, _ := uuid.NewV7()
		if q.ID != "" {
			qID, _ = uuid.Parse(q.ID)
		}

		optionsJson, _ := json.Marshal(q.Options)
		solutionJson, _ := json.Marshal(q.Solution)
		metadataJson, _ := json.Marshal(q.Metadata)

		_, err = database.DB.Exec(`INSERT INTO questions 
			(id, test_id, question_id, category, subject, topic, sub_topic, difficulty, skill_level, text, options, solution, metadata, image_url, related_concept_id) 
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
			qID.String(), currentTestID, q.QuestionID, q.Category, q.Subject, q.Topic, q.SubTopic, q.Difficulty, q.SkillLevel, q.Text, optionsJson, solutionJson, metadataJson, q.ImageURL, q.RelatedConceptID)

		if err == nil {
			insertedCount++
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":  "Bulk upload completed",
		"inserted": insertedCount,
		"skipped":  skippedCount,
	})
}
