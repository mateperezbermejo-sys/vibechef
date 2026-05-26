import { useRef, useState, useEffect, useCallback } from 'react';
import { loadModel, detectIngredients } from '../services/visionAgent';
import './VisionScanner.css';

const MODEL_INSTRUCTIONS_URL =
  'https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx';

export default function VisionScanner({ onDetected }) {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const fileRef = useRef(null);

  const [modelStatus, setModelStatus] = useState('idle'); // idle|loading|ready|notfound|error
  const [stream, setStream] = useState(null);
  const [mode, setMode] = useState('idle'); // idle|webcam|image
  const [analyzing, setAnalyzing] = useState(false);
  const [detections, setDetections] = useState([]);
  const [capturedSrc, setCapturedSrc] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // Load the ONNX model when the panel is first expanded
  useEffect(() => {
    if (!expanded || modelStatus !== 'idle') return;
    setModelStatus('loading');
    loadModel((msg) => setModelStatus(msg)).then((result) => {
      if (result.success) setModelStatus('ready');
      else if (result.notFound) setModelStatus('notfound');
      else setModelStatus('error');
    });
  }, [expanded]);

  // Stop webcam on unmount
  useEffect(() => {
    return () => stopWebcam();
  }, []);

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
    clearOverlay();
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    stopWebcam();
    setMode('image');
    setDetections([]);
    clearOverlay();

    const url = URL.createObjectURL(file);
    setCapturedSrc(url);
    e.target.value = '';
  }

  const runInference = useCallback(async () => {
    const source = mode === 'webcam' ? videoRef.current : null;

    if (mode === 'image' && capturedSrc) {
      const img = new Image();
      img.onload = async () => {
        setAnalyzing(true);
        try {
          const dets = await detectIngredients(img);
          setDetections(dets);
          drawOnOverlay(dets, img.naturalWidth, img.naturalHeight);
        } catch (err) {
          console.error(err);
        } finally {
          setAnalyzing(false);
        }
      };
      img.src = capturedSrc;
      return;
    }

    if (!source) return;
    setAnalyzing(true);
    try {
      const dets = await detectIngredients(source);
      setDetections(dets);
      drawOnOverlay(dets, source.videoWidth, source.videoHeight);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  }, [mode, capturedSrc]);

  function clearOverlay() {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawOnOverlay(dets, origW, origH) {
    const canvas = overlayRef.current;
    if (!canvas || !origW || !origH) return;

    canvas.width = origW;
    canvas.height = origH;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, origW, origH);

    for (const det of dets) {
      const [x1, y1, x2, y2] = det.box;
      const bw = x2 - x1;
      const bh = y2 - y1;

      ctx.strokeStyle = '#2D7D46';
      ctx.lineWidth = Math.max(2, origW / 200);
      ctx.strokeRect(x1, y1, bw, bh);

      const label = `${det.ingredient} ${(det.score * 100).toFixed(0)}%`;
      const fontSize = Math.max(14, origW / 40);
      ctx.font = `bold ${fontSize}px system-ui`;
      const textW = ctx.measureText(label).width;

      ctx.fillStyle = '#2D7D46';
      ctx.fillRect(x1, y1 - fontSize - 6, textW + 10, fontSize + 8);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x1 + 5, y1 - 6);
    }
  }

  function addToList() {
    const unique = [...new Set(detections.map((d) => d.ingredient))];
    onDetected(unique);
    setDetections([]);
    clearOverlay();
  }

  const canAnalyze = modelStatus === 'ready' && (mode === 'webcam' || mode === 'image') && !analyzing;

  return (
    <div className="vision-scanner">
      {/* Header toggle */}
      <button className="scanner-toggle" onClick={() => setExpanded((v) => !v)}>
        <span>🤖 Vision Agent — YOLOv8 local</span>
        <span className={`toggle-arrow ${expanded ? 'open' : ''}`}>▾</span>
      </button>

      {expanded && (
        <div className="scanner-body">
          {/* Model status bar */}
          <div className={`model-status status-${modelStatus}`}>
            {modelStatus === 'idle' && '⏳ Iniciando...'}
            {modelStatus === 'loading' && '⏳ Cargando modelo ONNX...'}
            {typeof modelStatus === 'string' && modelStatus.startsWith('Cargando') && modelStatus}
            {modelStatus === 'ready' && '✅ Modelo YOLOv8n listo'}
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
              <button
                className="btn-cam"
                onClick={startWebcam}
                disabled={modelStatus !== 'ready'}
              >
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
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>

          {/* Viewport: video or image + canvas overlay */}
          {(mode === 'webcam' || mode === 'image') && (
            <div className="scanner-viewport">
              {mode === 'webcam' && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="scanner-video"
                />
              )}
              {mode === 'image' && capturedSrc && (
                <img src={capturedSrc} alt="Imagen analizada" className="scanner-image" />
              )}
              <canvas ref={overlayRef} className="scanner-overlay" />
            </div>
          )}

          {/* Analyze button */}
          {(mode === 'webcam' || mode === 'image') && (
            <button
              className="btn-analyze"
              onClick={runInference}
              disabled={!canAnalyze}
            >
              {analyzing ? '⏳ Analizando...' : '🔍 Analizar fotograma'}
            </button>
          )}

          {/* Detections list */}
          {detections.length > 0 && (
            <div className="detections-box">
              <p className="detections-title">
                Detectado ({detections.length} objeto{detections.length !== 1 ? 's' : ''}):
              </p>
              <div className="detections-list">
                {detections.map((d, i) => (
                  <div key={i} className="detection-item">
                    <span className="det-name">{d.ingredient}</span>
                    <span className="det-class">({d.className})</span>
                    <span className="det-score">{(d.score * 100).toFixed(0)}%</span>
                  </div>
                ))}
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
