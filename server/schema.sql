-- PostgreSQL schema for Madoh's Learning Hub

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
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  storage_path TEXT,
  file_url TEXT,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  uploader_name TEXT,
  uploaded_at TEXT,
  downloads INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tutorials (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT,
  link TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  creator_name TEXT,
  course_title TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
  pinned INTEGER DEFAULT 0,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS tutorial_registrations (
  tutorial_id TEXT NOT NULL REFERENCES tutorials(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT,
  registered_at TEXT,
  PRIMARY KEY (tutorial_id, user_id)
);

-- Performance indexes for 500-1000 concurrent users
CREATE INDEX IF NOT EXISTS idx_materials_course ON materials(course_id);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_uploaded_at ON materials(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_roles_user ON course_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_course_roles_course ON course_roles(course_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorials_course ON tutorials(course_id);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(full_name);
CREATE INDEX IF NOT EXISTS idx_rep_codes_code ON rep_codes(code);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tutorial_reg_tutorial ON tutorial_registrations(tutorial_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_reg_user ON tutorial_registrations(user_id);
