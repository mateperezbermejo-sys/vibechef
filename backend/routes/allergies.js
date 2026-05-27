const express = require('express');
const { getAllergies, addAllergy, removeAllergy } = require('../controllers/allergiesController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', getAllergies);
router.post('/', addAllergy);
router.delete('/:ingredient', removeAllergy);

module.exports = router;
