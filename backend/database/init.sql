CREATE TABLE users (
  steam_id TEXT,
  user_name TEXT NOT NULL,
  avatar_link TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  p2sr TEXT NOT NULL DEFAULT '-',
  steam TEXT NOT NULL DEFAULT '-',
  youtube TEXT NOT NULL DEFAULT '-',
  twitch TEXT NOT NULL DEFAULT '-',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (steam_id)
);

CREATE TRIGGER "users"
AFTER UPDATE OR DELETE ON "users"
FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TABLE games (
  id SERIAL,
  name TEXT NOT NULL,
  is_coop BOOLEAN NOT NULL,
  image TEXT NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE chapters (
  id SERIAL,
  game_id SMALLINT NOT NULL,
  name TEXT NOT NULL,
  is_disabled BOOLEAN NOT NULL DEFAULT false,
  image TEXT NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (game_id) REFERENCES games(id)
);

CREATE TABLE categories (
  id SERIAL,
  name TEXT NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE game_categories (
  id SERIAL,
  game_id SMALLINT NOT NULL,
  category_id SMALLINT NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE maps (
  id SERIAL,
  game_id SMALLINT NOT NULL,
  chapter_id SMALLINT NOT NULL,
  name TEXT NOT NULL,
  is_disabled BOOLEAN NOT NULL DEFAULT false,
  image TEXT NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (chapter_id) REFERENCES chapters(id)
);

CREATE TABLE map_history (
  id SERIAL,
  map_id SMALLINT NOT NULL,
  category_id SMALLINT NOT NULL,
  user_name TEXT NOT NULL,
  score_count SMALLINT NOT NULL,
  description TEXT NOT NULL,
  showcase TEXT NOT NULL DEFAULT '',
  record_date DATE NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (map_id) REFERENCES maps(id),
  UNIQUE (map_id, category_id, score_count)
);

CREATE TRIGGER "map_history"
AFTER INSERT OR UPDATE OR DELETE ON "map_history"
FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TABLE map_ratings (
  id SERIAL,
  map_id SMALLINT NOT NULL,
  category_id SMALLINT NOT NULL,
  user_id TEXT NOT NULL,
  rating SMALLINT NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (map_id) REFERENCES maps(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (user_id) REFERENCES users(steam_id)
);

CREATE TABLE map_discussions (
  id SERIAL,
  map_id SMALLINT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (id),
  FOREIGN KEY (map_id) REFERENCES maps(id),
  FOREIGN KEY (user_id) REFERENCES users(steam_id)
);

CREATE TRIGGER "map_discussions"
AFTER INSERT OR UPDATE OR DELETE ON "map_discussions"
FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TABLE map_discussions_comments (
  id SERIAL,
  discussion_id INT NOT NULL,
  user_id TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (discussion_id) REFERENCES map_discussions(id),
  FOREIGN KEY (user_id) REFERENCES users(steam_id)
);

CREATE TRIGGER "map_discussions_comments"
AFTER INSERT OR UPDATE OR DELETE ON "map_discussions_comments"
FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TABLE map_discussions_upvotes (
  id SERIAL,
  discussion_id INT NOT NULL,
  user_id TEXT NOT NULL,
  upvoted BOOLEAN NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (discussion_id) REFERENCES map_discussions(id),
  FOREIGN KEY (user_id) REFERENCES users(steam_id)
);

CREATE TABLE demos (
  id UUID,
  PRIMARY KEY (id)
);

CREATE TABLE records_sp (
  id SERIAL,
  map_id SMALLINT NOT NULL,
  user_id TEXT NOT NULL,
  score_count SMALLINT NOT NULL,
  score_time INTEGER NOT NULL,
  demo_id UUID NOT NULL,
  record_date TIMESTAMP NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (id),
  FOREIGN KEY (map_id) REFERENCES maps(id),
  FOREIGN KEY (user_id) REFERENCES users(steam_id),
  FOREIGN KEY (demo_id) REFERENCES demos(id)
);

CREATE TRIGGER "records_sp"
AFTER INSERT OR UPDATE OR DELETE ON "records_sp"
FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TABLE records_mp (
  id SERIAL,
  map_id SMALLINT NOT NULL,
  host_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  score_count SMALLINT NOT NULL,
  score_time INTEGER NOT NULL,
  host_demo_id UUID NOT NULL,
  partner_demo_id UUID NOT NULL,
  record_date TIMESTAMP NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (id),
  FOREIGN KEY (map_id) REFERENCES maps(id),
  FOREIGN KEY (host_id) REFERENCES users(steam_id),
  FOREIGN KEY (partner_id) REFERENCES users(steam_id),
  FOREIGN KEY (host_demo_id) REFERENCES demos(id),
  FOREIGN KEY (partner_demo_id) REFERENCES demos(id)
);

CREATE TRIGGER "records_mp"
AFTER INSERT OR UPDATE OR DELETE ON "records_mp"
FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TABLE titles (
  id SERIAL,
  title_name TEXT NOT NULL,
  title_color CHAR(6) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE user_titles (
  title_id INT NOT NULL,
  user_id TEXT NOT NULL,
  FOREIGN KEY (title_id) REFERENCES titles(id),
  FOREIGN KEY (user_id) REFERENCES users(steam_id)
);

CREATE TABLE countries (
  country_code CHAR(2),
  country_name TEXT NOT NULL,
  PRIMARY KEY (country_code)
);

CREATE TABLE audit (
    id SERIAL,
    table_name TEXT NOT NULL,
    operation_type TEXT NOT NULL, -- 'INSERT', 'UPDATE', or 'DELETE'
    old_data JSONB,
    new_data JSONB,
    changed_by TEXT NOT NULL,
    changed_at TIMESTAMP DEFAULT now(),
    PRIMARY KEY (id),
    FOREIGN KEY (changed_by) REFERENCES users(steam_id)
);
