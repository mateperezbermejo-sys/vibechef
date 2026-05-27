const { sortRecipes } = require('./recipeUtils');

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/**
 * Pick 14 unique recipes (best-scored first) and arrange into a 7-day week.
 * If the pool has fewer than 14 recipes, cycles through the sorted list.
 * @param {Array} scoredRecipes - Already scored and allergy-filtered recipe objects
 * @param {string[]} [days] - Day names (default: Mon–Sun in Spanish)
 * @returns {Array} week - Array of { day, lunch, dinner } objects
 */
function generateWeekMenu(scoredRecipes, days = DAYS) {
  if (!scoredRecipes || scoredRecipes.length === 0) {
    return days.map((day) => ({ day, lunch: null, dinner: null }));
  }

  const sorted = sortRecipes(scoredRecipes);
  const mealsNeeded = days.length * 2;

  // Pick unique recipes up to mealsNeeded; cycle if pool is small
  const slots = [];
  for (let i = 0; i < mealsNeeded; i++) {
    slots.push(sorted[i % sorted.length]);
  }

  return days.map((day, i) => ({
    day,
    lunch: formatSlot(slots[i * 2]),
    dinner: formatSlot(slots[i * 2 + 1]),
  }));
}

function formatSlot(recipe) {
  if (!recipe) return null;
  return {
    recipe: {
      id: recipe.id,
      name: recipe.name,
      prep_time: recipe.prep_time,
      difficulty: recipe.difficulty,
      tags: recipe.tags || [],
      instructions: recipe.instructions || '',
    },
    availableUsed: recipe.availableUsed || [],
    missingIngredients: recipe.missingIngredients || [],
    score: recipe.score,
    lowConfidence: recipe.score <= 0,
  };
}

module.exports = { generateWeekMenu, DAYS };
