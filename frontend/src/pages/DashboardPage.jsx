import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import './DashboardPage.css';

const HERO_WORDS = [
  'tomate', 'huevo', 'pollo', 'arroz', 'pasta',
  'zanahoria', 'cebolla', 'ajo', 'salmón', 'limón',
  'espinacas', 'pimiento', 'patata', 'atún', 'aguacate',
  'queso', 'leche', 'maíz', 'calabacín', 'brócoli',
];

const STEPS = [
  {
    n: '01',
    title: 'Escanea',
    desc: 'Apunta la cámara a tu nevera. La IA detecta los ingredientes en tiempo real, en local, sin enviar tus datos.',
  },
  {
    n: '02',
    title: 'Confirma',
    desc: 'Revisa y ajusta la lista detectada. Añade alergias o restricciones alimentarias de forma permanente.',
  },
  {
    n: '03',
    title: 'Cocina',
    desc: 'Recibe recetas ordenadas por compatibilidad. Sin ingredientes de más, sin desperdicios.',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.pantry.predict()
      .then((d) => setPredictions(d.predictions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.email?.split('@')[0] || 'Chef';

  function handleUsePantry() {
    navigate('/scan', { state: { preloaded: predictions.map((p) => p.name_en) } });
  }

  return (
    <div className="dashboard">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="hero" aria-label="Presentación">
        {/* Decorative floating ingredient words */}
        <div className="hero-bg" aria-hidden="true">
          {HERO_WORDS.map((word, i) => (
            <span key={word} className="hero-word" style={{ '--i': i }}>{word}</span>
          ))}
        </div>

        {/* Subtle radial glow */}
        <div className="hero-glow" aria-hidden="true" />

        <div className="hero-content">
          <span className="hero-overline">Cocina inteligente · Cero desperdicio</span>

          <h1 className="hero-title">
            Cocina con<br />lo que tienes.
          </h1>

          <p className="hero-sub">
            Detecta ingredientes con la cámara, descubre recetas a tu medida y planifica tu semana entera. Todo offline, todo tuyo.
          </p>

          <div className="hero-actions">
            <button className="hero-btn-primary" onClick={() => navigate('/scan')}>
              Escanear ingredientes
            </button>
            <button className="hero-btn-secondary" onClick={() => navigate('/menu')}>
              Generar menú semanal
            </button>
          </div>
        </div>

        <div className="hero-scroll" aria-hidden="true"><span /></div>
      </section>

      {/* ── Pantry prediction ─────────────────────────────────── */}
      {(loading || predictions.length > 0) && (
        <section className="dash-section dash-section--white">
          <div className="dash-inner">
            <span className="section-label">Tu despensa habitual</span>
            <h2 className="dash-title">Hola, {firstName}. ¿Repetimos?</h2>

            {loading ? (
              <div className="skel-row">
                {Array.from({ length: 7 }).map((_, i) => <div key={i} className="skel-chip" />)}
              </div>
            ) : (
              <>
                <div className="pantry-chips">
                  {predictions.map((p) => (
                    <span key={p.ingredient_id} className="pantry-chip">
                      <span className="pantry-name">{p.name_en}</span>
                      <span className="pantry-count">{p.frequency_count}×</span>
                    </span>
                  ))}
                </div>
                <button className="dash-use-btn" onClick={handleUsePantry}>
                  Buscar recetas con estos ingredientes
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {/* ── How it works ──────────────────────────────────────── */}
      <section className="dash-section">
        <div className="dash-inner">
          <span className="section-label">Cómo funciona</span>
          <h2 className="dash-title">Tres pasos. Cero desperdicio.</h2>
          <div className="steps-grid">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="step-card">
                <span className="step-n" aria-hidden="true">{n}</span>
                <h3 className="step-title">{title}</h3>
                <p className="step-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
