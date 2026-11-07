require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

async function seed() {
  const hash = bcrypt.hashSync('1234', 10);

  await pool.query('DELETE FROM course_roles');
  await pool.query('DELETE FROM bookmarks');
  await pool.query('DELETE FROM waitlist');
  await pool.query('DELETE FROM rep_codes');
  await pool.query('DELETE FROM tutorials');
  await pool.query('DELETE FROM materials');
  await pool.query('DELETE FROM users');
  await pool.query('DELETE FROM courses');

  // Users
  await pool.query('INSERT INTO users (id, full_name, pin_hash, role, approved, avatar_initials, campus) VALUES ($1,$2,$3,$4,$5,$6,$7)', ['GSL-e4d005d0', 'Mabel Afriyie Andoh', hash, 'student', 1, 'MA', 'Accra']);
  await pool.query('INSERT INTO users (id, full_name, pin_hash, role, approved, avatar_initials, campus) VALUES ($1,$2,$3,$4,$5,$6,$7)', ['GSL-a1b2c3d4', 'Clement Mensah', hash, 'lecturer', 1, 'CM', 'Accra']);
  await pool.query('INSERT INTO users (id, full_name, pin_hash, role, approved, avatar_initials, campus) VALUES ($1,$2,$3,$4,$5,$6,$7)', ['GSL-f5e6d7c8', 'Nana Akua Owusu', hash, 'student', 1, 'NA', 'Accra']);

  // Course roles
  await pool.query('INSERT INTO course_roles (user_id, course_id, role) VALUES ($1,$2,$3)', ['GSL-f5e6d7c8', 'c-adr', 'course_rep']);
  await pool.query('INSERT INTO course_roles (user_id, course_id, role) VALUES ($1,$2,$3)', ['GSL-f5e6d7c8', 'c-fl', 'course_rep']);

  // Courses
  await pool.query('INSERT INTO courses (id, title, code, description, category, lecturer) VALUES ($1,$2,$3,$4,$5,$6)', ['c-adr', 'Alternative Dispute Resolution', 'ADR', 'Principles and practice of ADR including arbitration, mediation and negotiation.', 'Core', 'Prof. Adjei']);
  await pool.query('INSERT INTO courses (id, title, code, description, category, lecturer) VALUES ($1,$2,$3,$4,$5,$6)', ['c-ccl', 'Company and Corporate Law', 'CCL', 'Law governing companies, partnerships, and corporate governance in Ghana.', 'Core', 'Dr. Mensah']);
  await pool.query('INSERT INTO courses (id, title, code, description, category, lecturer) VALUES ($1,$2,$3,$4,$5,$6)', ['c-ios', 'Interpretation of Statutes', 'IOS', 'Rules and principles of statutory interpretation.', 'Core', 'Prof. Boateng']);
  await pool.query('INSERT INTO courses (id, title, code, description, category, lecturer) VALUES ($1,$2,$3,$4,$5,$6)', ['c-fl', 'Family Law', 'FL', 'Marriage, divorce, custody, adoption and family-related legal matters.', 'Core', 'Mrs. Asante']);

  // Materials (no actual files — seed entries only)
  const mat = (id, title, desc, filename, courseId, cat, uploadedBy, uploaderName, uploadedAt, downloads) =>
    pool.query('INSERT INTO materials (id, title, description, filename, storage_path, file_url, course_id, category, uploaded_by, uploader_name, uploaded_at, downloads) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
      [id, title, desc, filename, null, null, courseId, cat, uploadedBy, uploaderName, uploadedAt, downloads]);

  await mat(uuid(), 'Past Questions — ADR (2015–2025)', 'Pre-Bar examination past questions in Alternative Dispute Resolution, 2015 to 2025.', 'adr-past-questions.pdf', 'c-adr', 'past_question', 'GSL-a1b2c3d4', 'Clement Mensah', '2026-10-15T10:00:00Z', 14);
  await mat(uuid(), 'Past Questions — Company Law (2015–2026)', 'Pre-Bar examination past questions in Company and Commercial Law Practice.', 'ccl-past-questions.pdf', 'c-ccl', 'past_question', 'GSL-a1b2c3d4', 'Clement Mensah', '2026-10-15T10:00:00Z', 9);
  await mat(uuid(), 'Past Questions — Interpretation of Statutes (2015–2025)', 'Pre-Bar examination past questions in Interpretation of Statutes.', 'ios-past-questions.pdf', 'c-ios', 'past_question', 'GSL-a1b2c3d4', 'Clement Mensah', '2026-10-15T10:00:00Z', 6);
  await mat(uuid(), 'Past Questions — Family Law (2016–2026)', 'Pre-Bar examination past questions in Family Law.', 'fl-past-questions.pdf', 'c-fl', 'past_question', 'GSL-a1b2c3d4', 'Clement Mensah', '2026-10-15T10:00:00Z', 4);
  await mat(uuid(), 'ADR Lecture Notes — Week 1–6', 'Comprehensive lecture notes covering the first six weeks of ADR.', 'adr-notes-w1-6.pdf', 'c-adr', 'material', 'GSL-f5e6d7c8', 'Nana Akua Owusu', '2026-09-20T14:30:00Z', 12);
  await mat(uuid(), 'Company Law — Case Summaries', 'Summaries of leading cases in Company and Corporate Law.', 'ccl-case-summaries.docx', 'c-ccl', 'material', 'GSL-e4d005d0', 'Mabel Afriyie Andoh', '2026-09-25T09:00:00Z', 8);
  await mat(uuid(), 'Statutory Interpretation — Revision Guide', 'A concise revision guide for Interpretation of Statutes.', 'ios-revision-guide.pdf', 'c-ios', 'material', 'GSL-a1b2c3d4', 'Clement Mensah', '2026-10-01T11:00:00Z', 5);

  // Tutorials
  const tut = (courseId, title, desc, date, link, creatorName, courseTitle, createdAt) =>
    pool.query('INSERT INTO tutorials (id, course_id, title, description, date, link, created_by, creator_name, course_title, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [uuid(), courseId, title, desc, date, link, 'GSL-a1b2c3d4', creatorName, courseTitle, createdAt]);

  await tut('c-adr', 'ADR Tutorial — Arbitration Procedures', 'Practical walkthrough of arbitration proceedings.', '2026-11-08', 'https://chat.whatsapp.com/example-adr-group', 'Clement Mensah', 'Alternative Dispute Resolution', '2026-10-20T10:00:00Z');
  await tut('c-ccl', "Company Law — Directors' Duties Discussion", 'Discussion of fiduciary duties and statutory obligations.', '2026-11-10', 'https://chat.whatsapp.com/example-ccl-group', 'Clement Mensah', 'Company and Corporate Law', '2026-10-22T10:00:00Z');
  await tut('c-fl', 'Family Law — Custody & Maintenance', 'Focus on custody law and maintenance obligations.', '2026-11-15', 'https://meet.google.com/abc-defg-hij', 'Nana Akua Owusu', 'Family Law', '2026-10-25T10:00:00Z');

  console.log('Database seeded successfully.');
  console.log('Test credentials (PIN: 1234):');
  console.log('  Student:     Mabel Afriyie Andoh');
  console.log('  Lecturer:    Clement Mensah');
  console.log('  Course Rep:  Nana Akua Owusu (ADR + Family Law)');
  await pool.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
