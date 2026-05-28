import { useState, useEffect } from 'react';
import { api } from '../services/api';
import RecipeModal from '../components/RecipeModal';
import './MenuPage.css';

const FILTER_OPTIONS = [
  { value: 'quick', label: 'Rápida' },
  { value: 'vegetarian', label: 'Vegetariana' },
  { value: 'high-protein', label: 'Alta proteína' },
];

const DIFFICULTY_LABELS = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' };

export default function MenuPage() {
  const [ingredients, setIngredients] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [filters, setFilters] = useState([]);
  const [week, setWeek] = useState(null);
  const [shoppingList, setShoppingList] = useState([]);
  const [appliedAllergies, setAppliedAllergies] = useState([]);
  const [totalConsidered, setTotalConsidered] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedSlot, setExpandedSlot] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    function loadLS(key) {
      try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
    }
    const fridge = loadLS('vibechef_fridge');
    const pantry = loadLS('vibechef_pantry');
    const combined = [...new Set([...fridge, ...pantry])];
    if (combined.length > 0) {
      setIngredients(combined);
    } else {
      api.pantry.history().then((data) => {
        const names = (data.history || []).map((h) => h.name_en || h.ingredient_name || h.name).filter(Boolean);
        setIngredients(names.slice(0, 20));
      }).catch(() => {});
    }
  }, []);

  function addIngredient() {
    const val = inputValue.trim().toLowerCase();
    if (val && !ingredients.includes(val)) {
      setIngredients((prev) => [...prev, val]);
    }
    setInputValue('');
  }

  function removeIngredient(name) {
    setIngredients((prev) => prev.filter((i) => i !== name));
  }

  function toggleFilter(value) {
    setFilters((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
    );
  }

  async function handleGenerate() {
    setError('');
    setLoading(true);
    setWeek(null);
    setShoppingList([]);
    try {
      const data = await api.menus.weekly(ingredients, filters);
      setWeek(data.week);
      setShoppingList(data.shoppingList || []);
      setAppliedAllergies(data.appliedAllergies || []);
      setTotalConsidered(data.totalRecipesConsidered || 0);
    } catch (err) {
      setError(err.message || 'Error al generar el menú.');
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(key) {
    setExpandedSlot((prev) => (prev === key ? null : key));
  }

  function openMealModal(meal) {
    if (!meal) return;
    setSelectedRecipe({
      ...meal.recipe,
      availableUsed: meal.availableUsed || [],
      missingIngredients: meal.missingIngredients || [],
    });
  }

  return (
    <div className="menu-page">
      <div className="menu-header">
        <h1>Menú Semanal</h1>
        <p>Genera un plan de 7 días con comida y cena según tus ingredientes disponibles.</p>
      </div>

      <div className="menu-card">
        <h2>Mis ingredientes</h2>
        <div className="input-row">
          <input
            type="text"
            placeholder="Añadir ingrediente..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
          />
          <button className="btn-add" onClick={addIngredient}>Añadir</button>
        </div>
        {ingredients.length > 0 ? (
          <div className="ingredient-chips">
            {ingredients.map((name) => (
              <span key={name} className="chip chip-removable">
                {name}
                <button onClick={() => removeIngredient(name)} className="chip-remove">×</button>
              </span>
            ))}
          </div>
        ) : (
          <p className="empty-note">Sin ingredientes. Añade aquí lo que tienes o visita <a href="/scan">Escanear</a> primero.</p>
        )}
      </div>

      <div className="menu-card">
        <h2>Filtros</h2>
        <div className="filter-chips">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              className={`chip chip-filter ${filters.includes(value) ? 'active' : ''}`}
              onClick={() => toggleFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="menu-error">{error}</p>}

      <button
        className="btn-generate"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? 'Generando...' : 'Generar Menú Semanal'}
      </button>

      {week && (
        <>
          <div className="menu-meta">
            <span>{totalConsidered} recetas evaluadas</span>
            {appliedAllergies.length > 0 && (
              <span className="meta-allergies">
                Alergias aplicadas: {appliedAllergies.join(', ')}
              </span>
            )}
          </div>

          <div className="week-grid">
            {week.map(({ day, lunch, dinner }) => (
              <div key={day} className="day-row">
                <div className="day-name">{day}</div>
                <div className="day-meals">
                  {[
                    { meal: lunch, label: 'Comida', key: `${day}-lunch` },
                    { meal: dinner, label: 'Cena', key: `${day}-dinner` },
                  ].map(({ meal, label, key }) => (
                    <div
                      key={key}
                      className={`meal-slot ${meal?.lowConfidence ? 'low-confidence' : ''}`}
                    >
                      {meal ? (
                        <>
                          <div
                            className="meal-header"
                            onClick={() => toggleExpand(key)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && toggleExpand(key)}
                          >
                            <span className="meal-type-badge">{label}</span>
                            <span className="meal-name">{meal.recipe.name}</span>
                            <span className="meal-meta">
                              {meal.recipe.prep_time} min · {DIFFICULTY_LABELS[meal.recipe.difficulty] || meal.recipe.difficulty}
                            </span>
                            {meal.lowConfidence && (
                              <span className="badge-low">pocas coincidencias</span>
                            )}
                            <span className="expand-icon">{expandedSlot === key ? '▲' : '▼'}</span>
                          </div>

                          {expandedSlot === key && (
                            <div className="meal-detail">
                              {meal.availableUsed.length > 0 && (
                                <p className="detail-row">
                                  <strong>Disponibles:</strong>{' '}
                                  {meal.availableUsed.map((i) => (
                                    <span key={i} className="chip chip-available">{i}</span>
                                  ))}
                                </p>
                              )}
                              {meal.missingIngredients.length > 0 && (
                                <p className="detail-row">
                                  <strong>Faltan:</strong>{' '}
                                  {meal.missingIngredients.map((i) => (
                                    <span key={i} className="chip chip-missing">{i}</span>
                                  ))}
                                </p>
                              )}
                              <button
                                className="btn-ver-receta"
                                onClick={() => openMealModal(meal)}
                              >
                                Ver receta completa →
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="meal-empty">{label}: —</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {shoppingList.length > 0 && (
            <div className="shopping-panel">
              <div className="shopping-head">
                <h2>Lista de la compra</h2>
                <span className="shopping-count">{shoppingList.length}</span>
              </div>
              <p className="shopping-desc">
                Ingredientes que necesitas para el menú semanal y no tienes en casa.
              </p>
              <ul className="shopping-list">
                {shoppingList.map((item) => (
                  <li key={item} className="shopping-item">
                    <span className="shopping-dot" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {selectedRecipe && (
        <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
      )}
    </div>
  );
}
