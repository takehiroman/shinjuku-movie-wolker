CREATE TABLE IF NOT EXISTS theaters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS movies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS screenings (
  id TEXT PRIMARY KEY,
  theater_id TEXT NOT NULL,
  movie_id TEXT NOT NULL,
  screen_name TEXT,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  tags TEXT,
  target_date TEXT NOT NULL,
  source_type TEXT,
  source_ref TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (theater_id) REFERENCES theaters(id),
  FOREIGN KEY (movie_id) REFERENCES movies(id)
);

CREATE INDEX IF NOT EXISTS idx_screenings_target_date
  ON screenings(target_date);

CREATE INDEX IF NOT EXISTS idx_screenings_theater_target_date
  ON screenings(theater_id, target_date);

CREATE INDEX IF NOT EXISTS idx_screenings_movie_target_date
  ON screenings(movie_id, target_date);

CREATE INDEX IF NOT EXISTS idx_screenings_start_at
  ON screenings(start_at);

CREATE TABLE IF NOT EXISTS theater_travel_times (
  from_theater_id TEXT NOT NULL,
  to_theater_id TEXT NOT NULL,
  travel_minutes INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (from_theater_id, to_theater_id),
  FOREIGN KEY (from_theater_id) REFERENCES theaters(id),
  FOREIGN KEY (to_theater_id) REFERENCES theaters(id)
);

CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY,
  buffer_minutes INTEGER NOT NULL,
  enabled_theater_ids TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
