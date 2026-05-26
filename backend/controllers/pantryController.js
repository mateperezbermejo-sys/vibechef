const { getDb } = require('../db/database');

function upsertIngredients(req, res) {
  try {
    const { ingredients } = req.body;
    const userId = req.userId;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de ingredientes.' });
    }

    const db = getDb();

    const upsert = db.prepare(`
      INSERT INTO pantry_logs (user_id, ingredient_id, frequency_count, last_seen)
      VALUES (?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, ingredient_id)
      DO UPDATE SET
        frequency_count = frequency_count + 1,
        last_seen = CURRENT_TIMESTAMP
    `);

    const findIngredient = db.prepare('SELECT id FROM ingredients WHERE name_en = ?');

    db.exec('BEGIN');
    const updated = [];
    try {
      for (const name_en of ingredients) {
        const ingredient = findIngredient.get(name_en.toLowerCase().trim());
        if (ingredient) {
          upsert.run(userId, ingredient.id);
          updated.push(name_en);
        }
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    res.json({ updated, count: updated.length });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar el historial de ingredientes.' });
  }
}

function getPredictions(req, res) {
  try {
    const db = getDb();
    const userId = req.userId;

    const top5 = db.prepare(`
      SELECT i.name_en, i.name_es, pl.frequency_count, pl.last_seen
      FROM pantry_logs pl
      JOIN ingredients i ON i.id = pl.ingredient_id
      WHERE pl.user_id = ?
      ORDER BY pl.frequency_count DESC, pl.last_seen DESC
      LIMIT 5
    `).all(userId);

    res.json({ predictions: top5 });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener predicciones de despensa.' });
  }
}

function getPantryHistory(req, res) {
  try {
    const db = getDb();
    const userId = req.userId;

    const history = db.prepare(`
      SELECT i.name_en, i.name_es, pl.frequency_count, pl.last_seen
      FROM pantry_logs pl
      JOIN ingredients i ON i.id = pl.ingredient_id
      WHERE pl.user_id = ?
      ORDER BY pl.last_seen DESC
    `).all(userId);

    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial de despensa.' });
  }
}

module.exports = { upsertIngredients, getPredictions, getPantryHistory };
