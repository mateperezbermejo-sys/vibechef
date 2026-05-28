import { useEffect } from 'react';
import './RecipeModal.css';

const DIFFICULTY_ES = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' };

function parseSteps(instructions) {
  if (!instructions) return [];
  const numbered = instructions.match(/\d+[.)]\s+[^\n]+/g);
  if (numbered && numbered.length >= 2) {
    return numbered.map((s) => s.replace(/^\d+[.)]\s+/, '').trim());
  }
  const lines = instructions.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (lines.length >= 2) return lines;
  return instructions.split(/\.\s+/).map((s) => s.trim()).filter((s) => s.length > 10);
}

export default function RecipeModal({ recipe, onClose }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const {
    name, instructions, prep_time, difficulty, image_url,
    availableUsed = [], missingIngredients = [], tags = [],
  } = recipe;

  const steps = parseSteps(instructions);
  const allIngredients = [
    ...availableUsed.map((i) => ({ name: i, have: true })),
    ...missingIngredients.map((i) => ({ name: i, have: false })),
  ];

  return (
    <div className="rmodal-backdrop" onClick={onClose}>
      <div
        className="rmodal-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={name}
      >
        {/* Close button — floats above the image */}
        <button className="rmodal-close" onClick={onClose} aria-label="Cerrar">×</button>

        {/* Edge-to-edge image (or warm placeholder) */}
        <div className="rmodal-img">
          {image_url ? (
            <img src={image_url} alt={name} />
          ) : (
            <div className="rmodal-img-placeholder" aria-hidden="true" />
          )}
        </div>

        {/* Padded content area */}
        <div className="rmodal-content">
          <div className="rmodal-head">
            <h2 className="rmodal-title">{name}</h2>
            <div className="rmodal-meta">
              {prep_time && <span className="rmodal-meta-item">⏱ {prep_time} min</span>}
              {difficulty && (
                <span className="rmodal-meta-item">{DIFFICULTY_ES[difficulty] || difficulty}</span>
              )}
            </div>
          </div>

          {allIngredients.length > 0 && (
            <section className="rmodal-section">
              <h3 className="rmodal-section-title">Ingredientes</h3>
              <ul className="rmodal-ing-list">
                {allIngredients.map(({ name: ing, have }) => (
                  <li key={ing} className={`rmodal-ing-item ${have ? 'rmodal-ing--have' : 'rmodal-ing--miss'}`}>
                    <span className="rmodal-ing-dot" />
                    {ing}
                    {!have && <span className="rmodal-ing-label">comprar</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {steps.length > 0 ? (
            <section className="rmodal-section">
              <h3 className="rmodal-section-title">Preparación</h3>
              <ol className="rmodal-steps">
                {steps.map((step, i) => (
                  <li key={i} className="rmodal-step">{step}</li>
                ))}
              </ol>
            </section>
          ) : instructions ? (
            <section className="rmodal-section">
              <h3 className="rmodal-section-title">Preparación</h3>
              <p className="rmodal-instructions">{instructions}</p>
            </section>
          ) : null}

          {tags.length > 0 && (
            <div className="rmodal-tags">
              {tags.map((t) => (
                <span key={t} className="rmodal-tag">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
