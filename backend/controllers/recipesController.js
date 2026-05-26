const { getDb } = require('../db/database');

function matchRecipes(req, res) {
  try {
    const { ingredients, filters = [] } = req.body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de ingredientes.' });
    }

    const db = getDb();
    const normalizedInput = ingredients.map((i) => i.toLowerCase().trim());

    const allRecipes = db.prepare('SELECT * FROM recipes').all();

    const scored = allRecipes.map((recipe) => {
      const recipeIngredients = JSON.parse(recipe.ingredients);
      const tags = JSON.parse(recipe.tags);

      const matchCount = recipeIngredients.filter((ri) => normalizedInput.includes(ri)).length;
      const missingCount = recipeIngredients.filter((ri) => !normalizedInput.includes(ri)).length;

      // Scoring formula: Score = (Match_Count * 10) - (Missing_Count * 2)
      const score = matchCount * 10 - missingCount * 2;

      return {
        id: recipe.id,
        name: recipe.name,
        instructions: recipe.instructions,
        prep_time: recipe.prep_time,
        difficulty: recipe.difficulty,
        tags,
        ingredients: recipeIngredients,
        matchCount,
        missingCount,
        missingIngredients: recipeIngredients.filter((ri) => !normalizedInput.includes(ri)),
        score,
      };
    });

    let filtered = scored.filter((r) => r.score > 0);

    // Apply tag-based filters
    if (filters.length > 0) {
      filtered = filtered.filter((r) => filters.every((f) => r.tags.includes(f)));
    }

    filtered.sort((a, b) => b.score - a.score);

    res.json({ recipes: filtered });
  } catch (err) {
    res.status(500).json({ error: 'Error al buscar recetas.' });
  }
}

function getAllRecipes(req, res) {
  try {
    const db = getDb();
    const recipes = db.prepare('SELECT * FROM recipes').all().map((r) => ({
      ...r,
      ingredients: JSON.parse(r.ingredients),
      tags: JSON.parse(r.tags),
    }));
    res.json({ recipes });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener recetas.' });
  }
}

module.exports = { matchRecipes, getAllRecipes };
