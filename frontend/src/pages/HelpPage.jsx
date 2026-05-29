import { useState } from 'react';
import './HelpPage.css';

const FAQS = [
  {
    q: '¿Cómo funciona el escáner de ingredientes?',
    a: 'VibeChef usa un modelo de visión artificial (YOLOv8) que se ejecuta 100% en tu navegador, sin enviar ninguna imagen a servidores externos. Apunta la cámara a tu nevera o sube una foto y el modelo detectará los ingredientes automáticamente.',
  },
  {
    q: '¿Mis datos se almacenan en la nube?',
    a: 'Solo se guardan en nuestra base de datos los ingredientes que confirmes y tu historial de uso para mejorar las recomendaciones. Las imágenes que captures nunca se envían fuera de tu dispositivo.',
  },
  {
    q: '¿Puedo añadir mis propias recetas?',
    a: 'Sí. Desde la página de Configuración puedes importar recetas en formato PDF estructurado. También puedes añadirlas manualmente a través de nuestra API.',
  },
  {
    q: '¿Qué hago si el escáner no detecta bien un ingrediente?',
    a: 'Puedes corregir manualmente los resultados del escáner. Tus correcciones se guardan localmente y mejoran la precisión en detecciones futuras para ese mismo alimento.',
  },
  {
    q: '¿Cómo se generan las recetas recomendadas?',
    a: 'El motor de recomendación es 100% local: compara tus ingredientes con nuestra base de datos de recetas, calcula una puntuación de compatibilidad y te muestra primero las que mejor encajan.',
  },
  {
    q: '¿Puedo usar VibeChef sin crear una cuenta?',
    a: 'Actualmente se requiere una cuenta para guardar tu historial y despensa. El escáner y la detección de ingredientes no requieren conexión, pero las recetas y el menú semanal sí necesitan sesión activa.',
  },
];

const SUBJECTS = [
  'Problema técnico',
  'Sugerencia de mejora',
  'Error en recetas',
  'Pregunta sobre mi cuenta',
  'Problema con el escáner',
  'Otro',
];

export default function HelpPage() {
  const [openFaq,  setOpenFaq]  = useState(null);
  const [form,     setForm]     = useState({ name: '', email: '', subject: SUBJECTS[0], message: '' });
  const [sent,     setSent]     = useState(false);
  const [sending,  setSending]  = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setSending(true);
    setTimeout(() => { setSending(false); setSent(true); }, 1200);
  }

  return (
    <div className="help-page">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="help-hero">
        <div className="help-hero-inner">
          <span className="help-hero-tag">Soporte</span>
          <h1 className="help-hero-title">¿En qué podemos ayudarte?</h1>
          <p className="help-hero-sub">
            Consulta las preguntas frecuentes o envíanos un mensaje — respondemos en menos de 48 horas.
          </p>
          <div className="help-contact-chips">
            <a href="mailto:soporte@vibechef.app" className="help-chip">
              <span>✉</span> soporte@vibechef.app
            </a>
            <span className="help-chip help-chip--muted">
              <span>⏱</span> Respuesta en 24–48 h
            </span>
          </div>
        </div>
        <div className="help-hero-deco" aria-hidden="true">
          <span className="help-deco-bubble help-deco-bubble--1">💬</span>
          <span className="help-deco-bubble help-deco-bubble--2">🔧</span>
          <span className="help-deco-bubble help-deco-bubble--3">✅</span>
        </div>
      </div>

      <div className="help-body">

        {/* ── FAQ ─────────────────────────────────────────────────── */}
        <section className="help-section">
          <h2 className="help-section-title">Preguntas frecuentes</h2>
          <div className="faq-list">
            {FAQS.map(({ q, a }, i) => (
              <div
                key={i}
                className={`faq-item ${openFaq === i ? 'faq-item--open' : ''}`}
              >
                <button
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span>{q}</span>
                  <span className="faq-chevron">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="faq-answer">
                    <p>{a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Contact form ─────────────────────────────────────────── */}
        <section className="help-section">
          <h2 className="help-section-title">Contactar con soporte</h2>
          <p className="help-section-sub">
            ¿No encuentras respuesta? Cuéntanos tu consulta con detalle y te responderemos lo antes posible.
          </p>

          {sent ? (
            <div className="help-sent">
              <div className="help-sent-icon">✓</div>
              <h3>Mensaje enviado</h3>
              <p>Hemos recibido tu consulta. Te responderemos en las próximas 24–48 horas en <strong>{form.email}</strong>.</p>
              <button className="help-sent-reset" onClick={() => { setSent(false); setForm({ name: '', email: '', subject: SUBJECTS[0], message: '' }); }}>
                Enviar otra consulta
              </button>
            </div>
          ) : (
            <form className="help-form" onSubmit={handleSubmit}>
              <div className="help-form-row">
                <div className="help-field">
                  <label htmlFor="hf-name">Nombre</label>
                  <input
                    id="hf-name"
                    name="name"
                    type="text"
                    placeholder="Tu nombre"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="help-field">
                  <label htmlFor="hf-email">Email</label>
                  <input
                    id="hf-email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="help-field">
                <label htmlFor="hf-subject">Asunto</label>
                <select id="hf-subject" name="subject" value={form.subject} onChange={handleChange}>
                  {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="help-field">
                <label htmlFor="hf-message">Mensaje</label>
                <textarea
                  id="hf-message"
                  name="message"
                  rows={5}
                  placeholder="Descríbenos tu consulta con el mayor detalle posible..."
                  value={form.message}
                  onChange={handleChange}
                  required
                />
              </div>

              <button type="submit" className="help-submit" disabled={sending}>
                {sending ? 'Enviando...' : 'Enviar mensaje'}
              </button>
            </form>
          )}
        </section>

      </div>
    </div>
  );
}
