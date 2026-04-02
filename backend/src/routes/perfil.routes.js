const express = require('express');
const { getPerfil, upsertPerfil } = require('../controllers/perfil.controller');

const router = express.Router();

router.get('/', getPerfil);
router.put('/', upsertPerfil);

module.exports = router;
