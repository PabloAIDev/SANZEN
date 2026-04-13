const { OPENAI_API_URL, OPENAI_MODEL, OPENAI_TIMEOUT_MS } = require('./assistant.config');
const {
  isEnglish,
  detectHealthQuery,
  getHealthSupportCandidates,
  isOpenRecommendationQuestion,
  detectSpecialCatalogQuery,
  detectNutrientQuery,
  getOpenRecommendationCandidates,
  getCompatibleCatalog,
  getRecommendedCatalog
} = require('./assistant.rules');
const { sanitizeAssistantResponse } = require('./assistant.sanitizer');

async function requestOpenAi({ message, context, history, extraContext = null, language = 'es' }) {
  const timeoutSignal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(OPENAI_TIMEOUT_MS)
    : undefined;
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    signal: timeoutSignal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: buildOpenAiMessages({ message, context, history, extraContext, language })
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error de OpenAI:', response.status, errorText);
    return null;
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

function buildOpenAiMessages({ message, context, history, extraContext = null, language = 'es' }) {
  return [
    { role: 'system', content: buildSystemPrompt(language) },
    { role: 'user', content: JSON.stringify({ context: buildModelContext(context, extraContext) }) },
    ...history.map((entry) => ({ role: entry.role, content: entry.text })),
    { role: 'user', content: message.trim() }
  ];
}

function buildSystemPrompt(language = 'es') {
  if (isEnglish(language)) {
    return [
      'You are the SANZEN virtual assistant, a healthy Asian food app.',
      'Always reply in English, with a clear, brief and practical tone.',
      'Use the current context and the recent conversation to understand follow-up questions.',
      'Do not invent data, do not claim actions have been executed, and do not change orders, profiles or payments.',
      'You may only suggest navigation when it genuinely helps the user.',
      'Never recommend dishes whose allergens are incompatible with the user profile.',
      'If compatibleCatalog or recommendedCatalog exists, only recommend dishes from those lists.',
      'If candidateCatalog exists, explicitly mention between 2 and 4 dishes from that list by name and briefly explain why they fit.',
      'If the user asks about how the app works, answer about SANZEN and not general nutrition.',
      'If the user mentions a digestive issue or wellbeing need, answer cautiously, avoid strong medical advice, and suggest a professional if the situation goes beyond general guidance.',
      'If healthDataLimitations says that relevant nutritional data is missing, state that explicitly and do not assume missing information.',
      'When a health question cannot be answered reliably, say so clearly and finish by offering a concrete alternative: recommend compatible dishes according to the user profile or explain how the app works.',
      'If you do not have enough basis for a reliable recommendation, say so clearly and offer an alternative: recommend dishes according to the profile or explain app usage.',
      'SANZEN rules:',
      '- Individual order: minimum 20 EUR.',
      '- Weekly subscription: minimum 5 dishes.',
      '- If a complete profile is missing for payment, the user must complete it before confirming.',
      '- The weekly subscription can be reviewed, modified or renewed manually.',
      '- The weekly delivery date must respect previous orders.',
      'Always return valid JSON with this shape:',
      '{ "message": "text", "actions": [{ "type": "navigate", "target": "/route", "label": "Text" }] }'
    ].join('\n');
  }

  return [
    'Eres el asistente virtual de SANZEN, una app de comida asiatica saludable.',
    'Responde siempre en espanol, con tono claro, breve y practico.',
    'Usa el contexto actual y la conversacion reciente para entender preguntas encadenadas.',
    'No inventes datos, no digas que has ejecutado acciones y no cambies pedidos, perfiles ni pagos.',
    'Solo puedes sugerir navegacion cuando realmente ayude al usuario.',
    'Nunca recomiendes platos cuyos alergenos sean incompatibles con el perfil del usuario.',
    'Si existe compatibleCatalog o recommendedCatalog, solo puedes recomendar platos contenidos en esas listas.',
    'Si existe candidateCatalog, cita explicitamente entre 2 y 4 platos de esa lista por su nombre y explica brevemente por que encajan.',
    'Si el usuario pregunta por el funcionamiento de la app, responde sobre SANZEN y no sobre nutricion en general.',
    'Si el usuario plantea una molestia digestiva o una necesidad de bienestar, responde con prudencia, sin consejo medico fuerte, y recomienda consultar a un profesional si la situacion va mas alla de una orientacion general.',
    'Si en healthDataLimitations se indica que faltan datos nutricionales relevantes, debes decirlo expresamente y no asumir informacion que no existe.',
    'Cuando una consulta de salud no pueda resolverse con fiabilidad, debes decirlo claramente y cerrar ofreciendo ayuda alternativa concreta: recomendar platos compatibles segun el perfil del usuario o explicar el uso de la app.',
    'Si no tienes base suficiente para una recomendacion fiable, dilo claramente y ofrece ayuda alternativa: recomendar platos segun perfil o explicar el uso de la app.',
    'Reglas de SANZEN:',
    '- Pedido individual: minimo de 20 EUR.',
    '- Suscripcion semanal: minimo de 5 platos.',
    '- Si falta perfil completo para pago, el usuario debe completarlo antes de confirmar.',
    '- La suscripcion semanal puede revisarse, modificarse o renovarse manualmente.',
    '- La fecha de entrega semanal debe respetar pedidos anteriores.',
    'Devuelve siempre JSON valido con esta forma:',
    '{ "message": "texto", "actions": [{ "type": "navigate", "target": "/ruta", "label": "Texto" }] }'
  ].join('\n');
}

function buildModelContext(context, extraContext = null) {
  const compatibleCatalog = getCompatibleCatalog(context);
  const recommendedCatalog = getRecommendedCatalog(context);
  return {
    screen: context.screen,
    userAuthenticated: context.userAuthenticated,
    user: context.user?.name ? { name: context.user.name } : null,
    profile: {
      name: context.profile.name,
      allergies: context.profile.allergies,
      objective: context.profile.objective,
      compositionPreferences: context.profile.compositionPreferences,
      basicComplete: context.profile.basicComplete,
      addressComplete: context.profile.addressComplete,
      cardComplete: context.profile.cardComplete,
      profileCompleteForPayment: context.profile.profileCompleteForPayment,
      missingBasicFields: context.profile.missingBasicFields,
      missingPaymentFields: context.profile.missingPaymentFields
    },
    cart: {
      mode: context.cart.mode,
      itemCount: context.cart.itemCount,
      total: context.cart.total,
      meetsMinimum: context.cart.meetsMinimum,
      hasItems: context.cart.hasItems,
      items: context.cart.items.slice(0, 6).map((item) => ({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        healthScore: item.healthScore,
        allergens: item.allergens
      }))
    },
    subscription: {
      active: context.subscription.active,
      day: context.subscription.day,
      minimumItems: context.subscription.minimumItems,
      selectedItemCount: context.subscription.selectedItemCount,
      complete: context.subscription.complete,
      nextDelivery: context.subscription.nextDelivery,
      items: context.subscription.items
    },
    firstOrder: context.firstOrder,
    lastOrder: context.lastOrder,
    nextScheduledOrder: context.nextScheduledOrder,
    ordersSummary: context.ordersSummary,
    compatibleCatalog: compatibleCatalog.map(toCatalogSummary),
    recommendedCatalog: recommendedCatalog.map(toCatalogSummary),
    catalog: context.catalog.map(toCatalogSummary),
    appRules: context.appRules,
    ...(extraContext && typeof extraContext === 'object' ? extraContext : {})
  };
}

function toCatalogSummary(item) {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    price: item.price,
    calories: item.calories,
    proteinG: item.proteinG,
    carbohydratesG: item.carbohydratesG,
    fatG: item.fatG,
    fiberG: item.fiberG,
    healthScore: item.healthScore,
    allergens: item.allergens
  };
}

function buildGenericOpenAiExtraContext(message, context) {
  const healthQuery = detectHealthQuery(message);

  if (!healthQuery) {
    if (!isOpenRecommendationQuestion(message)) {
      return null;
    }

    const candidateCatalog = getOpenRecommendationCandidates(message, context);
    return candidateCatalog.length
      ? {
          recommendationQuery: {
            dinner: detectSpecialCatalogQuery(message).dinner,
            nutrient: detectNutrientQuery(message)?.label ?? null
          },
          candidateCatalog: candidateCatalog.map(toCatalogSummary)
        }
      : null;
  }

  return buildHealthOpenAiExtraContext(healthQuery, getHealthSupportCandidates(context, healthQuery));
}

function buildHealthOpenAiExtraContext(healthQuery, candidates) {
  return {
    healthQuery: {
      topic: healthQuery.key,
      guidance: healthQuery.guidance
    },
    healthDataLimitations: Array.isArray(healthQuery.dataLimitations) ? healthQuery.dataLimitations : [],
    candidateCatalog: candidates.map(toCatalogSummary)
  };
}

function parseAssistantJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
}

function isUsableAssistantPayload(response) {
  return Boolean(
    response &&
    typeof response === 'object' &&
    !Array.isArray(response) &&
    (
      (typeof response.message === 'string' && response.message.trim() !== '') ||
      Array.isArray(response.actions)
    )
  );
}

function buildOpenAiResponseOrNull(content, context, language = 'es') {
  if (typeof content !== 'string' || content.trim() === '') {
    return null;
  }

  const parsed = parseAssistantJson(content);
  return isUsableAssistantPayload(parsed)
    ? sanitizeAssistantResponse(parsed, context, 'openai', language)
    : null;
}

module.exports = {
  requestOpenAi,
  buildOpenAiMessages,
  buildSystemPrompt,
  buildModelContext,
  toCatalogSummary,
  buildGenericOpenAiExtraContext,
  buildHealthOpenAiExtraContext,
  parseAssistantJson,
  isUsableAssistantPayload,
  buildOpenAiResponseOrNull
};
