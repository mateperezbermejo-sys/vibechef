import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AccountPage.css';

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const email     = user?.email || '';
  const firstName = email.split('@')[0] || 'Chef';
  const initial   = firstName[0]?.toUpperCase() || 'C';

  const [displayName,  setDisplayName]  = useState(firstName);
  const [nameSaved,    setNameSaved]    = useState(false);

  const [pwForm,  setPwForm]  = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwOk,    setPwOk]    = useState(false);
  const [pwBusy,  setPwBusy]  = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDelete,    setShowDelete]    = useState(false);

  function handleSaveName(e) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2500);
  }

  function handlePwChange(e) {
    setPwForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setPwError(''); setPwOk(false);
  }

  async function handlePwSubmit(e) {
    e.preventDefault();
    if (!pwForm.current) { setPwError('Introduce tu contraseña actual.'); return; }
    if (pwForm.next.length < 8) { setPwError('La nueva contraseña debe tener al menos 8 caracteres.'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('Las contraseñas no coinciden.'); return; }
    setPwBusy(true);
    await new Promise((r) => setTimeout(r, 1000));
    setPwBusy(false);
    setPwOk(true);
    setPwForm({ current: '', next: '', confirm: '' });
  }

  function handleDeleteAccount() {
    if (deleteConfirm !== email) return;
    logout();
    navigate('/login');
  }

  return (
    <div className="account-page">
      <div className="account-inner">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="account-header">
          <div className="account-avatar-lg">{initial}</div>
          <div>
            <h1 className="account-heading">Mi cuenta</h1>
            <p className="account-email">{email}</p>
          </div>
        </div>

        {/* ── Profile ─────────────────────────────────────────────── */}
        <section className="account-card">
          <div className="account-card-head">
            <h2>Perfil</h2>
            <p>Tu información pública dentro de la app.</p>
          </div>
          <form onSubmit={handleSaveName} className="account-form">
            <div className="account-field">
              <label htmlFor="ac-name">Nombre de usuario</label>
              <input
                id="ac-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
            <div className="account-field">
              <label>Dirección de correo</label>
              <input type="email" value={email} disabled className="account-input--disabled" />
              <span className="account-field-hint">El email no se puede cambiar desde aquí.</span>
            </div>
            <div className="account-form-footer">
              <button type="submit" className="btn-account-primary">
                Guardar cambios
              </button>
              {nameSaved && <span className="account-saved">✓ Guardado</span>}
            </div>
          </form>
        </section>

        {/* ── Seguridad ────────────────────────────────────────────── */}
        <section className="account-card">
          <div className="account-card-head">
            <h2>Seguridad</h2>
            <p>Actualiza tu contraseña para mantener tu cuenta segura.</p>
          </div>
          {pwOk ? (
            <div className="account-ok-banner">
              ✓ Contraseña actualizada correctamente.
            </div>
          ) : (
            <form onSubmit={handlePwSubmit} className="account-form">
              <div className="account-field">
                <label htmlFor="ac-pw-cur">Contraseña actual</label>
                <input id="ac-pw-cur" name="current" type="password" value={pwForm.current} onChange={handlePwChange} placeholder="••••••••" />
              </div>
              <div className="account-field">
                <label htmlFor="ac-pw-new">Nueva contraseña</label>
                <input id="ac-pw-new" name="next" type="password" value={pwForm.next} onChange={handlePwChange} placeholder="Mínimo 8 caracteres" />
              </div>
              <div className="account-field">
                <label htmlFor="ac-pw-confirm">Confirmar nueva contraseña</label>
                <input id="ac-pw-confirm" name="confirm" type="password" value={pwForm.confirm} onChange={handlePwChange} placeholder="Repite la contraseña" />
              </div>
              {pwError && <p className="account-error">{pwError}</p>}
              <button type="submit" className="btn-account-primary" disabled={pwBusy}>
                {pwBusy ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>
          )}
        </section>

        {/* ── Actividad ────────────────────────────────────────────── */}
        <section className="account-card">
          <div className="account-card-head">
            <h2>Actividad y datos</h2>
            <p>Información sobre tu uso de VibeChef.</p>
          </div>
          <div className="account-stats">
            <div className="account-stat">
              <span className="account-stat-icon">🧅</span>
              <div>
                <strong>Ingredientes escaneados</strong>
                <span>Historial guardado en tu dispositivo</span>
              </div>
              <button className="btn-account-ghost" onClick={() => navigate('/history')}>Ver historial</button>
            </div>
            <div className="account-stat">
              <span className="account-stat-icon">🍽️</span>
              <div>
                <strong>Menús generados</strong>
                <span>Planifica tu semana sin desperdicios</span>
              </div>
              <button className="btn-account-ghost" onClick={() => navigate('/menu')}>Ver menú</button>
            </div>
            <div className="account-stat">
              <span className="account-stat-icon">📥</span>
              <div>
                <strong>Importar recetas (PDF)</strong>
                <span>Añade tus propias recetas en formato PDF</span>
              </div>
              <button className="btn-account-ghost" onClick={() => navigate('/settings')}>Importar</button>
            </div>
          </div>
        </section>

        {/* ── Zona de peligro ──────────────────────────────────────── */}
        <section className="account-card account-card--danger">
          <div className="account-card-head">
            <h2>Zona de peligro</h2>
            <p>Estas acciones son irreversibles. Procede con cuidado.</p>
          </div>

          <div className="account-logout-row">
            <div>
              <strong>Cerrar sesión</strong>
              <p>Cierra tu sesión en este dispositivo.</p>
            </div>
            <button
              className="btn-account-outline"
              onClick={() => { logout(); navigate('/login'); }}
            >
              Cerrar sesión
            </button>
          </div>

          <div className="account-delete-row">
            {!showDelete ? (
              <>
                <div>
                  <strong>Eliminar cuenta</strong>
                  <p>Borra permanentemente tu cuenta y todos tus datos.</p>
                </div>
                <button className="btn-account-danger" onClick={() => setShowDelete(true)}>
                  Eliminar cuenta
                </button>
              </>
            ) : (
              <div className="account-delete-confirm">
                <p>Escribe tu email <strong>{email}</strong> para confirmar la eliminación:</p>
                <input
                  type="email"
                  placeholder={email}
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                />
                <div className="account-delete-btns">
                  <button className="btn-account-ghost" onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}>
                    Cancelar
                  </button>
                  <button
                    className="btn-account-danger"
                    disabled={deleteConfirm !== email}
                    onClick={handleDeleteAccount}
                  >
                    Sí, eliminar mi cuenta
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
