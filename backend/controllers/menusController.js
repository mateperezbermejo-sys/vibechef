const { getDb } = require('../db/database');
const { scoreRecipe, filterByAllergies } = require('../utils/recipeUtils');
const { generateWeekMenu } = require('../utils/menuUtils');

function weeklyMenu(req, res) {
  try {
    const { ingredients, filters = [] } = req.body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de ingredientes.' });
    }

    const db = getDb();
    const normalizedInput = ingredients.map((i) => i.toLowerCase().trim());

    const allergyRows = db
      .prepare('SELECT ingredient_name FROM user_allergies WHERE user_id = ?')
      .all(req.userId);
    const allergies = allergyRows.map((r) => r.ingredient_name);

    const allRecipes = db.prepare('SELECT * FROM recipes').all();

    const scored = allRecipes.map((recipe) => {
      const recipeIngredients = JSON.parse(recipe.ingredients);
      const tags = JSON.parse(recipe.tags);
      const scoring = scoreRecipe(recipeIngredients, normalizedInput);
      return {
        id: recipe.id,
        name: recipe.name,
        instructions: recipe.instructions,
        prep_time: recipe.prep_time,
        difficulty: recipe.difficulty,
        tags,
        source: recipe.source || 'seed',
        ingredients: recipeIngredients,
        ...scoring,
      };
    });

    let filtered = filterByAllergies(scored, allergies);

    if (filters.length > 0) {
      filtered = filtered.filter((r) => filters.every((f) => r.tags.includes(f)));
    }

    const week = generateWeekMenu(filtered);

    res.json({
      week,
      appliedAllergies: allergies,
      totalRecipesConsidered: filtered.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar el menú semanal.' });
  }
}

module.exports = { weeklyMenu };
