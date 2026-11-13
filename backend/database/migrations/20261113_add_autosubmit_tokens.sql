CREATE TABLE autosubmit_tokens (
  user_id TEXT PRIMARY KEY REFERENCES users(steam_id) ON DELETE CASCADE,
  token_hash BYTEA NOT NULL UNIQUE,
  token_ciphertext BYTEA NOT NULL
);
