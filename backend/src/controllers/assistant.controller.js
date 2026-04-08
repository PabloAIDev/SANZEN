const { buildAssistantContext } = require('../services/assistant-context.service');
const { generateAssistantResponse } = require('../services/assistant.service');

async function chatWithAssistant(req, res) {
  let language = 'es';

  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 600) : '';
    const screen = typeof req.body?.screen === 'string' ? req.body.screen.trim().slice(0, 40) : 'inicio';
    language = normalizeLanguage(req.body?.language ?? req.body?.context?.language);
    const history = normalizeHistory(req.body?.history);
    const clientContext = req.body?.context && typeof req.body.context === 'object'
      ? req.body.context
      : {};

    if (message.length < 2) {
      res.status(400).json({ message: language === 'en' ? 'The assistant message is required.' : 'El mensaje del asistente es obligatorio.' });
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
      history,
      language
    });

    res.json(assistantResponse);
  } catch (error) {
    console.error('Error al generar la respuesta del asistente:', error);
    res.status(500).json({
      message: language === 'en'
        ? 'The assistant response could not be generated.'
        : 'No se ha podido obtener la respuesta del asistente.'
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

function normalizeLanguage(language) {
  return language === 'en' ? 'en' : 'es';
}

module.exports = {
  chatWithAssistant
};
