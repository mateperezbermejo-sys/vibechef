import { useState } from 'react';
import './RecipeCard.css';

const DIFFICULTY_ES    = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' };
const DIFFICULTY_CLASS = { easy: 'easy', medium: 'medium', hard: 'hard' };
const SOURCE_LABELS    = { pdf: 'PDF', markdown: 'Recetario', seed: null };

export default function RecipeCard({ recipe }) {
  const [expanded, setExpanded] = useState(false);

  const {
    name, instructions, prep_time, difficulty, tags = [], source,
    score, matchCount, missingCount,
    availableUsed = [], missingIngredients = [], substitutions = {},
  } = recipe;

  const total    = matchCount + missingCount;
  const matchPct = total > 0 ? Math.round((matchCount / total) * 100) : 0;
  const isHigh   = score >= 20;
  const srcLabel = SOURCE_LABELS[source];

  return (
    <article className={`rcard ${isHigh ? 'rcard--high' : ''}`}>
      {/* Match bar */}
      <div
        className="rcard-bar"
        style={{ '--pct': `${matchPct}%` }}
        aria-label={`Compatibilidad: ${matchPct}%`}
      />

      <div className="rcard-body">
        {/* Badges row */}
        <div className="rcard-badges">
          {srcLabel && (
            <span className={`rcard-badge rcard-badge--src rcard-badge--src-${source}`}>
              {srcLabel}
            </span>
          )}
          <span className={`rcard-badge rcard-badge--diff rcard-badge--${DIFFICULTY_CLASS[difficulty] || 'easy'}`}>
            {DIFFICULTY_ES[difficulty] || difficulty}
          </span>
          {prep_time && (
            <span className="rcard-badge rcard-badge--time">{prep_time} min</span>
          )}
          {isHigh && <span className="rcard-badge rcard-badge--match">Gran encaje</span>}
        </div>

        {/* Name */}
        <h3 className="rcard-name">{name}</h3>

        {/* Ingredient breakdown */}
        <div className="rcard-ingredients">
          {availableUsed.length > 0 && (
            <div className="rcard-ing-row">
              <span className="rcard-ing-lbl rcard-ing-lbl--have">Tienes</span>
              <div className="rcard-chips">
                {availableUsed.map((i) => (
                  <span key={i} className="rcard-chip rcard-chip--have">{i}</span>
                ))}
              </div>
            </div>
          )}

          {missingIngredients.length > 0 && (
            <div className="rcard-ing-row">
              <span className="rcard-ing-lbl rcard-ing-lbl--miss">Faltan</span>
              <div className="rcard-chips">
                {missingIngredients.map((i) => (
                  <span key={i} className="rcard-chip rcard-chip--miss">
                    {i}
                    {substitutions[i] && (
                      <span className="rcard-sub"> → {substitutions[i][0]}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Score summary */}
        <p className="rcard-score-line">
          <strong>{matchCount}</strong> de {total} ingredientes disponibles
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="rcard-tags">
            {tags.map((t) => (
              <span key={t} className="rcard-chip rcard-chip--tag">{t}</span>
            ))}
          </div>
        )}

        {/* Expand instructions */}
        {instructions && (
          <>
            <button
              className="rcard-toggle"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
            >
              {expanded ? 'Ocultar preparación' : 'Ver preparación'}
              <span className="rcard-toggle-arrow" aria-hidden="true">
                {expanded ? '▲' : '▼'}
              </span>
            </button>

            {expanded && (
              <div className="rcard-instructions">
                <p>{instructions}</p>
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}
