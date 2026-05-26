const { getDb } = require('./database');

const INGREDIENTS = [
  { name_en: 'egg', name_es: 'huevo' },
  { name_en: 'tomato', name_es: 'tomate' },
  { name_en: 'onion', name_es: 'cebolla' },
  { name_en: 'garlic', name_es: 'ajo' },
  { name_en: 'milk', name_es: 'leche' },
  { name_en: 'cheese', name_es: 'queso' },
  { name_en: 'chicken', name_es: 'pollo' },
  { name_en: 'rice', name_es: 'arroz' },
  { name_en: 'pasta', name_es: 'pasta' },
  { name_en: 'potato', name_es: 'patata' },
  { name_en: 'carrot', name_es: 'zanahoria' },
  { name_en: 'spinach', name_es: 'espinacas' },
  { name_en: 'pepper', name_es: 'pimiento' },
  { name_en: 'mushroom', name_es: 'champiñón' },
  { name_en: 'lemon', name_es: 'limón' },
  { name_en: 'olive oil', name_es: 'aceite de oliva' },
  { name_en: 'butter', name_es: 'mantequilla' },
  { name_en: 'bread', name_es: 'pan' },
  { name_en: 'flour', name_es: 'harina' },
  { name_en: 'tuna', name_es: 'atún' },
  { name_en: 'lettuce', name_es: 'lechuga' },
  { name_en: 'cucumber', name_es: 'pepino' },
  { name_en: 'zucchini', name_es: 'calabacín' },
  { name_en: 'broccoli', name_es: 'brócoli' },
  { name_en: 'banana', name_es: 'plátano' },
  { name_en: 'apple', name_es: 'manzana' },
  { name_en: 'orange', name_es: 'naranja' },
  { name_en: 'beef', name_es: 'carne de res' },
  { name_en: 'salmon', name_es: 'salmón' },
  { name_en: 'corn', name_es: 'maíz' },
];

const RECIPES = [
  {
    name: 'Tortilla Española',
    ingredients: JSON.stringify(['egg', 'potato', 'onion', 'olive oil']),
    instructions: 'Pela y corta las patatas y la cebolla en rodajas finas. Fríelas en aceite de oliva a fuego medio hasta que estén tiernas. Bate los huevos, añade las patatas y la cebolla escurridas, mezcla bien. Cuaja en sartén antiadherente por ambos lados.',
    prep_time: 30,
    difficulty: 'medium',
    tags: JSON.stringify(['vegetarian', 'quick', 'spanish']),
  },
  {
    name: 'Pasta al Pesto de Tomate',
    ingredients: JSON.stringify(['pasta', 'tomato', 'garlic', 'olive oil', 'cheese']),
    instructions: 'Cuece la pasta al dente. Sofríe el ajo en aceite, añade el tomate troceado y cocina 10 min. Mezcla con la pasta y espolvorea queso rallado.',
    prep_time: 20,
    difficulty: 'easy',
    tags: JSON.stringify(['vegetarian', 'quick', 'italian']),
  },
  {
    name: 'Arroz con Pollo',
    ingredients: JSON.stringify(['chicken', 'rice', 'tomato', 'onion', 'garlic', 'pepper']),
    instructions: 'Dora el pollo troceado en aceite. Sofríe la cebolla, el ajo y el pimiento. Añade el tomate, el arroz y caldo. Cocina a fuego medio 20 min hasta que el arroz absorba el líquido.',
    prep_time: 45,
    difficulty: 'medium',
    tags: JSON.stringify(['high-protein', 'spanish']),
  },
  {
    name: 'Ensalada Mediterránea',
    ingredients: JSON.stringify(['tomato', 'cucumber', 'lettuce', 'cheese', 'olive oil', 'lemon']),
    instructions: 'Trocea las verduras y la lechuga. Añade el queso en dados. Aliña con aceite de oliva, zumo de limón y sal.',
    prep_time: 10,
    difficulty: 'easy',
    tags: JSON.stringify(['vegetarian', 'quick', 'healthy']),
  },
  {
    name: 'Revuelto de Champiñones y Espinacas',
    ingredients: JSON.stringify(['egg', 'mushroom', 'spinach', 'garlic', 'olive oil']),
    instructions: 'Saltea el ajo y los champiñones en aceite. Añade las espinacas y deja reducir. Incorpora los huevos batidos y revuelve a fuego bajo.',
    prep_time: 15,
    difficulty: 'easy',
    tags: JSON.stringify(['vegetarian', 'quick', 'high-protein']),
  },
  {
    name: 'Crema de Zanahoria',
    ingredients: JSON.stringify(['carrot', 'onion', 'garlic', 'potato', 'olive oil']),
    instructions: 'Sofríe la cebolla y el ajo. Añade la zanahoria y la patata en dados con agua o caldo. Cocina 20 min y tritura hasta obtener crema. Ajusta sal y pimienta.',
    prep_time: 30,
    difficulty: 'easy',
    tags: JSON.stringify(['vegetarian', 'healthy', 'vegan']),
  },
  {
    name: 'Salmón a la Plancha con Brócoli',
    ingredients: JSON.stringify(['salmon', 'broccoli', 'garlic', 'lemon', 'olive oil']),
    instructions: 'Cuece el brócoli al vapor 5 min. Cocina el salmón en plancha caliente con ajo y aceite, 3 min por lado. Sirve con brócoli y zumo de limón.',
    prep_time: 20,
    difficulty: 'easy',
    tags: JSON.stringify(['high-protein', 'healthy', 'quick']),
  },
  {
    name: 'Hamburguesa Casera',
    ingredients: JSON.stringify(['beef', 'onion', 'tomato', 'lettuce', 'bread', 'cheese']),
    instructions: 'Forma las hamburguesas con la carne sazonada. Cocínalas a la plancha 4 min por lado. Monta en el pan con lechuga, tomate, cebolla y queso fundido.',
    prep_time: 25,
    difficulty: 'medium',
    tags: JSON.stringify(['high-protein']),
  },
  {
    name: 'Patatas Bravas',
    ingredients: JSON.stringify(['potato', 'tomato', 'garlic', 'olive oil']),
    instructions: 'Corta las patatas en cubos y fríelas hasta dorar. Prepara una salsa con tomate, ajo y especias. Sirve las patatas con la salsa por encima.',
    prep_time: 30,
    difficulty: 'easy',
    tags: JSON.stringify(['vegetarian', 'vegan', 'spanish']),
  },
  {
    name: 'Pasta a la Carbonara',
    ingredients: JSON.stringify(['pasta', 'egg', 'cheese', 'garlic', 'olive oil']),
    instructions: 'Cuece la pasta. Mezcla yemas de huevo con queso rallado. Saltea el ajo en aceite. Combina la pasta caliente con la mezcla de huevo y queso fuera del fuego, removiendo para crear una salsa cremosa.',
    prep_time: 20,
    difficulty: 'medium',
    tags: JSON.stringify(['quick', 'italian']),
  },
];

function seed() {
  const db = getDb();

  const insertIngredient = db.prepare(
    'INSERT OR IGNORE INTO ingredients (name_en, name_es) VALUES (?, ?)'
  );
  const insertRecipe = db.prepare(
    'INSERT OR IGNORE INTO recipes (name, ingredients, instructions, prep_time, difficulty, tags) VALUES (?, ?, ?, ?, ?, ?)'
  );

  db.exec('BEGIN');
  try {
    for (const ing of INGREDIENTS) {
      insertIngredient.run(ing.name_en, ing.name_es);
    }
    for (const r of RECIPES) {
      insertRecipe.run(r.name, r.ingredients, r.instructions, r.prep_time, r.difficulty, r.tags);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  console.log(`Seeded ${INGREDIENTS.length} ingredients and ${RECIPES.length} recipes.`);
}

seed();
