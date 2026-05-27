const { generateWeekMenu, DAYS } = require('../utils/menuUtils');

// Helpers to build fake scored recipe objects
function makeRecipe(id, name, score, missingCount, availableUsed = [], missingIngredients = []) {
  return {
    id,
    name,
    score,
    missingCount,
    availableUsed,
    missingIngredients,
    prep_time: 30,
    difficulty: 'easy',
    tags: [],
    instructions: '',
  };
}

describe('generateWeekMenu', () => {
  test('returns 7 days each with lunch and dinner', () => {
    const recipes = Array.from({ length: 14 }, (_, i) =>
      makeRecipe(i + 1, `Receta ${i + 1}`, 20 - i, i)
    );
    const week = generateWeekMenu(recipes);
    expect(week).toHaveLength(7);
    expect(week[0].day).toBe('Lunes');
    expect(week[6].day).toBe('Domingo');
    week.forEach(({ lunch, dinner }) => {
      expect(lunch).not.toBeNull();
      expect(dinner).not.toBeNull();
    });
  });

  test('uses day names in order (Mon–Sun)', () => {
    const recipes = Array.from({ length: 14 }, (_, i) => makeRecipe(i + 1, `R${i}`, 10, 0));
    const week = generateWeekMenu(recipes);
    expect(week.map((d) => d.day)).toEqual(DAYS);
  });

  test('higher-scored recipes are assigned first (lunch Monday)', () => {
    const recipes = [
      makeRecipe(1, 'Baja', 5, 2),
      makeRecipe(2, 'Alta', 50, 0),
      makeRecipe(3, 'Media', 20, 1),
      ...Array.from({ length: 11 }, (_, i) => makeRecipe(i + 10, `X${i}`, 1, 0)),
    ];
    const week = generateWeekMenu(recipes);
    expect(week[0].lunch.recipe.name).toBe('Alta');
    expect(week[0].dinner.recipe.name).toBe('Media');
  });

  test('no duplicate recipes when pool has 14+', () => {
    const recipes = Array.from({ length: 20 }, (_, i) =>
      makeRecipe(i + 1, `Receta ${i + 1}`, 10, 0)
    );
    const week = generateWeekMenu(recipes);
    const names = week.flatMap(({ lunch, dinner }) => [
      lunch.recipe.name,
      dinner.recipe.name,
    ]);
    const unique = new Set(names);
    expect(unique.size).toBe(14);
  });

  test('cycles recipes gracefully when pool is smaller than 14', () => {
    const recipes = [makeRecipe(1, 'Sola', 10, 0)];
    const week = generateWeekMenu(recipes);
    expect(week).toHaveLength(7);
    week.forEach(({ lunch, dinner }) => {
      expect(lunch.recipe.name).toBe('Sola');
      expect(dinner.recipe.name).toBe('Sola');
    });
  });

  test('returns null slots when no recipes provided', () => {
    const week = generateWeekMenu([]);
    week.forEach(({ lunch, dinner }) => {
      expect(lunch).toBeNull();
      expect(dinner).toBeNull();
    });
  });

  test('sets lowConfidence: true when score <= 0', () => {
    const recipes = Array.from({ length: 14 }, (_, i) =>
      makeRecipe(i + 1, `R${i}`, i === 0 ? -4 : i === 1 ? 0 : 10, 0)
    );
    const week = generateWeekMenu(recipes);
    const allSlots = week.flatMap(({ lunch, dinner }) => [lunch, dinner]);
    const lowConf = allSlots.filter((s) => s.lowConfidence);
    // The two lowest-scoring recipes (score -4 and 0) should be flagged
    expect(lowConf.length).toBeGreaterThanOrEqual(2);
  });

  test('slot includes availableUsed and missingIngredients', () => {
    const recipes = [
      makeRecipe(1, 'Tortilla', 28, 1, ['egg', 'potato'], ['olive oil']),
      ...Array.from({ length: 13 }, (_, i) => makeRecipe(i + 2, `R${i}`, 10, 0)),
    ];
    const week = generateWeekMenu(recipes);
    const tortilla = week
      .flatMap(({ lunch, dinner }) => [lunch, dinner])
      .find((s) => s.recipe.name === 'Tortilla');
    expect(tortilla.availableUsed).toEqual(['egg', 'potato']);
    expect(tortilla.missingIngredients).toEqual(['olive oil']);
  });

  test('respects custom day list', () => {
    const days = ['Día 1', 'Día 2'];
    const recipes = Array.from({ length: 4 }, (_, i) => makeRecipe(i + 1, `R${i}`, 10, 0));
    const week = generateWeekMenu(recipes, days);
    expect(week).toHaveLength(2);
    expect(week.map((d) => d.day)).toEqual(days);
  });
});
