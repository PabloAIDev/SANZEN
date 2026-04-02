const express = require('express');
const { chatWithAssistant } = require('../controllers/assistant.controller');

const router = express.Router();

router.post('/chat', chatWithAssistant);

module.exports = router;
