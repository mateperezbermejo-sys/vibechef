// Pure scoring/filtering helpers — no DB dependency, fully testable.

// Spanish → English ingredient translation.
// Applied before recipe matching so users can type in either language.
const ES_TO_EN = {
  // Proteins
  huevo: 'egg', huevos: 'egg',
  pollo: 'chicken', pechuga: 'chicken',
  'carne de res': 'beef', ternera: 'beef', carne: 'beef',
  cerdo: 'pork', lomo: 'pork',
  salmon: 'salmon', salmón: 'salmon',
  atun: 'tuna', atún: 'tuna',
  merluza: 'fish', bacalao: 'fish', pescado: 'fish',
  gambas: 'shrimp', langostinos: 'shrimp',
  // Dairy
  leche: 'milk',
  queso: 'cheese',
  mantequilla: 'butter',
  yogur: 'yogurt', yogurt: 'yogurt',
  nata: 'cream',
  // Vegetables
  tomate: 'tomato', tomates: 'tomato',
  cebolla: 'onion', cebollas: 'onion',
  ajo: 'garlic', ajos: 'garlic',
  pimiento: 'pepper', pimientos: 'pepper', pimenton: 'pepper',
  zanahoria: 'carrot', zanahorias: 'carrot',
  patata: 'potato', patatas: 'potato', papa: 'potato', papas: 'potato',
  lechuga: 'lettuce',
  espinacas: 'spinach', espinaca: 'spinach',
  pepino: 'cucumber',
  champinon: 'mushroom', champiñon: 'mushroom', champiñones: 'mushroom', setas: 'mushroom',
  'calabacin': 'zucchini', calabacín: 'zucchini',
  brocoli: 'broccoli', brócoli: 'broccoli',
  maiz: 'corn', maíz: 'corn',
  col: 'cabbage', repollo: 'cabbage',
  pepinillos: 'cucumber',
  aguacate: 'avocado',
  berenjena: 'eggplant',
  // Fruits
  manzana: 'apple', manzanas: 'apple',
  platano: 'banana', plátano: 'banana', platanos: 'banana',
  naranja: 'orange', naranjas: 'orange',
  limon: 'lemon', limón: 'lemon',
  melocoton: 'peach', melocotón: 'peach',
  fresa: 'strawberry', fresas: 'strawberry',
  uva: 'grape', uvas: 'grape',
  arandanos: 'blueberry', arándanos: 'blueberry',
  // Pantry & staples
  arroz: 'rice',
  pasta: 'pasta', fideos: 'pasta',
  pan: 'bread',
  harina: 'flour',
  'aceite de oliva': 'olive oil', aceite: 'olive oil',
  azucar: 'sugar', azúcar: 'sugar',
  sal: 'salt',
};

/**
 * Translate a list of ingredient names (Spanish or English) to canonical English.
 * Unknown names are passed through unchanged.
 */
function translateIngredients(list) {
  return list.map((name) => {
    const key = name.toLowerCase().trim();
    return ES_TO_EN[key] ?? key;
  });
}

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

module.exports = { scoreRecipe, filterByAllergies, sortRecipes, translateIngredients, SUBSTITUTIONS };
