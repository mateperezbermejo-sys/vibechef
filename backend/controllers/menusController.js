const { getDb } = require('../db/database');
const { scoreRecipe, filterByAllergies } = require('../utils/recipeUtils');
const { generateWeekMenu } = require('../utils/menuUtils');

function weeklyMenu(req, res) {
  try {
    const { ingredients = [], filters = [] } = req.body;

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
        image_url: recipe.image_url || null,
        ingredients: recipeIngredients,
        ...scoring,
      };
    });

    let filtered = filterByAllergies(scored, allergies);

    if (filters.length > 0) {
      filtered = filtered.filter((r) => filters.every((f) => r.tags.includes(f)));
    }

    const week = generateWeekMenu(filtered);

    // Build shopping list: missing ingredients not already owned, deduplicated
    const ownedSet = new Set(normalizedInput);
    const shoppingSet = new Set();
    for (const { lunch, dinner } of week) {
      for (const slot of [lunch, dinner]) {
        if (slot) {
          for (const ing of slot.missingIngredients || []) {
            if (!ownedSet.has(ing.toLowerCase())) shoppingSet.add(ing);
          }
        }
      }
    }
    const shoppingList = [...shoppingSet].sort();

    res.json({
      week,
      appliedAllergies: allergies,
      totalRecipesConsidered: filtered.length,
      shoppingList,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar el menú semanal.' });
  }
}

module.exports = { weeklyMenu };
