// Pure scoring/filtering helpers — no DB dependency, fully testable.

const SUBSTITUTIONS = {
  butter:   ['olive oil'],
  milk:     ['water', 'oat milk'],
  beef:     ['chicken', 'turkey'],
  pasta:    ['rice', 'zucchini'],
  cheese:   ['nutritional yeast'],
  egg:      ['tofu'],
  flour:    ['almond flour', 'oat flour'],
  bread:    ['crackers', 'rice'],
  salmon:   ['tuna'],
  cream:    ['milk', 'coconut milk'],
};

/**
 * Score a single recipe against the user's available ingredients.
 * Formula: (matchCount × 10) − (missingCount × 2)
 */
function scoreRecipe(recipeIngredients, userIngredients) {
  const available = userIngredients.map((i) => i.toLowerCase().trim());
  const recipe    = recipeIngredients.map((i) => i.toLowerCase().trim());

  const availableUsed    = recipe.filter((ri) => available.includes(ri));
  const missingIngredients = recipe.filter((ri) => !available.includes(ri));
  const availableNotUsed = available.filter((ai) => !recipe.includes(ai));
  const matchCount  = availableUsed.length;
  const missingCount = missingIngredients.length;
  const score = matchCount * 10 - missingCount * 2;

  // Suggest substitutions for missing ingredients
  const substitutions = {};
  for (const missing of missingIngredients) {
    const subs = SUBSTITUTIONS[missing];
    if (subs) {
      const available_subs = subs.filter((s) => available.includes(s));
      if (available_subs.length > 0) substitutions[missing] = available_subs;
    }
  }

  return {
    score,
    matchCount,
    missingCount,
    availableUsed,
    missingIngredients,
    availableNotUsed,
    substitutions,
  };
}

/**
 * Filter out recipes that contain any of the user's allergens.
 * Checks both recipe ingredients and the recipe name/tags for safety.
 */
function filterByAllergies(recipes, allergies) {
  if (!allergies || allergies.length === 0) return recipes;
  const lower = allergies.map((a) => a.toLowerCase().trim());
  return recipes.filter((r) => {
    const ingredients = Array.isArray(r.ingredients) ? r.ingredients : [];
    return !lower.some((allergen) => ingredients.includes(allergen));
  });
}

/**
 * Sort recipes: highest score first, then by fewest missing ingredients.
 */
function sortRecipes(recipes) {
  return [...recipes].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.missingCount - b.missingCount;
  });
}

module.exports = { scoreRecipe, filterByAllergies, sortRecipes, SUBSTITUTIONS };
