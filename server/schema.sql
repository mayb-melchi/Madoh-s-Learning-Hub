CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  pin_hash TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  approved INTEGER NOT NULL DEFAULT 0,
  avatar_initials TEXT,
  campus TEXT DEFAULT 'Accra'
);

CREATE TABLE IF NOT EXISTS course_roles (
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'course_rep',
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  category TEXT,
  lecturer TEXT
);

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  filename TEXT,
  path TEXT,
  course_id TEXT NOT NULL,
  category TEXT NOT NULL,
  uploaded_by TEXT,
  uploader_name TEXT,
  uploaded_at TEXT,
  downloads INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tutorials (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT,
  link TEXT,
  created_by TEXT,
  creator_name TEXT,
  course_title TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  campus TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS rep_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  course_id TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT,
  used INTEGER DEFAULT 0,
  used_by TEXT,
  used_at TEXT
);
