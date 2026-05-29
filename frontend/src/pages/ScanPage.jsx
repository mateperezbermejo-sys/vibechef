import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import VisionScanner from '../components/VisionScanner';
import './ScanPage.css';

// ── Canonical normalization ────────────────────────────────────
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

const LS_FRIDGE  = 'vibechef_fridge';
const LS_PANTRY  = 'vibechef_pantry';
function loadLS(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

const FILTER_OPTIONS = [
  { key: 'vegetarian',   label: 'Vegetariano' },
  { key: 'vegan',        label: 'Vegano' },
  { key: 'quick',        label: 'Rápido ⚡' },
  { key: 'high-protein', label: 'Alto en proteína' },
  { key: 'healthy',      label: 'Saludable' },
];

// ── Ingredient emoji map ───────────────────────────────────────
const EMOJI_MAP = {
  tomato:'🍅', egg:'🥚', milk:'🥛', apple:'🍎', chicken:'🍗',
  carrot:'🥕', potato:'🥔', onion:'🧅', garlic:'🧄', spinach:'🥬',
  pepper:'🫑', bread:'🍞', cheese:'🧀', rice:'🍚', pasta:'🍝',
  mushroom:'🍄', lemon:'🍋', avocado:'🥑', salmon:'🐟', tuna:'🐟',
  beef:'🥩', pork:'🥩', broccoli:'🥦', zucchini:'🥒', lettuce:'🥬',
  cucumber:'🥒', orange:'🍊', banana:'🍌', fish:'🐟', oil:'🫒',
  flour:'🌾', sugar:'🍬', butter:'🧈', yogurt:'🥛', ham:'🥓',
  chorizo:'🌶️', shrimp:'🍤',
};
function getEmoji(name) {
  const l = name.toLowerCase();
  for (const [k, e] of Object.entries(EMOJI_MAP)) if (l.includes(k)) return e;
  return '🫙';
}

// ── Inline SVG icons ───────────────────────────────────────────
function IconFridge()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="5" y1="10" x2="19" y2="10"/></svg>; }
function IconBook()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>; }
function IconCalendar() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function IconList()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>; }
function IconHeart()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>; }
function IconSettings() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function IconCamera()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>; }
function IconSearch()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function IconHelp()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
function IconStar()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>; }

const SIDEBAR_NAV = [
  { id: 'fridge',    label: 'Mi nevera',      Icon: IconFridge,   path: null },
  { id: 'menu',      label: 'Menú semanal',   Icon: IconCalendar, path: '/menu' },
  { id: 'alimentos', label: 'Mis alimentos',  Icon: IconList,     path: '/history' },
];

export default function ScanPage() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const firstName = user?.email?.split('@')[0] || 'Chef';

  const [fridgeItems,    setFridgeItems]    = useState([]);
  const [fridgeInput,    setFridgeInput]    = useState('');
  const [pantryItems,    setPantryItems]    = useState([]);
  const [pantryInput,    setPantryInput]    = useState('');
  const [quantities,     setQuantities]     = useState({});
  const [filters,        setFilters]        = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');
  const [allergies,      setAllergies]      = useState([]);
  const [allergyInput,   setAllergyInput]   = useState('');
  const [allergiesLoading, setAllergiesLoading] = useState(false);
  const [scannerOpen,    setScannerOpen]    = useState(false);
  const [showPantryAdd,  setShowPantryAdd]  = useState(false);

  useEffect(() => {
    if (location.state?.preloaded) addFridgeItem(location.state.preloaded);
    setPantryItems(loadLS(LS_PANTRY));
    api.allergies.get()
      .then((d) => setAllergies(d.allergies || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!scannerOpen) return;
    function onKey(e) { if (e.key === 'Escape') setScannerOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [scannerOpen]);

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
    setQuantities((prev) => {
      const next = { ...prev };
      for (const raw of names) {
        const c = normalize(raw.trim());
        if (c && !next[c]) next[c] = 1;
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

  function adjustQty(key, delta) {
    setQuantities((prev) => ({ ...prev, [key]: Math.max(1, (prev[key] || 1) + delta) }));
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

  // ── Filtros ───────────────────────────────────────────────────
  function toggleFilter(f) {
    setFilters((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  }

  // ── Alergias ──────────────────────────────────────────────────
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
    } catch (err) { console.error(err); }
  }

  function handleAllergyKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); handleAddAllergy(); }
  }

  // ── Buscar recetas ────────────────────────────────────────────
  async function handleConfirm() {
    const all = [...new Set([...fridgeItems, ...pantryItems])];
    if (all.length === 0) { setError('Añade al menos un ingrediente.'); return; }
    setError('');
    setLoading(true);
    try {
      if (fridgeItems.length > 0) await api.pantry.log(fridgeItems);
      localStorage.setItem(LS_FRIDGE, JSON.stringify(fridgeItems));
      const data = await api.recipes.match(all, filters);
      navigate('/recipes', {
        state: { recipes: data.recipes, ingredients: all, appliedAllergies: data.appliedAllergies },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const totalItems = fridgeItems.length + pantryItems.length;

  return (
    <div className="scan-shell">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="scan-sidebar">
        <div className="scan-sidebar-user">
          <div className="scan-sidebar-avatar">{firstName[0].toUpperCase()}</div>
          <div className="scan-sidebar-user-text">
            <strong>Bienvenido de nuevo</strong>
            <span>Cocina sin desperdicios</span>
          </div>
        </div>

        <nav className="scan-sidebar-nav" aria-label="Secciones">
          {SIDEBAR_NAV.map(({ id, label, Icon, path }) => (
            <button
              key={id}
              className={`scan-nav-item ${id === 'fridge' ? 'scan-nav-item--active' : ''}`}
              onClick={() => path && navigate(path)}
            >
              <Icon />
              <span>{label}</span>
              {id === 'fridge' && fridgeItems.length > 0 && (
                <span className="scan-nav-badge">{fridgeItems.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="scan-sidebar-footer">
          <button className="scan-sidebar-settings" onClick={() => navigate('/account')}>
            <IconSettings /> <span>Configuración</span>
          </button>
          <button className="scan-sidebar-settings" onClick={() => navigate('/help')}>
            <IconHelp /> <span>Ayuda</span>
          </button>
          <button className="scan-sidebar-cta" onClick={() => setScannerOpen((o) => !o)}>
            <IconCamera /> Escanear nevera
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────── */}
      <div className="scan-main-wrap">

        {/* Decorative food images */}
        <div className="scan-deco-food" aria-hidden="true">
          <img className="scan-deco-img scan-deco-img--1" src="/pngtree-salmon-fillet-on-white-background-no-shadow-reflection-png-image_15301726.png" alt="" />
          <img className="scan-deco-img scan-deco-img--2" src="/aguacate1.png" alt="" />
        </div>

        {/* Top bar */}
        <div className="scan-topbar">
          <div className="scan-search-wrap">
            <IconSearch />
            <input
              className="scan-search-input"
              placeholder="Buscar ingredientes..."
              value={fridgeInput}
              onChange={(e) => setFridgeInput(e.target.value)}
              onKeyDown={handleFridgeKeyDown}
            />
          </div>
          <button
            className="scan-topbar-icon-btn"
            onClick={() => setScannerOpen((o) => !o)}
            title="Abrir escáner"
            aria-label="Abrir escáner"
          >
            <IconCamera />
          </button>
          <div className="scan-topbar-avatar">{firstName[0].toUpperCase()}</div>
        </div>

        {/* Scrollable body */}
        <div className="scan-body">

          {/* Breadcrumb */}
          <nav className="scan-breadcrumb" aria-label="Ruta">
            <span>Resultados del escáner</span>
            <span className="scan-bc-sep">›</span>
            <span className="scan-bc-current">Ingredientes detectados</span>
          </nav>

          {/* Page heading */}
          <div className="scan-page-head">
            <h1 className="scan-page-title">
              {totalItems === 0
                ? 'Añade ingredientes de tu nevera'
                : `Encontramos ${totalItems} ingrediente${totalItems !== 1 ? 's' : ''} en tu nevera`}
            </h1>
            <p className="scan-page-sub">
              Verifica las cantidades y busca recetas a tu medida.
            </p>
          </div>

          {/* Filters row */}
          <div className="scan-filters-row">
            <span className="scan-filters-label">Filtros:</span>
            {FILTER_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                className={`scan-filter-pill ${filters.includes(key) ? 'active' : ''}`}
                onClick={() => toggleFilter(key)}
              >
                {label}
              </button>
            ))}
            {allergies.length > 0 && allergies.map((a) => (
              <span key={a} className="scan-allergy-chip">
                🚫 {a}
                <button onClick={() => handleRemoveAllergy(a)} aria-label={`Eliminar ${a}`}>×</button>
              </span>
            ))}
            <button className="scan-allergy-add" onClick={() => setAllergyInput((v) => v === null ? '' : null)}>
              + Restricción
            </button>
          </div>

          {allergyInput !== null && (
            <div className="scan-allergy-row">
              <input
                className="scan-allergy-input"
                placeholder="Añadir alergia o intolerancia..."
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                onKeyDown={handleAllergyKeyDown}
                autoFocus
              />
              <button
                className="btn-add"
                onClick={handleAddAllergy}
                disabled={allergiesLoading || !allergyInput.trim()}
              >
                {allergiesLoading ? '...' : 'Añadir'}
              </button>
            </div>
          )}

          {/* ── Product grid ──────────────────────────────────── */}
          <section className="scan-product-section">
            {fridgeItems.length > 0 && (
              <p className="scan-section-label">Nevera · {fridgeItems.length} artículos</p>
            )}

            <div className="scan-product-grid">
              {fridgeItems.map((name) => (
                <div key={name} className="product-card fade-in">
                  <button className="product-remove" onClick={() => removeFridgeItem(name)} aria-label={`Eliminar ${name}`}>×</button>
                  <div className="product-img">
                    <span className="product-emoji">{getEmoji(name)}</span>
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{name}</h3>
                    <span className="product-source">Nevera</span>
                  </div>
                  <div className="product-qty-row">
                    <span className="product-unit">{quantities[name] || 1} ud.</span>
                    <button className="product-qty-btn" onClick={() => adjustQty(name, -1)} aria-label="Reducir">−</button>
                    <span className="product-qty-num">{quantities[name] || 1}</span>
                    <button className="product-qty-btn" onClick={() => adjustQty(name, 1)} aria-label="Aumentar">+</button>
                  </div>
                </div>
              ))}

              {pantryItems.map((name) => (
                <div key={`pantry-${name}`} className="product-card product-card--pantry fade-in">
                  <button className="product-remove" onClick={() => removePantryItem(name)} aria-label={`Eliminar ${name}`}>×</button>
                  <div className="product-img product-img--pantry">
                    <span className="product-emoji">{getEmoji(name)}</span>
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{name}</h3>
                    <span className="product-source product-source--pantry">Despensa</span>
                  </div>
                  <div className="product-qty-row">
                    <span className="product-unit">{quantities[`p_${name}`] || 1} ud.</span>
                    <button className="product-qty-btn" onClick={() => adjustQty(`p_${name}`, -1)}>−</button>
                    <span className="product-qty-num">{quantities[`p_${name}`] || 1}</span>
                    <button className="product-qty-btn" onClick={() => adjustQty(`p_${name}`, 1)}>+</button>
                  </div>
                </div>
              ))}

              {/* Añadir más card */}
              <div className="product-card product-card--add">
                <div className="product-add-icon">
                  <span>＋</span>
                </div>
                <p className="product-add-label">Añadir más</p>
                <p className="product-add-sub">Escribe o escanea un ingrediente</p>
                <div className="product-add-actions">
                  <button className="product-add-scan" onClick={() => setScannerOpen(true)}>
                    <IconCamera /> Escanear
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── Despensa section ──────────────────────────────── */}
          <section className="scan-pantry-section">
            <div className="scan-pantry-head">
              <div>
                <h2>Mi despensa</h2>
                <p>Alimentos fuera de la nevera — se guardan entre sesiones.</p>
              </div>
              {pantryItems.length > 0 && (
                <span className="scan-pantry-badge">{pantryItems.length}</span>
              )}
            </div>
            <div className="input-row">
              <input
                type="text"
                value={pantryInput}
                onChange={(e) => setPantryInput(e.target.value)}
                onKeyDown={handlePantryKeyDown}
                placeholder="arroz, aceite, sal, especias..."
              />
              <button className="btn-add" onClick={addPantryItem} disabled={!pantryInput.trim()}>
                Añadir
              </button>
            </div>
          </section>

          {error && <p className="scan-error">{error}</p>}

          {/* Bottom spacer so FAB doesn't overlap last card */}
          <div style={{ height: '6rem' }} />
        </div>
      </div>

      {/* ── Scanner modal ───────────────────────────────────────── */}
      {scannerOpen && (
        <div
          className="scan-scanner-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Escáner de ingredientes"
          onClick={(e) => { if (e.target === e.currentTarget) setScannerOpen(false); }}
        >
          <div className="scan-scanner-dialog">
            <div className="scan-scanner-header">
              <span>Escáner de ingredientes</span>
              <button onClick={() => setScannerOpen(false)} aria-label="Cerrar escáner">×</button>
            </div>
            <div className="scan-scanner-body">
              <VisionScanner
                onDetected={(items) => {
                  addFridgeItem(items);
                  setScannerOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Floating CTA ────────────────────────────────────────── */}
      <div className={`scan-fab ${totalItems > 0 ? 'scan-fab--visible' : ''}`}>
        <button
          className="scan-fab-btn"
          onClick={handleConfirm}
          disabled={loading || totalItems === 0}
        >
          {loading
            ? 'Buscando recetas...'
            : `Buscar recetas · ${totalItems} ingrediente${totalItems !== 1 ? 's' : ''} →`}
        </button>
      </div>

    </div>
  );
}
