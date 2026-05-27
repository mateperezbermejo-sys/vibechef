const pdfParse = require('pdf-parse');
const { getDb } = require('../db/database');
const { parseRecipesFromText } = require('../utils/pdfParser');

async function importPdf(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo PDF.' });
    }
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'El archivo debe ser un PDF.' });
    }

    const data = await pdfParse(req.file.buffer);
    const rawText = data.text;

    if (!rawText || rawText.trim().length === 0) {
      return res.status(422).json({ error: 'El PDF no contiene texto extraíble.' });
    }

    const parsed = parseRecipesFromText(rawText);

    if (parsed.length === 0) {
      return res.status(422).json({
        error: 'No se encontraron recetas con el formato esperado.',
        hint: 'Asegúrate de que cada receta tenga los campos "Nombre:" e "Ingredientes:" (o "Recipe:" e "Ingredients:" en inglés).',
      });
    }

    const db = getDb();
    const insert = db.prepare(
      'INSERT OR IGNORE INTO recipes (name, ingredients, instructions, prep_time, difficulty, tags, source) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    let inserted = 0;
    let skipped = 0;

    db.exec('BEGIN');
    try {
      for (const r of parsed) {
        const result = insert.run(
          r.name, r.ingredients, r.instructions,
          r.prep_time, r.difficulty, r.tags, r.source
        );
        if (result.changes > 0) inserted++;
        else skipped++;
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    res.json({
      message: `Importación completada: ${inserted} receta(s) añadida(s), ${skipped} omitida(s) por duplicado.`,
      parsed: parsed.length,
      inserted,
      skipped,
      recipes: parsed.map((r) => ({ name: r.name, ingredients: JSON.parse(r.ingredients) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar el PDF.' });
  }
}

module.exports = { importPdf };
