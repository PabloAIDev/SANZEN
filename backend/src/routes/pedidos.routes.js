const express = require('express');
const { createPedido, getPedidos } = require('../controllers/pedidos.controller');

const router = express.Router();

router.get('/', getPedidos);
router.post('/', createPedido);

module.exports = router;
