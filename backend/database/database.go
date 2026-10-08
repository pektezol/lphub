package database

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"time"

	_ "github.com/lib/pq"
)

var DB *sql.DB

// BeginAuditTx starts a transaction and sets the actor for audit triggers on
// that transaction's connection. The setting is local to the transaction, so
// it is cleared automatically on commit or rollback and cannot leak through
// the connection pool.
func BeginAuditTx(ctx context.Context, userID string) (*sql.Tx, error) {
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `SELECT set_config('app.user_id', $1, true)`, userID); err != nil {
		_ = tx.Rollback()
		return nil, err
	}
	return tx, nil
}

func ConnectDB() {
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	pass := os.Getenv("DB_PASS")
	name := os.Getenv("DB_NAME")
	psqlInfo := fmt.Sprintf("host=%s port=%s user=%s "+
		"password=%s dbname=%s sslmode=disable",
		host, port, user, pass, name)
	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		panic(err)
	}
	if err = db.Ping(); err != nil {
		panic(err)
	}
	db.SetMaxOpenConns(50)
	db.SetMaxIdleConns(2)
	db.SetConnMaxLifetime(time.Minute * 5)
	DB = db
	fmt.Println("Successfully connected to database!")
}
