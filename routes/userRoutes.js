const express = require('express');
const { getUserById, updateUser } = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/:id', authMiddleware, getUserById);
router.put('/:id', authMiddleware, updateUser);

module.exports = router;
