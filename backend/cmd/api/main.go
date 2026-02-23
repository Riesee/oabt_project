package main

import (
	"backend/internal/database"
	"backend/internal/routes"
	"fmt"
	"net/http"
	"os"
)

// Build Version: 1.0.2
func main() {
	fmt.Println("DEBUG: Backend starting... v1.0.3")
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
