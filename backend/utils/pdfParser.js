/**
 * Parses raw text extracted from a PDF into an array of recipe objects.
 *
 * Supported PDF formats:
 * ─────────────────────
 * Format 1 (Spanish):
 *   Nombre: Paella Valenciana
 *   Ingredientes: rice, chicken, tomato, olive oil
 *   Instrucciones: Sofríe el pollo...
 *   Tiempo: 45
 *   Dificultad: medium
 *   Tags: spanish, high-protein
 *
 * Format 2 (English):
 *   Recipe: Paella Valenciana
 *   Ingredients: rice, chicken, tomato
 *   Instructions: Fry the chicken...
 *   Time: 45
 *   Difficulty: easy
 *   Tags: spanish
 *
 * Recipes must be separated by one or more blank lines (or "---" dividers).
 * Fields are case-insensitive. Any unknown field is silently ignored.
 * A recipe block is considered valid if it has at least a name and ingredients.
 *
 * Adding new PDFs in the future:
 *   1. Structure each recipe block with the fields above.
 *   2. Separate recipes with a blank line or "---".
 *   3. POST the PDF file to POST /api/recipes/import-pdf.
 *   4. Duplicate detection is done by recipe name (case-insensitive).
 */

const FIELD_PATTERNS = [
  { key: 'name',         regex: /^(?:nombre|recipe)\s*:\s*(.+)/i },
  { key: 'ingredients',  regex: /^(?:ingredientes|ingredients)\s*:\s*(.+)/i },
  { key: 'instructions', regex: /^(?:instrucciones|instructions)\s*:\s*(.+)/i },
  { key: 'prep_time',    regex: /^(?:tiempo|time|prep[\s_-]?time)\s*:\s*(\d+)/i },
  { key: 'difficulty',   regex: /^(?:dificultad|difficulty)\s*:\s*(.+)/i },
  { key: 'tags',         regex: /^(?:tags|etiquetas)\s*:\s*(.+)/i },
];

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard',
                            'fácil', 'media', 'difícil'];
const DIFFICULTY_MAP = { fácil: 'easy', facil: 'easy', media: 'medium', difícil: 'hard', dificil: 'hard' };

function normalizeDifficulty(value) {
  const v = value.toLowerCase().trim();
  return DIFFICULTY_MAP[v] || (VALID_DIFFICULTIES.includes(v) ? v : 'medium');
}

/**
 * Split text into recipe blocks separated by blank lines or "---".
 */
function splitIntoBlocks(text) {
  // Normalize line endings and split on blank lines / horizontal rules
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/(?:\n\s*\n+|\n-{3,}\n|\n={3,}\n)/);
  return blocks.map((b) => b.trim()).filter((b) => b.length > 0);
}

/**
 * Parse a single recipe block into a recipe object, or null if invalid.
 */
function parseBlock(block) {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  const parsed = {};
  let instructionsBuffer = [];
  let collectingInstructions = false;

  for (const line of lines) {
    let matched = false;
    for (const { key, regex } of FIELD_PATTERNS) {
      const m = line.match(regex);
      if (m) {
        if (key === 'instructions') {
          instructionsBuffer = [m[1].trim()];
          collectingInstructions = true;
        } else {
          parsed[key] = m[1].trim();
          collectingInstructions = false;
        }
        matched = true;
        break;
      }
    }
    // Continuation lines for multi-line instructions
    if (!matched && collectingInstructions) {
      instructionsBuffer.push(line);
    }
  }

  if (instructionsBuffer.length > 0) {
    parsed.instructions = instructionsBuffer.join(' ');
  }

  // Validate required fields
  if (!parsed.name || !parsed.ingredients) return null;

  // Normalize ingredients: comma-separated → lowercase array
  const ingredients = parsed.ingredients
    .split(/[,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (ingredients.length === 0) return null;

  // Normalize tags
  const tags = parsed.tags
    ? parsed.tags.split(/[,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];

  return {
    name: parsed.name.trim(),
    ingredients: JSON.stringify(ingredients),
    instructions: parsed.instructions || 'Ver PDF original para instrucciones detalladas.',
    prep_time: parseInt(parsed.prep_time, 10) || 30,
    difficulty: normalizeDifficulty(parsed.difficulty || 'medium'),
    tags: JSON.stringify(tags),
    source: 'pdf',
  };
}

/**
 * Parse a full PDF text string into an array of ready-to-insert recipe objects.
 */
function parseRecipesFromText(text) {
  const blocks = splitIntoBlocks(text);
  return blocks.map(parseBlock).filter(Boolean);
}

module.exports = { parseRecipesFromText, parseBlock, splitIntoBlocks };
