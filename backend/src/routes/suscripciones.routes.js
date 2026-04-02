const express = require('express');
const {
  getSuscripcion,
  upsertSuscripcion,
  simularRenovacionSemanal
} = require('../controllers/suscripciones.controller');

const router = express.Router();

router.get('/', getSuscripcion);
router.put('/', upsertSuscripcion);
router.post('/simular-renovacion', simularRenovacionSemanal);

module.exports = router;
