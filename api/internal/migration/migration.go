package migration

import (
	"database/sql"
	"embed"
	"fmt"
	"log"
	"sort"
	"strings"
)

//go:embed *.sql
var migrationFiles embed.FS

// Migration represents a single migration file
type Migration struct {
	Name    string
	Content string
}

// GetMigrations reads all migration files and returns them sorted
func GetMigrations() ([]Migration, error) {
	entries, err := migrationFiles.ReadDir(".")
	if err != nil {
		return nil, fmt.Errorf("failed to read migration directory: %w", err)
	}

	var migrations []Migration
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}

		content, err := migrationFiles.ReadFile(entry.Name())
		if err != nil {
			return nil, fmt.Errorf("failed to read migration file %s: %w", entry.Name(), err)
		}

		migrations = append(migrations, Migration{
			Name:    entry.Name(),
			Content: string(content),
		})
	}

	// Sort migrations by filename to ensure proper order
	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].Name < migrations[j].Name
	})

	return migrations, nil
}

// RunMigrations executes all migration files in order
func RunMigrations(db *sql.DB) error {
	log.Println("Loading migration files...")
	migrations, err := GetMigrations()
	if err != nil {
		return fmt.Errorf("failed to get migrations: %w", err)
	}

	log.Printf("Found %d migration files", len(migrations))

	// Create migrations tracking table if it doesn't exist
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}

	for _, migration := range migrations {
		// Check if migration has already been applied
		var count int
		err := db.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE filename = $1", migration.Name).Scan(&count)
		if err != nil {
			return fmt.Errorf("failed to check migration status for %s: %w", migration.Name, err)
		}

		if count > 0 {
			log.Printf("Skipping already applied migration: %s", migration.Name)
			continue
		}

		log.Printf("Applying migration: %s", migration.Name)
		
		// Execute migration in a transaction
		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("failed to start transaction for %s: %w", migration.Name, err)
		}

		// Execute the migration SQL
		_, err = tx.Exec(migration.Content)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to execute migration %s: %w", migration.Name, err)
		}

		// Mark migration as applied
		_, err = tx.Exec("INSERT INTO schema_migrations (filename) VALUES ($1)", migration.Name)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to mark migration %s as applied: %w", migration.Name, err)
		}

		// Commit the transaction
		err = tx.Commit()
		if err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", migration.Name, err)
		}

		log.Printf("Successfully applied migration: %s", migration.Name)
	}

	log.Println("All migrations completed successfully")
	return nil
}