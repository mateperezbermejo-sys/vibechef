const express = require('express');
const { matchRecipes, getAllRecipes } = require('../controllers/recipesController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', getAllRecipes);
router.post('/match', requireAuth, matchRecipes);

module.exports = router;
