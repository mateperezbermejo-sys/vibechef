import { useEffect, useState } from 'react';
import { api } from '../services/api';
import './HistoryPage.css';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.pantry.history()
      .then((data) => setHistory(data.history))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="history-page">
      <h1>🥫 Tu Despensa</h1>
      <p className="history-sub">Historial completo de ingredientes detectados</p>

      {loading ? (
        <div className="loading-msg">Cargando historial...</div>
      ) : history.length === 0 ? (
        <div className="empty-state">
          <span>📦</span>
          <p>Tu historial está vacío. Empieza escaneando ingredientes.</p>
        </div>
      ) : (
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Ingrediente</th>
                <th>Nombre (EN)</th>
                <th>Veces visto</th>
                <th>Última vez</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.name_en}>
                  <td className="name-es">{item.name_es}</td>
                  <td className="name-en">{item.name_en}</td>
                  <td>
                    <span className="freq-badge">×{item.frequency_count}</span>
                  </td>
                  <td className="last-seen">
                    {new Date(item.last_seen).toLocaleDateString('es-ES', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
