const express = require('express');
const { createProvider, getProviderById, updateProvider, getProviderAvailability } = require('../controllers/providerController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', createProvider);
router.get('/:id', getProviderById);
router.put('/:id', updateProvider);
router.get('/:id/availability', getProviderAvailability);

module.exports = router;
