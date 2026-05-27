const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const pantryRoutes = require('./routes/pantry');
const recipesRoutes = require('./routes/recipes');
const allergiesRoutes = require('./routes/allergies');
const correctionsRoutes = require('./routes/corrections');
const menusRoutes = require('./routes/menus');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', project: 'VibeChef', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/allergies', allergiesRoutes);
app.use('/api/corrections', correctionsRoutes);
app.use('/api/menus', menusRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`VibeChef backend running on http://localhost:${PORT}`);
});
