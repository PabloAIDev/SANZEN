const test = require('node:test');
const assert = require('node:assert/strict');
const { generateAssistantResponse, __test__ } = require('../src/services/assistant.service');

function createContext(overrides = {}) {
  return {
    screen: 'menu',
    userAuthenticated: true,
    user: {
      name: 'Ana',
      email: 'ana@example.com'
    },
    profile: {
      name: 'Ana',
      allergies: [],
      objective: 'masa-muscular',
      compositionPreferences: ['ricos-proteina'],
      basicComplete: true,
      addressComplete: true,
      cardComplete: true,
      profileCompleteForPayment: true,
      missingBasicFields: [],
      missingPaymentFields: []
    },
    cart: {
      mode: 'individual',
      itemCount: 1,
      total: 24.5,
      meetsMinimum: true,
      hasItems: true,
      items: [
        {
          name: 'Rollitos Nem',
          category: 'Entrante',
          quantity: 1,
          price: 6.5,
          subtotal: 6.5,
          healthScore: 7.8,
          allergens: ['Soja']
        }
      ]
    },
    subscription: {
      active: false,
      day: 'lunes',
      minimumItems: 5,
      selectedItemCount: 0,
      complete: false,
      nextDelivery: '',
      items: []
    },
    firstOrder: {
      active: false,
      mode: null
    },
    lastOrder: null,
    nextScheduledOrder: null,
    ordersSummary: {
      totalOrders: 0,
      recentOrders: []
    },
    catalog: [
      {
        id: 1,
        name: 'Rollitos Nem',
        description: 'Entrante crujiente',
        category: 'Entrante',
        price: 6.5,
        calories: 320,
        proteinG: 18,
        carbohydratesG: 25,
        fatG: 14,
        fiberG: 2,
        healthScore: 7.8,
        allergens: ['Soja']
      },
      {
        id: 2,
        name: 'Pollo teriyaki',
        description: 'Principal proteico',
        category: 'Principal',
        price: 9.5,
        calories: 410,
        proteinG: 31,
        carbohydratesG: 18,
        fatG: 14,
        fiberG: 3,
        healthScore: 8.4,
        allergens: []
      }
    ],
    appRules: {
      individualMinimumAmount: 20,
      subscriptionMinimumItems: 5
    },
    ...overrides
  };
}

test('buildModelContext no incluye email pero conserva el nombre', () => {
  const modelContext = __test__.buildModelContext(createContext());

  assert.deepEqual(modelContext.user, { name: 'Ana' });
  assert.equal(Object.prototype.hasOwnProperty.call(modelContext.user, 'email'), false);
});

test('sanitizeAssistantResponse solo mantiene acciones navigate permitidas', () => {
  const response = __test__.sanitizeAssistantResponse(
    {
      message: 'Te puedo ayudar con esto.',
      actions: [
        { type: 'navigate', target: 'https://evil.example', label: 'Abrir fuera' },
        { type: 'navigate', target: '/menu?subscriptionSelection=1&extra=1', label: ' Ir al menu ' },
        { type: 'navigate', target: '/perfil', label: '' }
      ]
    },
    createContext(),
    'openai'
  );

  assert.deepEqual(response.actions, [
    { type: 'navigate', target: '/menu?subscriptionSelection=1', label: 'Modificar seleccion' },
    { type: 'navigate', target: '/perfil', label: 'Completar perfil' }
  ]);
});

test('generateAssistantResponse mantiene fallback local si no hay OPENAI_API_KEY', async () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  try {
    delete process.env.OPENAI_API_KEY;

    const response = await generateAssistantResponse({
      message: 'Que me recomiendas para cenar?',
      context: createContext(),
      history: []
    });

    assert.equal(response.source, 'fallback');
    assert.equal(typeof response.message, 'string');
    assert.ok(response.message.length > 0);
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  }
});

test('generateAssistantResponse usa fallback si OpenAI devuelve contenido malformado', async () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalFetch = global.fetch;

  try {
    process.env.OPENAI_API_KEY = 'test-key';
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'respuesta no json'
            }
          }
        ]
      })
    });

    const response = await generateAssistantResponse({
      message: 'Que me recomiendas para cenar?',
      context: createContext(),
      history: []
    });

    assert.equal(response.source, 'fallback');
    assert.equal(typeof response.message, 'string');
    assert.ok(response.message.length > 0);
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }

    global.fetch = originalFetch;
  }
});

test('generateAssistantResponse mantiene el contexto corto en preguntas de seguimiento como "Y sin gluten?"', async () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  try {
    delete process.env.OPENAI_API_KEY;

    const response = await generateAssistantResponse({
      message: 'Y sin gluten?',
      history: [
        { role: 'user', text: 'Quiero algo ligero' },
        { role: 'assistant', text: 'Te puedo recomendar varias opciones ligeras.' }
      ],
      context: createContext({
        profile: {
          name: 'Ana',
          allergies: [],
          objective: null,
          compositionPreferences: [],
          basicComplete: true,
          addressComplete: true,
          cardComplete: true,
          profileCompleteForPayment: true,
          missingBasicFields: [],
          missingPaymentFields: []
        },
        catalog: [
          {
            id: 1,
            name: 'Sopa miso',
            description: 'Ligera y suave',
            category: 'Entrante',
            price: 4.5,
            calories: 180,
            proteinG: 6,
            carbohydratesG: 12,
            fatG: 4,
            fiberG: 2,
            healthScore: 8.5,
            allergens: []
          },
          {
            id: 2,
            name: 'Pollo con arroz',
            description: 'Principal sin gluten',
            category: 'Principal',
            price: 9.5,
            calories: 460,
            proteinG: 30,
            carbohydratesG: 32,
            fatG: 14,
            fiberG: 3,
            healthScore: 7.4,
            allergens: []
          },
          {
            id: 3,
            name: 'Gyozas clasicas',
            description: 'Masa de trigo',
            category: 'Entrante',
            price: 6,
            calories: 220,
            proteinG: 10,
            carbohydratesG: 24,
            fatG: 9,
            fiberG: 2,
            healthScore: 7.2,
            allergens: ['Gluten']
          }
        ]
      })
    });

    assert.equal(response.source, 'fallback');
    assert.match(response.message, /sin gluten y mas ligeros/i);
    assert.ok(response.message.includes('Sopa miso'));
    assert.ok(response.message.includes('Pollo con arroz'));
    assert.ok(!response.message.includes('Gyozas clasicas'));
    assert.ok(response.message.indexOf('Sopa miso') < response.message.indexOf('Pollo con arroz'));
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  }
});

test('generateAssistantResponse responde en ingles para preguntas guiadas cuando el idioma es en', async () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  try {
    delete process.env.OPENAI_API_KEY;

    const response = await generateAssistantResponse({
      message: 'How does SANZEN work?',
      context: createContext(),
      history: [],
      language: 'en'
    });

    assert.equal(response.source, 'rules');
    assert.match(response.message, /In SANZEN|You can currently use SANZEN|You can place individual orders/i);
    assert.deepEqual(response.actions, [
      { type: 'navigate', target: '/como-funciona', label: 'How it works' }
    ]);
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  }
});
