const { getDb } = require('../db/database');

function getCorrections(req, res) {
  try {
    const db = getDb();
    const rows = db.prepare(
      `SELECT yolo_class, corrected_ingredient, frequency_count, last_seen
       FROM detection_corrections
       WHERE user_id = ?
       ORDER BY frequency_count DESC`
    ).all(req.userId);
    // Return as a map { yolo_class: corrected_ingredient } for fast frontend lookup
    const map = {};
    for (const r of rows) map[r.yolo_class] = r.corrected_ingredient;
    res.json({ corrections: map, list: rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener correcciones.' });
  }
}

function saveCorrection(req, res) {
  try {
    const { yolo_class, corrected_ingredient } = req.body;
    if (!yolo_class || !corrected_ingredient) {
      return res.status(400).json({ error: 'yolo_class y corrected_ingredient son requeridos.' });
    }
    const db = getDb();
    db.prepare(`
      INSERT INTO detection_corrections (user_id, yolo_class, corrected_ingredient, frequency_count, last_seen)
      VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, yolo_class)
      DO UPDATE SET
        corrected_ingredient = excluded.corrected_ingredient,
        frequency_count = frequency_count + 1,
        last_seen = CURRENT_TIMESTAMP
    `).run(req.userId, yolo_class.toLowerCase().trim(), corrected_ingredient.toLowerCase().trim());

    res.json({ saved: { yolo_class, corrected_ingredient } });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar corrección.' });
  }
}

module.exports = { getCorrections, saveCorrection };
