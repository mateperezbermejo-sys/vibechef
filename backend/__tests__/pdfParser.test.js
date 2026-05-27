const { parseRecipesFromText, parseBlock, splitIntoBlocks } = require('../utils/pdfParser');

describe('splitIntoBlocks', () => {
  test('splits on double newlines', () => {
    const text = 'Block one\n\nBlock two\n\nBlock three';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(3);
  });

  test('splits on --- divider', () => {
    const text = 'Block one\n---\nBlock two';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(2);
  });

  test('ignores empty blocks', () => {
    const text = '\n\nReal block\n\n\n\n';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(1);
  });
});

describe('parseBlock', () => {
  test('parses a complete Spanish recipe block', () => {
    const block = `Nombre: Paella Valenciana
Ingredientes: rice, chicken, tomato, olive oil
Instrucciones: Sofríe el pollo en aceite caliente.
Tiempo: 45
Dificultad: medium
Tags: spanish, high-protein`;
    const recipe = parseBlock(block);
    expect(recipe).not.toBeNull();
    expect(recipe.name).toBe('Paella Valenciana');
    expect(JSON.parse(recipe.ingredients)).toEqual(['rice', 'chicken', 'tomato', 'olive oil']);
    expect(recipe.prep_time).toBe(45);
    expect(recipe.difficulty).toBe('medium');
    expect(JSON.parse(recipe.tags)).toEqual(['spanish', 'high-protein']);
    expect(recipe.source).toBe('pdf');
  });

  test('parses an English recipe block', () => {
    const block = `Recipe: Gazpacho
Ingredients: tomato, cucumber, pepper, garlic, olive oil
Instructions: Blend all ingredients cold.
Time: 10
Difficulty: easy
Tags: vegan, healthy`;
    const recipe = parseBlock(block);
    expect(recipe).not.toBeNull();
    expect(recipe.name).toBe('Gazpacho');
    expect(JSON.parse(recipe.ingredients)).toContain('cucumber');
    expect(recipe.difficulty).toBe('easy');
  });

  test('returns null when no name', () => {
    const block = `Ingredientes: egg, potato\nInstrucciones: Mix and fry.`;
    expect(parseBlock(block)).toBeNull();
  });

  test('returns null when no ingredients', () => {
    const block = `Nombre: Mystery Recipe\nInstrucciones: Do something.`;
    expect(parseBlock(block)).toBeNull();
  });

  test('normalizes Spanish difficulty names', () => {
    const block = `Nombre: Test\nIngredientes: egg\nDificultad: fácil`;
    const recipe = parseBlock(block);
    expect(recipe.difficulty).toBe('easy');
  });

  test('defaults missing fields gracefully', () => {
    const block = `Nombre: Minimal Recipe\nIngredientes: egg, salt`;
    const recipe = parseBlock(block);
    expect(recipe).not.toBeNull();
    expect(recipe.prep_time).toBe(30);
    expect(recipe.difficulty).toBe('medium');
    expect(JSON.parse(recipe.tags)).toEqual([]);
  });

  test('handles semicolon-separated ingredients', () => {
    const block = `Nombre: Test\nIngredientes: egg; milk; flour`;
    const recipe = parseBlock(block);
    expect(JSON.parse(recipe.ingredients)).toEqual(['egg', 'milk', 'flour']);
  });
});

describe('parseRecipesFromText', () => {
  test('parses multiple recipes from one text', () => {
    const text = `Nombre: Recipe One
Ingredientes: egg, potato
Instrucciones: Fry.

Nombre: Recipe Two
Ingredientes: pasta, tomato
Instrucciones: Boil and mix.`;
    const recipes = parseRecipesFromText(text);
    expect(recipes).toHaveLength(2);
    expect(recipes[0].name).toBe('Recipe One');
    expect(recipes[1].name).toBe('Recipe Two');
  });

  test('ignores invalid blocks silently', () => {
    const text = `Nombre: Good Recipe
Ingredientes: egg, milk
Instrucciones: Mix.

This block has no name or ingredients.
Just random text.`;
    const recipes = parseRecipesFromText(text);
    expect(recipes).toHaveLength(1);
    expect(recipes[0].name).toBe('Good Recipe');
  });

  test('returns empty array for unrecognized text', () => {
    const recipes = parseRecipesFromText('Hello world, this is not a recipe PDF.');
    expect(recipes).toEqual([]);
  });
});
