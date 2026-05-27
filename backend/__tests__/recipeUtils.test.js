const { scoreRecipe, filterByAllergies, sortRecipes } = require('../utils/recipeUtils');

describe('scoreRecipe', () => {
  test('exact match gives positive score', () => {
    const result = scoreRecipe(['egg', 'potato', 'onion'], ['egg', 'potato', 'onion']);
    expect(result.score).toBe(30); // 3*10 - 0*2
    expect(result.matchCount).toBe(3);
    expect(result.missingCount).toBe(0);
    expect(result.missingIngredients).toEqual([]);
    expect(result.availableNotUsed).toEqual([]);
  });

  test('partial match scores correctly', () => {
    // User has egg, potato, onion but recipe needs olive oil too
    const result = scoreRecipe(['egg', 'potato', 'onion', 'olive oil'], ['egg', 'potato', 'onion']);
    expect(result.score).toBe(28); // 3*10 - 1*2
    expect(result.matchCount).toBe(3);
    expect(result.missingIngredients).toEqual(['olive oil']);
    expect(result.availableNotUsed).toEqual([]);
  });

  test('availableNotUsed lists unused user ingredients', () => {
    // User has many ingredients, recipe only uses 2
    const result = scoreRecipe(['egg', 'milk'], ['egg', 'milk', 'tomato', 'cheese', 'pasta']);
    expect(result.availableUsed).toEqual(['egg', 'milk']);
    expect(result.availableNotUsed).toEqual(['tomato', 'cheese', 'pasta']);
  });

  test('no match gives negative score', () => {
    const result = scoreRecipe(['salmon', 'broccoli', 'lemon'], ['egg']);
    expect(result.score).toBe(-6); // 0*10 - 3*2
    expect(result.matchCount).toBe(0);
  });

  test('suggests substitutions for missing ingredients', () => {
    // User has chicken (sub for beef), recipe needs beef
    const result = scoreRecipe(['beef', 'onion'], ['chicken', 'onion']);
    expect(result.substitutions).toHaveProperty('beef');
    expect(result.substitutions['beef']).toContain('chicken');
  });

  test('is case-insensitive', () => {
    const result = scoreRecipe(['Egg', 'POTATO'], ['egg', 'potato']);
    expect(result.matchCount).toBe(2);
  });
});

describe('filterByAllergies', () => {
  const recipes = [
    { name: 'Tortilla', ingredients: ['egg', 'potato', 'onion'] },
    { name: 'Pasta', ingredients: ['pasta', 'tomato', 'garlic'] },
    { name: 'Salmon', ingredients: ['salmon', 'broccoli', 'lemon'] },
  ];

  test('removes recipes containing allergen', () => {
    const filtered = filterByAllergies(recipes, ['egg']);
    expect(filtered).toHaveLength(2);
    expect(filtered.find((r) => r.name === 'Tortilla')).toBeUndefined();
  });

  test('removes multiple recipes when multiple allergens', () => {
    const filtered = filterByAllergies(recipes, ['egg', 'salmon']);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Pasta');
  });

  test('returns all recipes when no allergies', () => {
    expect(filterByAllergies(recipes, [])).toHaveLength(3);
    expect(filterByAllergies(recipes, null)).toHaveLength(3);
  });

  test('allergen not in any recipe returns all', () => {
    const filtered = filterByAllergies(recipes, ['peanut']);
    expect(filtered).toHaveLength(3);
  });
});

describe('sortRecipes', () => {
  test('sorts by score descending', () => {
    const input = [
      { score: 10, missingCount: 1 },
      { score: 30, missingCount: 0 },
      { score: 20, missingCount: 2 },
    ];
    const sorted = sortRecipes(input);
    expect(sorted[0].score).toBe(30);
    expect(sorted[1].score).toBe(20);
    expect(sorted[2].score).toBe(10);
  });

  test('ties broken by fewest missing ingredients', () => {
    const input = [
      { score: 20, missingCount: 3 },
      { score: 20, missingCount: 1 },
      { score: 20, missingCount: 2 },
    ];
    const sorted = sortRecipes(input);
    expect(sorted[0].missingCount).toBe(1);
    expect(sorted[2].missingCount).toBe(3);
  });

  test('does not mutate original array', () => {
    const input = [{ score: 5, missingCount: 0 }, { score: 10, missingCount: 0 }];
    const sorted = sortRecipes(input);
    expect(input[0].score).toBe(5); // original unchanged
    expect(sorted[0].score).toBe(10);
  });
});
