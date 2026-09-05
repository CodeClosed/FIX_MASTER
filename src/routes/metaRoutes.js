const express = require('express');
const router = express.Router();
const meta = require('../controllers/metaController');

// Public or globally authenticated routes for dropdowns/UI population
router.get('/blocks', meta.getBlocks);
router.get('/blocks/:block_id/rooms', meta.getRoomsByBlock);
router.get('/categories', meta.getCategoriesWithSubcategories);

module.exports = router;