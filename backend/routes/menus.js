const express = require('express');
const { weeklyMenu } = require('../controllers/menusController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/weekly', requireAuth, weeklyMenu);

module.exports = router;
