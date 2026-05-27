import { useRef, useState, useEffect, useCallback } from 'react';
import { loadModel, detectIngredients, applyUserCorrections } from '../services/visionAgent';
import { api } from '../services/api';
import './VisionScanner.css';

const MODEL_INSTRUCTIONS_URL =
  'https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx';

export default function VisionScanner({ onDetected }) {
  const videoRef   = useRef(null);
  const overlayRef = useRef(null);
  const fileRef    = useRef(null);

  const [modelStatus, setModelStatus]     = useState('idle');
  const [modelMode, setModelMode]         = useState('coco'); // 'coco' | 'vibechef'
  const [stream, setStream]               = useState(null);
  const [mode, setMode]                   = useState('idle');
  const [analyzing, setAnalyzing]         = useState(false);
  const [detections, setDetections]       = useState([]);
  const [capturedSrc, setCapturedSrc]     = useState(null);
  const [expanded, setExpanded]           = useState(false);
  const [corrections, setCorrections]     = useState({}); // { yolo_class: ingredient }
  const [overrides, setOverrides]         = useState({});
  const [editingIdx, setEditingIdx]       = useState(null);
  const [savingIdx, setSavingIdx]         = useState(null);

  // Load model + user corrections when panel first opens
  useEffect(() => {
    if (!expanded) return;
    if (modelStatus === 'idle') {
      setModelStatus('loading');
      loadModel((msg) => setModelStatus(msg)).then((result) => {
        if (result.success) {
          setModelStatus('ready');
          setModelMode(result.mode || 'coco');
        } else if (result.notFound) {
          setModelStatus('notfound');
        } else {
          setModelStatus('error');
        }
      });
    }
    api.corrections.get()
      .then((data) => setCorrections(data.corrections || {}))
      .catch(() => {});
  }, [expanded]);

  // Stop webcam on unmount
  useEffect(() => () => stopWebcam(), []);

  function stopWebcam() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }

  async function startWebcam() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      videoRef.current.srcObject = s;
      await videoRef.current.play();
      setStream(s);
      setMode('webcam');
      setDetections([]);
      setOverrides({});
      setEditingIdx(null);
      setCapturedSrc(null);
      clearOverlay();
    } catch {
      alert('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
    }
  }

  function handleStopWebcam() {
    stopWebcam();
    setMode('idle');
    setDetections([]);
    setOverrides({});
    clearOverlay();
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    stopWebcam();
    setMode('image');
    setDetections([]);
    setOverrides({});
    setEditingIdx(null);
    clearOverlay();
    setCapturedSrc(URL.createObjectURL(file));
    e.target.value = '';
  }

  const runInference = useCallback(async () => {
    const source = mode === 'webcam' ? videoRef.current : null;

    async function processSource(src) {
      setAnalyzing(true);
      try {
        const raw  = await detectIngredients(src);
        const dets = applyUserCorrections(raw, corrections);
        setDetections(dets);
        setOverrides({});
        setEditingIdx(null);
        drawOnOverlay(dets, src.videoWidth ?? src.naturalWidth, src.videoHeight ?? src.naturalHeight);
      } catch (err) {
        console.error(err);
      } finally {
        setAnalyzing(false);
      }
    }

    if (mode === 'image' && capturedSrc) {
      const img = new Image();
      img.onload = () => processSource(img);
      img.src = capturedSrc;
      return;
    }
    if (source) processSource(source);
  }, [mode, capturedSrc, corrections]);

  function clearOverlay() {
    const canvas = overlayRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawOnOverlay(dets, origW, origH) {
    const canvas = overlayRef.current;
    if (!canvas || !origW || !origH) return;
    canvas.width  = origW;
    canvas.height = origH;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, origW, origH);

    for (const det of dets) {
      const [x1, y1, x2, y2] = det.box;
      const color = det.needsReview ? '#F5A623' : '#2D7D46';
      ctx.strokeStyle = color;
      ctx.lineWidth   = Math.max(2, origW / 200);
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      const label    = `${det.ingredient ?? '?'} ${(det.score * 100).toFixed(0)}%`;
      const fontSize = Math.max(14, origW / 40);
      ctx.font = `bold ${fontSize}px system-ui`;
      const textW = ctx.measureText(label).width;
      ctx.fillStyle = color;
      ctx.fillRect(x1, y1 - fontSize - 6, textW + 10, fontSize + 8);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x1 + 5, y1 - 6);
    }
  }

  // Effective ingredient for a detection (override → corrected-by-history → mapped)
  function effectiveIngredient(det, idx) {
    if (overrides[idx] !== undefined) return overrides[idx];
    return det.ingredient;
  }

  async function handleSaveCorrection(det, idx) {
    const chosen = effectiveIngredient(det, idx);
    if (!chosen) return;
    setSavingIdx(idx);
    try {
      await api.corrections.save(det.className, chosen);
      setCorrections((prev) => ({ ...prev, [det.className]: chosen }));
      setEditingIdx(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingIdx(null);
    }
  }

  function addToList() {
    const mapped = detections
      .map((det, idx) => effectiveIngredient(det, idx))
      .filter(Boolean);
    const unique = [...new Set(mapped)];
    onDetected(unique);
    setDetections([]);
    setOverrides({});
    setEditingIdx(null);
    clearOverlay();
  }

  const canAnalyze = modelStatus === 'ready' && (mode === 'webcam' || mode === 'image') && !analyzing;

  return (
    <div className="vision-scanner">
      <button className="scanner-toggle" onClick={() => setExpanded((v) => !v)}>
        <span>Vision Agent — YOLOv8 local</span>
        <span className={`toggle-arrow ${expanded ? 'open' : ''}`}>▾</span>
      </button>

      {expanded && (
        <div className="scanner-body">
          {/* Model status bar */}
          <div className={`model-status status-${modelStatus}`}>
            {modelStatus === 'idle' && '⏳ Iniciando...'}
            {modelStatus === 'loading' && '⏳ Cargando modelo ONNX...'}
            {typeof modelStatus === 'string' && modelStatus.startsWith('Cargando') && modelStatus}
            {modelStatus === 'ready' && (
              <span className="model-ready-row">
                <span>✅ Modelo listo —</span>
                {modelMode === 'vibechef' ? (
                  <span className="model-badge vibechef">VibeChef 30 clases</span>
                ) : (
                  <span className="model-badge coco" title="Solo 11 clases alimentarias. Entrena el modelo VibeChef para mejorar la precisión.">
                    COCO (cobertura limitada)
                  </span>
                )}
                {modelMode === 'coco' && (
                  <a href="/settings" className="model-upgrade-hint">mejorar →</a>
                )}
              </span>
            )}
            {modelStatus === 'notfound' && (
              <>
                ⚠️ Modelo no encontrado. Descarga{' '}
                <code>yolov8n.onnx</code> y colócalo en{' '}
                <code>frontend/public/models/</code>.{' '}
                <a href={MODEL_INSTRUCTIONS_URL} target="_blank" rel="noreferrer">
                  Descargar modelo ↗
                </a>
              </>
            )}
            {modelStatus === 'error' && '❌ Error cargando el modelo. Revisa la consola.'}
          </div>

          {/* Controls */}
          <div className="scanner-controls">
            {mode !== 'webcam' ? (
              <button className="btn-cam" onClick={startWebcam} disabled={modelStatus !== 'ready'}>
                📷 Activar cámara
              </button>
            ) : (
              <button className="btn-cam-stop" onClick={handleStopWebcam}>
                ⏹ Detener cámara
              </button>
            )}
            <button
              className="btn-upload"
              onClick={() => fileRef.current?.click()}
              disabled={modelStatus !== 'ready'}
            >
              📁 Subir imagen
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
          </div>

          {/* Viewport */}
          {(mode === 'webcam' || mode === 'image') && (
            <div className="scanner-viewport">
              {mode === 'webcam' && <video ref={videoRef} autoPlay playsInline muted className="scanner-video" />}
              {mode === 'image' && capturedSrc && <img src={capturedSrc} alt="Imagen analizada" className="scanner-image" />}
              <canvas ref={overlayRef} className="scanner-overlay" />
            </div>
          )}

          {(mode === 'webcam' || mode === 'image') && (
            <button className="btn-analyze" onClick={runInference} disabled={!canAnalyze}>
              {analyzing ? '⏳ Analizando...' : '🔍 Analizar fotograma'}
            </button>
          )}

          {/* Detections list */}
          {detections.length > 0 && (
            <div className="detections-box">
              <p className="detections-title">
                Detectado ({detections.length} objeto{detections.length !== 1 ? 's' : ''}):
              </p>
              {detections.some((d) => d.needsReview) && (
                <p className="review-hint">
                  ⚠️ Las detecciones en naranja tienen baja confianza o no tienen mapeo directo. Corrígelas antes de añadir.
                </p>
              )}

              <div className="detections-list">
                {detections.map((det, idx) => {
                  const eff        = effectiveIngredient(det, idx);
                  const isEditing  = editingIdx === idx;
                  const isSaving   = savingIdx === idx;
                  const wasChanged = overrides[idx] !== undefined && overrides[idx] !== det.ingredient;

                  return (
                    <div key={idx} className={`detection-item ${det.needsReview ? 'needs-review' : ''}`}>
                      <div className="det-main-row">
                        {det.needsReview
                          ? <span className="det-confidence-badge low">⚠️ {(det.score * 100).toFixed(0)}%</span>
                          : <span className="det-confidence-badge ok">✅ {(det.score * 100).toFixed(0)}%</span>
                        }
                        <span className="det-name">{eff ?? '—'}</span>
                        <span className="det-class">({det.className})</span>
                        {det.correctedByHistory && <span className="det-history-badge">historial</span>}
                        {wasChanged && <span className="det-history-badge changed">editado</span>}
                        <button
                          className="btn-det-edit"
                          onClick={() => setEditingIdx(isEditing ? null : idx)}
                          title="Corregir ingrediente"
                        >
                          ✏️
                        </button>
                      </div>

                      {isEditing && (
                        <div className="det-edit-row">
                          {/* Quick-pick: candidates that have a mapping */}
                          <div className="det-candidates">
                            {det.candidates
                              .filter((c) => c.ingredient)
                              .map((c, ci) => (
                                <button
                                  key={ci}
                                  className={`det-candidate-btn ${overrides[idx] === c.ingredient ? 'selected' : ''}`}
                                  onClick={() => setOverrides((p) => ({ ...p, [idx]: c.ingredient }))}
                                  title={`${c.className} ${(c.score * 100).toFixed(0)}%`}
                                >
                                  {c.ingredient}
                                </button>
                              ))}
                          </div>
                          {/* Free-text override */}
                          <input
                            className="det-custom-input"
                            type="text"
                            placeholder="Escribe el ingrediente correcto..."
                            value={overrides[idx] ?? eff ?? ''}
                            onChange={(e) => setOverrides((p) => ({ ...p, [idx]: e.target.value.toLowerCase().trim() }))}
                          />
                          <div className="det-edit-actions">
                            <button
                              className="btn-save-correction"
                              onClick={() => handleSaveCorrection(det, idx)}
                              disabled={isSaving || !effectiveIngredient(det, idx)}
                            >
                              {isSaving ? 'Guardando...' : 'Guardar en mi perfil'}
                            </button>
                            <button className="btn-cancel-edit" onClick={() => setEditingIdx(null)}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button className="btn-add-detected" onClick={addToList}>
                ✅ Añadir al listado de ingredientes
              </button>
            </div>
          )}

          {mode !== 'idle' && detections.length === 0 && !analyzing && (
            <p className="no-detections-hint">
              Pulsa "Analizar fotograma" para detectar alimentos en la imagen.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
