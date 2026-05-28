import './RecipeCard.css';

const DIFFICULTY_ES    = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' };
const DIFFICULTY_CLASS = { easy: 'easy', medium: 'medium', hard: 'hard' };

export default function RecipeCard({ recipe, onClick }) {
  const {
    name, prep_time, difficulty, tags = [], score,
    matchCount = 0, missingCount = 0, image_url,
  } = recipe;

  const total    = matchCount + missingCount;
  const matchPct = total > 0 ? Math.round((matchCount / total) * 100) : 0;
  const isHigh   = score >= 20;

  return (
    <article
      className={`rcard ${isHigh ? 'rcard--high' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Recipe image or category placeholder */}
      <div className="rcard-img">
        {image_url ? (
          <img src={image_url} alt={name} loading="lazy" />
        ) : (
          <div className="rcard-img-placeholder" aria-hidden="true" />
        )}
      </div>

      <div className="rcard-bar" style={{ '--pct': `${matchPct}%` }} />

      <div className="rcard-body">
        <div className="rcard-badges">
          <span className={`rcard-badge rcard-badge--${DIFFICULTY_CLASS[difficulty] || 'easy'}`}>
            {DIFFICULTY_ES[difficulty] || difficulty}
          </span>
          {prep_time && (
            <span className="rcard-badge rcard-badge--time">{prep_time} min</span>
          )}
          {isHigh && <span className="rcard-badge rcard-badge--match">Gran encaje</span>}
        </div>

        <h3 className="rcard-name">{name}</h3>

        <p className="rcard-miss-line">
          {missingCount === 0 ? (
            <span className="rcard-miss-zero">Tienes todo</span>
          ) : (
            <>
              <span className="rcard-miss-count">{missingCount}</span>
              {' '}ingrediente{missingCount !== 1 ? 's' : ''} por comprar
            </>
          )}
        </p>

        <div className="rcard-footer">
          {tags.length > 0 && (
            <div className="rcard-tags">
              {tags.slice(0, 3).map((t) => (
                <span key={t} className="rcard-tag">{t}</span>
              ))}
            </div>
          )}
          <span className="rcard-cta">Ver receta →</span>
        </div>
      </div>
    </article>
  );
}
