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

    CREATE TABLE IF NOT EXISTS user_allergies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ingredient_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, ingredient_name)
    );

    CREATE TABLE IF NOT EXISTS detection_corrections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      yolo_class TEXT NOT NULL,
      corrected_ingredient TEXT NOT NULL,
      frequency_count INTEGER NOT NULL DEFAULT 1,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, yolo_class)
    );
  `);

  // Add source column to recipes if it doesn't exist yet (tracks PDF imports)
  try {
    db.exec(`ALTER TABLE recipes ADD COLUMN source TEXT DEFAULT 'seed'`);
  } catch (err) {
    if (!err.message.includes('duplicate column name')) throw err;
  }

  // Add image_url column to recipes if it doesn't exist yet
  try {
    db.exec(`ALTER TABLE recipes ADD COLUMN image_url TEXT DEFAULT NULL`);
  } catch (err) {
    if (!err.message.includes('duplicate column name')) throw err;
  }

  // Weekly menu reference data (10-week template from markdown)
  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_number INTEGER NOT NULL,
      day_name TEXT NOT NULL,
      meal_type TEXT NOT NULL CHECK(meal_type IN ('lunch', 'dinner')),
      recipe_name TEXT NOT NULL,
      ingredients TEXT NOT NULL,
      steps TEXT NOT NULL,
      source TEXT DEFAULT 'markdown'
    );
  `);

  console.log('Migration complete.');
}

migrate();
