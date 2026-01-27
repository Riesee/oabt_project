package handlers

import (
	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/models"
	"database/sql"
	"encoding/json"
	"net/http"
)

func GetSubjectsHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	category := r.URL.Query().Get("category")

	query := "SELECT id, title, weight, category, content FROM subjects"
	var rows *sql.Rows
	var err error

	if category != "" {
		rows, err = database.DB.Query(query+" WHERE category=$1 ORDER BY title", category)
	} else {
		rows, err = database.DB.Query(query + " ORDER BY title")
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var result []models.Subject = []models.Subject{}
	for rows.Next() {
		var s models.Subject
		rows.Scan(&s.ID, &s.Title, &s.Weight, &s.Category, &s.Content)

		// Fetch Related Titles
		relRows, _ := database.DB.Query(`
			SELECT s.title 
			FROM subjects s 
			JOIN related_subjects rs ON s.id = rs.related_subject_id 
			WHERE rs.subject_id = $1`, s.ID)

		var rels []string = []string{}
		if relRows != nil {
			for relRows.Next() {
				var t string
				relRows.Scan(&t)
				rels = append(rels, t)
			}
			relRows.Close()
		}
		s.Related = rels
		result = append(result, s)
	}
	json.NewEncoder(w).Encode(result)
}
