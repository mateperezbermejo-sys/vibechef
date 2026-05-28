import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import VisionScanner from '../components/VisionScanner';
import './ScanPage.css';

const CANONICAL_MAP = {
  'whole milk': 'milk', 'semi milk': 'milk', 'skimmed milk': 'milk',
  'cherry tomato': 'tomato', 'cherry tomatoes': 'tomato', 'tomatoes': 'tomato',
  'eggs': 'egg', 'potatoes': 'potato', 'onions': 'onion',
  'carrots': 'carrot', 'mushrooms': 'mushroom', 'peppers': 'pepper',
  'chilli': 'pepper', 'bell pepper': 'pepper',
  'zucchinis': 'zucchini', 'courgette': 'zucchini',
  'extra virgin olive oil': 'olive oil', 'evoo': 'olive oil',
};

function normalize(name) {
  const lower = name.toLowerCase().trim();
  return CANONICAL_MAP[lower] || lower;
}

const LS_FRIDGE = 'vibechef_fridge';
const LS_PANTRY = 'vibechef_pantry';

function loadLS(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

const FILTER_OPTIONS = [
  { key: 'vegetarian',   label: 'Vegetariano' },
  { key: 'vegan',        label: 'Vegano' },
  { key: 'quick',        label: 'Rápido' },
  { key: 'high-protein', label: 'Alto en proteína' },
  { key: 'healthy',      label: 'Saludable' },
];

export default function ScanPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // "Mi nevera" — items from scanner or typed manually
  const [fridgeItems, setFridgeItems] = useState([]);
  const [fridgeInput, setFridgeInput] = useState('');

  // "Mi despensa" — manually added pantry items, persisted in localStorage
  const [pantryItems, setPantryItems] = useState([]);
  const [pantryInput, setPantryInput] = useState('');

  const [filters, setFilters]               = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [allergies, setAllergies]           = useState([]);
  const [allergyInput, setAllergyInput]     = useState('');
  const [allergiesLoading, setAllergiesLoading] = useState(false);

  useEffect(() => {
    if (location.state?.preloaded) setFridgeItems(location.state.preloaded);
    setPantryItems(loadLS(LS_PANTRY));
    api.allergies.get()
      .then((data) => setAllergies(data.allergies || []))
      .catch(() => {});
  }, []);

  // Persist pantry whenever it changes
  useEffect(() => {
    localStorage.setItem(LS_PANTRY, JSON.stringify(pantryItems));
  }, [pantryItems]);

  // ── Mi nevera ─────────────────────────────────────────────────

  function addFridgeItem(nameOrNames) {
    const names = Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames];
    setFridgeItems((prev) => {
      const next = [...prev];
      for (const raw of names) {
        const c = normalize(raw.trim());
        if (c && !next.includes(c)) next.push(c);
      }
      return next;
    });
    if (!Array.isArray(nameOrNames)) setFridgeInput('');
  }

  function removeFridgeItem(name) {
    setFridgeItems((prev) => prev.filter((i) => i !== name));
  }

  function handleFridgeKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); const r = fridgeInput.trim(); if (r) addFridgeItem(r); }
  }

  // ── Mi despensa ───────────────────────────────────────────────

  function addPantryItem() {
    const name = normalize(pantryInput.trim());
    if (!name || pantryItems.includes(name)) { setPantryInput(''); return; }
    setPantryItems((prev) => [...prev, name]);
    setPantryInput('');
  }

  function removePantryItem(name) {
    setPantryItems((prev) => prev.filter((i) => i !== name));
  }

  function handlePantryKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); addPantryItem(); }
  }

  // ── Alergias ──────────────────────────────────────────────────

  function toggleFilter(f) {
    setFilters((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  }

  async function handleAddAllergy() {
    const name = allergyInput.trim().toLowerCase();
    if (!name || allergies.includes(name)) return;
    setAllergiesLoading(true);
    try {
      await api.allergies.add(name);
      setAllergies((prev) => [...prev, name].sort());
      setAllergyInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setAllergiesLoading(false);
    }
  }

  async function handleRemoveAllergy(name) {
    try {
      await api.allergies.remove(name);
      setAllergies((prev) => prev.filter((a) => a !== name));
    } catch (err) {
      console.error(err);
    }
  }

  function handleAllergyKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); handleAddAllergy(); }
  }

  // ── Buscar recetas ────────────────────────────────────────────

  async function handleConfirm() {
    const allIngredients = [...new Set([...fridgeItems, ...pantryItems])];
    if (allIngredients.length === 0) {
      setError('Añade al menos un ingrediente para buscar recetas.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (fridgeItems.length > 0) await api.pantry.log(fridgeItems);
      localStorage.setItem(LS_FRIDGE, JSON.stringify(fridgeItems));
      const data = await api.recipes.match(allIngredients, filters);
      navigate('/recipes', {
        state: { recipes: data.recipes, ingredients: allIngredients, appliedAllergies: data.appliedAllergies },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const totalItems = fridgeItems.length + pantryItems.length;

  return (
    <div className="scan-page">
      <div className="scan-header">
        <h1>Escanea tu nevera</h1>
        <p>Haz una foto, revisa lo que tienes y completa tu despensa en segundos.</p>
      </div>

      <div className="scan-layout">
        {/* ── Columna izquierda: escáner + Mi nevera ────────────── */}
        <div className="scan-main">
          <VisionScanner onDetected={addFridgeItem} />

          <div className="scan-card">
            <h2>Mi nevera</h2>
            <p className="scan-card-desc">Ingredientes que has detectado o añadido de la nevera.</p>
            <div className="input-row">
              <input
                type="text"
                value={fridgeInput}
                onChange={(e) => setFridgeInput(e.target.value)}
                onKeyDown={handleFridgeKeyDown}
                placeholder="ej: tomate, huevo, pollo..."
              />
              <button
                onClick={() => { const r = fridgeInput.trim(); if (r) addFridgeItem(r); }}
                className="btn-add"
              >
                Añadir
              </button>
            </div>
            {fridgeItems.length === 0 ? (
              <div className="empty-ingredients">
                <p>Usa el escáner arriba o escribe directamente lo que tienes en la nevera.</p>
              </div>
            ) : (
              <div className="ingredient-tags">
                {fridgeItems.map((ing) => (
                  <div key={ing} className="ingredient-tag">
                    <span>{ing}</span>
                    <button onClick={() => removeFridgeItem(ing)} aria-label={`Eliminar ${ing}`}>×</button>
                  </div>
                ))}
              </div>
            )}
            {fridgeItems.length > 0 && (
              <div className="ingredient-count">{fridgeItems.length} en la nevera</div>
            )}
          </div>

          <div className="scan-card allergy-card">
            <h2>
              Lo que prefieres evitar
              {allergies.length > 0 && (
                <span className="allergy-count">{allergies.length} activa{allergies.length !== 1 ? 's' : ''}</span>
              )}
            </h2>
            <p className="allergy-hint">Ajustaremos tus recetas para que no aparezcan estos ingredientes.</p>
            <div className="input-row">
              <input
                type="text"
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                onKeyDown={handleAllergyKeyDown}
                placeholder="ej: gluten, frutos secos, lactosa..."
              />
              <button onClick={handleAddAllergy} className="btn-add" disabled={allergiesLoading || !allergyInput.trim()}>
                {allergiesLoading ? '...' : 'Añadir'}
              </button>
            </div>
            {allergies.length === 0 ? (
              <p className="allergy-empty">Sin restricciones activas.</p>
            ) : (
              <div className="ingredient-tags">
                {allergies.map((a) => (
                  <div key={a} className="ingredient-tag allergy-tag">
                    <span>{a}</span>
                    <button onClick={() => handleRemoveAllergy(a)} aria-label={`Eliminar restricción ${a}`}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="scan-card">
            <h2>Tipo de receta</h2>
            <div className="filter-grid">
              {FILTER_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  className={`filter-btn ${filters.includes(key) ? 'active' : ''}`}
                  onClick={() => toggleFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="scan-error">{error}</p>}

          <button
            className="btn-confirm"
            onClick={handleConfirm}
            disabled={loading || totalItems === 0}
          >
            {loading
              ? 'Buscando recetas...'
              : `Ver recetas · ${totalItems} ingrediente${totalItems !== 1 ? 's' : ''}`}
          </button>
        </div>

        {/* ── Columna derecha: Mi despensa ───────────────────────── */}
        <aside className="scan-aside">
          <div className="pantry-panel">
            <div className="pantry-panel-head">
              <h2>Mi despensa</h2>
              {pantryItems.length > 0 && (
                <span className="pantry-count">{pantryItems.length}</span>
              )}
            </div>
            <p className="pantry-desc">
              Añade aquí lo que tienes fuera de la nevera: especias, pasta, arroz, conservas...
              Se guardará entre sesiones.
            </p>
            <div className="input-row">
              <input
                type="text"
                value={pantryInput}
                onChange={(e) => setPantryInput(e.target.value)}
                onKeyDown={handlePantryKeyDown}
                placeholder="ej: arroz, aceite, sal..."
              />
              <button onClick={addPantryItem} className="btn-add" disabled={!pantryInput.trim()}>
                Añadir
              </button>
            </div>
            {pantryItems.length === 0 ? (
              <div className="pantry-empty">
                <p>Tu despensa está vacía.</p>
                <p className="pantry-empty-sub">Los alimentos que añadas aquí se guardarán entre sesiones.</p>
              </div>
            ) : (
              <div className="ingredient-tags">
                {pantryItems.map((item) => (
                  <div key={item} className="ingredient-tag pantry-tag">
                    <span>{item}</span>
                    <button onClick={() => removePantryItem(item)} aria-label={`Eliminar ${item}`}>×</button>
                  </div>
                ))}
              </div>
            )}
            {pantryItems.length > 0 && (
              <div className="ingredient-count">{pantryItems.length} en la despensa</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
