const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 12000);
const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_TEXT_LENGTH = 400;
const ALLOWED_TARGETS = ['/inicio', '/menu', '/resumen', '/pago', '/perfil', '/suscripcion', '/mis-pedidos', '/como-funciona', '/login'];
const NUTRIENT_QUERY_DEFINITIONS = [
  { field: 'fiberG', label: 'fibra', keywords: ['fibra'], defaultDirection: 'high' },
  { field: 'proteinG', label: 'proteina', keywords: ['proteina', 'proteinas'], defaultDirection: 'high' },
  { field: 'fatG', label: 'grasas', keywords: ['grasa', 'grasas'], defaultDirection: 'low' },
  { field: 'carbohydratesG', label: 'carbohidratos', keywords: ['carbohidrato', 'carbohidratos', 'hidrato', 'hidratos'], defaultDirection: 'low' }
];
const HEALTH_QUERY_DEFINITIONS = [
  {
    key: 'estreñimiento',
    pattern: /\bestrenim|\bestrinim|\btransito(?:\s+intestinal|\s+lento)?\b/,
    keywords: ['estrenim', 'estrinim', 'transito intestinal', 'transito lento', 'transito'],
    nutrientField: 'fiberG',
    ranking: 'highFiber',
    guidance: 'El usuario busca platos que puedan encajar mejor con molestias de estreñimiento o tránsito lento. Responde con cautela, sin consejo médico fuerte, priorizando platos compatibles con más fibra y buena ligereza.'
  },
  {
    key: 'colesterol',
    pattern: /\bcolesterol\b|\bcolesterol alto\b/,
    keywords: ['colesterol'],
    ranking: 'lowFatHighFiber',
    guidance: 'El usuario pregunta por colesterol. Puedes orientar de forma general con los datos disponibles, priorizando grasa total mas baja y fibra mas alta, pero dejando claro que SANZEN no dispone de datos de grasas saturadas ni colesterol dietetico.',
    dataLimitations: ['No dispones de grasas saturadas.', 'No dispones de colesterol dietetico.']
  },
  {
    key: 'tension-alta',
    pattern: /\btension alta\b|\bhipertension\b|\bpresion alta\b/,
    keywords: ['tension alta', 'hipertension', 'presion alta'],
    ranking: 'general',
    guidance: 'El usuario pregunta por tension alta. Debes responder con prudencia y aclarar que SANZEN no dispone de datos de sodio o sal, asi que no puedes dar una recomendacion fiable para ese criterio medico.',
    dataLimitations: ['No dispones de sodio ni sal por plato.']
  },
  {
    key: 'gases',
    pattern: /\bgases\b|\bhinchazon\b|\bdistension\b|\bmeteorismo\b/,
    keywords: ['gases', 'hinchazon', 'distension', 'meteorismo'],
    ranking: 'general',
    guidance: 'El usuario pregunta por gases o hinchazon. Debes responder con prudencia y aclarar que SANZEN no dispone de datos suficientes para una recomendacion digestiva fiable, pero si puedes orientar segun perfil y composicion general.',
    dataLimitations: ['No dispones de datos digestivos especificos ni de FODMAP.']
  }
];
const GENERIC_HEALTH_PATTERNS = [
  /\bsalud\b/,
  /\bbienestar\b/,
  /\bmedic/,
  /\benfermedad/,
  /\bpatolog/,
  /\btrastorn/,
  /\bdiagnost/,
  /\bdolencia/,
  /\bsintoma/,
  /\bmolestia/,
  /\bdolor/,
  /\bdigesti/,
  /\bestomag/,
  /\bintestin/,
  /\breflujo\b/,
  /\bgastrit/,
  /\bacidez\b/,
  /\bcolesterol/,
  /\btension/,
  /\bhipertension/,
  /\bdiabetes/,
  /\banemia\b/,
  /\basma\b/,
  /\binsomnio\b/,
  /\bansiedad\b/,
  /\bestres\b/,
  /\bmigra/,
  /\bgases/,
  /\bhinchazon/,
  /\binflamacion/
];
const GENERIC_HEALTH_QUERY = {
  key: 'salud-general',
  ranking: 'general',
  guidance: 'El usuario hace una consulta general de salud o bienestar. Responde con prudencia, sin consejo medico fuerte, usando solo el perfil y la composicion nutricional general disponible en SANZEN.',
  dataLimitations: ['No dispones de datos clinicos ni diagnosticos.', 'Solo conoces composicion nutricional general, alergenos y preferencias del usuario.']
};
const ALLERGEN_ALIASES = {
  gluten: 'gluten',
  lacteos: 'lacteos',
  lacteo: 'lacteos',
  lactosa: 'lacteos',
  soja: 'soja',
  huevo: 'huevo',
  huevos: 'huevo',
  pescado: 'pescado',
  crustaceos: 'crustaceos',
  crustaceo: 'crustaceos',
  sesamo: 'sesamo',
  legumbres: 'legumbres',
  legumbre: 'legumbres'
};
const VEGETARIAN_DISALLOWED_TERMS = [
  'pollo',
  'cerdo',
  'ternera',
  'carne',
  'gamba',
  'gambas',
  'pescado',
  'atun',
  'sardina',
  'salmon',
  'marisco',
  'crustaceo',
  'crustaceos',
  'panceta',
  'bacon',
  'chuleta'
];

async function generateAssistantResponse({ message, context, history = [] }) {
  const sanitizedHistory = normalizeHistory(history);
  const normalizedMessage = normalizarMensaje(resolveMessageWithHistory(message, sanitizedHistory));
  const matchedHealthQuery = detectHealthQuery(normalizedMessage);
  if (matchedHealthQuery) {
    const candidates = getHealthSupportCandidates(context, matchedHealthQuery);

    if (!candidates.length) {
      return buildResponse(
        'No veo platos claramente compatibles con tu perfil para esa consulta. Puedes revisar tu perfil alimentario o preguntarme por alternativas mas concretas del menu.',
        [{ type: 'navigate', target: '/menu', label: 'Ver menu' }, { type: 'navigate', target: '/perfil', label: 'Ver perfil' }],
        'fallback'
      );
    }

    const fallbackHealthResponse = buildResponse(
      buildHealthSupportFallbackMessage(matchedHealthQuery, candidates, context.profile),
      [{ type: 'navigate', target: '/menu', label: 'Ver menu' }],
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
        extraContext: buildHealthOpenAiExtraContext(matchedHealthQuery, candidates)
      });

      const openAiResponse = buildOpenAiResponseOrNull(content, context);

      if (openAiResponse) {
        return openAiResponse;
      }

      return fallbackHealthResponse;
    } catch (error) {
      console.error('Error al resolver consulta de salud con OpenAI:', error);
      return fallbackHealthResponse;
    }
  }
  const catalogResponse = buildStructuredCatalogResponse(normalizedMessage, context, 'fallback');
  if (catalogResponse) {
    return catalogResponse;
  }
  const ruleResponse = buildRuleBasedResponse(normalizedMessage, context, 'rules');
  if (ruleResponse) {
    return ruleResponse;
  }
  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackResponse(message, context, sanitizedHistory, 'fallback');
  }

  try {
    const content = await requestOpenAi({
      message,
      context,
      history: sanitizedHistory,
      extraContext: buildGenericOpenAiExtraContext(normalizedMessage, context)
    });

    const openAiResponse = buildOpenAiResponseOrNull(content, context);

    if (!openAiResponse) {
      return buildFallbackResponse(message, context, sanitizedHistory, 'fallback');
    }

    return openAiResponse;
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error);
    return buildFallbackResponse(message, context, sanitizedHistory, 'fallback');
  }
}

async function requestOpenAi({ message, context, history, extraContext = null }) {
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
      messages: buildOpenAiMessages({ message, context, history, extraContext })
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

function buildOpenAiMessages({ message, context, history, extraContext = null }) {
  return [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: JSON.stringify({ context: buildModelContext(context, extraContext) }) },
    ...history.map((entry) => ({ role: entry.role, content: entry.text })),
    { role: 'user', content: message.trim() }
  ];
}

function buildSystemPrompt() {
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

function buildRuleBasedResponse(message, context, source) {
  if (isHowWorks(message)) return buildResponse(explainHowWorks(context), [{ type: 'navigate', target: '/como-funciona', label: 'Como funciona' }], source);
  if (isFirstOrder(message)) return buildResponse(explainFirstOrder(context), firstOrderActions(context), source);
  if (isModesDifference(message)) return buildResponse(explainModesDifference(), [{ type: 'navigate', target: '/menu', label: 'Ver menu' }, { type: 'navigate', target: '/suscripcion', label: 'Gestionar suscripcion' }], source);
  if (isAllergyQuestion(message)) return buildResponse(describeAllergies(context), [{ type: 'navigate', target: '/perfil', label: 'Ver perfil' }], source);
  if (isObjectiveQuestion(message)) return buildResponse(describeObjective(context), [{ type: 'navigate', target: '/perfil', label: 'Ver perfil' }], source);
  if (isPaymentStatusQuestion(message)) return buildResponse(describePaymentStatus(context), paymentActions(context), source);
  if (isMissingFieldsQuestion(message)) return buildResponse(describeMissingFields(context), missingFieldsActions(context), source);
  if (isLastOrderDateQuestion(message)) return buildResponse(describeLastOrderDate(context), lastOrderActions(context), source);
  if (isLastOrderTypeQuestion(message)) return buildResponse(describeLastOrderType(context), lastOrderActions(context), source);
  if (isLastOrderQuestion(message)) return buildResponse(describeLastOrder(context), lastOrderActions(context), source);
  if (isNextDeliveryQuestion(message)) return buildResponse(describeNextDelivery(context), subscriptionActions(context), source);
  if (isRenewSubscriptionQuestion(message)) return buildResponse(explainRenewSubscription(context), subscriptionActions(context), source);
  if (isModifySubscriptionQuestion(message)) return buildResponse(explainModifySubscription(context), subscriptionActions(context), source);
  if (isSubscriptionContentQuestion(message)) return buildResponse(describeSubscription(context), subscriptionActions(context), source);
  if (isDeliveryDateQuestion(message)) return buildResponse(describeDeliveryDate(context), deliveryActions(context), source);
  if (isOrderTypeQuestion(message)) return buildResponse(compareSubscriptionVsIndividual(context), [{ type: 'navigate', target: '/menu', label: 'Ver menu' }, { type: 'navigate', target: '/suscripcion', label: 'Gestionar suscripcion' }], source);
  if (isProfileQuestion(message)) return buildResponse(describeProfile(context), [{ type: 'navigate', target: '/perfil', label: 'Ver perfil' }], source);
  if (isBlockingQuestion(message) || isMissingToContinueQuestion(message)) return buildResponse(explainBlocking(context), blockingActions(context), source);
  if (isCartSummaryQuestion(message)) return buildResponse(describeCart(context), [{ type: 'navigate', target: '/resumen', label: 'Ver carrito' }], source);
  if (isOrdersSummaryQuestion(message)) return buildResponse(describeHistory(context), lastOrderActions(context), source);
  return null;
}

function buildFallbackResponse(message, context, history, source) {
  const normalizedMessage = normalizarMensaje(resolveMessageWithHistory(message, history));
  const safeRecommendationFallback = buildSafeRecommendationFallback(normalizedMessage, context, source);
  return safeRecommendationFallback
    || buildRuleBasedResponse(normalizedMessage, context, source)
    || { message: defaultMessage(context), actions: defaultActions(context), source };
}

function buildResponse(message, actions, source) {
  return { message, actions: actions.slice(0, 2), source };
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

function buildOpenAiResponseOrNull(content, context) {
  if (typeof content !== 'string' || content.trim() === '') {
    return null;
  }

  const parsed = parseAssistantJson(content);
  return isUsableAssistantPayload(parsed)
    ? sanitizeAssistantResponse(parsed, context, 'openai')
    : null;
}

function sanitizeAssistantResponse(response, context, source) {
  const message = sanitizeMessage(response?.message) || defaultMessage(context);
  const actions = Array.isArray(response?.actions)
    ? response.actions
        .filter((action) => action && action.type === 'navigate' && typeof action.target === 'string')
        .map((action) => ({
          type: 'navigate',
          target: sanitizeTarget(action.target),
          label: sanitizeActionLabel(action.label, action.target)
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

function sanitizeActionLabel(label, target) {
  const sanitizedLabel = typeof label === 'string'
    ? label.trim().replace(/\s+/g, ' ').slice(0, 40)
    : '';

  return sanitizedLabel || buildLabelForTarget(target);
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      role: entry.role === 'assistant' ? 'assistant' : 'user',
      text: String(entry.text ?? '').trim().slice(0, MAX_HISTORY_TEXT_LENGTH)
    }))
    .filter((entry) => entry.text.length >= 2)
    .slice(-MAX_HISTORY_MESSAGES);
}

function resolveMessageWithHistory(message, history) {
  const currentMessage = String(message ?? '').trim();
  if (!isFollowUpMessage(currentMessage)) return currentMessage;
  const previousUserTurn = [...history].reverse().find((entry) => entry.role === 'user');
  return previousUserTurn ? `${previousUserTurn.text} ${currentMessage}` : currentMessage;
}

function isFollowUpMessage(message) {
  const normalizedMessage = normalizarMensaje(message);
  return normalizedMessage.startsWith('y ') || normalizedMessage.startsWith('entonces') || normalizedMessage.startsWith('y si') || normalizedMessage.startsWith('si ') || normalizedMessage.startsWith('vale') || normalizedMessage.startsWith('perfecto');
}

function normalizarMensaje(message) {
  return String(message ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function isHowWorks(message) { return message.includes('como funciona sanzen') || message === 'como funciona' || message.includes('como funciona la app'); }
function isFirstOrder(message) { return message.includes('primer pedido') || message.includes('que tengo que hacer para mi primer pedido') || message.includes('como hago mi primer pedido'); }
function isModesDifference(message) { return message.includes('diferencia') && (message.includes('pedido individual') || message.includes('suscripcion')); }
function isBlockingQuestion(message) { return message.includes('por que no puedo') || message.includes('no puedo continuar') || message.includes('no puedo seguir al pago') || message.includes('no me deja'); }
function isMissingToContinueQuestion(message) { return message.includes('que me falta para seguir') || message.includes('que me falta para continuar'); }
function isOrderTypeQuestion(message) { return message.includes('tipo de pedido') || message.includes('pedido me recomend') || message.includes('suscripcion o pedido individual') || message.includes('pedido individual o suscripcion') || message.includes('me conviene'); }
function isProfileQuestion(message) { return !(message.includes('plato') || message.includes('platos') || message.includes('menu') || message.includes('recomi')) && (message.includes('cual es mi perfil') || message.includes('que perfil') || message.includes('mi perfil') || message.includes('perfil actual') || message.includes('perfil alimentario')); }
function isPaymentStatusQuestion(message) { return message.includes('mi perfil esta completo para pagar') || message.includes('perfil completo para pagar') || message.includes('listo para pagar'); }
function isMissingFieldsQuestion(message) { return message.includes('que dato me falta') || message.includes('que me falta para completar el perfil') || message.includes('que me falta del perfil'); }
function isAllergyQuestion(message) { return message.includes('alergenos tengo') || message.includes('alergenos tengo seleccionados') || message.includes('que alergenos tengo'); }
function isObjectiveQuestion(message) { return message.includes('objetivo nutricional') || message.includes('que objetivo tengo') || message.includes('objetivo tengo ahora mismo'); }
function isOpenRecommendationQuestion(message) {
  return message.includes('recomi')
    || message.includes('aconsej')
    || message.includes('sugier')
    || message.includes('platos encajan')
    || message.includes('plato encaja')
    || message.includes('encajan con mi perfil');
}
function isCartSummaryQuestion(message) { return message.includes('resume mi carrito') || message.includes('resume mi pedido'); }
function isOrdersSummaryQuestion(message) { return message.includes('resume mis pedidos') || message.includes('resumeme mis pedidos') || message.includes('resumen de mis pedidos'); }
function isLastOrderTypeQuestion(message) { return message.includes('ultimo pedido fue') && (message.includes('suscripcion') || message.includes('individual')); }
function isLastOrderDateQuestion(message) { return message.includes('cuando se entrega mi ultimo pedido') || message.includes('cuando se entrego mi ultimo pedido') || (message.includes('ultimo pedido') && message.includes('cuando se entrega')); }
function isLastOrderQuestion(message) { return message.includes('ultimo pedido'); }
function isDeliveryDateQuestion(message) { return message.includes('cual sera la fecha de entrega') || message.includes('entrega prevista') || (message.includes('fecha de entrega') && !message.includes('ultimo pedido')); }
function isNextDeliveryQuestion(message) { return message.includes('proxima entrega'); }
function isSubscriptionContentQuestion(message) { return message.includes('que contiene mi suscripcion actual') || message.includes('suscripcion actual'); }
function isRenewSubscriptionQuestion(message) { return message.includes('como renuevo mi suscripcion') || message.includes('como renuevo la suscripcion') || message.includes('renovacion semanal') || message.includes('renovar mi suscripcion'); }
function isModifySubscriptionQuestion(message) { return message.includes('como modifico mi seleccion semanal') || message.includes('como modifico mi suscripcion') || message.includes('como modifico la seleccion semanal') || message.includes('modificarla'); }

function explainHowWorks(context) {
  if (!context.userAuthenticated) return 'En SANZEN puedes empezar desde Inicio con "Haz tu primer pedido". Eliges pedido individual o suscripcion semanal, seleccionas platos, revisas el carrito, inicias sesion o creas tu cuenta, completas el perfil si hace falta y confirmas el pedido.';
  if (context.subscription.active) return 'Ahora puedes usar SANZEN de dos formas: hacer un pedido puntual desde el menu o gestionar tu suscripcion semanal desde Suscripcion. Ahi puedes revisar tu seleccion actual, modificarla o lanzar la renovacion semanal.';
  return 'En SANZEN puedes hacer pedidos individuales o trabajar con una suscripcion semanal. Seleccionas platos en el menu, revisas el carrito, completas perfil y pago si hace falta y confirmas el pedido desde la pantalla final.';
}
function explainFirstOrder(context) {
  if (!context.userAuthenticated) return 'Para tu primer pedido, entra desde Inicio, elige si quieres pedido individual o suscripcion semanal, selecciona platos, ve al carrito y al intentar pagar podras crear tu cuenta o iniciar sesion. Si falta algo del perfil, SANZEN te llevara a completarlo antes de confirmar.';
  if (!context.profile.profileCompleteForPayment) return 'Ya tienes cuenta, asi que tu primer pedido es mas corto: elige tipo de pedido, selecciona platos y completa los datos que falten del perfil antes de pagar.';
  return 'Como ya tienes cuenta y perfil listo, solo tienes que elegir el tipo de pedido, seleccionar platos, revisar el carrito y confirmar el pedido.';
}
function explainModesDifference() {
  return 'El pedido individual es para una compra puntual y exige un minimo de 20 EUR. La suscripcion semanal exige al menos 5 platos, guarda tu seleccion semanal y te permite revisarla, modificarla o renovarla manualmente despues.';
}
function describeAllergies(context) {
  return context.profile.allergies.length === 0 ? 'Ahora mismo no tienes alergenos seleccionados en tu perfil.' : `En tu perfil tienes seleccionados estos alergenos: ${context.profile.allergies.join(', ')}.`;
}
function describeObjective(context) {
  return context.profile.objective ? `Tu objetivo nutricional actual es ${describeObjectiveValue(context.profile.objective)}.` : 'Ahora mismo no tienes un objetivo nutricional definido en tu perfil.';
}
function describePaymentStatus(context) {
  if (!context.userAuthenticated) return 'Antes de pagar necesitas iniciar sesion o crear una cuenta.';
  return context.profile.profileCompleteForPayment ? 'Si, tu perfil ya esta completo para pagar.' : `Todavia no. Para pagar te faltan estos datos: ${naturalList(context.profile.missingPaymentFields)}.`;
}
function describeMissingFields(context) {
  if (!context.userAuthenticated) return 'Para completar el perfil o pagar primero necesitas iniciar sesion.';
  if (context.screen === 'perfil') {
    const basic = context.profile.missingBasicFields;
    const payment = context.profile.missingPaymentFields;
    if (basic.length === 0 && payment.length === 0) return 'Tu perfil ya esta completo. Los alergenos, el objetivo nutricional y las preferencias de composicion son opcionales, pero ayudan a personalizar mejor las recomendaciones.';
    const parts = [];
    if (basic.length) parts.push(`perfil basico: ${naturalList(basic)}`);
    if (payment.length) parts.push(`datos de pago: ${naturalList(payment)}`);
    return `Todavia te faltan estos datos para completar el perfil: ${parts.join(' | ')}.`;
  }
  return context.profile.missingPaymentFields.length === 0 ? 'No te falta ningun dato obligatorio para pagar.' : `Para poder pagar te faltan estos datos: ${naturalList(context.profile.missingPaymentFields)}.`;
}
function explainBlocking(context) {
  if (!context.userAuthenticated) return 'Para finalizar el pedido necesitas iniciar sesion o crear una cuenta.';
  if (!context.cart.hasItems) return 'Todavia no tienes platos en el carrito. Anade algunos platos antes de continuar con el pedido.';
  const reasons = [];
  if (context.cart.mode === 'individual' && !context.cart.meetsMinimum) reasons.push(`tu pedido individual no llega al minimo de 20 EUR y te faltan ${(20 - context.cart.total).toFixed(2)} EUR`);
  if (context.cart.mode === 'suscripcion' && !context.subscription.complete) reasons.push(`tu seleccion semanal todavia no llega al minimo de ${context.subscription.minimumItems} platos y te faltan ${Math.max(context.subscription.minimumItems - context.subscription.selectedItemCount, 0)}`);
  if (['resumen', 'perfil', 'pago'].includes(context.screen) && !context.profile.profileCompleteForPayment) reasons.push(`tu perfil todavia no esta listo para pagar porque faltan ${naturalList(context.profile.missingPaymentFields)}`);
  if (!reasons.length) return 'El pedido parece listo para continuar. Si sigues viendo un bloqueo, revisa el carrito y los datos de pago.';
  return reasons.length === 1 ? `Ahora mismo no puedes continuar porque ${reasons[0]}.` : `Ahora mismo no puedes continuar por dos motivos: ${reasons[0]} y ademas ${reasons[1]}.`;
}
function describeCart(context) {
  if (!context.cart.hasItems) return 'Ahora mismo tu carrito esta vacio.';
  const items = context.cart.items.slice(0, 4).map((item) => `${item.quantity} x ${item.name}`).join(', ');
  const kind = context.cart.mode === 'suscripcion' ? 'suscripcion' : 'pedido individual';
  const minimumState = context.cart.mode === 'individual'
    ? (context.cart.meetsMinimum ? 'Ya cumples el minimo para seguir al pago.' : `Todavia no llegas al minimo de 20 EUR. Te faltan ${(20 - context.cart.total).toFixed(2)} EUR.`)
    : (context.cart.meetsMinimum ? 'Tu seleccion semanal ya cumple el minimo de la suscripcion.' : `Todavia no llegas al minimo de ${context.subscription.minimumItems} platos para la suscripcion.`);
  return `Llevas ${context.cart.itemCount} platos en ${kind}. El total actual es ${context.cart.total.toFixed(2)} EUR. ${items ? `Tu seleccion incluye ${items}. ` : ''}${minimumState}`.trim();
}
function describeHistory(context) {
  if (!context.userAuthenticated) return 'Para resumir tus pedidos necesitas iniciar sesion.';
  if (!context.ordersSummary?.totalOrders) return 'Todavia no tienes pedidos guardados en SANZEN.';
  const recentOrders = Array.isArray(context.ordersSummary.recentOrders) ? context.ordersSummary.recentOrders : [];
  const resumenRecientes = recentOrders
    .map((order) => `${order.subscription ? 'suscripcion' : 'individual'} con entrega ${formatDate(order.deliveryDate)} por ${Number(order.total ?? 0).toFixed(2)} EUR`)
    .join(' | ');
  return `Tienes ${context.ordersSummary.totalOrders} pedidos guardados. ${resumenRecientes ? `Los mas recientes son: ${resumenRecientes}.` : ''}`.trim();
}
function describeLastOrder(context) {
  if (!context.userAuthenticated) return 'Para consultar tu ultimo pedido necesitas iniciar sesion.';
  if (!context.lastOrder) return 'Todavia no tienes pedidos guardados en SANZEN.';
  const type = context.lastOrder.subscription ? 'de suscripcion' : 'individual';
  const items = context.lastOrder.items.map((item) => `${item.quantity} x ${item.name}`).join(', ');
  return `Tu ultimo pedido fue ${type}, con entrega ${formatDate(context.lastOrder.deliveryDate)}. Incluia ${items || 'varios platos'} y un total de ${context.lastOrder.total.toFixed(2)} EUR.`;
}
function describeLastOrderType(context) {
  if (!context.userAuthenticated) return 'Para consultar tu ultimo pedido necesitas iniciar sesion.';
  if (!context.lastOrder) return 'Todavia no tienes pedidos guardados en SANZEN.';
  return context.lastOrder.subscription ? 'Tu ultimo pedido fue de suscripcion semanal.' : 'Tu ultimo pedido fue un pedido individual.';
}
function describeLastOrderDate(context) {
  if (!context.userAuthenticated) return 'Para consultar la fecha de tu ultimo pedido necesitas iniciar sesion.';
  if (!context.lastOrder) return 'Todavia no tienes pedidos guardados en SANZEN.';
  return `La entrega de tu ultimo pedido esta prevista para ${formatDate(context.lastOrder.deliveryDate)}.`;
}
function describeSubscription(context) {
  if (!context.userAuthenticated) return 'Puedes activar o gestionar tu suscripcion semanal cuando tengas una cuenta iniciada en SANZEN.';
  if (!context.subscription.active) return 'Ahora mismo no tienes una suscripcion semanal activa. Si quieres, puedes activarla desde Gestionar suscripcion.';
  const items = context.subscription.items.slice(0, 4).map((item) => `${item.quantity} x ${item.name}`).join(', ');
  const nextDelivery = context.subscription.nextDelivery ? formatDate(context.subscription.nextDelivery) : 'pendiente de calcular';
  return `Tu suscripcion esta activa para ${context.subscription.day}. Tienes ${context.subscription.selectedItemCount} platos guardados y la proxima entrega prevista es ${nextDelivery}. ${items ? `Tu seleccion actual incluye ${items}.` : ''}`.trim();
}
function explainRenewSubscription(context) {
  if (!context.userAuthenticated) return 'Para renovar tu suscripcion primero necesitas iniciar sesion.';
  if (!context.subscription.active) return 'Ahora mismo no tienes una suscripcion activa. Primero debes activarla desde Gestionar suscripcion.';
  if (!context.subscription.complete) return `Tu suscripcion todavia no esta lista para renovar porque solo tiene ${context.subscription.selectedItemCount} platos. Necesitas al menos ${context.subscription.minimumItems}.`;
  return 'Para renovar tu suscripcion, entra en Gestionar suscripcion, revisa el bloque "Tu seleccion actual" y pulsa "Renovacion semanal". Si quieres cambiar platos antes, entra en "Modificar seleccion".';
}
function explainModifySubscription(context) {
  if (!context.userAuthenticated) return 'Para modificar tu seleccion semanal primero necesitas iniciar sesion.';
  if (!context.subscription.active) return 'Ahora mismo no tienes una suscripcion activa. Si quieres una seleccion semanal, primero debes activarla.';
  return 'Para modificar tu seleccion semanal, entra en el menu de suscripcion. Alli puedes subir o bajar platos, revisar el carrito y guardar los cambios del pedido semanal.';
}
function describeNextDelivery(context) {
  if (!context.userAuthenticated) return 'Para consultar la proxima entrega de tu suscripcion necesitas iniciar sesion.';
  if (!context.subscription.active) return 'Ahora mismo no tienes una suscripcion activa.';
  return context.subscription.nextDelivery
    ? `La proxima entrega de tu suscripcion esta prevista para ${formatDate(context.subscription.nextDelivery)}.`
    : 'La proxima entrega todavia no esta calculada.';
}
function describeDeliveryDate(context) {
  if (context.screen === 'mis-pedidos' && context.lastOrder) return describeLastOrderDate(context);
  if (context.cart.mode === 'suscripcion' || context.firstOrder.mode === 'suscripcion' || context.subscription.active) return context.subscription.nextDelivery ? `La fecha prevista para tu siguiente entrega semanal es ${formatDate(context.subscription.nextDelivery)}.` : 'La fecha de entrega semanal se calcula a partir del dia seleccionado y de la ultima entrega registrada.';
  if (!context.cart.hasItems) return 'Primero necesitas anadir platos al carrito para tener una fecha de entrega prevista.';
  return 'En el pedido individual la fecha prevista se calcula con la franja seleccionada y queda reflejada en el resumen final del pedido.';
}
function compareSubscriptionVsIndividual(context) {
  if (!hasFoodProfile(context.profile)) return 'Si quieres probar solo una vez, te conviene mas el pedido individual. Si piensas pedir cada semana y quieres guardar una seleccion estable, te conviene mas la suscripcion semanal.';
  if (context.subscription.active) return 'Como ya tienes una suscripcion activa, te conviene mantenerla si sigues pidiendo cada semana. Si solo quieres una compra puntual, puedes hacer un pedido individual sin perder tu suscripcion.';
  if (context.firstOrder.mode === 'suscripcion' || context.cart.mode === 'suscripcion') return 'Ahora mismo ya estas orientando la compra hacia suscripcion. Te conviene si quieres mantener esta seleccion como base semanal y renovarla despues.';
  if (context.cart.itemCount >= 5 && context.cart.total < 20) return 'Con la seleccion actual, la suscripcion puede encajarte mejor porque ya estas cerca del minimo de 5 platos. Si solo quieres una compra puntual, sigue con pedido individual y supera los 20 EUR.';
  return 'El pedido individual es mejor si quieres una compra puntual. La suscripcion te conviene mas si sueles pedir cada semana y quieres guardar una seleccion estable.';
}
function describeProfile(context) {
  if (!hasFoodProfile(context.profile)) return context.profile.profileCompleteForPayment ? 'No veo preferencias alimentarias definidas en tu perfil. Puedes anadir alergenos, objetivo nutricional y preferencias de composicion desde Perfil para recibir recomendaciones mas precisas.' : 'Todavia no tienes un perfil alimentario definido. Puedes completarlo en Perfil con tus alergenos, objetivo nutricional y preferencias de composicion.';
  const parts = [];
  parts.push(context.profile.allergies.length ? `alergenos: ${context.profile.allergies.join(', ')}` : 'sin alergenos marcados');
  if (context.profile.objective) parts.push(`objetivo: ${describeObjectiveValue(context.profile.objective)}`);
  if (context.profile.compositionPreferences.length) parts.push(`preferencias: ${describePreferences(context.profile.compositionPreferences)}`);
  return `Tu perfil actual es: ${parts.join('; ')}.`;
}
function recommendDishes(context) {
  const dishes = getRecommendedCatalog(context);
  if (!dishes.length) return 'No veo platos claramente compatibles con tu perfil actual. Puedes revisar tus filtros o completar mejor tu perfil alimentario para afinar la recomendacion.';
  const restrictions = buildProfileRestrictionsText(context.profile);
  const names = dishes.map((dish) => `${dish.name} (${dish.price.toFixed(2)} EUR, HealthScore ${dish.healthScore})`).join(', ');
  if (context.profile.objective === 'perder-peso') return `Segun tu objetivo de perder peso${restrictions}, te recomendaria ${names}. Son opciones mas favorables por equilibrio nutricional y perfil general.`;
  if (context.profile.objective === 'masa-muscular') return `Segun tu objetivo de masa muscular${restrictions}, te recomendaria ${names}. Son platos que encajan mejor con una busqueda de mayor aporte proteico.`;
  return `Segun tu perfil actual${restrictions}, te recomendaria ${names}.`;
}

async function buildHealthSupportResponse({ message, normalizedMessage, context, history, healthQuery = null }) {
  const resolvedHealthQuery = healthQuery ?? detectHealthQuery(normalizedMessage);

  if (!resolvedHealthQuery) {
    return null;
  }

  const candidates = getHealthSupportCandidates(context, resolvedHealthQuery);

  if (!candidates.length) {
    return buildResponse(
      'No veo platos claramente compatibles con tu perfil para esa consulta. Puedes revisar tu perfil alimentario o preguntarme por alternativas mas concretas del menu.',
      [{ type: 'navigate', target: '/menu', label: 'Ver menu' }, { type: 'navigate', target: '/perfil', label: 'Ver perfil' }],
      'fallback'
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return buildResponse(
      buildHealthSupportFallbackMessage(resolvedHealthQuery, candidates, context.profile),
      [{ type: 'navigate', target: '/menu', label: 'Ver menu' }],
      'fallback'
    );
  }

  try {
    const content = await requestOpenAi({
      message,
      context,
      history,
      extraContext: buildHealthOpenAiExtraContext(resolvedHealthQuery, candidates)
    });

    const openAiResponse = buildOpenAiResponseOrNull(content, context);

    if (!openAiResponse) {
      return buildResponse(
        buildHealthSupportFallbackMessage(resolvedHealthQuery, candidates, context.profile),
        [{ type: 'navigate', target: '/menu', label: 'Ver menu' }],
        'fallback'
      );
    }

    return openAiResponse;
  } catch (error) {
    console.error('Error al resolver consulta de salud con OpenAI:', error);
    return buildResponse(
      buildHealthSupportFallbackMessage(resolvedHealthQuery, candidates, context.profile),
      [{ type: 'navigate', target: '/menu', label: 'Ver menu' }],
      'fallback'
    );
  }
}

function detectHealthQuery(message) {
  if (hasDigestiveFiberClue(message)) {
    return HEALTH_QUERY_DEFINITIONS[0];
  }

  const matchedDefinition = HEALTH_QUERY_DEFINITIONS.find((definition) => definition.pattern?.test(message) || definition.keywords.some((keyword) => message.includes(keyword)));
  if (matchedDefinition) {
    return matchedDefinition;
  }

  return GENERIC_HEALTH_PATTERNS.some((pattern) => pattern.test(message)) ? GENERIC_HEALTH_QUERY : null;
}

function hasDigestiveFiberClue(message) {
  return String(message ?? '').includes('estre') || String(message ?? '').includes('transit');
}

function getHealthSupportCandidates(context, healthQuery) {
  const compatibleCatalog = getCompatibleCatalog(context);
  if (!compatibleCatalog.length) {
    return [];
  }

  const ranking = healthQuery?.ranking ?? (healthQuery?.nutrientField ? 'highNutrient' : 'general');

  return [...compatibleCatalog]
    .sort((left, right) => compareHealthSupportDishes(left, right, context.profile, healthQuery, ranking))
    .slice(0, 4);
}

function buildHealthSupportFallbackMessage(healthQuery, candidates, profile) {
  const dishes = candidates.map((dish) => `${dish.name} (${healthQuery.key === 'estreñimiento' ? `fibra ${Number(dish.fiberG ?? 0).toFixed(1)} g, ` : ''}${dish.price.toFixed(2)} EUR)`).join(', ');
  const profileText = buildProfileSupportText(profile);
  if (healthQuery.key === 'estreñimiento') {
    return `Sin sustituir una indicacion medica, para una consulta como ${healthQuery.key} te sugeriria priorizar platos compatibles con mas fibra y buena ligereza${profileText}. En el menu te encajan especialmente ${dishes}. Si el problema persiste, conviene consultarlo con un profesional.`;
  }

  if (Array.isArray(healthQuery.dataLimitations) && healthQuery.dataLimitations.length) {
    return `No tengo una base suficientemente fiable para responder con precision a esa consulta medica usando solo los datos de SANZEN${profileText}. ${healthQuery.dataLimitations.join(' ')} Si quieres, puedo orientarte de forma general con platos compatibles como ${dishes}, o ayudarte con recomendaciones segun tu perfil y el uso de la app.`;
  }

  return `Sin sustituir una indicacion medica, estas opciones del menu encajan mejor con esa consulta${profileText}: ${dishes}.`;
}

function compareHealthSupportDishes(left, right, profile, healthQuery, ranking) {
  if (ranking === 'highFiber') {
    const fiberDelta = Number(right.fiberG ?? 0) - Number(left.fiberG ?? 0);
    if (fiberDelta !== 0) {
      return fiberDelta;
    }
  }

  if (ranking === 'lowFatHighFiber') {
    const fatDelta = Number(left.fatG ?? 0) - Number(right.fatG ?? 0);
    if (fatDelta !== 0) {
      return fatDelta;
    }

    const fiberDelta = Number(right.fiberG ?? 0) - Number(left.fiberG ?? 0);
    if (fiberDelta !== 0) {
      return fiberDelta;
    }
  }

  if (ranking === 'highNutrient' && healthQuery?.nutrientField) {
    const nutrientDelta = Number(right[healthQuery.nutrientField] ?? 0) - Number(left[healthQuery.nutrientField] ?? 0);
    if (nutrientDelta !== 0) {
      return nutrientDelta;
    }
  }

  return scoreDish(right, profile) - scoreDish(left, profile);
}

function buildSafeRecommendationFallback(message, context, source) {
  if (!detectHealthQuery(message) && !isOpenRecommendationQuestion(message)) {
    return null;
  }

  return buildResponse(
    'No tengo una respuesta fiable para esa consulta concreta en este momento. Si quieres, puedo ayudarte a recomendar platos segun tu perfil, alergenos y objetivo nutricional, o explicarte como funciona la app.',
    [{ type: 'navigate', target: '/menu', label: 'Ver menu' }, { type: 'navigate', target: '/como-funciona', label: 'Como funciona' }],
    source
  );
}

function buildStructuredCatalogResponse(message, context, source) {
  const query = parseStructuredCatalogQuery(message);

  if (!query) {
    return null;
  }

  const allCatalogMatches = context.catalog.filter((dish) => matchesStructuredCatalogQuery(dish, query));
  const compatibleCatalogMatches = getCompatibleCatalog(context).filter((dish) => matchesStructuredCatalogQuery(dish, query));

  if (!allCatalogMatches.length) {
    return buildResponse(
      `No encuentro platos del menu actual ${describeCatalogQuery(query)}.`,
      [{ type: 'navigate', target: '/menu', label: 'Ver menu' }],
      source
    );
  }

  if (!compatibleCatalogMatches.length) {
    return buildResponse(
      `He encontrado platos del menu ${describeCatalogQuery(query)}, pero ninguno es compatible con tu perfil actual y tus alergenos seleccionados.`,
      [{ type: 'navigate', target: '/perfil', label: 'Ver perfil' }, { type: 'navigate', target: '/menu', label: 'Ver menu' }],
      source
    );
  }

  const rankedMatches = orderStructuredCatalogMatches(compatibleCatalogMatches, query, context.profile).slice(0, 3);
  return buildResponse(
    describeStructuredCatalogResult(query, rankedMatches, context.profile),
    [{ type: 'navigate', target: '/menu', label: 'Ver menu' }],
    source
  );
}

function parseStructuredCatalogQuery(message) {
  if (isOpenRecommendationQuestion(message) || detectHealthQuery(message)) {
    return null;
  }

  const nutrientQuery = detectNutrientQuery(message);
  const specialQuery = detectSpecialCatalogQuery(message);
  const includeTerms = extractCatalogTerms(message, nutrientQuery, false);
  const excludeTerms = extractCatalogTerms(message, nutrientQuery, true);

  if (!nutrientQuery && includeTerms.length === 0 && excludeTerms.length === 0 && !specialQuery.vegetarian && !specialQuery.dinner && !specialQuery.light) {
    return null;
  }

  if (!mentionsCatalogScope(message) && !nutrientQuery && includeTerms.length === 0 && excludeTerms.length === 0 && !specialQuery.vegetarian && !specialQuery.dinner && !specialQuery.light) {
    return null;
  }

  return {
    nutrientQuery,
    includeTerms,
    excludeTerms,
    vegetarian: specialQuery.vegetarian,
    dinner: specialQuery.dinner,
    light: specialQuery.light
  };
}

function detectSpecialCatalogQuery(message) {
  return {
    vegetarian: /\bvegetarian[oa]s?\b|\bvegano?s?\b/.test(message),
    dinner: /\bcenar\b|\bcena\b/.test(message),
    light: /\bliger[oa]s?\b|\blight\b/.test(message)
  };
}

function getOpenRecommendationCandidates(message, context) {
  const nutrientQuery = detectNutrientQuery(message);
  const specialQuery = detectSpecialCatalogQuery(message);
  const includeTerms = extractCatalogTerms(message, nutrientQuery, false);
  const excludeTerms = extractCatalogTerms(message, nutrientQuery, true);
  const query = {
    nutrientQuery,
    includeTerms,
    excludeTerms,
    vegetarian: specialQuery.vegetarian,
    dinner: specialQuery.dinner,
    light: specialQuery.light
  };

  let candidates = getCompatibleCatalog(context);

  if (query.vegetarian || query.dinner || query.light || query.includeTerms.length || query.excludeTerms.length || query.nutrientQuery) {
    candidates = candidates.filter((dish) => matchesStructuredCatalogQuery(dish, query));
  }

  if (!candidates.length) {
    candidates = getCompatibleCatalog(context);
  }

  return orderStructuredCatalogMatches(candidates, query, context.profile).slice(0, 4);
}

function detectNutrientQuery(message) {
  for (const definition of NUTRIENT_QUERY_DEFINITIONS) {
    if (definition.keywords.some((keyword) => message.includes(keyword))) {
      return {
        field: definition.field,
        label: definition.label,
        direction: detectNutrientDirection(message, definition.defaultDirection)
      };
    }
  }

  return null;
}

function detectNutrientDirection(message, fallbackDirection) {
  if (/(bajo|baja|bajos|bajas|menos|poco|poca)\s+(contenido\s+en\s+)?(fibra|proteina|proteinas|grasa|grasas|carbohidrato|carbohidratos|hidrato|hidratos)/.test(message)) {
    return 'low';
  }

  if (/(alto|alta|altos|altas|rico|rica|ricos|ricas|mas|mucho|mucha)\s+(contenido\s+en\s+)?(fibra|proteina|proteinas|grasa|grasas|carbohidrato|carbohidratos|hidrato|hidratos)/.test(message)) {
    return 'high';
  }

  return fallbackDirection;
}

function extractCatalogTerms(message, nutrientQuery, exclude) {
  const sanitizedMessage = nutrientQuery ? stripNutrientFragments(message) : message;
  const terms = [];
  const patterns = exclude
    ? [/\bsin\s+([a-z0-9áéíóúñü,\s-]+)/g]
    : [
        /\b(?:lleven|lleva|tengan|tenga|contengan|contenga|incluyan|incluya)\s+([a-z0-9áéíóúñü,\s-]+)/g,
        /\b(?:platos?|menu)\s+con\s+([a-z0-9áéíóúñü,\s-]+)/g,
        /\bcon\s+([a-z0-9áéíóúñü-]+)\b/g
      ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(sanitizedMessage)) !== null) {
      for (const term of splitCatalogTerms(match[1])) {
        if (term && !terms.includes(term)) {
          terms.push(term);
        }
      }
    }
  }

  return terms;
}

function stripNutrientFragments(message) {
  return message
    .replace(/\b(?:alto|alta|altos|altas|bajo|baja|bajos|bajas|rico|rica|ricos|ricas|mucho|mucha|mas|menos|poco|poca)\s+(?:contenido\s+en\s+)?(?:fibra|proteina|proteinas|grasa|grasas|carbohidrato|carbohidratos|hidrato|hidratos)\b/g, ' ')
    .replace(/\b(?:fibra|proteina|proteinas|grasa|grasas|carbohidrato|carbohidratos|hidrato|hidratos)\b/g, ' ');
}

function splitCatalogTerms(fragment) {
  return String(fragment ?? '')
    .split(/,| y /)
    .map((term) => normalizarMensaje(term))
    .map((term) => term.replace(/^(de|del|la|las|el|los)\s+/, '').trim())
    .map((term) => term.replace(/\bpara\s+(cenar|cena)\b/g, '').trim())
    .map((term) => term.replace(/\b(menu|platos?|que|lleven|lleva|tengan|tenga|contengan|contenga|incluyan|incluya)\b/g, '').trim())
    .map((term) => term.replace(/\bvegetarian[oa]s?\b|\bvegano?s?\b/g, '').trim())
    .filter((term) => term.length >= 2 && !isPureQuestionBoilerplate(term));
}

function isPureQuestionBoilerplate(term) {
  return ['hay', 'haya', 'dime', 'quiero', 'busco', 'actual'].includes(term);
}

function mentionsCatalogScope(message) {
  return message.includes('menu') || message.includes('plato') || message.includes('platos') || message.includes('lleven') || message.includes('tengan') || message.includes('sin ') || message.includes('cena') || message.includes('cenar') || message.includes('vegetar');
}

function matchesStructuredCatalogQuery(dish, query) {
  if (query.vegetarian && !isVegetarianDish(dish)) {
    return false;
  }

  if (query.includeTerms.some((term) => !dishMatchesCatalogTerm(dish, term, false))) {
    return false;
  }

  if (query.excludeTerms.some((term) => dishMatchesCatalogTerm(dish, term, true))) {
    return false;
  }

  return true;
}

function dishMatchesCatalogTerm(dish, term, negativeSearch) {
  const normalizedTerm = normalizarMensaje(term);
  const allergenAlias = ALLERGEN_ALIASES[normalizedTerm];
  const allergens = new Set((dish.allergens ?? []).map(normalizeComparisonKey));

  if (allergenAlias) {
    return allergens.has(allergenAlias);
  }

  const searchableText = buildDishSearchText(dish);
  return negativeSearch ? searchableText.includes(normalizedTerm) : searchableText.includes(normalizedTerm);
}

function buildDishSearchText(dish) {
  return normalizarMensaje([
    dish.name,
    dish.description,
    ...(dish.allergens ?? [])
  ].filter(Boolean).join(' '));
}

function orderStructuredCatalogMatches(dishes, query, profile) {
  return [...dishes].sort((left, right) => {
    if (query.light) {
      const caloriesDelta = Number(left.calories ?? 0) - Number(right.calories ?? 0);
      if (caloriesDelta !== 0) {
        return caloriesDelta;
      }
    }

    if (query.dinner) {
      const dinnerDelta = Number(isDinnerFriendlyDish(right)) - Number(isDinnerFriendlyDish(left));
      if (dinnerDelta !== 0) {
        return dinnerDelta;
      }
    }

    if (query.nutrientQuery) {
      const field = query.nutrientQuery.field;
      const leftValue = Number(left[field] ?? 0);
      const rightValue = Number(right[field] ?? 0);
      const nutrientDelta = query.nutrientQuery.direction === 'low'
        ? leftValue - rightValue
        : rightValue - leftValue;

      if (nutrientDelta !== 0) {
        return nutrientDelta;
      }
    }

    return scoreDish(right, profile) - scoreDish(left, profile);
  });
}

function describeStructuredCatalogResult(query, dishes, profile) {
  const intro = buildStructuredCatalogIntro(query, profile);
  const details = dishes.map((dish) => formatStructuredDish(dish, query)).join(', ');
  return `${intro} ${details}.`;
}

function buildStructuredCatalogIntro(query, profile) {
  const profileParts = [];

  if ((profile.allergies ?? []).length) {
    profileParts.push('evitando alergenos incompatibles');
  }

  if (profile.objective) {
    profileParts.push(`alineados con tu objetivo de ${describeObjectiveValue(profile.objective)}`);
  }

  if ((profile.compositionPreferences ?? []).length) {
    profileParts.push(`priorizando ${describePreferences(profile.compositionPreferences)}`);
  }

  const profileText = profileParts.length ? ` y teniendo en cuenta tu perfil (${profileParts.join(', ')})` : '';

  if (query.vegetarian && query.dinner) {
    return `Los platos vegetarianos del menu que mejor encajan para cenar${profileText} son`;
  }

  if (query.vegetarian && query.light) {
    return `Los platos vegetarianos mas ligeros del menu que mejor encajan contigo${profileText} son`;
  }

  if (query.vegetarian) {
    return `Los platos vegetarianos del menu que mejor encajan contigo${profileText} son`;
  }

  if (query.light && query.dinner && query.nutrientQuery) {
    const amountText = query.nutrientQuery.direction === 'low' ? `con menos ${query.nutrientQuery.label}` : `con mas ${query.nutrientQuery.label}`;
    return `Los platos del menu mas ligeros, para cenar y ${amountText} que mejor encajan contigo${profileText} son`;
  }

  if (query.light && query.dinner) {
    return `Los platos del menu mas ligeros que mejor encajan para cenar${profileText} son`;
  }

  if (query.dinner && query.nutrientQuery) {
    const amountText = query.nutrientQuery.direction === 'low' ? `con menos ${query.nutrientQuery.label}` : `con mas ${query.nutrientQuery.label}`;
    return `Los platos del menu para cenar y ${amountText} que mejor encajan contigo${profileText} son`;
  }

  if (query.dinner && query.includeTerms.length) {
    return `Los platos del menu ${describeCatalogTerms(query.includeTerms, false)} que mejor encajan para cenar${profileText} son`;
  }

  if (query.dinner && query.excludeTerms.length) {
    return `Los platos del menu ${describeCatalogTerms(query.excludeTerms, true)} que mejor encajan para cenar${profileText} son`;
  }

  if (query.dinner) {
    return `Los platos del menu que mejor encajan para cenar${profileText} son`;
  }

  if (query.light && query.nutrientQuery) {
    const amountText = query.nutrientQuery.direction === 'low' ? `con menos ${query.nutrientQuery.label}` : `con mas ${query.nutrientQuery.label}`;
    return `Los platos del menu mas ligeros y ${amountText} que mejor encajan contigo${profileText} son`;
  }

  if (query.light && query.includeTerms.length) {
    return `Los platos del menu ${describeCatalogTerms(query.includeTerms, false)} y mas ligeros que mejor encajan contigo${profileText} son`;
  }

  if (query.light && query.excludeTerms.length) {
    return `Los platos del menu ${describeCatalogTerms(query.excludeTerms, true)} y mas ligeros que mejor encajan contigo${profileText} son`;
  }

  if (query.light) {
    return `Los platos del menu mas ligeros que mejor encajan contigo${profileText} son`;
  }

  if (query.nutrientQuery) {
    const amountText = query.nutrientQuery.direction === 'low' ? `con menos ${query.nutrientQuery.label}` : `con mas ${query.nutrientQuery.label}`;
    if (query.includeTerms.length) {
      return `Los platos del menu ${describeCatalogTerms(query.includeTerms, false)} y ${amountText} que mejor encajan contigo${profileText} son`;
    }

    return `Los platos del menu ${amountText} que mejor encajan contigo${profileText} son`;
  }

  if (query.includeTerms.length) {
    return `Los platos del menu ${describeCatalogTerms(query.includeTerms, false)} que mejor encajan contigo${profileText} son`;
  }

  if (query.excludeTerms.length) {
    return `Los platos del menu ${describeCatalogTerms(query.excludeTerms, true)} que mejor encajan contigo${profileText} son`;
  }

  return `Estos platos del menu encajan bien contigo${profileText}:`;
}

function formatStructuredDish(dish, query) {
  if (query.nutrientQuery) {
    const nutrientValue = Number(dish[query.nutrientQuery.field] ?? 0).toFixed(1);
    return `${dish.name} (${query.nutrientQuery.label} ${nutrientValue} g, ${dish.price.toFixed(2)} EUR, HealthScore ${dish.healthScore})`;
  }

  return `${dish.name} (${dish.price.toFixed(2)} EUR, HealthScore ${dish.healthScore})`;
}

function describeCatalogQuery(query) {
  if (query.vegetarian && query.dinner) {
    return 'vegetarianos y adecuados para cenar';
  }

  if (query.vegetarian && query.light) {
    return 'vegetarianos y mas ligeros';
  }

  if (query.light && query.dinner && query.includeTerms.length) {
    return `${describeCatalogTerms(query.includeTerms, false)} y mas ligeros, adecuados para cenar`;
  }

  if (query.light && query.dinner && query.excludeTerms.length) {
    return `${describeCatalogTerms(query.excludeTerms, true)} y mas ligeros, adecuados para cenar`;
  }

  if (query.light && query.dinner) {
    return 'mas ligeros y adecuados para cenar';
  }

  if (query.vegetarian) {
    return 'vegetarianos';
  }

  if (query.dinner && query.includeTerms.length) {
    return `${describeCatalogTerms(query.includeTerms, false)} y adecuados para cenar`;
  }

  if (query.dinner && query.excludeTerms.length) {
    return `${describeCatalogTerms(query.excludeTerms, true)} y adecuados para cenar`;
  }

  if (query.dinner) {
    return 'adecuados para cenar';
  }

  if (query.light && query.nutrientQuery) {
    return `mas ligeros y ${query.nutrientQuery.direction === 'low' ? 'con menos' : 'con mas'} ${query.nutrientQuery.label}`;
  }

  if (query.light && query.includeTerms.length) {
    return `${describeCatalogTerms(query.includeTerms, false)} y mas ligeros`;
  }

  if (query.light && query.excludeTerms.length) {
    return `${describeCatalogTerms(query.excludeTerms, true)} y mas ligeros`;
  }

  if (query.light) {
    return 'mas ligeros';
  }

  if (query.nutrientQuery && query.includeTerms.length) {
    return `${describeCatalogTerms(query.includeTerms, false)} y ${query.nutrientQuery.direction === 'low' ? 'con menos' : 'con mas'} ${query.nutrientQuery.label}`;
  }

  if (query.nutrientQuery) {
    return `${query.nutrientQuery.direction === 'low' ? 'con menos' : 'con mas'} ${query.nutrientQuery.label}`;
  }

  if (query.includeTerms.length) {
    return describeCatalogTerms(query.includeTerms, false);
  }

  if (query.excludeTerms.length) {
    return describeCatalogTerms(query.excludeTerms, true);
  }

  return 'que coincidan con tu busqueda';
}

function describeCatalogTerms(terms, negative) {
  const text = naturalList(terms);
  return negative ? `sin ${text}` : `que llevan ${text}`;
}

function firstOrderActions(context) {
  if (!context.userAuthenticated) return [{ type: 'navigate', target: '/menu', label: 'Ver menu' }, { type: 'navigate', target: '/login', label: 'Iniciar sesion' }];
  return !context.profile.profileCompleteForPayment ? [{ type: 'navigate', target: '/perfil', label: 'Completar perfil' }] : [{ type: 'navigate', target: '/menu', label: 'Ver menu' }];
}
function paymentActions(context) {
  if (!context.userAuthenticated) return [{ type: 'navigate', target: '/login', label: 'Iniciar sesion' }];
  return context.profile.profileCompleteForPayment ? [{ type: 'navigate', target: '/pago', label: 'Ir al pago' }] : [{ type: 'navigate', target: '/perfil', label: 'Completar perfil' }];
}
function missingFieldsActions(context) {
  if (!context.userAuthenticated) return [{ type: 'navigate', target: '/login', label: 'Iniciar sesion' }];
  return [{ type: 'navigate', target: '/perfil', label: 'Completar perfil' }];
}
function blockingActions(context) {
  if (!context.userAuthenticated) return [{ type: 'navigate', target: '/login', label: 'Iniciar sesion' }];
  const actions = [];
  if (['resumen', 'perfil', 'pago'].includes(context.screen) && !context.profile.profileCompleteForPayment) actions.push({ type: 'navigate', target: '/perfil', label: 'Completar perfil' });
  if (!context.cart.hasItems || (context.cart.mode === 'individual' && !context.cart.meetsMinimum)) actions.push({ type: 'navigate', target: '/menu', label: 'Ver menu' });
  if (context.cart.mode === 'suscripcion' && !context.subscription.complete) actions.push({ type: 'navigate', target: '/menu?subscriptionSelection=1', label: 'Completar suscripcion' });
  if (!actions.length) actions.push({ type: 'navigate', target: '/resumen', label: 'Ver carrito' });
  return actions.slice(0, 2);
}
function subscriptionActions(context) {
  if (!context.userAuthenticated) return [{ type: 'navigate', target: '/login', label: 'Iniciar sesion' }];
  if (!context.subscription.active) return [{ type: 'navigate', target: '/suscripcion', label: 'Gestionar suscripcion' }, { type: 'navigate', target: '/como-funciona', label: 'Como funciona' }];
  return [{ type: 'navigate', target: '/suscripcion', label: 'Gestionar suscripcion' }, { type: 'navigate', target: '/menu?subscriptionSelection=1', label: 'Modificar seleccion' }];
}
function deliveryActions(context) {
  if (context.screen === 'suscripcion' || context.subscription.active) return subscriptionActions(context);
  return [{ type: 'navigate', target: context.screen === 'pago' ? '/pago' : '/resumen', label: context.screen === 'pago' ? 'Ir al pago' : 'Ver carrito' }];
}
function lastOrderActions(context) {
  return context.userAuthenticated ? [{ type: 'navigate', target: '/mis-pedidos', label: 'Ver mis pedidos' }] : [{ type: 'navigate', target: '/login', label: 'Iniciar sesion' }];
}

function defaultMessage(context) {
  switch (context.screen) {
    case 'menu':
      return 'Puedo ayudarte a elegir platos, comparar suscripcion e individual o explicarte por que no puedes continuar desde este menu.';
    case 'resumen':
      return 'Puedo resumirte tu carrito, decirte que te falta para continuar y orientarte hacia el siguiente paso.';
    case 'pago':
      return 'Puedo explicarte que dato te falta, revisar el resumen del pedido o indicarte si el perfil esta listo para pagar.';
    case 'suscripcion':
      return 'Puedo resumirte tu suscripcion actual, explicarte como renovarla o decirte cuando sera la proxima entrega.';
    case 'mis-pedidos':
      return 'Puedo resumirte tu ultimo pedido o ayudarte a revisar pedidos anteriores desde esta pantalla.';
    default:
      return 'Puedo ayudarte a elegir platos, entender tu suscripcion, revisar bloqueos del pedido o resumirte tu ultimo pedido.';
  }
}
function defaultActions(context) {
  switch (context.screen) {
    case 'suscripcion':
      return [{ type: 'navigate', target: '/suscripcion', label: 'Gestionar suscripcion' }, { type: 'navigate', target: '/menu?subscriptionSelection=1', label: 'Modificar seleccion' }];
    case 'pago':
      return [{ type: 'navigate', target: '/perfil', label: 'Ver perfil' }, { type: 'navigate', target: '/resumen', label: 'Ver carrito' }];
    case 'mis-pedidos':
      return [{ type: 'navigate', target: '/mis-pedidos', label: 'Ver mis pedidos' }, { type: 'navigate', target: '/menu', label: 'Ver menu' }];
    default:
      return [{ type: 'navigate', target: '/menu', label: 'Ver menu' }, { type: 'navigate', target: '/como-funciona', label: 'Como funciona' }];
  }
}

function sanitizeTarget(target) {
  const normalized = target.trim();
  if (ALLOWED_TARGETS.includes(normalized)) return normalized;
  if (normalized.startsWith('/menu?subscriptionSelection=1')) return '/menu?subscriptionSelection=1';
  return null;
}
function buildLabelForTarget(target) {
  const normalized = sanitizeTarget(target);
  switch (normalized) {
    case '/menu': return 'Ver menu';
    case '/menu?subscriptionSelection=1': return 'Modificar seleccion';
    case '/suscripcion': return 'Gestionar suscripcion';
    case '/perfil': return 'Completar perfil';
    case '/pago': return 'Ir al pago';
    case '/mis-pedidos': return 'Ver mis pedidos';
    case '/resumen': return 'Ver carrito';
    case '/como-funciona': return 'Como funciona';
    case '/login': return 'Iniciar sesion';
    case '/inicio': return 'Ir a Inicio';
    default: return 'Abrir';
  }
}

function hasFoodProfile(profile) {
  return Boolean((profile.allergies ?? []).length || profile.objective || (profile.compositionPreferences ?? []).length);
}
function describeObjectiveValue(value) {
  if (value === 'perder-peso') return 'perder peso';
  if (value === 'masa-muscular') return 'ganar masa muscular';
  return value;
}
function describePreferences(items) {
  return items.map((item) => {
    if (item === 'ricos-proteina') return 'ricos en proteina';
    if (item === 'bajos-grasas') return 'bajos en grasas';
    if (item === 'bajos-carbohidratos') return 'bajos en carbohidratos';
    return item;
  }).join(', ');
}
function buildProfileRestrictionsText(profile) {
  return Array.isArray(profile.allergies) && profile.allergies.length ? ` y evitando alergenos incompatibles como ${profile.allergies.join(', ')}` : '';
}
function buildProfileSupportText(profile) {
  const parts = [];
  if (Array.isArray(profile.allergies) && profile.allergies.length) {
    parts.push('evitando alergenos incompatibles');
  }
  if (profile.objective) {
    parts.push(`alineado con tu objetivo de ${describeObjectiveValue(profile.objective)}`);
  }
  if (Array.isArray(profile.compositionPreferences) && profile.compositionPreferences.length) {
    parts.push(`priorizando ${describePreferences(profile.compositionPreferences)}`);
  }
  return parts.length ? ` y teniendo en cuenta tu perfil (${parts.join(', ')})` : '';
}
function naturalList(items) {
  const values = Array.isArray(items) ? items.filter((item) => typeof item === 'string' && item.trim() !== '').map((item) => item.trim()) : [];
  if (!values.length) return 'ningun dato';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} y ${values[1]}`;
  return `${values.slice(0, -1).join(', ')} y ${values[values.length - 1]}`;
}
function normalizeComparisonKey(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}
function isCompatibleWithProfile(dish, profile) {
  const allergies = new Set((profile.allergies ?? []).map(normalizeComparisonKey));
  if (!allergies.size) return true;
  return !dish.allergens.some((allergen) => allergies.has(normalizeComparisonKey(allergen)));
}
function isVegetarianDish(dish) {
  const searchableText = buildDishSearchText(dish);
  return !VEGETARIAN_DISALLOWED_TERMS.some((term) => searchableText.includes(term));
}
function isDinnerFriendlyDish(dish) {
  const category = normalizeComparisonKey(dish.category);
  if (category === 'postre') {
    return false;
  }
  return Number(dish.calories ?? 0) <= 420;
}
function getCompatibleCatalog(context) {
  return context.catalog.filter((dish) => isCompatibleWithProfile(dish, context.profile));
}
function scoreDish(dish, profile) {
  let score = dish.healthScore * 10;
  if (profile.objective === 'perder-peso') score += Math.max(500 - dish.calories, 0);
  if (profile.objective === 'masa-muscular') {
    score += dish.category === 'Principal' ? 80 : 0;
    score += Math.max(100 - dish.calories / 10, 0);
  }
  if (profile.compositionPreferences.includes('ricos-proteina')) score += dish.category === 'Principal' ? 60 : 10;
  if (profile.compositionPreferences.includes('bajos-grasas')) score += Math.max(80 - dish.calories / 8, 0);
  if (profile.compositionPreferences.includes('bajos-carbohidratos')) score += dish.category !== 'Postre' ? 40 : -20;
  return score;
}
function getRecommendedCatalog(context) {
  return getCompatibleCatalog(context).sort((a, b) => scoreDish(b, context.profile) - scoreDish(a, context.profile)).slice(0, 3);
}
function formatDate(value) {
  if (!value) return 'sin fecha disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'sin fecha disponible';
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
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
