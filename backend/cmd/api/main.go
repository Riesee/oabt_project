package main

import (
	"backend/internal/database"
	"backend/internal/routes"
	"fmt"
	"net/http"
	"os"
)

func main() {
	// Initialize Database
	database.InitDB()
	defer database.DB.Close()

	// Register Routes
	mux := routes.RegisterRoutes()

	// Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Printf("Server starting on port %s...\n", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		fmt.Printf("Error starting server: %v\n", err)
	}
}
