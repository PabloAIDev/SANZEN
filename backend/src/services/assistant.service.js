const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_TEXT_LENGTH = 400;

const ALLOWED_TARGETS = [
  '/inicio',
  '/menu',
  '/resumen',
  '/pago',
  '/perfil',
  '/suscripcion',
  '/mis-pedidos',
  '/como-funciona',
  '/login'
];

async function generateAssistantResponse({ message, context, history = [] }) {
  const sanitizedHistory = normalizeHistory(history);

  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackResponse(message, context, sanitizedHistory, 'fallback');
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.35,
        response_format: {
          type: 'json_object'
        },
        messages: buildOpenAiMessages({
          message,
          context,
          history: sanitizedHistory
        })
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de OpenAI:', response.status, errorText);
      return buildFallbackResponse(message, context, sanitizedHistory, 'fallback');
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || content.trim() === '') {
      return buildFallbackResponse(message, context, sanitizedHistory, 'fallback');
    }

    return sanitizeAssistantResponse(parseAssistantJson(content), context, 'openai');
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error);
    return buildFallbackResponse(message, context, sanitizedHistory, 'fallback');
  }
}

function buildOpenAiMessages({ message, context, history }) {
  return [
    {
      role: 'system',
      content: buildSystemPrompt()
    },
    {
      role: 'user',
      content: JSON.stringify({
        context: buildModelContext(context)
      })
    },
    ...history.map((entry) => ({
      role: entry.role,
      content: entry.text
    })),
    {
      role: 'user',
      content: message.trim()
    }
  ];
}

function buildSystemPrompt() {
  return [
    'Eres el asistente virtual de SANZEN, una app de comida asiatica saludable.',
    'Responde siempre en espanol, con tono claro, breve y practico.',
    'Usa el contexto actual y la conversacion reciente para entender preguntas encadenadas.',
    'No inventes datos, no digas que has ejecutado acciones y no cambies pedidos, perfiles ni pagos.',
    'Solo puedes sugerir navegacion cuando realmente ayude al usuario.',
    'Reglas de SANZEN:',
    '- Pedido individual: minimo de 20 EUR.',
    '- Suscripcion semanal: minimo de 5 platos.',
    '- Si falta perfil completo para pago, el usuario debe completarlo antes de confirmar.',
    '- La suscripcion semanal puede revisarse, modificarse o renovarse manualmente.',
    '- La fecha de entrega semanal debe respetar pedidos anteriores.',
    'Si recomiendas platos, menciona como maximo 3 opciones concretas y una razon breve.',
    'Si el usuario pregunta por un bloqueo, explica el motivo exacto antes de sugerir una accion.',
    'Si la pregunta es general, no repitas una introduccion larga; responde directo.',
    'Devuelve siempre un JSON valido con esta forma:',
    '{ "message": "texto", "actions": [{ "type": "navigate", "target": "/ruta", "label": "Texto" }] }',
    'No anadas texto fuera del JSON.'
  ].join('\n');
}

function buildModelContext(context) {
  return {
    screen: context.screen,
    userAuthenticated: context.userAuthenticated,
    user: context.user
      ? {
          name: context.user.name,
          email: context.user.email
        }
      : null,
    profile: {
      name: context.profile.name,
      allergies: context.profile.allergies,
      objective: context.profile.objective,
      compositionPreferences: context.profile.compositionPreferences,
      profileCompleteForPayment: context.profile.profileCompleteForPayment
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
    catalog: context.catalog.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      calories: item.calories,
      healthScore: item.healthScore,
      allergens: item.allergens
    })),
    appRules: context.appRules
  };
}

function parseAssistantJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      return {};
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
}

function sanitizeAssistantResponse(response, context, source) {
  const message = typeof response?.message === 'string' && response.message.trim() !== ''
    ? response.message.trim()
    : buildFallbackResponse('', context, [], source).message;

  const actions = Array.isArray(response?.actions)
    ? response.actions
        .filter((action) => action && action.type === 'navigate' && typeof action.target === 'string')
        .map((action) => ({
          type: 'navigate',
          target: sanitizeTarget(action.target),
          label: typeof action.label === 'string' && action.label.trim() !== ''
            ? action.label.trim()
            : buildLabelForTarget(action.target)
        }))
        .filter((action) => action.target !== null)
        .slice(0, 2)
    : [];

  return {
    message,
    actions,
    source
  };
}

function sanitizeTarget(target) {
  const normalized = target.trim();

  if (ALLOWED_TARGETS.includes(normalized)) {
    return normalized;
  }

  if (normalized.startsWith('/menu?subscriptionSelection=1')) {
    return '/menu?subscriptionSelection=1';
  }

  return null;
}

function buildLabelForTarget(target) {
  const normalized = sanitizeTarget(target);

  switch (normalized) {
    case '/menu':
      return 'Ir al menú';
    case '/menu?subscriptionSelection=1':
      return 'Modificar selección';
    case '/suscripcion':
      return 'Gestionar suscripción';
    case '/perfil':
      return 'Completar perfil';
    case '/pago':
      return 'Ir al pago';
    case '/mis-pedidos':
      return 'Ver mis pedidos';
    case '/resumen':
      return 'Ver carrito';
    case '/como-funciona':
      return 'Cómo funciona';
    case '/login':
      return 'Iniciar sesión';
    case '/inicio':
      return 'Ir a Inicio';
    default:
      return 'Abrir';
  }
}

function buildFallbackResponse(message, context, history, source) {
  const normalizedMessage = normalizarMensaje(resolveMessageWithHistory(message, history));

  if (preguntaPorBloqueo(normalizedMessage)) {
    return {
      message: responderBloqueo(context),
      actions: accionesParaBloqueo(context),
      source
    };
  }

  if (normalizedMessage.includes('resume mi carrito') || normalizedMessage.includes('resume mi pedido')) {
    return {
      message: responderCarrito(context),
      actions: [{ type: 'navigate', target: '/resumen', label: 'Ver carrito' }],
      source
    };
  }

  if (normalizedMessage.includes('resume mis pedidos')) {
    return {
      message: responderHistorial(context),
      actions: context.userAuthenticated
        ? [{ type: 'navigate', target: '/mis-pedidos', label: 'Ver mis pedidos' }]
        : [{ type: 'navigate', target: '/login', label: 'Iniciar sesión' }],
      source
    };
  }

  if (normalizedMessage.includes('último pedido') || normalizedMessage.includes('ultimo pedido')) {
    return {
      message: responderUltimoPedido(context),
      actions: context.userAuthenticated
        ? [{ type: 'navigate', target: '/mis-pedidos', label: 'Ver mis pedidos' }]
        : [{ type: 'navigate', target: '/login', label: 'Iniciar sesión' }],
      source
    };
  }

  if (
    normalizedMessage.includes('suscripción actual') ||
    normalizedMessage.includes('suscripcion actual') ||
    normalizedMessage.includes('renovar')
  ) {
    return {
      message: responderSuscripcion(context),
      actions: accionesSuscripcion(context),
      source
    };
  }

  if (
    normalizedMessage.includes('suscripción o pedido individual') ||
    normalizedMessage.includes('suscripcion o pedido individual') ||
    normalizedMessage.includes('me conviene')
  ) {
    return {
      message: compararSuscripcionVsIndividual(context),
      actions: [
        { type: 'navigate', target: '/menu', label: 'Ver menú' },
        { type: 'navigate', target: '/suscripcion', label: 'Gestionar suscripción' }
      ],
      source
    };
  }

  if (
    normalizedMessage.includes('recomi') ||
    normalizedMessage.includes('qué plato') ||
    normalizedMessage.includes('que plato')
  ) {
    return {
      message: recomendarPlatos(context),
      actions: [{ type: 'navigate', target: '/menu', label: 'Ver menú' }],
      source
    };
  }

  return {
    message:
      buildDefaultMessage(context),
    actions: buildDefaultActions(context),
    source
  };
}

function normalizarMensaje(message) {
  return String(message ?? '').trim().toLowerCase();
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

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

  if (!isFollowUpMessage(currentMessage)) {
    return currentMessage;
  }

  const previousUserTurn = [...history].reverse().find((entry) => entry.role === 'user');

  if (!previousUserTurn) {
    return currentMessage;
  }

  return `${previousUserTurn.text} ${currentMessage}`;
}

function isFollowUpMessage(message) {
  const normalizedMessage = normalizarMensaje(message);

  return normalizedMessage.length <= 40 ||
    normalizedMessage.startsWith('y ') ||
    normalizedMessage.startsWith('entonces') ||
    normalizedMessage.startsWith('y si') ||
    normalizedMessage.startsWith('si ') ||
    normalizedMessage.startsWith('vale') ||
    normalizedMessage.startsWith('perfecto');
}

function preguntaPorBloqueo(message) {
  return message.includes('por qué no puedo') ||
    message.includes('por que no puedo') ||
    message.includes('no puedo continuar') ||
    message.includes('no me deja');
}

function responderBloqueo(context) {
  if (!context.cart.hasItems) {
    return 'Todavía no tienes platos en el carrito. Añade algunos platos antes de continuar con el pedido.';
  }

  if (context.cart.mode === 'individual' && !context.cart.meetsMinimum) {
    const missing = Number((20 - context.cart.total).toFixed(2));
    return `Ahora mismo no puedes continuar porque tu pedido individual no llega al mínimo de 20 €. Te faltan ${missing.toFixed(2)} € para poder pagarlo.`;
  }

  if (context.cart.mode === 'suscripcion' && !context.subscription.complete) {
    const missingItems = Math.max(context.subscription.minimumItems - context.subscription.selectedItemCount, 0);
    return `Tu suscripción aún no está completa. Necesitas al menos ${context.subscription.minimumItems} platos y ahora mismo te faltan ${missingItems}.`;
  }

  if (!context.userAuthenticated) {
    return 'Para finalizar el pedido necesitas iniciar sesión o crear una cuenta.';
  }

  if (!context.profile.profileCompleteForPayment) {
    return 'Tu perfil todavía no está listo para pagar. Necesitas completar dirección y tarjeta antes de confirmar el pedido.';
  }

  return 'El pedido parece listo para continuar. Si sigues viendo un bloqueo, revisa el carrito y los datos de pago.';
}

function accionesParaBloqueo(context) {
  if (!context.cart.hasItems) {
    return [{ type: 'navigate', target: '/menu', label: 'Añadir platos' }];
  }

  if (context.cart.mode === 'individual' && !context.cart.meetsMinimum) {
    return [{ type: 'navigate', target: '/menu', label: 'Seguir añadiendo platos' }];
  }

  if (context.cart.mode === 'suscripcion' && !context.subscription.complete) {
    return [{ type: 'navigate', target: '/menu?subscriptionSelection=1', label: 'Completar suscripción' }];
  }

  if (!context.userAuthenticated) {
    return [{ type: 'navigate', target: '/login', label: 'Iniciar sesión' }];
  }

  if (!context.profile.profileCompleteForPayment) {
    return [{ type: 'navigate', target: '/perfil', label: 'Completar perfil' }];
  }

  return [{ type: 'navigate', target: '/resumen', label: 'Ver carrito' }];
}

function responderUltimoPedido(context) {
  if (!context.userAuthenticated) {
    return 'Para consultar tu último pedido necesitas iniciar sesión.';
  }

  if (!context.lastOrder) {
    return 'Todavía no tienes pedidos guardados en SANZEN.';
  }

  const tipo = context.lastOrder.subscription ? 'de suscripción' : 'individual';
  const fecha = formatearFecha(context.lastOrder.deliveryDate);
  const platos = context.lastOrder.items.map((item) => `${item.quantity} x ${item.name}`).join(', ');

  return `Tu último pedido fue ${tipo}, con entrega ${fecha}. Incluía ${platos || 'varios platos'} y un total de ${context.lastOrder.total.toFixed(2)} €.`;
}

function responderCarrito(context) {
  if (!context.cart.hasItems) {
    return 'Ahora mismo tu carrito está vacío.';
  }

  const items = context.cart.items
    .slice(0, 4)
    .map((item) => `${item.quantity} x ${item.name}`)
    .join(', ');

  const tipo = context.cart.mode === 'suscripcion' ? 'suscripción' : 'pedido individual';

  const estadoMinimo = context.cart.mode === 'individual'
    ? context.cart.meetsMinimum
      ? 'Ya cumples el mínimo para seguir al pago.'
      : `Todavía no llegas al mínimo de 20 €. Te faltan ${(20 - context.cart.total).toFixed(2)} €.`
    : context.cart.meetsMinimum
      ? 'Tu selección semanal ya cumple el mínimo de la suscripción.'
      : `Todavía no llegas al mínimo de ${context.subscription.minimumItems} platos para la suscripción.`;

  return `Llevas ${context.cart.itemCount} platos en ${tipo}. El total actual es ${context.cart.total.toFixed(2)} €. ${items ? `Tu selección incluye ${items}. ` : ''}${estadoMinimo}`.trim();
}

function responderHistorial(context) {
  if (!context.userAuthenticated) {
    return 'Para resumir tus pedidos necesitas iniciar sesión.';
  }

  if (!context.lastOrder) {
    return 'Todavía no tienes pedidos guardados en SANZEN.';
  }

  return `Ahora mismo puedo resumirte el último pedido que tengo cargado: ${responderUltimoPedido(context)}`;
}

function responderSuscripcion(context) {
  if (!context.userAuthenticated) {
    return 'Puedes activar o gestionar tu suscripción semanal cuando tengas una cuenta iniciada en SANZEN.';
  }

  if (!context.subscription.active) {
    return 'Ahora mismo no tienes una suscripción semanal activa. Si quieres, puedes revisar cómo funciona o activarla desde Gestionar suscripción.';
  }

  const nombres = context.subscription.items
    .slice(0, 4)
    .map((item) => `${item.quantity} x ${item.name}`)
    .join(', ');
  const proximaEntrega = context.subscription.nextDelivery
    ? formatearFecha(context.subscription.nextDelivery)
    : 'pendiente de calcular';

  return `Tu suscripción está activa para ${context.subscription.day}. Tienes ${context.subscription.selectedItemCount} platos guardados y la próxima entrega prevista es ${proximaEntrega}. ${nombres ? `Tu selección actual incluye ${nombres}.` : ''}`.trim();
}

function accionesSuscripcion(context) {
  if (!context.userAuthenticated) {
    return [{ type: 'navigate', target: '/login', label: 'Iniciar sesión' }];
  }

  if (!context.subscription.active) {
    return [
      { type: 'navigate', target: '/suscripcion', label: 'Gestionar suscripción' },
      { type: 'navigate', target: '/como-funciona', label: 'Cómo funciona' }
    ];
  }

  return [
    { type: 'navigate', target: '/suscripcion', label: 'Gestionar suscripción' },
    { type: 'navigate', target: '/menu?subscriptionSelection=1', label: 'Modificar selección' }
  ];
}

function compararSuscripcionVsIndividual(context) {
  if (context.subscription.active) {
    return 'Como ya tienes una suscripción activa, te conviene mantenerla si sigues pidiendo cada semana. Si solo quieres una compra puntual, puedes hacer un pedido individual sin perder tu suscripción.';
  }

  if (context.cart.itemCount >= 5 || context.firstOrder.mode === 'suscripcion') {
    return 'Si quieres pedir cada semana y mantener una selección guardada, la suscripción te encaja mejor. Si solo buscas una compra puntual, el pedido individual es la opción más simple.';
  }

  return 'El pedido individual es mejor si quieres comprar algo puntual. La suscripción te conviene más si sueles pedir cada semana y quieres guardar una selección estable.';
}

function buildDefaultMessage(context) {
  switch (context.screen) {
    case 'menu':
      return 'Puedo ayudarte a elegir platos, comparar suscripción e individual o explicarte por qué no puedes continuar desde este menú.';
    case 'resumen':
      return 'Puedo resumirte tu carrito, decirte qué te falta para continuar y orientarte hacia el siguiente paso.';
    case 'pago':
      return 'Puedo explicarte qué dato te falta, revisar el resumen del pedido o indicarte si el perfil está listo para pagar.';
    case 'suscripcion':
      return 'Puedo resumirte tu suscripción actual, explicarte cómo renovarla o decirte cuándo será la próxima entrega.';
    case 'mis-pedidos':
      return 'Puedo resumirte tu último pedido o ayudarte a revisar pedidos anteriores desde esta pantalla.';
    default:
      return 'Puedo ayudarte a elegir platos, entender tu suscripción, revisar bloqueos del pedido o resumirte tu último pedido.';
  }
}

function buildDefaultActions(context) {
  switch (context.screen) {
    case 'suscripcion':
      return [
        { type: 'navigate', target: '/suscripcion', label: 'Gestionar suscripción' },
        { type: 'navigate', target: '/menu?subscriptionSelection=1', label: 'Modificar selección' }
      ];
    case 'pago':
      return [
        { type: 'navigate', target: '/perfil', label: 'Ver perfil' },
        { type: 'navigate', target: '/resumen', label: 'Ver carrito' }
      ];
    case 'mis-pedidos':
      return [
        { type: 'navigate', target: '/mis-pedidos', label: 'Ver mis pedidos' },
        { type: 'navigate', target: '/menu', label: 'Ver menú' }
      ];
    default:
      return [
        { type: 'navigate', target: '/menu', label: 'Ver menú' },
        { type: 'navigate', target: '/como-funciona', label: 'Cómo funciona' }
      ];
  }
}

function recomendarPlatos(context) {
  const compatibles = context.catalog
    .filter((plato) => esCompatibleConPerfil(plato, context.profile))
    .sort((a, b) => puntuarPlato(b, context.profile) - puntuarPlato(a, context.profile))
    .slice(0, 3);

  if (compatibles.length === 0) {
    return 'No veo platos claramente compatibles con tu perfil actual. Puedes revisar tus filtros o tu perfil alimentario para afinar la recomendación.';
  }

  const nombres = compatibles
    .map((plato) => `${plato.name} (${plato.price.toFixed(2)} €, HealthScore ${plato.healthScore})`)
    .join(', ');

  if (context.profile.objective === 'perder-peso') {
    return `Según tu objetivo de perder peso, te recomendaría ${nombres}. Son opciones más favorables por equilibrio nutricional y perfil general.`;
  }

  if (context.profile.objective === 'masa-muscular') {
    return `Según tu objetivo de masa muscular, te recomendaría ${nombres}. Son platos que encajan mejor con una búsqueda de mayor aporte proteico.`;
  }

  return `Según tu perfil actual, te recomendaría ${nombres}.`;
}

function esCompatibleConPerfil(plato, profile) {
  if (profile.allergies.length > 0 && plato.allergens.some((allergen) => profile.allergies.includes(allergen))) {
    return false;
  }

  return true;
}

function puntuarPlato(plato, profile) {
  let score = plato.healthScore * 10;

  if (profile.objective === 'perder-peso') {
    score += Math.max(500 - plato.calories, 0);
  }

  if (profile.objective === 'masa-muscular') {
    score += plato.category === 'Principal' ? 80 : 0;
    score += Math.max(100 - plato.calories / 10, 0);
  }

  if (profile.compositionPreferences.includes('ricos-proteina')) {
    score += plato.category === 'Principal' ? 60 : 10;
  }

  if (profile.compositionPreferences.includes('bajos-grasas')) {
    score += Math.max(80 - plato.calories / 8, 0);
  }

  if (profile.compositionPreferences.includes('bajos-carbohidratos')) {
    score += plato.category !== 'Postre' ? 40 : -20;
  }

  return score;
}

function formatearFecha(value) {
  if (!value) {
    return 'sin fecha disponible';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'sin fecha disponible';
  }

  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

module.exports = {
  generateAssistantResponse
};
