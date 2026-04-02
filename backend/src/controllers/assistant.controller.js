const { buildAssistantContext } = require('../services/assistant-context.service');
const { generateAssistantResponse } = require('../services/assistant.service');

async function chatWithAssistant(req, res) {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const screen = typeof req.body?.screen === 'string' ? req.body.screen.trim() : 'inicio';
    const history = normalizeHistory(req.body?.history);
    const clientContext = req.body?.context && typeof req.body.context === 'object'
      ? req.body.context
      : {};

    if (message.length < 2) {
      res.status(400).json({ message: 'El mensaje del asistente es obligatorio.' });
      return;
    }

    const context = await buildAssistantContext({
      userId: req.authUserId ?? null,
      screen,
      clientContext
    });

    const assistantResponse = await generateAssistantResponse({
      message,
      context,
      history
    });

    res.json(assistantResponse);
  } catch (error) {
    console.error('Error al generar la respuesta del asistente:', error);
    res.status(500).json({
      message: 'No se ha podido obtener la respuesta del asistente.'
    });
  }
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      role: entry.role === 'assistant' ? 'assistant' : 'user',
      text: typeof entry.text === 'string' ? entry.text.trim() : ''
    }))
    .filter((entry) => entry.text.length >= 2)
    .slice(-6);
}

module.exports = {
  chatWithAssistant
};
