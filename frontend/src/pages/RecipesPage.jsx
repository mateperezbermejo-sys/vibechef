import { useLocation, useNavigate } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard';
import './RecipesPage.css';

export default function RecipesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { recipes = [], ingredients = [], appliedAllergies = [] } = location.state || {};

  if (recipes.length === 0 && ingredients.length === 0) {
    navigate('/scan');
    return null;
  }

  return (
    <div className="recipes-page">
      <div className="recipes-header">
        <button className="btn-back" onClick={() => navigate('/scan')}>← Volver</button>
        <div>
          <h1>Recetas encontradas</h1>
          <p className="recipes-sub">
            Con: <strong>{ingredients.join(', ')}</strong>
          </p>
        </div>
      </div>

      {appliedAllergies.length > 0 && (
        <p className="allergies-note">
          Alergias aplicadas: {appliedAllergies.join(', ')}
        </p>
      )}

      {recipes.length === 0 ? (
        <div className="no-results">
          <span className="no-results-icon">◌</span>
          <p>No encontramos recetas para esa combinación de ingredientes.</p>
          <button className="btn-try-again" onClick={() => navigate('/scan')}>
            Probar con otros ingredientes
          </button>
        </div>
      ) : (
        <>
          <p className="recipes-count">
            {recipes.length} receta{recipes.length !== 1 ? 's' : ''} · ordenadas por compatibilidad
          </p>
          <div className="recipes-grid">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
