import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        🍳 VibeChef
      </Link>
      {user && (
        <div className="navbar-links">
          <Link to="/">Inicio</Link>
          <Link to="/scan">Escanear</Link>
          <Link to="/history">Despensa</Link>
          <span className="navbar-email">{user.email}</span>
          <button onClick={handleLogout} className="btn-logout">Salir</button>
        </div>
      )}
    </nav>
  );
}
