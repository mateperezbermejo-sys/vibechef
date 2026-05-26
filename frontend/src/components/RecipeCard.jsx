import './RecipeCard.css';

const DIFFICULTY_LABEL = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' };
const DIFFICULTY_COLOR = { easy: '#2D7D46', medium: '#F5A623', hard: '#E55' };

export default function RecipeCard({ recipe }) {
  const { name, instructions, prep_time, difficulty, tags, matchCount, missingIngredients, score } = recipe;

  return (
    <div className="recipe-card">
      <div className="recipe-card-header">
        <h3>{name}</h3>
        <span className="recipe-score">{score} pts</span>
      </div>

      <div className="recipe-meta">
        <span className="meta-pill">⏱ {prep_time} min</span>
        <span className="meta-pill" style={{ color: DIFFICULTY_COLOR[difficulty] }}>
          {DIFFICULTY_LABEL[difficulty]}
        </span>
        {tags.map((t) => (
          <span key={t} className="meta-pill tag">{t}</span>
        ))}
      </div>

      <div className="recipe-match">
        <span className="match-count">✅ {matchCount} ingredientes coinciden</span>
        {missingIngredients && missingIngredients.length > 0 && (
          <span className="missing">
            Falta: {missingIngredients.join(', ')}
          </span>
        )}
      </div>

      <details className="recipe-instructions">
        <summary>Ver instrucciones</summary>
        <p>{instructions}</p>
      </details>
    </div>
  );
}
