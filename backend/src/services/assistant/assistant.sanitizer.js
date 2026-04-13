const { defaultMessage, buildLabelForTarget, sanitizeTarget } = require('./assistant.rules');

function sanitizeAssistantResponse(response, context, source, language = 'es') {
  const message = sanitizeMessage(response?.message) || defaultMessage(context, language);
  const actions = Array.isArray(response?.actions)
    ? response.actions
        .filter((action) => action && action.type === 'navigate' && typeof action.target === 'string')
        .map((action) => ({
          type: 'navigate',
          target: sanitizeTarget(action.target),
          label: sanitizeActionLabel(action.label, action.target, language)
        }))
        .filter((action) => action.target !== null)
        .slice(0, 2)
    : [];
  return { message, actions, source };
}

function sanitizeMessage(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\s+/g, ' ').slice(0, 800);
}

function sanitizeActionLabel(_label, target, language = 'es') {
  return buildLabelForTarget(target, language);
}

module.exports = {
  sanitizeAssistantResponse,
  sanitizeMessage,
  sanitizeActionLabel
};
