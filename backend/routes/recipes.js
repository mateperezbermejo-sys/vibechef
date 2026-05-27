const express = require('express');
const multer = require('multer');
const { matchRecipes, getAllRecipes } = require('../controllers/recipesController');
const { importPdf } = require('../controllers/pdfController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// PDF upload: memory storage (buffer), 10 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF.'), false);
  },
});

router.get('/', getAllRecipes);
router.post('/match', requireAuth, matchRecipes);
router.post('/import-pdf', requireAuth, upload.single('file'), importPdf);

module.exports = router;
