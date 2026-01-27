package handlers

import (
	"backend/internal/database"
	"backend/internal/middleware"
	"encoding/json"
	"net/http"
)

func GetLeaderboardHandler(w http.ResponseWriter, r *http.Request) {
	middleware.EnableCors(&w)
	rows, err := database.DB.Query("SELECT nickname, emoji, total_score, streak FROM users ORDER BY total_score DESC LIMIT 10")
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
	var list []LeaderboardEntry = []LeaderboardEntry{}
	for rows.Next() {
		var e LeaderboardEntry
		rows.Scan(&e.Nickname, &e.Emoji, &e.Score, &e.Streak)
		list = append(list, e)
	}
	json.NewEncoder(w).Encode(list)
}
