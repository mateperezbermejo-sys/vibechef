import { useState, useRef } from 'react';
import { api } from '../services/api';
import './SettingsPage.css';

export default function SettingsPage() {
  const fileRef = useRef(null);

  const [pdfFile, setPdfFile]           = useState(null);
  const [importing, setImporting]       = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError]   = useState('');

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
    setImportResult(null);
    setImportError('');
    e.target.value = '';
  }

  async function handleImport() {
    if (!pdfFile) return;
    setImporting(true);
    setImportResult(null);
    setImportError('');
    try {
      const result = await api.recipes.importPdf(pdfFile);
      setImportResult(result);
      setPdfFile(null);
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Importar recetas</h1>
        <p className="settings-sub">Amplía el recetario importando recetas desde un archivo PDF</p>
      </div>

      {/* ── PDF Import ──────────────────────────────────────────── */}
      <section className="settings-card">
        <h2>Importar desde PDF</h2>

        <div className="pdf-format-hint">
          <p>El PDF debe tener <strong>una receta por bloque</strong>, separadas por líneas en blanco. Campos reconocidos:</p>
          <pre className="pdf-sample">{`Nombre: Paella Valenciana
Ingredientes: rice, chicken, tomato, olive oil
Instrucciones: Sofríe el pollo en aceite caliente...
Tiempo: 45
Dificultad: medium
Tags: spanish, high-protein

Nombre: Gazpacho
Ingredientes: tomato, cucumber, pepper, garlic
Instrucciones: Tritura todo en frío.
Tiempo: 10
Dificultad: easy
Tags: vegan, healthy`}</pre>
          <p className="pdf-note">
            También funciona en inglés con <code>Recipe:</code>, <code>Ingredients:</code>, <code>Instructions:</code>.<br />
            Los duplicados (mismo nombre) se omiten automáticamente.
          </p>
        </div>

        <div className="pdf-upload-row">
          <button className="btn-select-pdf" onClick={() => fileRef.current?.click()}>
            Seleccionar PDF
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          {pdfFile && <span className="pdf-filename">{pdfFile.name}</span>}
        </div>

        {pdfFile && (
          <button className="btn-import-pdf" onClick={handleImport} disabled={importing}>
            {importing ? 'Importando...' : 'Importar recetas'}
          </button>
        )}

        {importError && (
          <div className="import-error">
            <strong>Error:</strong> {importError}
          </div>
        )}

        {importResult && (
          <div className="import-result">
            <p className="import-summary">{importResult.message}</p>
            {importResult.recipes?.length > 0 && (
              <ul className="import-recipe-list">
                {importResult.recipes.map((r, i) => (
                  <li key={i}>
                    <strong>{r.name}</strong> — {r.ingredients.join(', ')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* ── YOLO note ───────────────────────────────────────────── */}
      <section className="settings-card info-card">
        <h2>Sobre la detección visual</h2>
        <p>
          El modelo actual es <strong>YOLOv8n-COCO</strong>, entrenado con 80 clases generales. Reconoce directamente: banana, apple, orange, broccoli, carrot, hot dog, pizza, cake y bottle.
        </p>
        <p>
          Para mejorar la precisión con ingredientes específicos (filetes, salmón, huevos, etc.) se puede:
        </p>
        <ol>
          <li><strong>Fine-tuning</strong> de YOLOv8 sobre un dataset alimentario etiquetado (Food-101, Open Images).</li>
          <li><strong>Clasificador de segundo nivel</strong> (EfficientNet/MobileNet) que reciba el recorte del bbox y clasifique ingredientes.</li>
          <li><strong>Modelo especializado</strong> pre-entrenado en comida disponible en Hugging Face.</li>
        </ol>
        <p>
          Mientras tanto usa el <strong>sistema de correcciones</strong> en el escáner: si corriges «cake → beef» una vez, el sistema lo recordará en detecciones futuras.
        </p>
      </section>
    </div>
  );
}
