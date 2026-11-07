require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const db = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

const hash = bcrypt.hashSync('1234', 10);

// Clear existing data
db.exec('DELETE FROM course_roles');
db.exec('DELETE FROM bookmarks');
db.exec('DELETE FROM waitlist');
db.exec('DELETE FROM rep_codes');
db.exec('DELETE FROM tutorials');
db.exec('DELETE FROM materials');
db.exec('DELETE FROM users');
db.exec('DELETE FROM courses');

// Users
const insertUser = db.prepare('INSERT INTO users (id, full_name, pin_hash, role, approved, avatar_initials, campus) VALUES (?, ?, ?, ?, ?, ?, ?)');
insertUser.run('GSL-e4d005d0', 'Mabel Afriyie Andoh', hash, 'student', 1, 'MA', 'Accra');
insertUser.run('GSL-a1b2c3d4', 'Clement Mensah', hash, 'lecturer', 1, 'CM', 'Accra');
insertUser.run('GSL-f5e6d7c8', 'Nana Akua Owusu', hash, 'student', 1, 'NA', 'Accra');

// Course roles
const insertCourseRole = db.prepare('INSERT INTO course_roles (user_id, course_id, role) VALUES (?, ?, ?)');
insertCourseRole.run('GSL-f5e6d7c8', 'c-adr', 'course_rep');
insertCourseRole.run('GSL-f5e6d7c8', 'c-fl', 'course_rep');

// Courses
const insertCourse = db.prepare('INSERT INTO courses (id, title, code, description, category, lecturer) VALUES (?, ?, ?, ?, ?, ?)');
insertCourse.run('c-adr', 'Alternative Dispute Resolution', 'ADR', 'Principles and practice of ADR including arbitration, mediation and negotiation.', 'Core', 'Prof. Adjei');
insertCourse.run('c-ccl', 'Company and Corporate Law', 'CCL', 'Law governing companies, partnerships, and corporate governance in Ghana.', 'Core', 'Dr. Mensah');
insertCourse.run('c-ios', 'Interpretation of Statutes', 'IOS', 'Rules and principles of statutory interpretation.', 'Core', 'Prof. Boateng');
insertCourse.run('c-fl', 'Family Law', 'FL', 'Marriage, divorce, custody, adoption and family-related legal matters.', 'Core', 'Mrs. Asante');

// Materials
const insertMaterial = db.prepare('INSERT INTO materials (id, title, description, filename, path, course_id, category, uploaded_by, uploader_name, uploaded_at, downloads) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

// Past questions
insertMaterial.run(uuid(), 'Past Questions — ADR (2015–2025)', 'Pre-Bar examination past questions in Alternative Dispute Resolution, 2015 to 2025.', 'adr-past-questions.pdf', '', 'c-adr', 'past_question', 'GSL-a1b2c3d4', 'Clement Mensah', '2026-10-15T10:00:00Z', 14);
insertMaterial.run(uuid(), 'Past Questions — Company Law (2015–2026)', 'Pre-Bar examination past questions in Company and Commercial Law Practice.', 'ccl-past-questions.pdf', '', 'c-ccl', 'past_question', 'GSL-a1b2c3d4', 'Clement Mensah', '2026-10-15T10:00:00Z', 9);
insertMaterial.run(uuid(), 'Past Questions — Interpretation of Statutes (2015–2025)', 'Pre-Bar examination past questions in Interpretation of Statutes.', 'ios-past-questions.pdf', '', 'c-ios', 'past_question', 'GSL-a1b2c3d4', 'Clement Mensah', '2026-10-15T10:00:00Z', 6);
insertMaterial.run(uuid(), 'Past Questions — Family Law (2016–2026)', 'Pre-Bar examination past questions in Family Law.', 'fl-past-questions.pdf', '', 'c-fl', 'past_question', 'GSL-a1b2c3d4', 'Clement Mensah', '2026-10-15T10:00:00Z', 4);

// Learning materials
insertMaterial.run(uuid(), 'ADR Lecture Notes — Week 1–6', 'Comprehensive lecture notes covering the first six weeks of ADR.', 'adr-notes-w1-6.pdf', '', 'c-adr', 'material', 'GSL-f5e6d7c8', 'Nana Akua Owusu', '2026-09-20T14:30:00Z', 12);
insertMaterial.run(uuid(), 'Company Law — Case Summaries', 'Summaries of leading cases in Company and Corporate Law.', 'ccl-case-summaries.docx', '', 'c-ccl', 'material', 'GSL-e4d005d0', 'Mabel Afriyie Andoh', '2026-09-25T09:00:00Z', 8);
insertMaterial.run(uuid(), 'Statutory Interpretation — Revision Guide', 'A concise revision guide for Interpretation of Statutes.', 'ios-revision-guide.pdf', '', 'c-ios', 'material', 'GSL-a1b2c3d4', 'Clement Mensah', '2026-10-01T11:00:00Z', 5);

// Tutorials
const insertTutorial = db.prepare('INSERT INTO tutorials (id, course_id, title, description, date, link, created_by, creator_name, course_title, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
insertTutorial.run(uuid(), 'c-adr', 'ADR Tutorial — Arbitration Procedures', 'Practical walkthrough of arbitration proceedings.', '2026-11-08', 'https://chat.whatsapp.com/example-adr-group', 'GSL-a1b2c3d4', 'Clement Mensah', 'Alternative Dispute Resolution', '2026-10-20T10:00:00Z');
insertTutorial.run(uuid(), 'c-ccl', "Company Law — Directors' Duties Discussion", 'Discussion of fiduciary duties and statutory obligations.', '2026-11-10', 'https://chat.whatsapp.com/example-ccl-group', 'GSL-a1b2c3d4', 'Clement Mensah', 'Company and Corporate Law', '2026-10-22T10:00:00Z');
insertTutorial.run(uuid(), 'c-fl', 'Family Law — Custody & Maintenance', 'Focus on custody law and maintenance obligations.', '2026-11-15', 'https://meet.google.com/abc-defg-hij', 'GSL-f5e6d7c8', 'Nana Akua Owusu', 'Family Law', '2026-10-25T10:00:00Z');

console.log('Database seeded.');
console.log('Test credentials (PIN: 1234):');
console.log('  Student:     Mabel Afriyie Andoh');
console.log('  Lecturer:    Clement Mensah');
console.log('  Course Rep:  Nana Akua Owusu (ADR + Family Law)');
