require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function setup() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    await pool.query(stmt);
  }
  console.log('Schema applied successfully.');
  await pool.end();
}

setup().catch(err => { console.error(err); process.exit(1); });
