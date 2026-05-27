const { getDb } = require('../db/database');

function getAllergies(req, res) {
  try {
    const db = getDb();
    const rows = db.prepare(
      'SELECT ingredient_name, created_at FROM user_allergies WHERE user_id = ? ORDER BY ingredient_name'
    ).all(req.userId);
    res.json({ allergies: rows.map((r) => r.ingredient_name) });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener alergias.' });
  }
}

function addAllergy(req, res) {
  try {
    const { ingredient } = req.body;
    if (!ingredient || typeof ingredient !== 'string' || !ingredient.trim()) {
      return res.status(400).json({ error: 'Ingrediente requerido.' });
    }
    const name = ingredient.toLowerCase().trim();
    const db = getDb();
    db.prepare(
      'INSERT OR IGNORE INTO user_allergies (user_id, ingredient_name) VALUES (?, ?)'
    ).run(req.userId, name);
    res.status(201).json({ added: name });
  } catch (err) {
    res.status(500).json({ error: 'Error al añadir alergia.' });
  }
}

function removeAllergy(req, res) {
  try {
    const name = req.params.ingredient.toLowerCase().trim();
    const db = getDb();
    db.prepare(
      'DELETE FROM user_allergies WHERE user_id = ? AND ingredient_name = ?'
    ).run(req.userId, name);
    res.json({ removed: name });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar alergia.' });
  }
}

module.exports = { getAllergies, addAllergy, removeAllergy };
