import { useRef, useState, useEffect, useCallback } from 'react';
import { loadModel, detectIngredients, applyUserCorrections } from '../services/visionAgent';
import { api } from '../services/api';
import './VisionScanner.css';

const LS_IMG_MEM = 'vibechef_img_mem';

function loadImgMem() {
  try { return JSON.parse(localStorage.getItem(LS_IMG_MEM) || '{}'); } catch { return {}; }
}
function saveImgMem(mem) {
  localStorage.setItem(LS_IMG_MEM, JSON.stringify(mem));
}

// Normalized bbox signature: class + four corners as % of image dimensions (0-100)
function detSig(det, W, H) {
  const [x1, y1, x2, y2] = det.box;
  const r = (n) => Math.round(n);
  return `${det.className}|${r(x1/W*100)}|${r(y1/H*100)}|${r(x2/W*100)}|${r(y2/H*100)}`;
}

async function computeImageHash(file) {
  if (!crypto?.subtle) return null;
  try {
    const buf  = await file.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash).slice(0, 8))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}

function ensureImgSlot(mem, hash) {
  if (!mem[hash]) mem[hash] = { deleted: [], renames: {}, manuals: [] };
  return mem[hash];
}

export default function VisionScanner({ onDetected }) {
  const videoRef       = useRef(null);
  const overlayRef     = useRef(null);
  const fileRef        = useRef(null);
  const streamRef      = useRef(null);
  const naturalSizeRef = useRef({ w: 0, h: 0 });
  const drawStateRef   = useRef(null);
  const detectionsRef  = useRef([]);
  const currentFileRef = useRef(null);  // File object for hash computation (null during webcam)
  const imageHashRef   = useRef(null);  // 8-char hex hash of current image

  const [modelStatus, setModelStatus]   = useState('idle');
  const [modelMode, setModelMode]       = useState('coco');
  const [stream, setStream]             = useState(null);
  const [mode, setMode]                 = useState('idle');
  const [analyzing, setAnalyzing]       = useState(false);
  const [detections, setDetections]     = useState([]);
  const [capturedSrc, setCapturedSrc]   = useState(null);
  const [expanded, setExpanded]         = useState(false);
  const [corrections, setCorrections]   = useState({});
  const [overrides, setOverrides]       = useState({});
  const [editingIdx, setEditingIdx]     = useState(null);
  const [savingIdx, setSavingIdx]       = useState(null);
  const [drawMode, setDrawMode]         = useState(false);
  const [pendingBox, setPendingBox]     = useState(null);
  const [pendingName, setPendingName]   = useState('');

  useEffect(() => { streamRef.current = stream; }, [stream]);
  useEffect(() => { detectionsRef.current = detections; }, [detections]);

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

  useEffect(() => () => stopWebcam(), []);

  useEffect(() => {
    if (!expanded) return;
    function handlePaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of [...items]) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) return;
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            setStream(null);
          }
          currentFileRef.current = file;
          imageHashRef.current   = null;
          setMode('image');
          setDetections([]);
          setOverrides({});
          setEditingIdx(null);
          setDrawMode(false);
          setPendingBox(null);
          clearOverlay();
          setCapturedSrc(URL.createObjectURL(file));
          return;
        }
      }
    }
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [expanded]);

  // ── Media helpers ──────────────────────────────────────────────

  function stopWebcam() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
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
      currentFileRef.current = null;
      imageHashRef.current   = null;
      setStream(s);
      setMode('webcam');
      setDetections([]);
      setOverrides({});
      setEditingIdx(null);
      setDrawMode(false);
      setPendingBox(null);
      setCapturedSrc(null);
      clearOverlay();
    } catch {
      alert('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
    }
  }

  function handleStopWebcam() {
    stopWebcam();
    currentFileRef.current = null;
    imageHashRef.current   = null;
    setMode('idle');
    setDetections([]);
    setOverrides({});
    setDrawMode(false);
    setPendingBox(null);
    clearOverlay();
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    stopWebcam();
    currentFileRef.current = file;
    imageHashRef.current   = null;
    setMode('image');
    setDetections([]);
    setOverrides({});
    setEditingIdx(null);
    setDrawMode(false);
    setPendingBox(null);
    clearOverlay();
    setCapturedSrc(URL.createObjectURL(file));
    e.target.value = '';
  }

  // ── Canvas helpers ─────────────────────────────────────────────

  function clearOverlay() {
    const canvas = overlayRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawOnOverlay(dets, origW, origH, rubberBand = null) {
    if (origW && origH) naturalSizeRef.current = { w: origW, h: origH };
    const canvas = overlayRef.current;
    const { w, h } = naturalSizeRef.current;
    if (!canvas || !w || !h) return;
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    for (const det of dets) {
      const [x1, y1, x2, y2] = det.box;
      const color = det.source === 'manual' ? '#1a6ebd'
                  : det.needsReview          ? '#F5A623'
                  : '#2D7D46';
      ctx.strokeStyle = color;
      ctx.lineWidth   = Math.max(2, w / 200);
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      const label = det.source === 'manual'
        ? `${det.ingredient ?? '?'} ✎`
        : `${det.ingredient ?? '?'} ${(det.score * 100).toFixed(0)}%`;
      const fontSize = Math.max(14, w / 40);
      ctx.font = `bold ${fontSize}px system-ui`;
      const textW = ctx.measureText(label).width;
      ctx.fillStyle = color;
      ctx.fillRect(x1, y1 - fontSize - 6, textW + 10, fontSize + 8);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x1 + 5, y1 - 6);
    }

    if (rubberBand) {
      const { x1, y1, x2, y2 } = rubberBand;
      ctx.strokeStyle = '#1a6ebd';
      ctx.lineWidth   = Math.max(2, w / 200);
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.setLineDash([]);
    }
  }

  // ── Draw-mode: coordinate conversion + mouse handlers ──────────

  function canvasCoords(e) {
    const canvas = overlayRef.current;
    const rect   = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left)  * (canvas.width  / rect.width),
      y: (e.clientY - rect.top)   * (canvas.height / rect.height),
    };
  }

  function handleCanvasMouseDown(e) {
    if (!drawMode) return;
    e.preventDefault();
    const { x, y } = canvasCoords(e);
    drawStateRef.current = { startX: x, startY: y };
  }

  function handleCanvasMouseMove(e) {
    if (!drawMode || !drawStateRef.current) return;
    const { x, y } = canvasCoords(e);
    const { startX, startY } = drawStateRef.current;
    const { w, h } = naturalSizeRef.current;
    drawOnOverlay(detectionsRef.current, w, h, {
      x1: Math.min(startX, x), y1: Math.min(startY, y),
      x2: Math.max(startX, x), y2: Math.max(startY, y),
    });
  }

  function handleCanvasMouseUp(e) {
    if (!drawMode || !drawStateRef.current) return;
    const { x, y } = canvasCoords(e);
    const { startX, startY } = drawStateRef.current;
    drawStateRef.current = null;
    const x1 = Math.min(startX, x), y1 = Math.min(startY, y);
    const x2 = Math.max(startX, x), y2 = Math.max(startY, y);
    if (x2 - x1 < 10 || y2 - y1 < 10) {
      drawOnOverlay(detectionsRef.current, 0, 0);
      return;
    }
    setPendingBox({ x1, y1, x2, y2 });
    setPendingName('');
  }

  function confirmManualBox() {
    if (!pendingBox || !pendingName.trim()) return;
    const newDet = {
      box: [pendingBox.x1, pendingBox.y1, pendingBox.x2, pendingBox.y2],
      ingredient: pendingName.trim().toLowerCase(),
      className: 'manual',
      score: 1,
      needsReview: false,
      candidates: [],
      correctedByHistory: false,
      source: 'manual',
    };
    const updated = [...detectionsRef.current, newDet];
    setDetections(updated);
    setPendingBox(null);
    setPendingName('');
    setDrawMode(false);
    drawOnOverlay(updated, 0, 0);

    if (imageHashRef.current) {
      const mem  = loadImgMem();
      const slot = ensureImgSlot(mem, imageHashRef.current);
      slot.manuals.push(newDet);
      saveImgMem(mem);
    }
  }

  function cancelManualBox() {
    setPendingBox(null);
    setDrawMode(false);
    drawOnOverlay(detectionsRef.current, 0, 0);
  }

  // ── Delete a detection and re-index overrides ──────────────────

  function deleteDetection(idx) {
    const det     = detectionsRef.current[idx];
    const { w, h } = naturalSizeRef.current;

    if (imageHashRef.current) {
      const mem  = loadImgMem();
      const slot = ensureImgSlot(mem, imageHashRef.current);
      if (det.source === 'manual') {
        slot.manuals = slot.manuals.filter(
          (m) => !(m.ingredient === det.ingredient &&
                   JSON.stringify(m.box) === JSON.stringify(det.box))
        );
      } else {
        const sig = detSig(det, w, h);
        if (!slot.deleted.includes(sig)) slot.deleted.push(sig);
      }
      saveImgMem(mem);
    }

    const updated = detectionsRef.current.filter((_, i) => i !== idx);
    setDetections(updated);
    setOverrides((prev) => {
      const next = {};
      for (const [k, v] of Object.entries(prev)) {
        const ki = parseInt(k, 10);
        if (ki < idx) next[ki] = v;
        else if (ki > idx) next[ki - 1] = v;
      }
      return next;
    });
    setEditingIdx((prev) => {
      if (prev === null || prev === idx) return null;
      return prev > idx ? prev - 1 : prev;
    });
    drawOnOverlay(updated, 0, 0);
  }

  // ── Inference ──────────────────────────────────────────────────

  const runInference = useCallback(async () => {
    async function processSource(src) {
      setAnalyzing(true);
      try {
        const raw  = await detectIngredients(src);
        let dets   = applyUserCorrections(raw, corrections).map((d) => ({ ...d, source: 'model' }));
        const origW = src.videoWidth ?? src.naturalWidth;
        const origH = src.videoHeight ?? src.naturalHeight;

        let initOverrides = {};

        // Apply image memory for file/paste (not webcam)
        if (currentFileRef.current) {
          const hash = await computeImageHash(currentFileRef.current);
          imageHashRef.current = hash;
          if (hash) {
            const mem     = loadImgMem();
            const imgMem  = mem[hash];
            if (imgMem) {
              // Remove detections the user previously deleted
              dets = dets.filter((d) => !(imgMem.deleted || []).includes(detSig(d, origW, origH)));
              // Pre-populate overrides for previously renamed detections
              dets.forEach((d, i) => {
                const rename = imgMem.renames?.[detSig(d, origW, origH)];
                if (rename) initOverrides[i] = rename;
              });
              // Re-add manual detections the user previously drew
              dets = [...dets, ...(imgMem.manuals || [])];
            }
          }
        }

        setDetections(dets);
        setOverrides(initOverrides);
        setEditingIdx(null);
        setDrawMode(false);
        setPendingBox(null);
        drawOnOverlay(dets, origW, origH);
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
    if (mode === 'webcam' && videoRef.current) processSource(videoRef.current);
  }, [mode, capturedSrc, corrections]);

  // ── Detection editing ──────────────────────────────────────────

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

      // Also persist rename in per-image memory
      if (imageHashRef.current && det.source !== 'manual') {
        const { w, h } = naturalSizeRef.current;
        const mem  = loadImgMem();
        const slot = ensureImgSlot(mem, imageHashRef.current);
        slot.renames[detSig(det, w, h)] = chosen;
        saveImgMem(mem);
      }

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
    setDrawMode(false);
    setPendingBox(null);
    clearOverlay();
  }

  const canAnalyze  = modelStatus === 'ready' && (mode === 'webcam' || mode === 'image') && !analyzing;
  const hasViewport = mode === 'webcam' || mode === 'image';
  const canDraw     = hasViewport && naturalSizeRef.current.w > 0;

  return (
    <div className="vision-scanner">
      <button className="scanner-toggle" onClick={() => setExpanded((v) => !v)}>
        <span>Escanear nevera con la cámara</span>
        <span className={`toggle-arrow ${expanded ? 'open' : ''}`}>▾</span>
      </button>

      {expanded && (
        <div className="scanner-body">
          {/* Model status bar */}
          <div className={`model-status status-${modelStatus}`}>
            {modelStatus === 'idle' && '⏳ Preparando reconocimiento...'}
            {modelStatus === 'loading' && '⏳ Preparando reconocimiento...'}
            {typeof modelStatus === 'string' && modelStatus.startsWith('Cargando') && '⏳ Preparando reconocimiento...'}
            {modelStatus === 'ready' && (
              <span className="model-ready-row">
                <span>✅ Reconocimiento de alimentos listo</span>
                {modelMode === 'vibechef' ? (
                  <span className="model-badge vibechef">VibeChef</span>
                ) : (
                  <span className="model-badge coco" title="Reconocimiento básico activo.">
                    Modo básico
                  </span>
                )}
              </span>
            )}
            {modelStatus === 'notfound' && (
              <span>⚠️ El reconocimiento no está disponible. Contacta con soporte si persiste.</span>
            )}
            {modelStatus === 'error' && '❌ No se pudo activar el reconocimiento.'}
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
          <p className="paste-hint">También puedes pegar una imagen con Ctrl+V</p>

          {/* Viewport */}
          {hasViewport && (
            <div className="scanner-viewport">
              {mode === 'webcam' && (
                <video
                  ref={videoRef}
                  autoPlay playsInline muted
                  className="scanner-video"
                  onLoadedMetadata={(e) => {
                    const w = e.target.videoWidth, h = e.target.videoHeight;
                    naturalSizeRef.current = { w, h };
                    const c = overlayRef.current;
                    if (c) { c.width = w; c.height = h; }
                  }}
                />
              )}
              {mode === 'image' && capturedSrc && (
                <img
                  src={capturedSrc}
                  alt="Imagen analizada"
                  className="scanner-image"
                  onLoad={(e) => {
                    const w = e.target.naturalWidth, h = e.target.naturalHeight;
                    naturalSizeRef.current = { w, h };
                    const c = overlayRef.current;
                    if (c) { c.width = w; c.height = h; }
                  }}
                />
              )}
              <canvas
                ref={overlayRef}
                className={`scanner-overlay${drawMode ? ' scanner-overlay--draw' : ''}`}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
            </div>
          )}

          {/* Action buttons */}
          {hasViewport && (
            <div className="scanner-actions">
              <button className="btn-analyze" onClick={runInference} disabled={!canAnalyze}>
                {analyzing ? '⏳ Detectando...' : '🔍 Detectar alimentos'}
              </button>
              <button
                className={`btn-draw-mode${drawMode ? ' active' : ''}`}
                onClick={() => { setDrawMode((v) => !v); setPendingBox(null); }}
                disabled={!canDraw}
                title="Dibuja un recuadro para añadir un alimento manualmente"
              >
                ✏️ Añadir manualmente
              </button>
            </div>
          )}

          {/* Name prompt after drawing a box */}
          {pendingBox && (
            <div className="manual-name-form">
              <p className="manual-name-prompt">Nombre del alimento en el recuadro:</p>
              <div className="manual-name-row">
                <input
                  autoFocus
                  type="text"
                  className="manual-name-input"
                  placeholder="ej. tomate, leche, pollo..."
                  value={pendingName}
                  onChange={(e) => setPendingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmManualBox();
                    if (e.key === 'Escape') cancelManualBox();
                  }}
                />
                <button
                  className="btn-confirm-manual"
                  onClick={confirmManualBox}
                  disabled={!pendingName.trim()}
                >
                  Añadir
                </button>
                <button className="btn-cancel-manual" onClick={cancelManualBox}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Detections list */}
          {detections.length > 0 && (
            <div className="detections-box">
              <p className="detections-title">
                Detectado ({detections.length} objeto{detections.length !== 1 ? 's' : ''}):
              </p>
              {detections.some((d) => d.needsReview) && (
                <p className="review-hint">
                  ⚠️ Algunos alimentos tienen baja confianza. Revísalos antes de confirmar.
                </p>
              )}

              <div className="detections-list">
                {detections.map((det, idx) => {
                  const eff        = effectiveIngredient(det, idx);
                  const isEditing  = editingIdx === idx;
                  const isSaving   = savingIdx === idx;
                  const wasChanged = overrides[idx] !== undefined && overrides[idx] !== det.ingredient;
                  const isManual   = det.source === 'manual';

                  return (
                    <div
                      key={idx}
                      className={`detection-item ${det.needsReview ? 'needs-review' : ''} ${isManual ? 'manual-item' : ''}`}
                    >
                      <div className="det-main-row">
                        {isManual ? (
                          <span className="det-confidence-badge manual">✎ manual</span>
                        ) : det.needsReview ? (
                          <span className="det-confidence-badge low">⚠️ {(det.score * 100).toFixed(0)}%</span>
                        ) : (
                          <span className="det-confidence-badge ok">✅ {(det.score * 100).toFixed(0)}%</span>
                        )}
                        <span className="det-name">{eff ?? '—'}</span>
                        {!isManual && <span className="det-class">({det.className})</span>}
                        {det.correctedByHistory && <span className="det-history-badge">historial</span>}
                        {wasChanged && <span className="det-history-badge changed">editado</span>}
                        <button
                          className="btn-det-edit"
                          onClick={() => setEditingIdx(isEditing ? null : idx)}
                          title="Editar nombre"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-det-delete"
                          onClick={() => deleteDetection(idx)}
                          title="Eliminar detección"
                        >
                          ×
                        </button>
                      </div>

                      {isEditing && (
                        <div className="det-edit-row">
                          {!isManual && (
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
                          )}
                          <input
                            className="det-custom-input"
                            type="text"
                            placeholder="Escribe el ingrediente correcto..."
                            value={overrides[idx] ?? eff ?? ''}
                            onChange={(e) => setOverrides((p) => ({ ...p, [idx]: e.target.value.toLowerCase().trim() }))}
                          />
                          <div className="det-edit-actions">
                            {!isManual && (
                              <button
                                className="btn-save-correction"
                                onClick={() => handleSaveCorrection(det, idx)}
                                disabled={isSaving || !effectiveIngredient(det, idx)}
                              >
                                {isSaving ? 'Guardando...' : 'Guardar en mi perfil'}
                              </button>
                            )}
                            <button className="btn-cancel-edit" onClick={() => setEditingIdx(null)}>
                              {isManual ? 'Cerrar' : 'Cancelar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button className="btn-add-detected" onClick={addToList}>
                ✅ Confirmar alimentos detectados
              </button>
            </div>
          )}

          {mode !== 'idle' && detections.length === 0 && !analyzing && !pendingBox && (
            <p className="no-detections-hint">
              Pulsa "Detectar alimentos" para analizar la imagen.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
