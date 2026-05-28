import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const NAV_LINKS = [
  { to: '/',        label: 'Inicio' },
  { to: '/scan',    label: 'Escanear' },
  { to: '/history', label: 'Mis alimentos' },
  { to: '/menu',    label: 'Menú' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleLogout() { setMenuOpen(false); logout(); navigate('/login'); }

  const transparent = isHome && !scrolled && !menuOpen;

  return (
    <header className={`navbar ${transparent ? 'navbar--transparent' : 'navbar--solid'}`}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">VibeChef</Link>

        {user && (
          <>
            <nav className={`navbar-nav ${menuOpen ? 'navbar-nav--open' : ''}`} aria-label="Principal">
              {NAV_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`navbar-link ${location.pathname === to ? 'navbar-link--active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <span className="navbar-divider" aria-hidden="true" />
              <span className="navbar-email">{user.email}</span>
              <button onClick={handleLogout} className="navbar-logout">Salir</button>
            </nav>

            <button
              className={`navbar-hamburger ${menuOpen ? 'navbar-hamburger--open' : ''}`}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
            >
              <span /><span /><span />
            </button>
          </>
        )}

        {!user && (
          <div className="navbar-auth">
            <Link to="/login"    className="navbar-link">Entrar</Link>
            <Link to="/register" className="navbar-cta">Registrarse</Link>
          </div>
        )}
      </div>
    </header>
  );
}
