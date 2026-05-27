const express = require('express');
const { getCorrections, saveCorrection } = require('../controllers/correctionsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', getCorrections);
router.post('/', saveCorrection);

module.exports = router;
