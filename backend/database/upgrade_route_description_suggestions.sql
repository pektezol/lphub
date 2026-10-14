CREATE TABLE route_description_suggestions (
  id SERIAL PRIMARY KEY,
  map_id INTEGER NOT NULL REFERENCES maps(id),
  route_id INTEGER NOT NULL REFERENCES map_history(id),
  submitter_id TEXT NOT NULL REFERENCES users(steam_id),
  submitted_description TEXT NOT NULL,
  proposed_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  reviewed_by TEXT REFERENCES users(steam_id),
  reviewed_at TIMESTAMP
);

CREATE INDEX route_description_suggestions_pending_idx
  ON route_description_suggestions (created_at, id) WHERE status = 'pending';
