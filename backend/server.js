const express = require('express');
const cors = require('cors');

const { getDb } = require('./db/database');
const authRoutes = require('./routes/auth');
const pantryRoutes = require('./routes/pantry');
const recipesRoutes = require('./routes/recipes');
const allergiesRoutes = require('./routes/allergies');
const correctionsRoutes = require('./routes/corrections');
const menusRoutes = require('./routes/menus');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function initDb() {
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

  try { db.exec(`ALTER TABLE recipes ADD COLUMN source TEXT DEFAULT 'seed'`); } catch {}
  try { db.exec(`ALTER TABLE recipes ADD COLUMN image_url TEXT DEFAULT NULL`); } catch {}

  const count = db.prepare('SELECT COUNT(*) as n FROM recipes').get();
  if (count.n === 0) {
    const ins = db.prepare('INSERT OR IGNORE INTO ingredients (name_en, name_es) VALUES (?, ?)');
    const rec = db.prepare('INSERT OR IGNORE INTO recipes (name, ingredients, instructions, prep_time, difficulty, tags) VALUES (?, ?, ?, ?, ?, ?)');
    const INGREDIENTS = [
      ['egg','huevo'],['tomato','tomate'],['onion','cebolla'],['garlic','ajo'],
      ['milk','leche'],['cheese','queso'],['chicken','pollo'],['rice','arroz'],
      ['pasta','pasta'],['potato','patata'],['carrot','zanahoria'],['spinach','espinacas'],
      ['pepper','pimiento'],['mushroom','champiñón'],['lemon','limón'],
      ['olive oil','aceite de oliva'],['butter','mantequilla'],['bread','pan'],
      ['flour','harina'],['tuna','atún'],['lettuce','lechuga'],['cucumber','pepino'],
      ['zucchini','calabacín'],['broccoli','brócoli'],['banana','plátano'],
      ['apple','manzana'],['orange','naranja'],['beef','carne de res'],
      ['salmon','salmón'],['corn','maíz'],
    ];
    const RECIPES = [
      ['Tortilla Española', JSON.stringify(['egg','potato','onion','olive oil']), 'Pela y corta las patatas y la cebolla en rodajas finas. Fríelas en aceite de oliva a fuego medio hasta que estén tiernas. Bate los huevos, añade las patatas y la cebolla escurridas, mezcla bien. Cuaja en sartén antiadherente por ambos lados.', 30, 'medium', JSON.stringify(['vegetarian','quick','spanish'])],
      ['Pasta al Pesto de Tomate', JSON.stringify(['pasta','tomato','garlic','olive oil','cheese']), 'Cuece la pasta al dente. Sofríe el ajo en aceite, añade el tomate troceado y cocina 10 min. Mezcla con la pasta y espolvorea queso rallado.', 20, 'easy', JSON.stringify(['vegetarian','quick','italian'])],
      ['Arroz con Pollo', JSON.stringify(['chicken','rice','tomato','onion','garlic','pepper']), 'Dora el pollo troceado en aceite. Sofríe la cebolla, el ajo y el pimiento. Añade el tomate, el arroz y caldo. Cocina a fuego medio 20 min.', 45, 'medium', JSON.stringify(['high-protein','spanish'])],
      ['Ensalada Mediterránea', JSON.stringify(['tomato','cucumber','lettuce','cheese','olive oil','lemon']), 'Trocea las verduras y la lechuga. Añade el queso en dados. Aliña con aceite de oliva, zumo de limón y sal.', 10, 'easy', JSON.stringify(['vegetarian','quick','healthy'])],
      ['Revuelto de Champiñones y Espinacas', JSON.stringify(['egg','mushroom','spinach','garlic','olive oil']), 'Saltea el ajo y los champiñones en aceite. Añade las espinacas y deja reducir. Incorpora los huevos batidos y revuelve a fuego bajo.', 15, 'easy', JSON.stringify(['vegetarian','quick','high-protein'])],
      ['Crema de Zanahoria', JSON.stringify(['carrot','onion','garlic','potato','olive oil']), 'Sofríe la cebolla y el ajo. Añade la zanahoria y la patata en dados con agua o caldo. Cocina 20 min y tritura.', 30, 'easy', JSON.stringify(['vegetarian','healthy','vegan'])],
      ['Salmón a la Plancha con Brócoli', JSON.stringify(['salmon','broccoli','garlic','lemon','olive oil']), 'Cuece el brócoli al vapor 5 min. Cocina el salmón en plancha caliente con ajo y aceite, 3 min por lado.', 20, 'easy', JSON.stringify(['high-protein','healthy','quick'])],
      ['Hamburguesa Casera', JSON.stringify(['beef','onion','tomato','lettuce','bread','cheese']), 'Forma las hamburguesas con la carne sazonada. Cocínalas a la plancha 4 min por lado. Monta en el pan con lechuga, tomate y queso.', 25, 'medium', JSON.stringify(['high-protein'])],
      ['Patatas Bravas', JSON.stringify(['potato','tomato','garlic','olive oil']), 'Corta las patatas en cubos y fríelas hasta dorar. Prepara una salsa con tomate, ajo y especias.', 30, 'easy', JSON.stringify(['vegetarian','vegan','spanish'])],
      ['Pasta a la Carbonara', JSON.stringify(['pasta','egg','cheese','garlic','olive oil']), 'Cuece la pasta. Mezcla yemas de huevo con queso rallado. Saltea el ajo. Combina la pasta caliente con la mezcla fuera del fuego.', 20, 'medium', JSON.stringify(['quick','italian'])],
    ];
    db.exec('BEGIN');
    for (const [en, es] of INGREDIENTS) ins.run(en, es);
    for (const r of RECIPES) rec.run(...r);
    db.exec('COMMIT');
    console.log('Database seeded.');
  }

  console.log('Database ready.');
}

initDb();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', project: 'VibeChef', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/allergies', allergiesRoutes);
app.use('/api/corrections', correctionsRoutes);
app.use('/api/menus', menusRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`VibeChef backend running on http://localhost:${PORT}`);
});
