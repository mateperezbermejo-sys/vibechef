import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './HistoryPage.css';

const LS_FRIDGE = 'vibechef_fridge';
const LS_PANTRY = 'vibechef_pantry';

function loadLS(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

export default function HistoryPage() {
  const [fridgeItems, setFridgeItems] = useState([]);
  const [pantryItems, setPantryItems] = useState([]);

  useEffect(() => {
    setFridgeItems(loadLS(LS_FRIDGE));
    setPantryItems(loadLS(LS_PANTRY));
  }, []);

  function removeFridge(item) {
    setFridgeItems((prev) => {
      const next = prev.filter((i) => i !== item);
      localStorage.setItem(LS_FRIDGE, JSON.stringify(next));
      return next;
    });
  }

  function removePantry(item) {
    setPantryItems((prev) => {
      const next = prev.filter((i) => i !== item);
      localStorage.setItem(LS_PANTRY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="myfoods-page">

      {/* ── Slogan banner ───────────────────────────────────────── */}
      <div className="myfoods-slogan" aria-label="Eslogan">
        <p className="myfoods-slogan-text">¿Lo tienes?<br /><span>¡Cocínalo!</span></p>
      </div>

      <div className="myfoods-inner">
      <div className="myfoods-header">
        <h1>Mis alimentos</h1>
        <p className="myfoods-sub">Todo lo que tienes en casa, listo para cocinar.</p>
      </div>

      <div className="myfoods-grid">
        {/* ── Mi nevera ───────────────────────────────────────── */}
        <section className="myfoods-card">
          <div className="myfoods-card-head">
            <div>
              <h2>Mi nevera</h2>
              <p className="myfoods-card-desc">Ingredientes confirmados desde tu última exploración de la nevera.</p>
            </div>
            {fridgeItems.length > 0 && (
              <span className="myfoods-badge myfoods-badge--green">{fridgeItems.length}</span>
            )}
          </div>

          {fridgeItems.length === 0 ? (
            <div className="myfoods-empty">
              <p className="myfoods-empty-title">Tu nevera está vacía</p>
              <p>Escanea tu nevera para ver tus ingredientes aquí.</p>
              <Link to="/scan" className="myfoods-cta">Escanear ahora →</Link>
            </div>
          ) : (
            <div className="myfoods-tags">
              {fridgeItems.map((item) => (
                <div key={item} className="myfoods-tag myfoods-tag--fridge">
                  <span>{item}</span>
                  <button onClick={() => removeFridge(item)} aria-label={`Eliminar ${item}`}>×</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Mi despensa ──────────────────────────────────────── */}
        <section className="myfoods-card">
          <div className="myfoods-card-head">
            <div>
              <h2>Mi despensa</h2>
              <p className="myfoods-card-desc">Especias, pasta, arroz y todo lo que tienes fuera de la nevera.</p>
            </div>
            {pantryItems.length > 0 && (
              <span className="myfoods-badge myfoods-badge--blue">{pantryItems.length}</span>
            )}
          </div>

          {pantryItems.length === 0 ? (
            <div className="myfoods-empty">
              <p className="myfoods-empty-title">Tu despensa está vacía</p>
              <p>Añade alimentos desde la sección Escanear.</p>
              <Link to="/scan" className="myfoods-cta">Ir a Escanear →</Link>
            </div>
          ) : (
            <div className="myfoods-tags">
              {pantryItems.map((item) => (
                <div key={item} className="myfoods-tag myfoods-tag--pantry">
                  <span>{item}</span>
                  <button onClick={() => removePantry(item)} aria-label={`Eliminar ${item}`}>×</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      </div>
    </div>
  );
}
