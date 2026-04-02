const express = require('express');
const { listUsuarios, login, register } = require('../controllers/auth.controller');

const router = express.Router();

router.get('/users', listUsuarios);
router.post('/login', login);
router.post('/register', register);

module.exports = router;
