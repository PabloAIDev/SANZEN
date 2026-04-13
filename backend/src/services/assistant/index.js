const {
  resolveAssistantLanguage,
  isEnglish,
  navigateAction,
  buildRuleBasedResponse,
  buildFallbackResponse,
  buildResponse,
  normalizeHistory,
  resolveMessageWithHistory,
  normalizarMensaje,
  detectHealthQuery,
  getHealthSupportCandidates,
  buildHealthSupportFallbackMessage,
  buildStructuredCatalogResponse,
  sanitizeTarget
} = require('./assistant.rules');
const {
  requestOpenAi,
  buildGenericOpenAiExtraContext,
  buildHealthOpenAiExtraContext,
  buildModelContext,
  parseAssistantJson,
  isUsableAssistantPayload,
  buildOpenAiResponseOrNull
} = require('./assistant.openai');
const { sanitizeAssistantResponse } = require('./assistant.sanitizer');

async function generateAssistantResponse({ message, context, history = [], language = 'es' }) {
  const resolvedLanguage = resolveAssistantLanguage(language || context?.language);
  const sanitizedHistory = normalizeHistory(history);
  const normalizedMessage = normalizarMensaje(resolveMessageWithHistory(message, sanitizedHistory));
  const matchedHealthQuery = detectHealthQuery(normalizedMessage);

  if (matchedHealthQuery) {
    return buildHealthResponse({
      message,
      context,
      sanitizedHistory,
      matchedHealthQuery,
      resolvedLanguage
    });
  }

  const catalogResponse = buildStructuredCatalogResponse(normalizedMessage, context, 'fallback', resolvedLanguage);
  if (catalogResponse) {
    return catalogResponse;
  }

  const ruleResponse = buildRuleBasedResponse(normalizedMessage, context, 'rules', resolvedLanguage);
  if (ruleResponse) {
    return ruleResponse;
  }

  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackResponse(message, context, sanitizedHistory, 'fallback', resolvedLanguage);
  }

  try {
    const content = await requestOpenAi({
      message,
      context,
      history: sanitizedHistory,
      extraContext: buildGenericOpenAiExtraContext(normalizedMessage, context),
      language: resolvedLanguage
    });

    const openAiResponse = buildOpenAiResponseOrNull(content, context, resolvedLanguage);

    if (!openAiResponse) {
      return buildFallbackResponse(message, context, sanitizedHistory, 'fallback', resolvedLanguage);
    }

    return openAiResponse;
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error);
    return buildFallbackResponse(message, context, sanitizedHistory, 'fallback', resolvedLanguage);
  }
}

async function buildHealthResponse({ message, context, sanitizedHistory, matchedHealthQuery, resolvedLanguage }) {
  const candidates = getHealthSupportCandidates(context, matchedHealthQuery);

  if (!candidates.length) {
    return buildResponse(
      isEnglish(resolvedLanguage)
        ? 'I do not see dishes that clearly fit your profile for that question. You can review your food profile or ask me for more specific menu alternatives.'
        : 'No veo platos claramente compatibles con tu perfil para esa consulta. Puedes revisar tu perfil alimentario o preguntarme por alternativas mas concretas del menu.',
      [navigateAction('/menu', resolvedLanguage), navigateAction('/perfil', resolvedLanguage)],
      'fallback'
    );
  }

  const fallbackHealthResponse = buildResponse(
    buildHealthSupportFallbackMessage(matchedHealthQuery, candidates, context.profile, resolvedLanguage),
    [navigateAction('/menu', resolvedLanguage)],
    'fallback'
  );

  if (!process.env.OPENAI_API_KEY) {
    return fallbackHealthResponse;
  }

  try {
    const content = await requestOpenAi({
      message,
      context,
      history: sanitizedHistory,
      extraContext: buildHealthOpenAiExtraContext(matchedHealthQuery, candidates),
      language: resolvedLanguage
    });

    const openAiResponse = buildOpenAiResponseOrNull(content, context, resolvedLanguage);

    if (openAiResponse) {
      return openAiResponse;
    }

    return fallbackHealthResponse;
  } catch (error) {
    console.error('Error al resolver consulta de salud con OpenAI:', error);
    return fallbackHealthResponse;
  }
}

module.exports = {
  generateAssistantResponse,
  __test__: {
    buildModelContext,
    sanitizeAssistantResponse,
    sanitizeTarget,
    parseAssistantJson,
    isUsableAssistantPayload,
    buildOpenAiResponseOrNull
  }
};
