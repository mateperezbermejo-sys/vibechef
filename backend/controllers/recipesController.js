const { getDb } = require('../db/database');
const { scoreRecipe, filterByAllergies, sortRecipes, translateIngredients } = require('../utils/recipeUtils');

function matchRecipes(req, res) {
  try {
    const { ingredients, filters = [] } = req.body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de ingredientes.' });
    }

    const db = getDb();
    const normalizedInput = translateIngredients(ingredients.map((i) => i.toLowerCase().trim()));

    // Load user allergies to apply automatic filtering
    const allergyRows = db.prepare(
      'SELECT ingredient_name FROM user_allergies WHERE user_id = ?'
    ).all(req.userId);
    const allergies = allergyRows.map((r) => r.ingredient_name);

    const allRecipes = db.prepare('SELECT * FROM recipes').all();

    const scored = allRecipes.map((recipe) => {
      const recipeIngredients = JSON.parse(recipe.ingredients);
      const tags = JSON.parse(recipe.tags);
      const {
        score, matchCount, missingCount,
        availableUsed, missingIngredients, availableNotUsed, substitutions,
      } = scoreRecipe(recipeIngredients, normalizedInput);

      return {
        id: recipe.id,
        name: recipe.name,
        instructions: recipe.instructions,
        prep_time: recipe.prep_time,
        difficulty: recipe.difficulty,
        tags,
        source: recipe.source || 'seed',
        image_url: recipe.image_url || null,
        ingredients: recipeIngredients,
        // Subset-match breakdown
        score,
        matchCount,
        missingCount,
        availableUsed,
        missingIngredients,
        availableNotUsed,
        substitutions,
      };
    });

    // Keep only recipes with at least 1 matched ingredient.
    // Missing ingredients can be bought or taken from pantry.
    let filtered = scored.filter((r) => r.matchCount >= 1);

    // Apply allergy filter — remove recipes containing allergens
    filtered = filterByAllergies(filtered, allergies);

    // Apply tag-based filters requested by the user
    if (filters.length > 0) {
      filtered = filtered.filter((r) => filters.every((f) => r.tags.includes(f)));
    }

    filtered = sortRecipes(filtered);

    res.json({
      recipes: filtered,
      appliedAllergies: allergies,
    });
  } catch (err) {
    console.error(err);
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
