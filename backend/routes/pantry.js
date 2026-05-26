const express = require('express');
const { upsertIngredients, getPredictions, getPantryHistory } = require('../controllers/pantryController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.post('/log', upsertIngredients);
router.get('/predict', getPredictions);
router.get('/history', getPantryHistory);

module.exports = router;
