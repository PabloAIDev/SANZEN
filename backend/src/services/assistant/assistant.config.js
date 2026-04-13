const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 12000);
const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_TEXT_LENGTH = 400;
const ALLOWED_TARGETS = ['/inicio', '/menu', '/resumen', '/pago', '/perfil', '/suscripcion', '/mis-pedidos', '/como-funciona', '/login'];
const NUTRIENT_QUERY_DEFINITIONS = [
  { field: 'fiberG', label: 'fibra', keywords: ['fibra', 'fiber'], defaultDirection: 'high' },
  { field: 'proteinG', label: 'proteina', keywords: ['proteina', 'proteinas', 'protein'], defaultDirection: 'high' },
  { field: 'fatG', label: 'grasas', keywords: ['grasa', 'grasas', 'fat', 'fats'], defaultDirection: 'low' },
  { field: 'carbohydratesG', label: 'carbohidratos', keywords: ['carbohidrato', 'carbohidratos', 'hidrato', 'hidratos', 'carb', 'carbs', 'carbohydrate', 'carbohydrates'], defaultDirection: 'low' }
];
const HEALTH_QUERY_DEFINITIONS = [
  {
    key: 'estreñimiento',
    pattern: /\bestrenim|\bestrinim|\btransito(?:\s+intestinal|\s+lento)?\b|\bconstipation\b|\bslow transit\b/,
    keywords: ['estrenim', 'estrinim', 'transito intestinal', 'transito lento', 'transito', 'constipation', 'slow transit'],
    nutrientField: 'fiberG',
    ranking: 'highFiber',
    guidance: 'El usuario busca platos que puedan encajar mejor con molestias de estreñimiento o tránsito lento. Responde con cautela, sin consejo médico fuerte, priorizando platos compatibles con más fibra y buena ligereza.'
  },
  {
    key: 'colesterol',
    pattern: /\bcolesterol\b|\bcolesterol alto\b|\bhigh cholesterol\b/,
    keywords: ['colesterol', 'high cholesterol'],
    ranking: 'lowFatHighFiber',
    guidance: 'El usuario pregunta por colesterol. Puedes orientar de forma general con los datos disponibles, priorizando grasa total mas baja y fibra mas alta, pero dejando claro que SANZEN no dispone de datos de grasas saturadas ni colesterol dietetico.',
    dataLimitations: ['No dispones de grasas saturadas.', 'No dispones de colesterol dietetico.']
  },
  {
    key: 'tension-alta',
    pattern: /\btension alta\b|\bhipertension\b|\bpresion alta\b|\bhigh blood pressure\b|\bhypertension\b/,
    keywords: ['tension alta', 'hipertension', 'presion alta', 'high blood pressure', 'hypertension'],
    ranking: 'general',
    guidance: 'El usuario pregunta por tension alta. Debes responder con prudencia y aclarar que SANZEN no dispone de datos de sodio o sal, asi que no puedes dar una recomendacion fiable para ese criterio medico.',
    dataLimitations: ['No dispones de sodio ni sal por plato.']
  },
  {
    key: 'gases',
    pattern: /\bgases\b|\bhinchazon\b|\bdistension\b|\bmeteorismo\b|\bbloating\b|\bgas\b/,
    keywords: ['gases', 'hinchazon', 'distension', 'meteorismo', 'bloating', 'gas'],
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
  /\binflamacion/,
  /\bhealth\b/,
  /\bwellness\b/,
  /\bmedical\b/,
  /\bdoctor\b/,
  /\bcondition\b/,
  /\bsymptom\b/,
  /\bdigestive\b/,
  /\bstomach\b/,
  /\bconstipation\b/,
  /\bbloating\b/,
  /\bhypertension\b/
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
  fish: 'pescado',
  crustaceos: 'crustaceos',
  crustaceo: 'crustaceos',
  crustacean: 'crustaceos',
  crustaceans: 'crustaceos',
  sesamo: 'sesamo',
  sesame: 'sesamo',
  legumbres: 'legumbres',
  legumbre: 'legumbres',
  legumes: 'legumbres',
  egg: 'huevo',
  eggs: 'huevo',
  soy: 'soja',
  dairy: 'lacteos',
  milk: 'lacteos',
  nuts: 'frutos secos',
  'tree nuts': 'frutos secos'
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
  'chuleta',
  'chicken',
  'pork',
  'beef',
  'meat',
  'shrimp',
  'fish',
  'tuna',
  'salmon',
  'seafood',
  'shellfish',
  'cutlet'
];

const TARGET_LABELS = {
  es: {
    '/menu': 'Ver menu',
    '/menu?subscriptionSelection=1': 'Modificar seleccion',
    '/suscripcion': 'Gestionar suscripcion',
    '/perfil': 'Completar perfil',
    '/pago': 'Ir al pago',
    '/mis-pedidos': 'Ver mis pedidos',
    '/resumen': 'Ver carrito',
    '/como-funciona': 'Como funciona',
    '/login': 'Iniciar sesion',
    '/inicio': 'Ir a inicio',
    default: 'Abrir'
  },
  en: {
    '/menu': 'View menu',
    '/menu?subscriptionSelection=1': 'Edit selection',
    '/suscripcion': 'Manage subscription',
    '/perfil': 'Complete profile',
    '/pago': 'Go to payment',
    '/mis-pedidos': 'View my orders',
    '/resumen': 'View cart',
    '/como-funciona': 'How it works',
    '/login': 'Sign in',
    '/inicio': 'Go to home',
    default: 'Open'
  }
};

const FIELD_LABELS = {
  'nombre de entrega': { es: 'nombre de entrega', en: 'delivery name' },
  'calle y numero': { es: 'calle y numero', en: 'street and number' },
  ciudad: { es: 'ciudad', en: 'city' },
  'codigo postal': { es: 'codigo postal', en: 'postal code' },
  provincia: { es: 'provincia', en: 'province' },
  telefono: { es: 'telefono', en: 'phone' },
  'nombre del titular': { es: 'nombre del titular', en: 'cardholder name' },
  'numero de tarjeta': { es: 'numero de tarjeta', en: 'card number' },
  'fecha de caducidad': { es: 'fecha de caducidad', en: 'expiry date' },
  nombre: { es: 'nombre', en: 'name' },
  email: { es: 'email', en: 'email' }
};

const DAY_LABELS = {
  lunes: { es: 'lunes', en: 'Monday' },
  martes: { es: 'martes', en: 'Tuesday' },
  miercoles: { es: 'miercoles', en: 'Wednesday' },
  jueves: { es: 'jueves', en: 'Thursday' },
  viernes: { es: 'viernes', en: 'Friday' },
  sabado: { es: 'sabado', en: 'Saturday' },
  domingo: { es: 'domingo', en: 'Sunday' }
};

const NUTRIENT_LABELS = {
  fiberG: { es: 'fibra', en: 'fiber' },
  proteinG: { es: 'proteina', en: 'protein' },
  fatG: { es: 'grasas', en: 'fat' },
  carbohydratesG: { es: 'carbohidratos', en: 'carbohydrates' }
};

const ALLERGEN_LABELS = {
  gluten: { es: 'gluten', en: 'gluten' },
  lacteos: { es: 'lacteos', en: 'dairy' },
  soja: { es: 'soja', en: 'soy' },
  huevo: { es: 'huevo', en: 'egg' },
  pescado: { es: 'pescado', en: 'fish' },
  crustaceos: { es: 'crustaceos', en: 'crustaceans' },
  sesamo: { es: 'sesamo', en: 'sesame' },
  legumbres: { es: 'legumbres', en: 'legumes' },
  'frutos secos': { es: 'frutos secos', en: 'tree nuts' }
};

module.exports = {
  OPENAI_API_URL,
  OPENAI_MODEL,
  OPENAI_TIMEOUT_MS,
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
};
