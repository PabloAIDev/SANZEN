const {
  MAX_HISTORY_MESSAGES,
  MAX_HISTORY_TEXT_LENGTH,
  ALLOWED_TARGETS,
  NUTRIENT_QUERY_DEFINITIONS,
  HEALTH_QUERY_DEFINITIONS,
  GENERIC_HEALTH_PATTERNS,
  GENERIC_HEALTH_QUERY,
  ALLERGEN_ALIASES,
  VEGETARIAN_DISALLOWED_TERMS,
  TARGET_LABELS,
  FIELD_LABELS,
  DAY_LABELS,
  NUTRIENT_LABELS,
  ALLERGEN_LABELS
} = require('./assistant.config');

function resolveAssistantLanguage(language) {
  return language === 'en' ? 'en' : 'es';
}

function isEnglish(language) {
  return resolveAssistantLanguage(language) === 'en';
}

function navigateAction(target, language) {
  return { type: 'navigate', target, label: buildLabelForTarget(target, language) };
}

function buildRuleBasedResponse(message, context, source, language = 'es') {
  if (isHowWorks(message)) return buildResponse(explainHowWorks(context, language), [navigateAction('/como-funciona', language)], source);
  if (isFirstOrder(message)) return buildResponse(explainFirstOrder(context, language), firstOrderActions(context, language), source);
  if (isModesDifference(message)) return buildResponse(explainModesDifference(language), [navigateAction('/menu', language), navigateAction('/suscripcion', language)], source);
  if (isAllergyQuestion(message)) return buildResponse(describeAllergies(context, language), [navigateAction('/perfil', language)], source);
  if (isObjectiveQuestion(message)) return buildResponse(describeObjective(context, language), [navigateAction('/perfil', language)], source);
  if (isPaymentStatusQuestion(message)) return buildResponse(describePaymentStatus(context, language), paymentActions(context, language), source);
  if (isMissingFieldsQuestion(message)) return buildResponse(describeMissingFields(context, language), missingFieldsActions(context, language), source);
  if (isLastOrderDateQuestion(message)) return buildResponse(describeLastOrderDate(context, language), lastOrderActions(context, language), source);
  if (isLastOrderTypeQuestion(message)) return buildResponse(describeLastOrderType(context, language), lastOrderActions(context, language), source);
  if (isLastOrderQuestion(message)) return buildResponse(describeLastOrder(context, language), lastOrderActions(context, language), source);
  if (isNextDeliveryQuestion(message)) return buildResponse(describeNextDelivery(context, language), subscriptionActions(context, language), source);
  if (isRenewSubscriptionQuestion(message)) return buildResponse(explainRenewSubscription(context, language), subscriptionActions(context, language), source);
  if (isModifySubscriptionQuestion(message)) return buildResponse(explainModifySubscription(context, language), subscriptionActions(context, language), source);
  if (isSubscriptionContentQuestion(message)) return buildResponse(describeSubscription(context, language), subscriptionActions(context, language), source);
  if (isDeliveryDateQuestion(message)) return buildResponse(describeDeliveryDate(context, language), deliveryActions(context, language), source);
  if (isOrderTypeQuestion(message)) return buildResponse(compareSubscriptionVsIndividual(context, language), [navigateAction('/menu', language), navigateAction('/suscripcion', language)], source);
  if (isProfileQuestion(message)) return buildResponse(describeProfile(context, language), [navigateAction('/perfil', language)], source);
  if (isBlockingQuestion(message) || isMissingToContinueQuestion(message)) return buildResponse(explainBlocking(context, language), blockingActions(context, language), source);
  if (isCartSummaryQuestion(message)) return buildResponse(describeCart(context, language), [navigateAction('/resumen', language)], source);
  if (isOrdersSummaryQuestion(message)) return buildResponse(describeHistory(context, language), lastOrderActions(context, language), source);
  return null;
}

function buildFallbackResponse(message, context, history, source, language = 'es') {
  const normalizedMessage = normalizarMensaje(resolveMessageWithHistory(message, history));
  const safeRecommendationFallback = buildSafeRecommendationFallback(normalizedMessage, context, source, language);
  return safeRecommendationFallback
    || buildRuleBasedResponse(normalizedMessage, context, source, language)
    || { message: defaultMessage(context, language), actions: defaultActions(context, language), source };
}

function buildResponse(message, actions, source) {
  return { message, actions: actions.slice(0, 2), source };
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
  return normalizedMessage.startsWith('y ')
    || normalizedMessage.startsWith('entonces')
    || normalizedMessage.startsWith('y si')
    || normalizedMessage.startsWith('si ')
    || normalizedMessage.startsWith('vale')
    || normalizedMessage.startsWith('perfecto')
    || normalizedMessage.startsWith('and ')
    || normalizedMessage.startsWith('then')
    || normalizedMessage.startsWith('what about')
    || normalizedMessage.startsWith('and what')
    || normalizedMessage.startsWith('okay');
}

function normalizarMensaje(message) {
  return String(message ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function isHowWorks(message) { return message.includes('como funciona sanzen') || message === 'como funciona' || message.includes('como funciona la app') || message.includes('how does sanzen work') || message === 'how it works' || message.includes('how does the app work'); }
function isFirstOrder(message) { return message.includes('primer pedido') || message.includes('que tengo que hacer para mi primer pedido') || message.includes('como hago mi primer pedido') || message.includes('first order') || message.includes('how do i place my first order'); }
function isModesDifference(message) { return (message.includes('diferencia') && (message.includes('pedido individual') || message.includes('suscripcion'))) || (message.includes('difference') && (message.includes('individual order') || message.includes('subscription'))); }
function isBlockingQuestion(message) { return message.includes('por que no puedo') || message.includes('no puedo continuar') || message.includes('no puedo seguir al pago') || message.includes('no me deja') || message.includes("why can't i") || message.includes('why can i not') || message.includes('cannot continue') || message.includes("can't continue"); }
function isMissingToContinueQuestion(message) { return message.includes('que me falta para seguir') || message.includes('que me falta para continuar') || message.includes('what am i missing to continue') || message.includes('what do i need to continue'); }
function isOrderTypeQuestion(message) { return message.includes('tipo de pedido') || message.includes('pedido me recomend') || message.includes('suscripcion o pedido individual') || message.includes('pedido individual o suscripcion') || message.includes('me conviene') || message.includes('subscription or individual order') || message.includes('individual order or subscription') || message.includes('which option suits me') || message.includes('should i choose a subscription'); }
function isProfileQuestion(message) { return !(message.includes('plato') || message.includes('platos') || message.includes('menu') || message.includes('recomi') || message.includes('dish') || message.includes('dishes') || message.includes('recommend')) && (message.includes('cual es mi perfil') || message.includes('que perfil') || message.includes('mi perfil') || message.includes('perfil actual') || message.includes('perfil alimentario') || message.includes('what is my profile') || message.includes('current profile') || message.includes('food profile')); }
function isPaymentStatusQuestion(message) { return message.includes('mi perfil esta completo para pagar') || message.includes('perfil completo para pagar') || message.includes('listo para pagar') || message.includes('is my profile ready for payment') || message.includes('ready to pay'); }
function isMissingFieldsQuestion(message) { return message.includes('que dato me falta') || message.includes('que me falta para completar el perfil') || message.includes('que me falta del perfil') || message.includes('what information am i missing') || message.includes('what am i missing from my profile') || message.includes('missing details'); }
function isAllergyQuestion(message) { return message.includes('alergenos tengo') || message.includes('alergenos tengo seleccionados') || message.includes('que alergenos tengo') || message.includes('what allergies do i have') || message.includes('selected allergens'); }
function isObjectiveQuestion(message) { return message.includes('objetivo nutricional') || message.includes('que objetivo tengo') || message.includes('objetivo tengo ahora mismo') || message.includes('nutritional goal') || message.includes('what is my goal'); }
function isOpenRecommendationQuestion(message) {
  return message.includes('recomi')
    || message.includes('aconsej')
    || message.includes('sugier')
    || message.includes('platos encajan')
    || message.includes('plato encaja')
    || message.includes('encajan con mi perfil')
    || message.includes('recommend')
    || message.includes('suggest')
    || message.includes('fit my profile')
    || message.includes('which dishes fit');
}
function isCartSummaryQuestion(message) { return message.includes('resume mi carrito') || message.includes('resume mi pedido') || message.includes('summarize my cart') || message.includes('summarise my cart') || message.includes('summarize my order'); }
function isOrdersSummaryQuestion(message) { return message.includes('resume mis pedidos') || message.includes('resumeme mis pedidos') || message.includes('resumen de mis pedidos') || message.includes('summarize my orders') || message.includes('summarise my orders'); }
function isLastOrderTypeQuestion(message) { return (message.includes('ultimo pedido fue') && (message.includes('suscripcion') || message.includes('individual'))) || (message.includes('last order') && (message.includes('subscription') || message.includes('individual'))); }
function isLastOrderDateQuestion(message) { return message.includes('cuando se entrega mi ultimo pedido') || message.includes('cuando se entrego mi ultimo pedido') || (message.includes('ultimo pedido') && message.includes('cuando se entrega')) || message.includes('when is my last order delivered') || ((message.includes('last order') || message.includes('latest order')) && message.includes('delivery')); }
function isLastOrderQuestion(message) { return message.includes('ultimo pedido') || message.includes('last order') || message.includes('latest order'); }
function isDeliveryDateQuestion(message) { return message.includes('cual sera la fecha de entrega') || message.includes('entrega prevista') || (message.includes('fecha de entrega') && !message.includes('ultimo pedido')) || message.includes('delivery date') || message.includes('expected delivery'); }
function isNextDeliveryQuestion(message) { return message.includes('proxima entrega') || message.includes('next delivery'); }
function isSubscriptionContentQuestion(message) { return message.includes('que contiene mi suscripcion actual') || message.includes('suscripcion actual') || message.includes('current subscription') || message.includes('what does my current subscription contain'); }
function isRenewSubscriptionQuestion(message) { return message.includes('como renuevo mi suscripcion') || message.includes('como renuevo la suscripcion') || message.includes('renovacion semanal') || message.includes('renovar mi suscripcion') || message.includes('how do i renew my subscription') || message.includes('weekly renewal'); }
function isModifySubscriptionQuestion(message) { return message.includes('como modifico mi seleccion semanal') || message.includes('como modifico mi suscripcion') || message.includes('como modifico la seleccion semanal') || message.includes('modificarla') || message.includes('how do i modify my subscription') || message.includes('edit my weekly selection') || message.includes('modify my weekly selection'); }

function explainHowWorks(context, language = 'es') {
  if (isEnglish(language)) {
    if (!context.userAuthenticated) return 'In SANZEN you can start from Home with "Place your first order". You choose an individual order or a weekly subscription, select dishes, review the cart, sign in or create your account, complete your profile if needed and confirm the order.';
    if (context.subscription.active) return 'You can currently use SANZEN in two ways: place a one-off order from the menu or manage your weekly subscription from Subscription. There you can review your current selection, modify it or launch the weekly renewal.';
    return 'In SANZEN you can place individual orders or work with a weekly subscription. You select dishes in the menu, review the cart, complete profile and payment details if needed, and confirm the order from the final screen.';
  }

  if (!context.userAuthenticated) return 'En SANZEN puedes empezar desde Inicio con "Haz tu primer pedido". Eliges pedido individual o suscripcion semanal, seleccionas platos, revisas el carrito, inicias sesion o creas tu cuenta, completas el perfil si hace falta y confirmas el pedido.';
  if (context.subscription.active) return 'Ahora puedes usar SANZEN de dos formas: hacer un pedido puntual desde el menu o gestionar tu suscripcion semanal desde Suscripcion. Ahi puedes revisar tu seleccion actual, modificarla o lanzar la renovacion semanal.';
  return 'En SANZEN puedes hacer pedidos individuales o trabajar con una suscripcion semanal. Seleccionas platos en el menu, revisas el carrito, completas perfil y pago si hace falta y confirmas el pedido desde la pantalla final.';
}
function explainFirstOrder(context, language = 'es') {
  if (isEnglish(language)) {
    if (!context.userAuthenticated) return 'For your first order, start from Home, choose whether you want an individual order or a weekly subscription, select dishes, go to the cart and, when you try to pay, you will be able to create your account or sign in. If any profile data is missing, SANZEN will take you there before confirmation.';
    if (!context.profile.profileCompleteForPayment) return 'You already have an account, so your first order is shorter: choose the order type, select dishes and complete the missing profile details before paying.';
    return 'Because you already have an account and a ready profile, you only need to choose the order type, select dishes, review the cart and confirm the order.';
  }

  if (!context.userAuthenticated) return 'Para tu primer pedido, entra desde Inicio, elige si quieres pedido individual o suscripcion semanal, selecciona platos, ve al carrito y al intentar pagar podras crear tu cuenta o iniciar sesion. Si falta algo del perfil, SANZEN te llevara a completarlo antes de confirmar.';
  if (!context.profile.profileCompleteForPayment) return 'Ya tienes cuenta, asi que tu primer pedido es mas corto: elige tipo de pedido, selecciona platos y completa los datos que falten del perfil antes de pagar.';
  return 'Como ya tienes cuenta y perfil listo, solo tienes que elegir el tipo de pedido, seleccionar platos, revisar el carrito y confirmar el pedido.';
}
function explainModesDifference(language = 'es') {
  return isEnglish(language)
    ? 'The individual order is for a one-off purchase and requires a minimum of 20 EUR. The weekly subscription requires at least 5 dishes, stores your weekly selection and lets you review, modify or renew it manually later.'
    : 'El pedido individual es para una compra puntual y exige un minimo de 20 EUR. La suscripcion semanal exige al menos 5 platos, guarda tu seleccion semanal y te permite revisarla, modificarla o renovarla manualmente despues.';
}
function describeAllergies(context, language = 'es') {
  const allergies = localizeAllergenList(context.profile.allergies, language);
  if (isEnglish(language)) {
    return allergies.length === 0
      ? 'You do not currently have any allergens selected in your profile.'
      : `These allergens are currently selected in your profile: ${allergies.join(', ')}.`;
  }

  return allergies.length === 0 ? 'Ahora mismo no tienes alergenos seleccionados en tu perfil.' : `En tu perfil tienes seleccionados estos alergenos: ${allergies.join(', ')}.`;
}
function describeObjective(context, language = 'es') {
  return context.profile.objective
    ? (isEnglish(language)
      ? `Your current nutritional goal is ${describeObjectiveValue(context.profile.objective, language)}.`
      : `Tu objetivo nutricional actual es ${describeObjectiveValue(context.profile.objective, language)}.`)
    : (isEnglish(language)
      ? 'You do not currently have a nutritional goal defined in your profile.'
      : 'Ahora mismo no tienes un objetivo nutricional definido en tu perfil.');
}
function describePaymentStatus(context, language = 'es') {
  const missingPaymentFields = localizeFieldList(context.profile.missingPaymentFields, language);
  if (isEnglish(language)) {
    if (!context.userAuthenticated) return 'Before paying, you need to sign in or create an account.';
    return context.profile.profileCompleteForPayment ? 'Yes, your profile is already complete for payment.' : `Not yet. To pay, you are still missing: ${naturalList(missingPaymentFields, language)}.`;
  }

  if (!context.userAuthenticated) return 'Antes de pagar necesitas iniciar sesion o crear una cuenta.';
  return context.profile.profileCompleteForPayment ? 'Si, tu perfil ya esta completo para pagar.' : `Todavia no. Para pagar te faltan estos datos: ${naturalList(missingPaymentFields, language)}.`;
}
function describeMissingFields(context, language = 'es') {
  const basic = localizeFieldList(context.profile.missingBasicFields, language);
  const payment = localizeFieldList(context.profile.missingPaymentFields, language);

  if (isEnglish(language)) {
    if (!context.userAuthenticated) return 'To complete the profile or pay, you first need to sign in.';
    if (context.screen === 'perfil') {
      if (basic.length === 0 && payment.length === 0) return 'Your profile is already complete. Allergens, nutritional goal and composition preferences are optional, but they help personalise the recommendations better.';
      const parts = [];
      if (basic.length) parts.push(`basic profile: ${naturalList(basic, language)}`);
      if (payment.length) parts.push(`payment details: ${naturalList(payment, language)}`);
      return `You are still missing these details to complete the profile: ${parts.join(' | ')}.`;
    }
    return payment.length === 0 ? 'You are not missing any required detail for payment.' : `To continue to payment you still need: ${naturalList(payment, language)}.`;
  }

  if (!context.userAuthenticated) return 'Para completar el perfil o pagar primero necesitas iniciar sesion.';
  if (context.screen === 'perfil') {
    if (basic.length === 0 && payment.length === 0) return 'Tu perfil ya esta completo. Los alergenos, el objetivo nutricional y las preferencias de composicion son opcionales, pero ayudan a personalizar mejor las recomendaciones.';
    const parts = [];
    if (basic.length) parts.push(`perfil basico: ${naturalList(basic, language)}`);
    if (payment.length) parts.push(`datos de pago: ${naturalList(payment, language)}`);
    return `Todavia te faltan estos datos para completar el perfil: ${parts.join(' | ')}.`;
  }
  return payment.length === 0 ? 'No te falta ningun dato obligatorio para pagar.' : `Para poder pagar te faltan estos datos: ${naturalList(payment, language)}.`;
}
function explainBlocking(context, language = 'es') {
  const missingPaymentFields = localizeFieldList(context.profile.missingPaymentFields, language);

  if (isEnglish(language)) {
    if (!context.userAuthenticated) return 'To finish the order you need to sign in or create an account.';
    if (!context.cart.hasItems) return 'You do not have dishes in the cart yet. Add some dishes before continuing with the order.';
  } else {
    if (!context.userAuthenticated) return 'Para finalizar el pedido necesitas iniciar sesion o crear una cuenta.';
    if (!context.cart.hasItems) return 'Todavia no tienes platos en el carrito. Anade algunos platos antes de continuar con el pedido.';
  }

  const reasons = [];
  if (context.cart.mode === 'individual' && !context.cart.meetsMinimum) reasons.push(isEnglish(language) ? `your individual order does not reach the 20 EUR minimum and you still need ${(20 - context.cart.total).toFixed(2)} EUR` : `tu pedido individual no llega al minimo de 20 EUR y te faltan ${(20 - context.cart.total).toFixed(2)} EUR`);
  if (context.cart.mode === 'suscripcion' && !context.subscription.complete) reasons.push(isEnglish(language) ? `your weekly selection does not yet reach the minimum of ${context.subscription.minimumItems} dishes and you still need ${Math.max(context.subscription.minimumItems - context.subscription.selectedItemCount, 0)}` : `tu seleccion semanal todavia no llega al minimo de ${context.subscription.minimumItems} platos y te faltan ${Math.max(context.subscription.minimumItems - context.subscription.selectedItemCount, 0)}`);
  if (['resumen', 'perfil', 'pago'].includes(context.screen) && !context.profile.profileCompleteForPayment) reasons.push(isEnglish(language) ? `your profile is not ready for payment yet because ${naturalList(missingPaymentFields, language)} is still missing` : `tu perfil todavia no esta listo para pagar porque faltan ${naturalList(missingPaymentFields, language)}`);
  if (!reasons.length) return isEnglish(language) ? 'The order seems ready to continue. If you still see a blocker, review the cart and the payment details.' : 'El pedido parece listo para continuar. Si sigues viendo un bloqueo, revisa el carrito y los datos de pago.';
  return reasons.length === 1
    ? (isEnglish(language) ? `You cannot continue right now because ${reasons[0]}.` : `Ahora mismo no puedes continuar porque ${reasons[0]}.`)
    : (isEnglish(language) ? `You cannot continue right now for two reasons: ${reasons[0]}, and also ${reasons[1]}.` : `Ahora mismo no puedes continuar por dos motivos: ${reasons[0]} y ademas ${reasons[1]}.`);
}
function describeCart(context, language = 'es') {
  if (!context.cart.hasItems) return isEnglish(language) ? 'Your cart is currently empty.' : 'Ahora mismo tu carrito esta vacio.';
  const items = context.cart.items.slice(0, 4).map((item) => `${item.quantity} x ${item.name}`).join(', ');
  const kind = context.cart.mode === 'suscripcion'
    ? (isEnglish(language) ? 'subscription' : 'suscripcion')
    : (isEnglish(language) ? 'individual order' : 'pedido individual');
  const minimumState = context.cart.mode === 'individual'
    ? (context.cart.meetsMinimum
      ? (isEnglish(language) ? 'You already meet the minimum to continue to payment.' : 'Ya cumples el minimo para seguir al pago.')
      : (isEnglish(language) ? `You still do not reach the 20 EUR minimum. You need ${(20 - context.cart.total).toFixed(2)} EUR more.` : `Todavia no llegas al minimo de 20 EUR. Te faltan ${(20 - context.cart.total).toFixed(2)} EUR.`))
    : (context.cart.meetsMinimum
      ? (isEnglish(language) ? 'Your weekly selection already meets the subscription minimum.' : 'Tu seleccion semanal ya cumple el minimo de la suscripcion.')
      : (isEnglish(language) ? `You still do not reach the minimum of ${context.subscription.minimumItems} dishes for the subscription.` : `Todavia no llegas al minimo de ${context.subscription.minimumItems} platos para la suscripcion.`));
  return isEnglish(language)
    ? `You currently have ${context.cart.itemCount} dishes in ${kind}. The current total is ${context.cart.total.toFixed(2)} EUR. ${items ? `Your selection includes ${items}. ` : ''}${minimumState}`.trim()
    : `Llevas ${context.cart.itemCount} platos en ${kind}. El total actual es ${context.cart.total.toFixed(2)} EUR. ${items ? `Tu seleccion incluye ${items}. ` : ''}${minimumState}`.trim();
}
function describeHistory(context, language = 'es') {
  if (!context.userAuthenticated) return isEnglish(language) ? 'To summarise your orders you need to sign in.' : 'Para resumir tus pedidos necesitas iniciar sesion.';
  if (!context.ordersSummary?.totalOrders) return isEnglish(language) ? 'You do not have any saved SANZEN orders yet.' : 'Todavia no tienes pedidos guardados en SANZEN.';
  const recentOrders = Array.isArray(context.ordersSummary.recentOrders) ? context.ordersSummary.recentOrders : [];
  const resumenRecientes = recentOrders
    .map((order) => isEnglish(language)
      ? `${order.subscription ? 'subscription' : 'individual'} with delivery ${formatDate(order.deliveryDate, language)} for ${Number(order.total ?? 0).toFixed(2)} EUR`
      : `${order.subscription ? 'suscripcion' : 'individual'} con entrega ${formatDate(order.deliveryDate, language)} por ${Number(order.total ?? 0).toFixed(2)} EUR`)
    .join(' | ');
  return isEnglish(language)
    ? `You have ${context.ordersSummary.totalOrders} saved orders. ${resumenRecientes ? `The most recent ones are: ${resumenRecientes}.` : ''}`.trim()
    : `Tienes ${context.ordersSummary.totalOrders} pedidos guardados. ${resumenRecientes ? `Los mas recientes son: ${resumenRecientes}.` : ''}`.trim();
}
function describeLastOrder(context, language = 'es') {
  if (!context.userAuthenticated) return isEnglish(language) ? 'To check your last order you need to sign in.' : 'Para consultar tu ultimo pedido necesitas iniciar sesion.';
  if (!context.lastOrder) return isEnglish(language) ? 'You do not have any saved SANZEN orders yet.' : 'Todavia no tienes pedidos guardados en SANZEN.';
  const type = context.lastOrder.subscription ? (isEnglish(language) ? 'subscription' : 'de suscripcion') : (isEnglish(language) ? 'individual' : 'individual');
  const items = context.lastOrder.items.map((item) => `${item.quantity} x ${item.name}`).join(', ');
  return isEnglish(language)
    ? `Your last order was ${type}, with delivery ${formatDate(context.lastOrder.deliveryDate, language)}. It included ${items || 'several dishes'} and a total of ${context.lastOrder.total.toFixed(2)} EUR.`
    : `Tu ultimo pedido fue ${type}, con entrega ${formatDate(context.lastOrder.deliveryDate, language)}. Incluia ${items || 'varios platos'} y un total de ${context.lastOrder.total.toFixed(2)} EUR.`;
}
function describeLastOrderType(context, language = 'es') {
  if (!context.userAuthenticated) return isEnglish(language) ? 'To check your last order you need to sign in.' : 'Para consultar tu ultimo pedido necesitas iniciar sesion.';
  if (!context.lastOrder) return isEnglish(language) ? 'You do not have any saved SANZEN orders yet.' : 'Todavia no tienes pedidos guardados en SANZEN.';
  return context.lastOrder.subscription
    ? (isEnglish(language) ? 'Your last order was a weekly subscription order.' : 'Tu ultimo pedido fue de suscripcion semanal.')
    : (isEnglish(language) ? 'Your last order was an individual order.' : 'Tu ultimo pedido fue un pedido individual.');
}
function describeLastOrderDate(context, language = 'es') {
  if (!context.userAuthenticated) return isEnglish(language) ? 'To check the delivery date of your last order you need to sign in.' : 'Para consultar la fecha de tu ultimo pedido necesitas iniciar sesion.';
  if (!context.lastOrder) return isEnglish(language) ? 'You do not have any saved SANZEN orders yet.' : 'Todavia no tienes pedidos guardados en SANZEN.';
  return isEnglish(language)
    ? `The delivery of your last order is scheduled for ${formatDate(context.lastOrder.deliveryDate, language)}.`
    : `La entrega de tu ultimo pedido esta prevista para ${formatDate(context.lastOrder.deliveryDate, language)}.`;
}
function describeSubscription(context, language = 'es') {
  if (!context.userAuthenticated) return isEnglish(language) ? 'You can activate or manage your weekly subscription once you are signed in to SANZEN.' : 'Puedes activar o gestionar tu suscripcion semanal cuando tengas una cuenta iniciada en SANZEN.';
  if (!context.subscription.active) return isEnglish(language) ? 'You do not currently have an active weekly subscription. If you want, you can activate it from Manage subscription.' : 'Ahora mismo no tienes una suscripcion semanal activa. Si quieres, puedes activarla desde Gestionar suscripcion.';
  const items = context.subscription.items.slice(0, 4).map((item) => `${item.quantity} x ${item.name}`).join(', ');
  const nextDelivery = context.subscription.nextDelivery ? formatDate(context.subscription.nextDelivery, language) : (isEnglish(language) ? 'pending calculation' : 'pendiente de calcular');
  return isEnglish(language)
    ? `Your subscription is active for ${localizeDay(context.subscription.day, language)}. You have ${context.subscription.selectedItemCount} saved dishes and the next scheduled delivery is ${nextDelivery}. ${items ? `Your current selection includes ${items}.` : ''}`.trim()
    : `Tu suscripcion esta activa para ${localizeDay(context.subscription.day, language)}. Tienes ${context.subscription.selectedItemCount} platos guardados y la proxima entrega prevista es ${nextDelivery}. ${items ? `Tu seleccion actual incluye ${items}.` : ''}`.trim();
}
function explainRenewSubscription(context, language = 'es') {
  if (isEnglish(language)) {
    if (!context.userAuthenticated) return 'To renew your subscription, you first need to sign in.';
    if (!context.subscription.active) return 'You do not currently have an active subscription. First activate it from Manage subscription.';
    if (!context.subscription.complete) return `Your subscription is not ready to renew yet because it only has ${context.subscription.selectedItemCount} dishes. You need at least ${context.subscription.minimumItems}.`;
    return 'To renew your subscription, go to Manage subscription, review the "Your current selection" block and tap "Weekly renewal". If you want to change dishes first, go to "Edit selection".';
  }

  if (!context.userAuthenticated) return 'Para renovar tu suscripcion primero necesitas iniciar sesion.';
  if (!context.subscription.active) return 'Ahora mismo no tienes una suscripcion activa. Primero debes activarla desde Gestionar suscripcion.';
  if (!context.subscription.complete) return `Tu suscripcion todavia no esta lista para renovar porque solo tiene ${context.subscription.selectedItemCount} platos. Necesitas al menos ${context.subscription.minimumItems}.`;
  return 'Para renovar tu suscripcion, entra en Gestionar suscripcion, revisa el bloque "Tu seleccion actual" y pulsa "Renovacion semanal". Si quieres cambiar platos antes, entra en "Modificar seleccion".';
}
function explainModifySubscription(context, language = 'es') {
  if (isEnglish(language)) {
    if (!context.userAuthenticated) return 'To modify your weekly selection, you first need to sign in.';
    if (!context.subscription.active) return 'You do not currently have an active subscription. If you want a weekly selection, activate it first.';
    return 'To modify your weekly selection, go to the subscription menu. There you can add or remove dishes, review the cart and save the weekly order changes.';
  }

  if (!context.userAuthenticated) return 'Para modificar tu seleccion semanal primero necesitas iniciar sesion.';
  if (!context.subscription.active) return 'Ahora mismo no tienes una suscripcion activa. Si quieres una seleccion semanal, primero debes activarla.';
  return 'Para modificar tu seleccion semanal, entra en el menu de suscripcion. Alli puedes subir o bajar platos, revisar el carrito y guardar los cambios del pedido semanal.';
}
function describeNextDelivery(context, language = 'es') {
  if (!context.userAuthenticated) return isEnglish(language) ? 'To check the next delivery of your subscription you need to sign in.' : 'Para consultar la proxima entrega de tu suscripcion necesitas iniciar sesion.';
  if (!context.subscription.active) return isEnglish(language) ? 'You do not currently have an active subscription.' : 'Ahora mismo no tienes una suscripcion activa.';
  return context.subscription.nextDelivery
    ? (isEnglish(language)
      ? `The next delivery of your subscription is scheduled for ${formatDate(context.subscription.nextDelivery, language)}.`
      : `La proxima entrega de tu suscripcion esta prevista para ${formatDate(context.subscription.nextDelivery, language)}.`)
    : (isEnglish(language) ? 'The next delivery has not been calculated yet.' : 'La proxima entrega todavia no esta calculada.');
}
function describeDeliveryDate(context, language = 'es') {
  if (context.screen === 'mis-pedidos' && context.lastOrder) return describeLastOrderDate(context, language);
  if (context.cart.mode === 'suscripcion' || context.firstOrder.mode === 'suscripcion' || context.subscription.active) {
    return context.subscription.nextDelivery
      ? (isEnglish(language)
        ? `The expected date for your next weekly delivery is ${formatDate(context.subscription.nextDelivery, language)}.`
        : `La fecha prevista para tu siguiente entrega semanal es ${formatDate(context.subscription.nextDelivery, language)}.`)
      : (isEnglish(language)
        ? 'The weekly delivery date is calculated from the selected day and the last recorded delivery.'
        : 'La fecha de entrega semanal se calcula a partir del dia seleccionado y de la ultima entrega registrada.');
  }
  if (!context.cart.hasItems) return isEnglish(language) ? 'You first need to add dishes to the cart to have an estimated delivery date.' : 'Primero necesitas anadir platos al carrito para tener una fecha de entrega prevista.';
  return isEnglish(language)
    ? 'For an individual order, the expected date is calculated using the selected time slot and shown in the final order summary.'
    : 'En el pedido individual la fecha prevista se calcula con la franja seleccionada y queda reflejada en el resumen final del pedido.';
}
function compareSubscriptionVsIndividual(context, language = 'es') {
  if (isEnglish(language)) {
    if (!hasFoodProfile(context.profile)) return 'If you only want to try SANZEN once, the individual order fits better. If you plan to order every week and want to keep a stable selection, the weekly subscription fits better.';
    if (context.subscription.active) return 'Because you already have an active subscription, it makes sense to keep it if you continue ordering every week. If you only want a one-off purchase, you can place an individual order without losing your subscription.';
    if (context.firstOrder.mode === 'suscripcion' || context.cart.mode === 'suscripcion') return 'Right now your purchase is already oriented towards a subscription. It fits if you want to keep this selection as your weekly base and renew it later.';
    if (context.cart.itemCount >= 5 && context.cart.total < 20) return 'With your current selection, the subscription may fit better because you are already close to the minimum of 5 dishes. If you only want a one-off purchase, keep the individual order and exceed 20 EUR.';
    return 'The individual order is better if you want a one-off purchase. The subscription fits better if you usually order every week and want to keep a stable selection.';
  }

  if (!hasFoodProfile(context.profile)) return 'Si quieres probar solo una vez, te conviene mas el pedido individual. Si piensas pedir cada semana y quieres guardar una seleccion estable, te conviene mas la suscripcion semanal.';
  if (context.subscription.active) return 'Como ya tienes una suscripcion activa, te conviene mantenerla si sigues pidiendo cada semana. Si solo quieres una compra puntual, puedes hacer un pedido individual sin perder tu suscripcion.';
  if (context.firstOrder.mode === 'suscripcion' || context.cart.mode === 'suscripcion') return 'Ahora mismo ya estas orientando la compra hacia suscripcion. Te conviene si quieres mantener esta seleccion como base semanal y renovarla despues.';
  if (context.cart.itemCount >= 5 && context.cart.total < 20) return 'Con la seleccion actual, la suscripcion puede encajarte mejor porque ya estas cerca del minimo de 5 platos. Si solo quieres una compra puntual, sigue con pedido individual y supera los 20 EUR.';
  return 'El pedido individual es mejor si quieres una compra puntual. La suscripcion te conviene mas si sueles pedir cada semana y quieres guardar una seleccion estable.';
}
function describeProfile(context, language = 'es') {
  if (!hasFoodProfile(context.profile)) {
    if (isEnglish(language)) {
      return context.profile.profileCompleteForPayment
        ? 'I do not see food preferences defined in your profile. You can add allergens, a nutritional goal and composition preferences from Profile to receive more precise recommendations.'
        : 'You do not have a food profile defined yet. You can complete it in Profile with your allergens, nutritional goal and composition preferences.';
    }
    return context.profile.profileCompleteForPayment ? 'No veo preferencias alimentarias definidas en tu perfil. Puedes anadir alergenos, objetivo nutricional y preferencias de composicion desde Perfil para recibir recomendaciones mas precisas.' : 'Todavia no tienes un perfil alimentario definido. Puedes completarlo en Perfil con tus alergenos, objetivo nutricional y preferencias de composicion.';
  }
  const parts = [];
  const allergies = localizeAllergenList(context.profile.allergies, language);
  parts.push(allergies.length ? `${isEnglish(language) ? 'allergens' : 'alergenos'}: ${allergies.join(', ')}` : (isEnglish(language) ? 'no marked allergens' : 'sin alergenos marcados'));
  if (context.profile.objective) parts.push(`${isEnglish(language) ? 'goal' : 'objetivo'}: ${describeObjectiveValue(context.profile.objective, language)}`);
  if (context.profile.compositionPreferences.length) parts.push(`${isEnglish(language) ? 'preferences' : 'preferencias'}: ${describePreferences(context.profile.compositionPreferences, language)}`);
  return isEnglish(language) ? `Your current profile is: ${parts.join('; ')}.` : `Tu perfil actual es: ${parts.join('; ')}.`;
}
function recommendDishes(context, language = 'es') {
  const dishes = getRecommendedCatalog(context);
  if (!dishes.length) {
    return isEnglish(language)
      ? 'I do not see dishes clearly compatible with your current profile. You can review your filters or complete your food profile better to refine the recommendation.'
      : 'No veo platos claramente compatibles con tu perfil actual. Puedes revisar tus filtros o completar mejor tu perfil alimentario para afinar la recomendacion.';
  }

  const restrictions = buildProfileRestrictionsText(context.profile, language);
  const names = dishes.map((dish) => `${dish.name} (${dish.price.toFixed(2)} EUR, HealthScore ${dish.healthScore})`).join(', ');
  if (context.profile.objective === 'perder-peso') {
    return isEnglish(language)
      ? `Based on your goal of losing weight${restrictions}, I would recommend ${names}. These options are more favourable in terms of nutritional balance and overall profile.`
      : `Segun tu objetivo de perder peso${restrictions}, te recomendaria ${names}. Son opciones mas favorables por equilibrio nutricional y perfil general.`;
  }

  if (context.profile.objective === 'masa-muscular') {
    return isEnglish(language)
      ? `Based on your goal of building muscle${restrictions}, I would recommend ${names}. These dishes fit better with a higher-protein objective.`
      : `Segun tu objetivo de masa muscular${restrictions}, te recomendaria ${names}. Son platos que encajan mejor con una busqueda de mayor aporte proteico.`;
  }

  return isEnglish(language)
    ? `Based on your current profile${restrictions}, I would recommend ${names}.`
    : `Segun tu perfil actual${restrictions}, te recomendaria ${names}.`;
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

function buildHealthSupportFallbackMessage(healthQuery, candidates, profile, language = 'es') {
  const nutrientLabel = isEnglish(language) ? 'fiber' : 'fibra';
  const isConstipation = healthQuery.key === 'estreñimiento' || healthQuery.key === 'estrenimiento';
  const dishes = candidates.map((dish) => `${dish.name} (${isConstipation ? `${nutrientLabel} ${Number(dish.fiberG ?? 0).toFixed(1)} g, ` : ''}${dish.price.toFixed(2)} EUR)`).join(', ');
  const profileText = buildProfileSupportText(profile, language);
  if (isConstipation) {
    return isEnglish(language)
      ? `Without replacing medical advice, for a question like ${healthQuery.key} I would prioritise compatible dishes with more fiber and good lightness${profileText}. The menu options that fit best are ${dishes}. If the problem persists, it is best to consult a professional.`
      : `Sin sustituir una indicacion medica, para una consulta como ${healthQuery.key} te sugeriria priorizar platos compatibles con mas fibra y buena ligereza${profileText}. En el menu te encajan especialmente ${dishes}. Si el problema persiste, conviene consultarlo con un profesional.`;
  }

  if (Array.isArray(healthQuery.dataLimitations) && healthQuery.dataLimitations.length) {
    return isEnglish(language)
      ? `I do not have a sufficiently reliable basis to answer that health question precisely using only SANZEN data${profileText}. ${healthQuery.dataLimitations.join(' ')} If you want, I can give you general guidance with compatible dishes such as ${dishes}, or help you with recommendations according to your profile and app usage.`
      : `No tengo una base suficientemente fiable para responder con precision a esa consulta medica usando solo los datos de SANZEN${profileText}. ${healthQuery.dataLimitations.join(' ')} Si quieres, puedo orientarte de forma general con platos compatibles como ${dishes}, o ayudarte con recomendaciones segun tu perfil y el uso de la app.`;
  }

  return isEnglish(language)
    ? `Without replacing medical advice, these menu options fit that question better${profileText}: ${dishes}.`
    : `Sin sustituir una indicacion medica, estas opciones del menu encajan mejor con esa consulta${profileText}: ${dishes}.`;
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

function buildSafeRecommendationFallback(message, context, source, language = 'es') {
  if (!detectHealthQuery(message) && !isOpenRecommendationQuestion(message)) {
    return null;
  }

  return buildResponse(
    isEnglish(language)
      ? 'I do not have a reliable answer for that specific question right now. If you want, I can help you recommend dishes according to your profile, allergens and nutritional goal, or explain how the app works.'
      : 'No tengo una respuesta fiable para esa consulta concreta en este momento. Si quieres, puedo ayudarte a recomendar platos segun tu perfil, alergenos y objetivo nutricional, o explicarte como funciona la app.',
    [navigateAction('/menu', language), navigateAction('/como-funciona', language)],
    source
  );
}

function buildStructuredCatalogResponse(message, context, source, language = 'es') {
  const query = parseStructuredCatalogQuery(message);

  if (!query) {
    return null;
  }

  const allCatalogMatches = context.catalog.filter((dish) => matchesStructuredCatalogQuery(dish, query));
  const compatibleCatalogMatches = getCompatibleCatalog(context).filter((dish) => matchesStructuredCatalogQuery(dish, query));

  if (!allCatalogMatches.length) {
    return buildResponse(
      isEnglish(language)
        ? `I cannot find dishes in the current menu ${describeCatalogQuery(query, language)}.`
        : `No encuentro platos del menu actual ${describeCatalogQuery(query, language)}.`,
      [navigateAction('/menu', language)],
      source
    );
  }

  if (!compatibleCatalogMatches.length) {
    return buildResponse(
      isEnglish(language)
        ? `I found menu dishes ${describeCatalogQuery(query, language)}, but none of them is compatible with your current profile and selected allergens.`
        : `He encontrado platos del menu ${describeCatalogQuery(query, language)}, pero ninguno es compatible con tu perfil actual y tus alergenos seleccionados.`,
      [navigateAction('/perfil', language), navigateAction('/menu', language)],
      source
    );
  }

  const rankedMatches = orderStructuredCatalogMatches(compatibleCatalogMatches, query, context.profile).slice(0, 3);
  return buildResponse(
    describeStructuredCatalogResult(query, rankedMatches, context.profile, language),
    [navigateAction('/menu', language)],
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
    dinner: /\bcenar\b|\bcena\b|\bdinner\b|\bevening\b/.test(message),
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

  if (/(low|lower|less)\s+(in\s+)?(fiber|protein|fat|carb|carbs|carbohydrate|carbohydrates)/.test(message)) {
    return 'low';
  }

  if (/(alto|alta|altos|altas|rico|rica|ricos|ricas|mas|mucho|mucha)\s+(contenido\s+en\s+)?(fibra|proteina|proteinas|grasa|grasas|carbohidrato|carbohidratos|hidrato|hidratos)/.test(message)) {
    return 'high';
  }

  if (/(high|higher|rich|more)\s+(in\s+)?(fiber|protein|fat|carb|carbs|carbohydrate|carbohydrates)/.test(message)) {
    return 'high';
  }

  return fallbackDirection;
}

function extractCatalogTerms(message, nutrientQuery, exclude) {
  const sanitizedMessage = nutrientQuery ? stripNutrientFragments(message) : message;
  const terms = [];
  const patterns = exclude
    ? [/\bsin\s+([a-z0-9áéíóúñü,\s-]+)/g, /\bwithout\s+([a-z0-9áéíóúñü,\s-]+)/g]
    : [
        /\b(?:lleven|lleva|tengan|tenga|contengan|contenga|incluyan|incluya)\s+([a-z0-9áéíóúñü,\s-]+)/g,
        /\b(?:platos?|menu)\s+con\s+([a-z0-9áéíóúñü,\s-]+)/g,
        /\bcon\s+([a-z0-9áéíóúñü-]+)\b/g,
        /\b(?:dishes?|menu)\s+with\s+([a-z0-9áéíóúñü,\s-]+)/g,
        /\bwith\s+([a-z0-9áéíóúñü-]+)\b/g
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
    .split(/,| y | and /)
    .map((term) => normalizarMensaje(term))
    .map((term) => term.replace(/^(de|del|la|las|el|los)\s+/, '').trim())
    .map((term) => term.replace(/\bpara\s+(cenar|cena)\b/g, '').trim())
    .map((term) => term.replace(/\bfor\s+(dinner|evening)\b/g, '').trim())
    .map((term) => term.replace(/\b(menu|platos?|que|lleven|lleva|tengan|tenga|contengan|contenga|incluyan|incluya|dishes?|with|containing)\b/g, '').trim())
    .map((term) => term.replace(/\bvegetarian[oa]s?\b|\bvegano?s?\b/g, '').trim())
    .filter((term) => term.length >= 2 && !isPureQuestionBoilerplate(term));
}

function isPureQuestionBoilerplate(term) {
  return ['hay', 'haya', 'dime', 'quiero', 'busco', 'actual', 'show', 'tell', 'want', 'looking', 'current'].includes(term);
}

function mentionsCatalogScope(message) {
  return message.includes('menu') || message.includes('plato') || message.includes('platos') || message.includes('dish') || message.includes('dishes') || message.includes('lleven') || message.includes('tengan') || message.includes('with ') || message.includes('without ') || message.includes('sin ') || message.includes('cena') || message.includes('cenar') || message.includes('dinner') || message.includes('vegetar');
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
    ...(dish.allergens ?? []),
    ...(dish.ingredients ?? []),
    ...(dish.sideDishes ?? [])
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

function describeStructuredCatalogResult(query, dishes, profile, language = 'es') {
  const intro = buildStructuredCatalogIntro(query, profile, language);
  const details = dishes.map((dish) => formatStructuredDish(dish, query, language)).join(', ');
  return `${intro} ${details}.`;
}

function buildStructuredCatalogIntro(query, profile, language = 'es') {
  if (isEnglish(language)) {
    const qualifiers = [];
    if (query.vegetarian) qualifiers.push('vegetarian');
    if (query.light) qualifiers.push('lighter');
    if (query.dinner) qualifiers.push('suitable for dinner');
    if (query.nutrientQuery) qualifiers.push(`${query.nutrientQuery.direction === 'low' ? 'lower' : 'higher'} in ${getNutrientLabel(query.nutrientQuery.field, language)}`);
    if (query.includeTerms.length) qualifiers.push(`with ${naturalList(query.includeTerms, language)}`);
    if (query.excludeTerms.length) qualifiers.push(`without ${naturalList(query.excludeTerms, language)}`);

    const profileParts = [];
    if ((profile.allergies ?? []).length) profileParts.push('avoiding incompatible allergens');
    if (profile.objective) profileParts.push(`aligned with your goal of ${describeObjectiveValue(profile.objective, language)}`);
    if ((profile.compositionPreferences ?? []).length) profileParts.push(`prioritising ${describePreferences(profile.compositionPreferences, language)}`);

    const qualifierText = qualifiers.length ? ` ${qualifiers.join(', ')}` : '';
    const profileText = profileParts.length ? ` and taking your profile into account (${profileParts.join(', ')})` : '';
    return `The menu dishes${qualifierText} that fit you best${profileText} are`;
  }

  const profileParts = [];

  if ((profile.allergies ?? []).length) {
    profileParts.push('evitando alergenos incompatibles');
  }

  if (profile.objective) {
    profileParts.push(`alineados con tu objetivo de ${describeObjectiveValue(profile.objective, language)}`);
  }

  if ((profile.compositionPreferences ?? []).length) {
    profileParts.push(`priorizando ${describePreferences(profile.compositionPreferences, language)}`);
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

function formatStructuredDish(dish, query, language = 'es') {
  if (query.nutrientQuery) {
    const nutrientValue = Number(dish[query.nutrientQuery.field] ?? 0).toFixed(1);
    return `${dish.name} (${getNutrientLabel(query.nutrientQuery.field, language)} ${nutrientValue} g, ${dish.price.toFixed(2)} EUR, HealthScore ${dish.healthScore})`;
  }

  return `${dish.name} (${dish.price.toFixed(2)} EUR, HealthScore ${dish.healthScore})`;
}

function describeCatalogQuery(query, language = 'es') {
  if (isEnglish(language)) {
    const qualifiers = [];
    if (query.vegetarian) qualifiers.push('vegetarian');
    if (query.light) qualifiers.push('lighter');
    if (query.dinner) qualifiers.push('suitable for dinner');
    if (query.nutrientQuery) qualifiers.push(`${query.nutrientQuery.direction === 'low' ? 'lower' : 'higher'} in ${getNutrientLabel(query.nutrientQuery.field, language)}`);
    if (query.includeTerms.length) qualifiers.push(`with ${naturalList(query.includeTerms, language)}`);
    if (query.excludeTerms.length) qualifiers.push(`without ${naturalList(query.excludeTerms, language)}`);
    return qualifiers.length ? qualifiers.join(', ') : 'matching your search';
  }

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

function describeCatalogTerms(terms, negative, language = 'es') {
  const text = naturalList(terms, language);
  if (isEnglish(language)) {
    return negative ? `without ${text}` : `with ${text}`;
  }

  return negative ? `sin ${text}` : `que llevan ${text}`;
}

function firstOrderActions(context, language = 'es') {
  if (!context.userAuthenticated) return [navigateAction('/menu', language), navigateAction('/login', language)];
  return !context.profile.profileCompleteForPayment ? [navigateAction('/perfil', language)] : [navigateAction('/menu', language)];
}
function paymentActions(context, language = 'es') {
  if (!context.userAuthenticated) return [navigateAction('/login', language)];
  return context.profile.profileCompleteForPayment ? [navigateAction('/pago', language)] : [navigateAction('/perfil', language)];
}
function missingFieldsActions(context, language = 'es') {
  if (!context.userAuthenticated) return [navigateAction('/login', language)];
  return [navigateAction('/perfil', language)];
}
function blockingActions(context, language = 'es') {
  if (!context.userAuthenticated) return [navigateAction('/login', language)];
  const actions = [];
  if (['resumen', 'perfil', 'pago'].includes(context.screen) && !context.profile.profileCompleteForPayment) actions.push(navigateAction('/perfil', language));
  if (!context.cart.hasItems || (context.cart.mode === 'individual' && !context.cart.meetsMinimum)) actions.push(navigateAction('/menu', language));
  if (context.cart.mode === 'suscripcion' && !context.subscription.complete) actions.push(navigateAction('/menu?subscriptionSelection=1', language));
  if (!actions.length) actions.push(navigateAction('/resumen', language));
  return actions.slice(0, 2);
}
function subscriptionActions(context, language = 'es') {
  if (!context.userAuthenticated) return [navigateAction('/login', language)];
  if (!context.subscription.active) return [navigateAction('/suscripcion', language), navigateAction('/como-funciona', language)];
  return [navigateAction('/suscripcion', language), navigateAction('/menu?subscriptionSelection=1', language)];
}
function deliveryActions(context, language = 'es') {
  if (context.screen === 'suscripcion' || context.subscription.active) return subscriptionActions(context, language);
  return [navigateAction(context.screen === 'pago' ? '/pago' : '/resumen', language)];
}
function lastOrderActions(context, language = 'es') {
  return context.userAuthenticated ? [navigateAction('/mis-pedidos', language)] : [navigateAction('/login', language)];
}

function defaultMessage(context, language = 'es') {
  if (isEnglish(language)) {
    switch (context.screen) {
      case 'menu':
        return 'I can help you choose dishes, compare subscription vs individual order, or explain why you cannot continue from this menu.';
      case 'resumen':
        return 'I can summarise your cart, tell you what is missing to continue, and guide you to the next step.';
      case 'pago':
        return 'I can explain what detail is missing, review the order summary, or tell you whether your profile is ready for payment.';
      case 'suscripcion':
        return 'I can summarise your current subscription, explain how to renew it, or tell you when the next delivery will be.';
      case 'mis-pedidos':
        return 'I can summarise your last order or help you review previous orders from this screen.';
      default:
        return 'I can help you choose dishes, understand your subscription, review order blockers, or summarise your last order.';
    }
  }

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
function defaultActions(context, language = 'es') {
  switch (context.screen) {
    case 'suscripcion':
      return [navigateAction('/suscripcion', language), navigateAction('/menu?subscriptionSelection=1', language)];
    case 'pago':
      return [navigateAction('/perfil', language), navigateAction('/resumen', language)];
    case 'mis-pedidos':
      return [navigateAction('/mis-pedidos', language), navigateAction('/menu', language)];
    default:
      return [navigateAction('/menu', language), navigateAction('/como-funciona', language)];
  }
}

function sanitizeTarget(target) {
  const normalized = target.trim();
  if (ALLOWED_TARGETS.includes(normalized)) return normalized;
  if (normalized.startsWith('/menu?subscriptionSelection=1')) return '/menu?subscriptionSelection=1';
  return null;
}
function buildLabelForTarget(target, language = 'es') {
  const normalized = sanitizeTarget(target);
  const labels = TARGET_LABELS[resolveAssistantLanguage(language)];
  return labels[normalized] || labels.default;
}

function hasFoodProfile(profile) {
  return Boolean((profile.allergies ?? []).length || profile.objective || (profile.compositionPreferences ?? []).length);
}
function describeObjectiveValue(value, language = 'es') {
  if (value === 'perder-peso') return isEnglish(language) ? 'lose weight' : 'perder peso';
  if (value === 'masa-muscular') return isEnglish(language) ? 'build muscle' : 'ganar masa muscular';
  return value;
}
function describePreferences(items, language = 'es') {
  return items.map((item) => {
    if (item === 'ricos-proteina') return isEnglish(language) ? 'high protein' : 'ricos en proteina';
    if (item === 'bajos-grasas') return isEnglish(language) ? 'low fat' : 'bajos en grasas';
    if (item === 'bajos-carbohidratos') return isEnglish(language) ? 'low carb' : 'bajos en carbohidratos';
    return item;
  }).join(', ');
}
function buildProfileRestrictionsText(profile, language = 'es') {
  const allergies = localizeAllergenList(profile.allergies, language);
  if (!(Array.isArray(allergies) && allergies.length)) {
    return '';
  }

  return isEnglish(language)
    ? ` while avoiding incompatible allergens such as ${allergies.join(', ')}`
    : ` y evitando alergenos incompatibles como ${allergies.join(', ')}`;
}
function buildProfileSupportText(profile, language = 'es') {
  const parts = [];
  if (Array.isArray(profile.allergies) && profile.allergies.length) {
    parts.push(isEnglish(language) ? 'avoiding incompatible allergens' : 'evitando alergenos incompatibles');
  }
  if (profile.objective) {
    parts.push(isEnglish(language)
      ? `aligned with your goal of ${describeObjectiveValue(profile.objective, language)}`
      : `alineado con tu objetivo de ${describeObjectiveValue(profile.objective, language)}`);
  }
  if (Array.isArray(profile.compositionPreferences) && profile.compositionPreferences.length) {
    parts.push(isEnglish(language)
      ? `prioritising ${describePreferences(profile.compositionPreferences, language)}`
      : `priorizando ${describePreferences(profile.compositionPreferences, language)}`);
  }
  return parts.length
    ? (isEnglish(language) ? ` and taking your profile into account (${parts.join(', ')})` : ` y teniendo en cuenta tu perfil (${parts.join(', ')})`)
    : '';
}
function naturalList(items, language = 'es') {
  const values = Array.isArray(items) ? items.filter((item) => typeof item === 'string' && item.trim() !== '').map((item) => item.trim()) : [];
  if (!values.length) return isEnglish(language) ? 'no data' : 'ningun dato';
  if (values.length === 1) return values[0];
  if (values.length === 2) return isEnglish(language) ? `${values[0]} and ${values[1]}` : `${values[0]} y ${values[1]}`;
  return isEnglish(language)
    ? `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`
    : `${values.slice(0, -1).join(', ')} y ${values[values.length - 1]}`;
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
function formatDate(value, language = 'es') {
  if (!value) return isEnglish(language) ? 'no date available' : 'sin fecha disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return isEnglish(language) ? 'no date available' : 'sin fecha disponible';
  return new Intl.DateTimeFormat(isEnglish(language) ? 'en-GB' : 'es-ES', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function localizeFieldName(field, language = 'es') {
  const normalized = normalizeComparisonKey(field);
  return FIELD_LABELS[normalized]?.[resolveAssistantLanguage(language)] || field;
}

function localizeFieldList(fields, language = 'es') {
  return Array.isArray(fields) ? fields.map((field) => localizeFieldName(field, language)) : [];
}

function localizeAllergenName(allergen, language = 'es') {
  const normalized = ALLERGEN_ALIASES[normalizeComparisonKey(allergen)] || normalizeComparisonKey(allergen);
  return ALLERGEN_LABELS[normalized]?.[resolveAssistantLanguage(language)] || allergen;
}

function localizeAllergenList(allergens, language = 'es') {
  return Array.isArray(allergens) ? allergens.map((allergen) => localizeAllergenName(allergen, language)) : [];
}

function localizeDay(day, language = 'es') {
  const normalized = normalizeComparisonKey(day);
  return DAY_LABELS[normalized]?.[resolveAssistantLanguage(language)] || day;
}

function getNutrientLabel(field, language = 'es') {
  return NUTRIENT_LABELS[field]?.[resolveAssistantLanguage(language)] || field;
}

module.exports = {
  resolveAssistantLanguage,
  isEnglish,
  navigateAction,
  buildRuleBasedResponse,
  buildFallbackResponse,
  buildResponse,
  normalizeHistory,
  resolveMessageWithHistory,
  isFollowUpMessage,
  normalizarMensaje,
  detectHealthQuery,
  getHealthSupportCandidates,
  buildHealthSupportFallbackMessage,
  buildStructuredCatalogResponse,
  sanitizeTarget,
  buildLabelForTarget,
  defaultMessage,
  isOpenRecommendationQuestion,
  detectSpecialCatalogQuery,
  detectNutrientQuery,
  getOpenRecommendationCandidates,
  getCompatibleCatalog,
  getRecommendedCatalog
};
