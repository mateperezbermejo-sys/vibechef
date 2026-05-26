import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.pantry.predict()
      .then((data) => setPredictions(data.predictions))
      .catch(() => setPredictions([]))
      .finally(() => setLoading(false));
  }, []);

  function startScanWithPredictions() {
    const names = predictions.map((p) => p.name_en);
    navigate('/scan', { state: { preloaded: names } });
  }

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <h1>¡Hola, chef! 👋</h1>
        <p className="hero-sub">¿Qué tienes en casa hoy? Detecta tus ingredientes y encuentra recetas al instante.</p>
        <button className="btn-scan" onClick={() => navigate('/scan')}>
          📷 Escanear ingredientes
        </button>
      </div>

      <div className="dashboard-section">
        <h2>Tu despensa habitual</h2>
        <p className="section-desc">Ingredientes que usas con más frecuencia</p>

        {loading ? (
          <div className="skeleton-grid">
            {[1,2,3,4,5].map((i) => <div key={i} className="skeleton-pill" />)}
          </div>
        ) : predictions.length === 0 ? (
          <div className="empty-state">
            <span>🥦</span>
            <p>Todavía no tienes historial de ingredientes. Empieza escaneando tus primeros ingredientes.</p>
          </div>
        ) : (
          <div className="prediction-grid">
            {predictions.map((p) => (
              <div key={p.name_en} className="prediction-chip">
                <span className="chip-name">{p.name_es}</span>
                <span className="chip-count">×{p.frequency_count}</span>
              </div>
            ))}
          </div>
        )}

        {predictions.length > 0 && (
          <button className="btn-secondary" onClick={startScanWithPredictions}>
            Usar ingredientes habituales →
          </button>
        )}
      </div>

      <div className="dashboard-section">
        <h2>¿Cómo funciona?</h2>
        <div className="how-it-works">
          <div className="step">
            <div className="step-icon">📷</div>
            <div>
              <strong>1. Escanea</strong>
              <p>Añade los ingredientes que tienes disponibles</p>
            </div>
          </div>
          <div className="step">
            <div className="step-icon">✅</div>
            <div>
              <strong>2. Confirma</strong>
              <p>Revisa y ajusta la lista de ingredientes detectados</p>
            </div>
          </div>
          <div className="step">
            <div className="step-icon">🍽️</div>
            <div>
              <strong>3. Cocina</strong>
              <p>Descubre recetas perfectas para lo que tienes en casa</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
