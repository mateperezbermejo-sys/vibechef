const { getDb } = require('./database');

function migrate() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT UNIQUE NOT NULL,
      name_es TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ingredients TEXT NOT NULL,
      instructions TEXT NOT NULL,
      prep_time INTEGER NOT NULL,
      difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')) NOT NULL,
      tags TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pantry_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      frequency_count INTEGER NOT NULL DEFAULT 1,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, ingredient_id)
    );
  `);

  console.log('Migration complete.');
}

migrate();
