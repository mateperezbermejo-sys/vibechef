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

export default function ScanPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (location.state?.preloaded) {
      setIngredients(location.state.preloaded);
    }
  }, []);

  function addIngredient(nameOrNames) {
    const names = Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames];
    setIngredients((prev) => {
      const next = [...prev];
      for (const raw of names) {
        const canonical = normalize(raw.trim());
        if (canonical && !next.includes(canonical)) next.push(canonical);
      }
      return next;
    });
    if (!Array.isArray(nameOrNames)) setInput('');
  }

  function removeIngredient(name) {
    setIngredients((prev) => prev.filter((i) => i !== name));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const raw = input.trim();
      if (raw) addIngredient(raw);
    }
  }

  function toggleFilter(f) {
    setFilters((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  }

  async function handleConfirm() {
    if (ingredients.length === 0) {
      setError('Añade al menos un ingrediente.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.pantry.log(ingredients);
      const data = await api.recipes.match(ingredients, filters);
      navigate('/recipes', { state: { recipes: data.recipes, ingredients } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const FILTER_OPTIONS = [
    { key: 'vegetarian', label: '🥦 Vegetariano' },
    { key: 'vegan',      label: '🌱 Vegano' },
    { key: 'quick',      label: '⚡ Rápido (<20 min)' },
    { key: 'high-protein', label: '💪 Alto en proteína' },
    { key: 'healthy',    label: '❤️ Saludable' },
  ];

  return (
    <div className="scan-page">
      <div className="scan-header">
        <h1>📋 Agente de Confirmación</h1>
        <p>Detecta ingredientes con la cámara o añádelos manualmente</p>
      </div>

      {/* Vision Agent — expandable */}
      <VisionScanner onDetected={addIngredient} />

      {/* Manual ingredient input */}
      <div className="scan-card">
        <h2>Ingredientes confirmados</h2>

        <div className="input-row">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ej: tomato, egg, pasta..."
          />
          <button
            onClick={() => { const raw = input.trim(); if (raw) addIngredient(raw); }}
            className="btn-add"
          >
            Añadir
          </button>
        </div>

        {ingredients.length === 0 ? (
          <div className="empty-ingredients">
            <p>
              Usa el Vision Agent para detectar ingredientes con la cámara, o
              escríbelos directamente arriba.
            </p>
          </div>
        ) : (
          <div className="ingredient-tags">
            {ingredients.map((ing) => (
              <div key={ing} className="ingredient-tag">
                <span>{ing}</span>
                <button
                  onClick={() => removeIngredient(ing)}
                  aria-label={`Eliminar ${ing}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="ingredient-count">
          {ingredients.length} ingrediente{ingredients.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters */}
      <div className="scan-card">
        <h2>Filtros</h2>
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
        disabled={loading || ingredients.length === 0}
      >
        {loading
          ? 'Buscando recetas...'
          : `🍽️ Buscar recetas con ${ingredients.length} ingrediente${ingredients.length !== 1 ? 's' : ''}`}
      </button>
    </div>
  );
}
