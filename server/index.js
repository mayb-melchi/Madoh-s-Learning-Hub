require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'gsl-weekend-class-secret-key';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const STORAGE_BUCKET = process.env.SUPABASE_BUCKET || 'materials';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: corsOrigin.split(',').map(s => s.trim()) }));
app.use(compression());
app.use(express.json());

// ─── Helpers ─────────────────────────────────────────

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

async function getUserCourseRoles(userId) {
  const { rows } = await pool.query('SELECT course_id, role FROM course_roles WHERE user_id = $1', [userId]);
  const roles = {};
  for (const r of rows) roles[r.course_id] = r.role;
  return roles;
}

async function canManageCourse(user, courseId) {
  if (user.role === 'lecturer') return true;
  const { rows } = await pool.query('SELECT role FROM course_roles WHERE user_id = $1 AND course_id = $2', [user.id, courseId]);
  return rows[0]?.role === 'course_rep';
}

function requireCourseAccess(getCourseId) {
  return async (req, res, next) => {
    const courseId = getCourseId(req);
    if (!courseId) return res.status(400).json({ error: 'course_id required' });
    if (!(await canManageCourse(req.user, courseId))) return res.status(403).json({ error: 'Insufficient permissions for this course' });
    next();
  };
}

async function makeUserPayload(user) {
  const courseRoles = await getUserCourseRoles(user.id);
  return { id: user.id, full_name: user.full_name, role: user.role, avatar_initials: user.avatar_initials, courseRoles };
}

async function uploadToStorage(fileBuffer, mimeType, storagePath) {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, fileBuffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function deleteFromStorage(storagePath) {
  if (!storagePath) return;
  await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
}

// ─── Auth ────────────────────────────────────────────
app.post('/api/auth/lookup', async (req, res, next) => {
  try {
    const { full_name } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(full_name) = LOWER($1)', [full_name?.trim()]);
    const user = rows[0];
    if (!user) return res.json({ found: false });
    if (!user.approved) return res.json({ found: true, approved: false });
    res.json({ found: true, approved: true, has_pin: !!user.pin_hash, user_id: user.id });
  } catch (err) { next(err); }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { full_name, pin } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(full_name) = LOWER($1)', [full_name?.trim()]);
    const user = rows[0];
    if (!user || !user.approved) return res.status(401).json({ error: 'User not found or not approved' });
    if (!bcrypt.compareSync(pin, user.pin_hash)) return res.status(401).json({ error: 'Incorrect PIN' });
    const payload = await makeUserPayload(user);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: payload });
  } catch (err) { next(err); }
});

app.post('/api/auth/set-pin', async (req, res, next) => {
  try {
    const { full_name, pin } = req.body;
    if (!pin || pin.length !== 4) return res.status(400).json({ error: 'PIN must be 4 digits' });
    const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(full_name) = LOWER($1)', [full_name?.trim()]);
    const user = rows[0];
    if (!user || !user.approved) return res.status(404).json({ error: 'User not found' });
    const pinHash = bcrypt.hashSync(pin, 10);
    await pool.query('UPDATE users SET pin_hash = $1 WHERE id = $2', [pinHash, user.id]);
    const payload = await makeUserPayload(user);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: payload });
  } catch (err) { next(err); }
});

app.post('/api/auth/waitlist', async (req, res, next) => {
  try {
    const { full_name, email, campus, rep_code } = req.body;

    if (rep_code) {
      const { rows } = await pool.query('SELECT * FROM rep_codes WHERE code = $1 AND used = 0', [rep_code.trim().toUpperCase()]);
      const code = rows[0];
      if (!code) return res.status(400).json({ error: 'Invalid or already-used rep code.' });
      const initials = full_name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const userId = `GSL-${uuid().slice(0, 8)}`;
      await pool.query('INSERT INTO users (id, full_name, role, approved, avatar_initials, campus) VALUES ($1, $2, $3, 1, $4, $5)', [userId, full_name.trim(), 'student', initials, campus || 'Accra']);
      await pool.query('INSERT INTO course_roles (user_id, course_id, role) VALUES ($1, $2, $3)', [userId, code.course_id, 'course_rep']);
      await pool.query('UPDATE rep_codes SET used = 1, used_by = $1, used_at = $2 WHERE id = $3', [userId, new Date().toISOString(), code.id]);
      return res.json({ success: true, auto_approved: true, message: 'Account created! You can now sign in.' });
    }

    await pool.query('INSERT INTO waitlist (id, full_name, email, campus, created_at) VALUES ($1, $2, $3, $4, $5)', [uuid(), full_name, email, campus, new Date().toISOString()]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

app.get('/api/auth/me', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const payload = await makeUserPayload(user);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: payload });
  } catch (err) { next(err); }
});

// ─── Rep Codes ──────────────────────────────────────
app.get('/api/rep-codes/validate/:code', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM rep_codes WHERE code = $1 AND used = 0', [req.params.code.toUpperCase()]);
    const code = rows[0];
    if (!code) return res.json({ valid: false });
    const { rows: courseRows } = await pool.query('SELECT title FROM courses WHERE id = $1', [code.course_id]);
    res.json({ valid: true, course_title: courseRows[0]?.title || code.course_id });
  } catch (err) { next(err); }
});

app.post('/api/rep-codes', auth, requireRole('lecturer'), async (req, res, next) => {
  try {
    const { course_id } = req.body;
    if (!course_id) return res.status(400).json({ error: 'course_id required' });
    const { rows } = await pool.query('SELECT * FROM courses WHERE id = $1', [course_id]);
    const course = rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const code = `REP-${course.code}-${uuid().slice(0, 6).toUpperCase()}`;
    const entry = { id: uuid(), code, course_id, created_by: req.user.id, created_at: new Date().toISOString() };
    await pool.query('INSERT INTO rep_codes (id, code, course_id, created_by, created_at, used) VALUES ($1, $2, $3, $4, $5, 0)', [entry.id, entry.code, entry.course_id, entry.created_by, entry.created_at]);
    res.json(entry);
  } catch (err) { next(err); }
});

app.get('/api/rep-codes', auth, requireRole('lecturer'), async (req, res, next) => {
  try {
    const { course_id } = req.query;
    const { rows } = course_id
      ? await pool.query('SELECT * FROM rep_codes WHERE course_id = $1', [course_id])
      : await pool.query('SELECT * FROM rep_codes');
    res.json(rows);
  } catch (err) { next(err); }
});

// ─── Course Members / Promote / Revoke ───────────────
app.get('/api/courses/:id/members', auth, requireRole('lecturer'), async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { rows: users } = await pool.query('SELECT id, full_name, avatar_initials, role FROM users WHERE approved = 1 AND role != $1', ['lecturer']);
    const members = await Promise.all(users.map(async u => {
      const { rows } = await pool.query('SELECT role FROM course_roles WHERE user_id = $1 AND course_id = $2', [u.id, courseId]);
      return { ...u, courseRole: rows[0]?.role || null };
    }));
    res.json(members);
  } catch (err) { next(err); }
});

app.post('/api/courses/:id/promote', auth, requireRole('lecturer'), async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { user_id } = req.body;
    const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    await pool.query('INSERT INTO course_roles (user_id, course_id, role) VALUES ($1, $2, $3) ON CONFLICT (user_id, course_id) DO UPDATE SET role = $3', [user_id, courseId, 'course_rep']);
    res.json({ success: true });
  } catch (err) { next(err); }
});

app.post('/api/courses/:id/revoke', auth, requireRole('lecturer'), async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { user_id } = req.body;
    const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    await pool.query('DELETE FROM course_roles WHERE user_id = $1 AND course_id = $2', [user_id, courseId]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Courses ─────────────────────────────────────────
app.get('/api/courses', auth, async (req, res, next) => {
  try {
    const { rows: courses } = await pool.query('SELECT * FROM courses ORDER BY title');
    const result = await Promise.all(courses.map(async c => {
      const { rows: counts } = await pool.query(`
        SELECT
          SUM(CASE WHEN category = 'material' THEN 1 ELSE 0 END) AS material_count,
          SUM(CASE WHEN category = 'past_question' THEN 1 ELSE 0 END) AS past_question_count
        FROM materials WHERE course_id = $1
      `, [c.id]);
      const { rows: tutRows } = await pool.query('SELECT COUNT(*) AS tutorial_count FROM tutorials WHERE course_id = $1', [c.id]);
      const mc = parseInt(counts[0]?.material_count || 0);
      const pqc = parseInt(counts[0]?.past_question_count || 0);
      const tc = parseInt(tutRows[0]?.tutorial_count || 0);
      return { ...c, material_count: mc, past_question_count: pqc, tutorial_count: tc, resource_count: mc + pqc + tc };
    }));
    res.json(result);
  } catch (err) { next(err); }
});

app.get('/api/courses/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM courses WHERE id = $1', [req.params.id]);
    const course = rows[0];
    if (!course) return res.status(404).json({ error: 'Not found' });
    const { rows: materials } = await pool.query('SELECT * FROM materials WHERE course_id = $1 ORDER BY uploaded_at DESC', [req.params.id]);
    const { rows: tutorials } = await pool.query('SELECT * FROM tutorials WHERE course_id = $1 ORDER BY date', [req.params.id]);
    const userCanManage = await canManageCourse(req.user, req.params.id);
    res.json({ ...course, materials, tutorials, userCanManage });
  } catch (err) { next(err); }
});

// ─── Materials ───────────────────────────────────────
app.get('/api/materials', auth, async (req, res, next) => {
  try {
    const { category, course_id, search } = req.query;
    let sql = 'SELECT m.*, c.title AS course_title, c.code AS course_code FROM materials m LEFT JOIN courses c ON c.id = m.course_id WHERE 1=1';
    const params = [];
    let i = 1;
    if (category) { sql += ` AND m.category = $${i++}`; params.push(category); }
    if (course_id) { sql += ` AND m.course_id = $${i++}`; params.push(course_id); }
    if (search) { sql += ` AND (LOWER(m.title) LIKE $${i} OR LOWER(m.description) LIKE $${i})`; params.push(`%${search.toLowerCase()}%`); i++; }
    sql += ' ORDER BY m.uploaded_at DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

app.post('/api/materials/upload', auth, upload.single('file'), async (req, res, next) => {
  try {
    const courseId = req.body.course_id;
    if (!(await canManageCourse(req.user, courseId))) return res.status(403).json({ error: 'Insufficient permissions for this course' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { course_id, category, title, description } = req.body;
    if (!course_id || !category) return res.status(400).json({ error: 'course_id and category required' });

    const id = uuid();
    const ext = path.extname(req.file.originalname).toLowerCase();
    const storagePath = `${course_id}/${id}${ext}`;
    const fileUrl = await uploadToStorage(req.file.buffer, req.file.mimetype, storagePath);

    const uploadedAt = new Date().toISOString();
    await pool.query(
      'INSERT INTO materials (id, title, description, filename, storage_path, file_url, course_id, category, uploaded_by, uploader_name, uploaded_at, downloads) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0)',
      [id, title || req.file.originalname, description || '', req.file.originalname, storagePath, fileUrl, course_id, category, req.user.id, req.user.full_name, uploadedAt]
    );

    const { rows } = await pool.query('SELECT title, code FROM courses WHERE id = $1', [course_id]);
    res.json({ id, title: title || req.file.originalname, description: description || '', filename: req.file.originalname, storage_path: storagePath, file_url: fileUrl, course_id, category, uploaded_by: req.user.id, uploader_name: req.user.full_name, uploaded_at: uploadedAt, downloads: 0, course_title: rows[0]?.title, course_code: rows[0]?.code });
  } catch (err) { next(err); }
});

app.delete('/api/materials/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM materials WHERE id = $1', [req.params.id]);
    const mat = rows[0];
    if (!mat) return res.status(404).json({ error: 'Not found' });
    if (!(await canManageCourse(req.user, mat.course_id))) return res.status(403).json({ error: 'Insufficient permissions for this course' });
    await pool.query('DELETE FROM materials WHERE id = $1', [req.params.id]);
    await pool.query('DELETE FROM bookmarks WHERE material_id = $1', [req.params.id]);
    await deleteFromStorage(mat.storage_path);
    res.json({ success: true });
  } catch (err) { next(err); }
});

app.post('/api/materials/:id/download', auth, async (req, res, next) => {
  try {
    await pool.query('UPDATE materials SET downloads = downloads + 1 WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Bookmarks ───────────────────────────────────────
app.get('/api/bookmarks', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.*, m.title, m.description FROM bookmarks b
      LEFT JOIN materials m ON m.id = b.material_id
      WHERE b.user_id = $1
    `, [req.user.id]);
    res.json(rows);
  } catch (err) { next(err); }
});

app.post('/api/bookmarks', auth, async (req, res, next) => {
  try {
    const { material_id } = req.body;
    const { rows } = await pool.query('SELECT id FROM bookmarks WHERE user_id = $1 AND material_id = $2', [req.user.id, material_id]);
    if (rows[0]) {
      await pool.query('DELETE FROM bookmarks WHERE id = $1', [rows[0].id]);
      return res.json({ success: true, removed: true });
    }
    await pool.query('INSERT INTO bookmarks (id, user_id, material_id, created_at) VALUES ($1, $2, $3, $4)', [uuid(), req.user.id, material_id, new Date().toISOString()]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Tutorials ───────────────────────────────────────
app.get('/api/tutorials', auth, async (req, res, next) => {
  try {
    const { course_id } = req.query;
    const { rows } = course_id
      ? await pool.query('SELECT t.*, c.title AS course_title FROM tutorials t LEFT JOIN courses c ON c.id = t.course_id WHERE t.course_id = $1 ORDER BY t.date', [course_id])
      : await pool.query('SELECT t.*, c.title AS course_title FROM tutorials t LEFT JOIN courses c ON c.id = t.course_id ORDER BY t.date');
    res.json(rows);
  } catch (err) { next(err); }
});

app.post('/api/tutorials', auth, requireCourseAccess(req => req.body.course_id), async (req, res, next) => {
  try {
    const { course_id, title, date, link, description } = req.body;
    if (!course_id || !title) return res.status(400).json({ error: 'course_id and title required' });
    const { rows } = await pool.query('SELECT title FROM courses WHERE id = $1', [course_id]);
    const id = uuid();
    const createdAt = new Date().toISOString();
    await pool.query(
      'INSERT INTO tutorials (id, course_id, title, description, date, link, created_by, creator_name, course_title, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [id, course_id, title, description || '', date || '', link || '', req.user.id, req.user.full_name, rows[0]?.title || '', createdAt]
    );
    res.json({ id, course_id, title, description: description || '', date: date || '', link: link || '', created_by: req.user.id, creator_name: req.user.full_name, course_title: rows[0]?.title || '', created_at: createdAt });
  } catch (err) { next(err); }
});

app.put('/api/tutorials/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tutorials WHERE id = $1', [req.params.id]);
    const t = rows[0];
    if (!t) return res.status(404).json({ error: 'Not found' });
    if (!(await canManageCourse(req.user, t.course_id))) return res.status(403).json({ error: 'Insufficient permissions for this course' });
    const { title, date, link, description } = req.body;
    await pool.query(`
      UPDATE tutorials SET
        title = COALESCE($1, title),
        date = COALESCE($2, date),
        link = COALESCE($3, link),
        description = COALESCE($4, description)
      WHERE id = $5
    `, [title ?? null, date ?? null, link ?? null, description ?? null, req.params.id]);
    const { rows: updated } = await pool.query('SELECT * FROM tutorials WHERE id = $1', [req.params.id]);
    res.json(updated[0]);
  } catch (err) { next(err); }
});

app.delete('/api/tutorials/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tutorials WHERE id = $1', [req.params.id]);
    const t = rows[0];
    if (!t) return res.status(404).json({ error: 'Not found' });
    if (!(await canManageCourse(req.user, t.course_id))) return res.status(403).json({ error: 'Insufficient permissions for this course' });
    await pool.query('DELETE FROM tutorials WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Dashboard ───────────────────────────────────────
app.get('/api/dashboard', auth, async (req, res, next) => {
  try {
    const [coursesRes, materialsRes, tutorialsRes, recentRes] = await Promise.all([
      pool.query('SELECT COUNT(*) AS cnt FROM courses'),
      pool.query("SELECT SUM(CASE WHEN category='material' THEN 1 ELSE 0 END) AS materials_count, SUM(CASE WHEN category='past_question' THEN 1 ELSE 0 END) AS past_questions_count FROM materials"),
      pool.query('SELECT COUNT(*) AS cnt FROM tutorials'),
      pool.query('SELECT m.*, c.title AS course_title FROM materials m LEFT JOIN courses c ON c.id = m.course_id ORDER BY m.uploaded_at DESC LIMIT 5'),
    ]);
    res.json({
      courses_count: parseInt(coursesRes.rows[0].cnt),
      materials_count: parseInt(materialsRes.rows[0].materials_count || 0),
      past_questions_count: parseInt(materialsRes.rows[0].past_questions_count || 0),
      tutorials_count: parseInt(tutorialsRes.rows[0].cnt),
      recent_materials: recentRes.rows,
    });
  } catch (err) { next(err); }
});

// ─── Search ──────────────────────────────────────────
app.get('/api/search', auth, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ materials: [], courses: [], tutorials: [] });
    const like = `%${q.toLowerCase()}%`;
    const [matRes, courseRes, tutRes] = await Promise.all([
      pool.query('SELECT * FROM materials WHERE LOWER(title) LIKE $1 OR LOWER(description) LIKE $1 LIMIT 10', [like]),
      pool.query('SELECT * FROM courses WHERE LOWER(title) LIKE $1 OR LOWER(description) LIKE $1 LIMIT 5', [like]),
      pool.query('SELECT * FROM tutorials WHERE LOWER(title) LIKE $1 OR LOWER(description) LIKE $1 LIMIT 5', [like]),
    ]);
    res.json({ materials: matRes.rows, courses: courseRes.rows, tutorials: tutRes.rows });
  } catch (err) { next(err); }
});

// ─── Announcements ──────────────────────────────────
app.get('/api/announcements', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC');
    res.json(rows);
  } catch (err) { next(err); }
});

app.post('/api/announcements', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'lecturer') {
      const { rows } = await pool.query('SELECT course_id FROM course_roles WHERE user_id = $1', [req.user.id]);
      if (rows.length === 0) return res.status(403).json({ error: 'Only lecturers and course reps can post announcements' });
    }
    const { title, body, course_id, pinned } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });
    const id = uuid();
    const createdAt = new Date().toISOString();
    await pool.query(
      'INSERT INTO announcements (id, title, body, course_id, pinned, author_id, author_name, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [id, title, body, course_id || null, pinned ? 1 : 0, req.user.id, req.user.full_name, createdAt]
    );
    res.json({ id, title, body, course_id: course_id || null, pinned: pinned ? 1 : 0, author_id: req.user.id, author_name: req.user.full_name, created_at: createdAt });
  } catch (err) { next(err); }
});

app.delete('/api/announcements/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM announcements WHERE id = $1', [req.params.id]);
    const ann = rows[0];
    if (!ann) return res.status(404).json({ error: 'Not found' });
    if (ann.author_id !== req.user.id && req.user.role !== 'lecturer') return res.status(403).json({ error: 'Not authorized' });
    await pool.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Tutorial Registration ──────────────────────────
app.get('/api/tutorials/:id/registrations', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tutorial_registrations WHERE tutorial_id = $1', [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
});

app.post('/api/tutorials/:id/register', auth, async (req, res, next) => {
  try {
    const tutorialId = req.params.id;
    const { rows: existing } = await pool.query('SELECT * FROM tutorial_registrations WHERE tutorial_id = $1 AND user_id = $2', [tutorialId, req.user.id]);
    if (existing[0]) return res.json({ success: true, already: true });
    await pool.query(
      'INSERT INTO tutorial_registrations (tutorial_id, user_id, user_name, registered_at) VALUES ($1, $2, $3, $4)',
      [tutorialId, req.user.id, req.user.full_name, new Date().toISOString()]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

app.delete('/api/tutorials/:id/register', auth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM tutorial_registrations WHERE tutorial_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Waitlist Management ────────────────────────────
app.get('/api/waitlist', auth, requireRole('lecturer'), async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM waitlist ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { next(err); }
});

app.post('/api/waitlist/:id/approve', auth, requireRole('lecturer'), async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM waitlist WHERE id = $1', [req.params.id]);
    const entry = rows[0];
    if (!entry) return res.status(404).json({ error: 'Not found' });
    const initials = entry.full_name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const userId = `GSL-${uuid().slice(0, 8)}`;
    await pool.query('INSERT INTO users (id, full_name, role, approved, avatar_initials, campus) VALUES ($1, $2, $3, 1, $4, $5)', [userId, entry.full_name, 'student', initials, entry.campus || 'Accra']);
    await pool.query('DELETE FROM waitlist WHERE id = $1', [req.params.id]);
    res.json({ success: true, user_id: userId });
  } catch (err) { next(err); }
});

app.delete('/api/waitlist/:id', auth, requireRole('lecturer'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM waitlist WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Notifications ──────────────────────────────────
app.get('/api/notifications', auth, async (req, res, next) => {
  try {
    const [annRes, matRes] = await Promise.all([
      pool.query('SELECT id, title, author_name, created_at FROM announcements ORDER BY created_at DESC LIMIT 5'),
      pool.query('SELECT id, title, uploader_name, uploaded_at FROM materials ORDER BY uploaded_at DESC LIMIT 5'),
    ]);
    const notifications = [
      ...annRes.rows.map(a => ({ id: `ann-${a.id}`, text: a.title, by: a.author_name, time: a.created_at, type: 'announcement' })),
      ...matRes.rows.map(m => ({ id: `mat-${m.id}`, text: `New upload: ${m.title}`, by: m.uploader_name, time: m.uploaded_at, type: 'material' })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);
    res.json(notifications);
  } catch (err) { next(err); }
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
