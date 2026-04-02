const express = require('express');
const { getPlatos } = require('../controllers/platos.controller');

const router = express.Router();

router.get('/', getPlatos);

module.exports = router;
