require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'gsl-weekend-class-secret-key';
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: corsOrigin.split(',').map(s => s.trim()) }));
app.use(express.json());
app.use('/api/uploads', express.static(UPLOADS_DIR));

function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

function getUserCourseRoles(userId) {
  const rows = db.prepare('SELECT course_id, role FROM course_roles WHERE user_id = ?').all(userId);
  const roles = {};
  for (const r of rows) roles[r.course_id] = r.role;
  return roles;
}

function canManageCourse(user, courseId) {
  if (user.role === 'lecturer') return true;
  const row = db.prepare('SELECT role FROM course_roles WHERE user_id = ? AND course_id = ?').get(user.id, courseId);
  return row?.role === 'course_rep';
}

function requireCourseAccess(getCourseId) {
  return (req, res, next) => {
    const courseId = getCourseId(req);
    if (!courseId) return res.status(400).json({ error: 'course_id required' });
    if (!canManageCourse(req.user, courseId)) return res.status(403).json({ error: 'Insufficient permissions for this course' });
    next();
  };
}

function makeUserPayload(user) {
  const courseRoles = getUserCourseRoles(user.id);
  return { id: user.id, full_name: user.full_name, role: user.role, avatar_initials: user.avatar_initials, courseRoles };
}

// ─── Auth ────────────────────────────────────────────
app.post('/api/auth/lookup', (req, res) => {
  const { full_name } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE LOWER(full_name) = LOWER(?)').get(full_name?.trim());
  if (!user) return res.json({ found: false });
  if (!user.approved) return res.json({ found: true, approved: false });
  res.json({ found: true, approved: true, has_pin: !!user.pin_hash, user_id: user.id });
});

app.post('/api/auth/login', (req, res) => {
  const { full_name, pin } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE LOWER(full_name) = LOWER(?)').get(full_name?.trim());
  if (!user || !user.approved) return res.status(401).json({ error: 'User not found or not approved' });
  if (!bcrypt.compareSync(pin, user.pin_hash)) return res.status(401).json({ error: 'Incorrect PIN' });
  const payload = makeUserPayload(user);
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: payload });
});

app.post('/api/auth/set-pin', (req, res) => {
  const { full_name, pin } = req.body;
  if (!pin || pin.length !== 4) return res.status(400).json({ error: 'PIN must be 4 digits' });
  const user = db.prepare('SELECT * FROM users WHERE LOWER(full_name) = LOWER(?)').get(full_name?.trim());
  if (!user || !user.approved) return res.status(404).json({ error: 'User not found' });
  const pinHash = bcrypt.hashSync(pin, 10);
  db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(pinHash, user.id);
  const payload = makeUserPayload(user);
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: payload });
});

app.post('/api/auth/waitlist', (req, res) => {
  const { full_name, email, campus, rep_code } = req.body;

  if (rep_code) {
    const code = db.prepare('SELECT * FROM rep_codes WHERE code = ? AND used = 0').get(rep_code.trim().toUpperCase());
    if (!code) return res.status(400).json({ error: 'Invalid or already-used rep code.' });
    const initials = full_name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const userId = `GSL-${uuid().slice(0, 8)}`;
    db.prepare('INSERT INTO users (id, full_name, role, approved, avatar_initials, campus) VALUES (?, ?, ?, 1, ?, ?)').run(userId, full_name.trim(), 'student', initials, campus || 'Accra');
    db.prepare('INSERT INTO course_roles (user_id, course_id, role) VALUES (?, ?, ?)').run(userId, code.course_id, 'course_rep');
    db.prepare('UPDATE rep_codes SET used = 1, used_by = ?, used_at = ? WHERE id = ?').run(userId, new Date().toISOString(), code.id);
    return res.json({ success: true, auto_approved: true, message: 'Account created! You can now sign in.' });
  }

  db.prepare('INSERT INTO waitlist (id, full_name, email, campus, created_at) VALUES (?, ?, ?, ?, ?)').run(uuid(), full_name, email, campus, new Date().toISOString());
  res.json({ success: true });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const payload = makeUserPayload(user);
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: payload });
});

// ─── Rep Codes ──────────────────────────────────────
app.get('/api/rep-codes/validate/:code', (req, res) => {
  const code = db.prepare('SELECT * FROM rep_codes WHERE code = ? AND used = 0').get(req.params.code.toUpperCase());
  if (!code) return res.json({ valid: false });
  const course = db.prepare('SELECT title FROM courses WHERE id = ?').get(code.course_id);
  res.json({ valid: true, course_title: course?.title || code.course_id });
});

app.post('/api/rep-codes', auth, requireRole('lecturer'), (req, res) => {
  const { course_id } = req.body;
  if (!course_id) return res.status(400).json({ error: 'course_id required' });
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(course_id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const code = `REP-${course.code}-${uuid().slice(0, 6).toUpperCase()}`;
  const entry = { id: uuid(), code, course_id, created_by: req.user.id, created_at: new Date().toISOString(), used: 0 };
  db.prepare('INSERT INTO rep_codes (id, code, course_id, created_by, created_at, used) VALUES (?, ?, ?, ?, ?, 0)').run(entry.id, entry.code, entry.course_id, entry.created_by, entry.created_at);
  res.json(entry);
});

app.get('/api/rep-codes', auth, requireRole('lecturer'), (req, res) => {
  const { course_id } = req.query;
  let codes;
  if (course_id) {
    codes = db.prepare('SELECT * FROM rep_codes WHERE course_id = ?').all(course_id);
  } else {
    codes = db.prepare('SELECT * FROM rep_codes').all();
  }
  res.json(codes);
});

app.get('/api/courses/:id/members', auth, requireRole('lecturer'), (req, res) => {
  const courseId = req.params.id;
  const users = db.prepare('SELECT id, full_name, avatar_initials, role FROM users WHERE approved = 1').all();
  const members = users
    .filter(u => u.role !== 'lecturer')
    .map(u => {
      const cr = db.prepare('SELECT role FROM course_roles WHERE user_id = ? AND course_id = ?').get(u.id, courseId);
      return { id: u.id, full_name: u.full_name, avatar_initials: u.avatar_initials, role: u.role, courseRole: cr?.role || null };
    });
  res.json(members);
});

app.post('/api/courses/:id/promote', auth, requireRole('lecturer'), (req, res) => {
  const courseId = req.params.id;
  const { user_id } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('INSERT OR REPLACE INTO course_roles (user_id, course_id, role) VALUES (?, ?, ?)').run(user_id, courseId, 'course_rep');
  res.json({ success: true });
});

app.post('/api/courses/:id/revoke', auth, requireRole('lecturer'), (req, res) => {
  const courseId = req.params.id;
  const { user_id } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('DELETE FROM course_roles WHERE user_id = ? AND course_id = ?').run(user_id, courseId);
  res.json({ success: true });
});

// ─── Courses ─────────────────────────────────────────
app.get('/api/courses', auth, (req, res) => {
  const courses = db.prepare('SELECT * FROM courses ORDER BY title').all();
  const result = courses.map(c => {
    const materialCount = db.prepare('SELECT COUNT(*) as cnt FROM materials WHERE course_id = ? AND category = ?').get(c.id, 'material').cnt;
    const pastQuestionCount = db.prepare('SELECT COUNT(*) as cnt FROM materials WHERE course_id = ? AND category = ?').get(c.id, 'past_question').cnt;
    const tutorialCount = db.prepare('SELECT COUNT(*) as cnt FROM tutorials WHERE course_id = ?').get(c.id).cnt;
    return { ...c, material_count: materialCount, past_question_count: pastQuestionCount, tutorial_count: tutorialCount, resource_count: materialCount + pastQuestionCount + tutorialCount };
  });
  res.json(result);
});

app.get('/api/courses/:id', auth, (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Not found' });
  const materials = db.prepare('SELECT * FROM materials WHERE course_id = ?').all(req.params.id);
  const tutorials = db.prepare('SELECT * FROM tutorials WHERE course_id = ?').all(req.params.id);
  const userCanManage = canManageCourse(req.user, req.params.id);
  res.json({ ...course, materials, tutorials, userCanManage });
});

// ─── Materials ───────────────────────────────────────
app.get('/api/materials', auth, (req, res) => {
  const { category, course_id, search } = req.query;
  let sql = 'SELECT * FROM materials WHERE 1=1';
  const params = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (course_id) { sql += ' AND course_id = ?'; params.push(course_id); }
  if (search) { sql += ' AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)'; params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`); }
  sql += ' ORDER BY uploaded_at DESC';
  const results = db.prepare(sql).all(...params);
  const enriched = results.map(m => {
    const course = db.prepare('SELECT title, code FROM courses WHERE id = ?').get(m.course_id);
    return { ...m, course_title: course?.title, course_code: course?.code };
  });
  res.json(enriched);
});

app.post('/api/materials/upload', auth, upload.single('file'), (req, res) => {
  const courseId = req.body.course_id;
  if (!canManageCourse(req.user, courseId)) return res.status(403).json({ error: 'Insufficient permissions for this course' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { course_id, category, title, description } = req.body;
  if (!course_id || !category) return res.status(400).json({ error: 'course_id and category required' });
  const id = uuid();
  const uploadedAt = new Date().toISOString();
  db.prepare('INSERT INTO materials (id, title, description, filename, path, course_id, category, uploaded_by, uploader_name, uploaded_at, downloads) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)')
    .run(id, title || req.file.originalname, description || '', req.file.originalname, req.file.filename, course_id, category, req.user.id, req.user.full_name, uploadedAt);
  const course = db.prepare('SELECT title, code FROM courses WHERE id = ?').get(course_id);
  res.json({ id, title: title || req.file.originalname, description: description || '', filename: req.file.originalname, path: req.file.filename, course_id, category, uploaded_by: req.user.id, uploader_name: req.user.full_name, uploaded_at: uploadedAt, downloads: 0, course_title: course?.title, course_code: course?.code });
});

app.delete('/api/materials/:id', auth, (req, res) => {
  const mat = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
  if (!mat) return res.status(404).json({ error: 'Not found' });
  if (!canManageCourse(req.user, mat.course_id)) return res.status(403).json({ error: 'Insufficient permissions for this course' });
  db.prepare('DELETE FROM materials WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM bookmarks WHERE material_id = ?').run(req.params.id);
  if (mat.path) {
    const filePath = path.join(UPLOADS_DIR, mat.path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  res.json({ success: true });
});

app.post('/api/materials/:id/download', auth, (req, res) => {
  db.prepare('UPDATE materials SET downloads = downloads + 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Bookmarks ───────────────────────────────────────
app.get('/api/bookmarks', auth, (req, res) => {
  const bookmarks = db.prepare(`
    SELECT b.*, m.title, m.description FROM bookmarks b
    LEFT JOIN materials m ON m.id = b.material_id
    WHERE b.user_id = ?
  `).all(req.user.id);
  res.json(bookmarks);
});

app.post('/api/bookmarks', auth, (req, res) => {
  const { material_id } = req.body;
  const existing = db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND material_id = ?').get(req.user.id, material_id);
  if (existing) {
    db.prepare('DELETE FROM bookmarks WHERE id = ?').run(existing.id);
    return res.json({ success: true, removed: true });
  }
  db.prepare('INSERT INTO bookmarks (id, user_id, material_id, created_at) VALUES (?, ?, ?, ?)').run(uuid(), req.user.id, material_id, new Date().toISOString());
  res.json({ success: true });
});

// ─── Tutorials ───────────────────────────────────────
app.get('/api/tutorials', auth, (req, res) => {
  const { course_id } = req.query;
  let tutorials;
  if (course_id) {
    tutorials = db.prepare('SELECT * FROM tutorials WHERE course_id = ? ORDER BY date').all(course_id);
  } else {
    tutorials = db.prepare('SELECT * FROM tutorials ORDER BY date').all();
  }
  const enriched = tutorials.map(t => {
    const course = db.prepare('SELECT title FROM courses WHERE id = ?').get(t.course_id);
    return { ...t, course_title: course?.title || t.course_title };
  });
  res.json(enriched);
});

app.post('/api/tutorials', auth, requireCourseAccess(req => req.body.course_id), (req, res) => {
  const { course_id, title, date, link, description } = req.body;
  if (!course_id || !title) return res.status(400).json({ error: 'course_id and title required' });
  const course = db.prepare('SELECT title FROM courses WHERE id = ?').get(course_id);
  const id = uuid();
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO tutorials (id, course_id, title, description, date, link, created_by, creator_name, course_title, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, course_id, title, description || '', date || '', link || '', req.user.id, req.user.full_name, course?.title || '', createdAt);
  res.json({ id, course_id, title, description: description || '', date: date || '', link: link || '', created_by: req.user.id, creator_name: req.user.full_name, course_title: course?.title || '', created_at: createdAt });
});

app.put('/api/tutorials/:id', auth, (req, res) => {
  const t = db.prepare('SELECT * FROM tutorials WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (!canManageCourse(req.user, t.course_id)) return res.status(403).json({ error: 'Insufficient permissions for this course' });
  const { title, date, link, description } = req.body;
  db.prepare('UPDATE tutorials SET title = COALESCE(?, title), date = COALESCE(?, date), link = COALESCE(?, link), description = COALESCE(?, description) WHERE id = ?')
    .run(title ?? null, date ?? null, link ?? null, description ?? null, req.params.id);
  const updated = db.prepare('SELECT * FROM tutorials WHERE id = ?').get(req.params.id);
  res.json(updated);
});

app.delete('/api/tutorials/:id', auth, (req, res) => {
  const t = db.prepare('SELECT * FROM tutorials WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (!canManageCourse(req.user, t.course_id)) return res.status(403).json({ error: 'Insufficient permissions for this course' });
  db.prepare('DELETE FROM tutorials WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Dashboard ───────────────────────────────────────
app.get('/api/dashboard', auth, (req, res) => {
  const courses_count = db.prepare('SELECT COUNT(*) as cnt FROM courses').get().cnt;
  const materials_count = db.prepare("SELECT COUNT(*) as cnt FROM materials WHERE category = 'material'").get().cnt;
  const past_questions_count = db.prepare("SELECT COUNT(*) as cnt FROM materials WHERE category = 'past_question'").get().cnt;
  const tutorials_count = db.prepare('SELECT COUNT(*) as cnt FROM tutorials').get().cnt;
  const recentMaterials = db.prepare('SELECT * FROM materials ORDER BY uploaded_at DESC LIMIT 5').all().map(m => {
    const course = db.prepare('SELECT title FROM courses WHERE id = ?').get(m.course_id);
    return { ...m, course_title: course?.title };
  });
  res.json({ courses_count, materials_count, past_questions_count, tutorials_count, recent_materials: recentMaterials });
});

// ─── Search ──────────────────────────────────────────
app.get('/api/search', auth, (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ materials: [], courses: [], tutorials: [] });
  const like = `%${q.toLowerCase()}%`;
  res.json({
    materials: db.prepare('SELECT * FROM materials WHERE LOWER(title) LIKE ? OR LOWER(description) LIKE ? LIMIT 10').all(like, like),
    courses: db.prepare('SELECT * FROM courses WHERE LOWER(title) LIKE ? OR LOWER(description) LIKE ? LIMIT 5').all(like, like),
    tutorials: db.prepare('SELECT * FROM tutorials WHERE LOWER(title) LIKE ? OR LOWER(description) LIKE ? LIMIT 5').all(like, like),
  });
});

// ─── Serve React build in production ─────────────────
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// ─── Global error handler ────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
