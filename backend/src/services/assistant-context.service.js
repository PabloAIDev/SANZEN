const pool = require('../config/db');

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function normalizarNumero(valor) {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : 0;
  }

  if (typeof valor === 'string') {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
  }

  return 0;
}

function normalizarArrayTextos(valor) {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}

function textoValido(valor, minimo) {
  return normalizarTexto(valor).length >= minimo;
}

function codigoPostalValido(valor) {
  return /^\d{5}$/.test(normalizarTexto(valor));
}

function telefonoValido(valor) {
  return /^\d{9}$/.test(normalizarTexto(valor).replace(/\s/g, ''));
}

function numeroTarjetaValido(valor) {
  const digitos = normalizarTexto(valor).replace(/\D/g, '');
  return /^\d{16}$/.test(digitos);
}

function fechaCaducidadValida(valor) {
  const coincidencia = normalizarTexto(valor).match(/^(\d{2})\/(\d{2}|\d{4})$/);

  if (!coincidencia) {
    return false;
  }

  const mes = Number(coincidencia[1]);
  const anioTexto = coincidencia[2];

  if (mes < 1 || mes > 12) {
    return false;
  }

  const anio = anioTexto.length === 2 ? 2000 + Number(anioTexto) : Number(anioTexto);
  const fechaExpiracion = new Date(anio, mes, 0, 23, 59, 59, 999);
  return fechaExpiracion >= new Date();
}

function cvvValido(valor) {
  return /^\d{3}$/.test(normalizarTexto(valor));
}

function direccionCompleta(direccion) {
  return Boolean(
    direccion &&
    textoValido(direccion.nombre, 2) &&
    textoValido(direccion.calle_numero, 5) &&
    textoValido(direccion.ciudad, 2) &&
    codigoPostalValido(direccion.codigo_postal) &&
    textoValido(direccion.provincia, 2) &&
    telefonoValido(direccion.telefono)
  );
}

function tarjetaCompleta(tarjeta) {
  return Boolean(
    tarjeta &&
    textoValido(tarjeta.nombre_titular, 3) &&
    numeroTarjetaValido(tarjeta.numero_enmascarado) &&
    fechaCaducidadValida(tarjeta.fecha_caducidad) &&
    cvvValido(tarjeta.cvv)
  );
}

function parseJsonArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalizarCartContext(context) {
  const cart = context?.cart ?? {};
  const items = Array.isArray(cart.items)
    ? cart.items
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          id: normalizarNumero(item.id),
          name: normalizarTexto(item.name),
          category: normalizarTexto(item.category),
          quantity: normalizarNumero(item.quantity),
          price: normalizarNumero(item.price),
          subtotal: normalizarNumero(item.subtotal),
          healthScore: normalizarNumero(item.healthScore),
          allergens: normalizarArrayTextos(item.allergens)
        }))
        .filter((item) => item.id > 0 && item.quantity > 0)
    : [];

  return {
    mode: cart.mode === 'suscripcion' ? 'suscripcion' : 'individual',
    itemCount: normalizarNumero(cart.itemCount),
    total: normalizarNumero(cart.total),
    meetsMinimum: Boolean(cart.meetsMinimum),
    hasItems: Boolean(cart.hasItems),
    items
  };
}

function normalizarSubscriptionContext(context) {
  const subscription = context?.subscription ?? {};

  return {
    active: Boolean(subscription.active),
    day: normalizarTexto(subscription.day) || 'lunes',
    minimumItems: Math.max(normalizarNumero(subscription.minimumItems), 5),
    selectedItemCount: normalizarNumero(subscription.selectedItemCount),
    complete: Boolean(subscription.complete),
    nextDelivery: normalizarTexto(subscription.nextDelivery),
    items: Array.isArray(subscription.items)
      ? subscription.items
          .filter((item) => item && typeof item === 'object')
          .map((item) => ({
            id: normalizarNumero(item.id),
            name: normalizarTexto(item.name),
            quantity: normalizarNumero(item.quantity)
          }))
          .filter((item) => item.id > 0 && item.quantity > 0)
      : []
  };
}

function normalizarProfileContext(context) {
  const profile = context?.profile ?? {};

  return {
    name: normalizarTexto(profile.name),
    allergies: normalizarArrayTextos(profile.allergies),
    objective: normalizarTexto(profile.objective) || null,
    compositionPreferences: normalizarArrayTextos(profile.compositionPreferences),
    profileCompleteForPayment: Boolean(profile.profileCompleteForPayment)
  };
}

function normalizarFirstOrderContext(context) {
  const firstOrder = context?.firstOrder ?? {};

  return {
    active: Boolean(firstOrder.active),
    mode: firstOrder.mode === 'suscripcion' ? 'suscripcion' : firstOrder.mode === 'individual' ? 'individual' : null
  };
}

async function buildAssistantContext({ userId, screen, clientContext }) {
  const context = {
    screen: normalizarTexto(screen) || 'inicio',
    userAuthenticated: Boolean(userId),
    user: null,
    profile: normalizarProfileContext(clientContext),
    subscription: normalizarSubscriptionContext(clientContext),
    cart: normalizarCartContext(clientContext),
    firstOrder: normalizarFirstOrderContext(clientContext),
    lastOrder: null,
    catalog: [],
    appRules: {
      individualMinimumAmount: 20,
      subscriptionMinimumItems: 5
    }
  };

  if (userId) {
    const [userRows] = await pool.query(
      `
      SELECT nombre, email
      FROM usuarios
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    );

    const user = userRows[0] ?? null;
    context.user = user
      ? {
          name: normalizarTexto(user.nombre),
          email: normalizarTexto(user.email)
        }
      : null;

    const [[perfil]] = await pool.query(
      `
      SELECT id, objetivo_nutricional
      FROM perfiles
      WHERE usuario_id = ?
      LIMIT 1
      `,
      [userId]
    );

    const [alergenosRows] = perfil
      ? await pool.query(
          `
          SELECT a.nombre
          FROM perfil_alergenos pa
          INNER JOIN alergenos a ON a.id = pa.alergeno_id
          WHERE pa.perfil_id = ?
          ORDER BY a.nombre
          `,
          [perfil.id]
        )
      : [[]];

    const [preferenciasRows] = perfil
      ? await pool.query(
          `
          SELECT pc.nombre
          FROM perfil_preferencias pp
          INNER JOIN preferencias_composicion pc ON pc.id = pp.preferencia_id
          WHERE pp.perfil_id = ?
          ORDER BY pc.nombre
          `,
          [perfil.id]
        )
      : [[]];

    const [[direccion]] = await pool.query(
      `
      SELECT nombre, calle_numero, ciudad, codigo_postal, provincia, telefono
      FROM direcciones
      WHERE usuario_id = ?
      ORDER BY es_principal DESC, id ASC
      LIMIT 1
      `,
      [userId]
    );

    const [[tarjeta]] = await pool.query(
      `
      SELECT nombre_titular, numero_enmascarado, fecha_caducidad, cvv
      FROM tarjetas
      WHERE usuario_id = ?
      ORDER BY es_principal DESC, id ASC
      LIMIT 1
      `,
      [userId]
    );

    context.profile = {
      name: context.user?.name ?? context.profile.name,
      allergies: alergenosRows.map((row) => normalizarTexto(row.nombre)),
      objective: perfil?.objetivo_nutricional ?? null,
      compositionPreferences: preferenciasRows.map((row) => normalizarTexto(row.nombre)),
      profileCompleteForPayment: direccionCompleta(direccion) && tarjetaCompleta(tarjeta)
    };

    const [[subscriptionRow]] = await pool.query(
      `
      SELECT
        id,
        activa,
        dia_entrega,
        proxima_entrega
      FROM suscripciones
      WHERE usuario_id = ?
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
      `,
      [userId]
    );

    if (subscriptionRow) {
      const [subscriptionItemsRows] = await pool.query(
        `
        SELECT
          sp.plato_id,
          sp.cantidad,
          p.nombre
        FROM suscripcion_platos sp
        INNER JOIN platos p ON p.id = sp.plato_id
        WHERE sp.suscripcion_id = ?
        ORDER BY sp.id
        `,
        [subscriptionRow.id]
      );

      const selectedItemCount = subscriptionItemsRows.reduce(
        (total, item) => total + normalizarNumero(item.cantidad),
        0
      );

      context.subscription = {
        active: Boolean(subscriptionRow.activa),
        day: normalizarTexto(subscriptionRow.dia_entrega) || context.subscription.day,
        minimumItems: 5,
        selectedItemCount,
        complete: selectedItemCount >= 5,
        nextDelivery: subscriptionRow.proxima_entrega
          ? new Date(subscriptionRow.proxima_entrega).toISOString()
          : '',
        items: subscriptionItemsRows.map((item) => ({
          id: normalizarNumero(item.plato_id),
          name: normalizarTexto(item.nombre),
          quantity: normalizarNumero(item.cantidad)
        }))
      };
    }

    const [pedidoRows] = await pool.query(
      `
      SELECT
        id,
        numero_pedido,
        fecha_entrega_programada,
        total,
        es_suscripcion
      FROM pedidos
      WHERE usuario_id = ?
      ORDER BY fecha_creacion DESC, id DESC
      LIMIT 1
      `,
      [userId]
    );

    const lastOrderRow = pedidoRows[0] ?? null;

    if (lastOrderRow) {
      const [orderItemsRows] = await pool.query(
        `
        SELECT lp.plato_id, lp.cantidad, p.nombre
        FROM lineas_pedido lp
        INNER JOIN platos p ON p.id = lp.plato_id
        WHERE lp.pedido_id = ?
        ORDER BY lp.id
        `,
        [lastOrderRow.id]
      );

      context.lastOrder = {
        number: normalizarTexto(lastOrderRow.numero_pedido),
        deliveryDate: lastOrderRow.fecha_entrega_programada
          ? new Date(lastOrderRow.fecha_entrega_programada).toISOString()
          : '',
        total: normalizarNumero(lastOrderRow.total),
        subscription: Boolean(lastOrderRow.es_suscripcion),
        items: orderItemsRows.slice(0, 5).map((item) => ({
          id: normalizarNumero(item.plato_id),
          name: normalizarTexto(item.nombre),
          quantity: normalizarNumero(item.cantidad)
        }))
      };
    }
  }

  const [catalogRows] = await pool.query(
    `
    SELECT
      p.id,
      p.nombre,
      p.categoria,
      p.precio,
      p.calorias,
      p.health_score AS healthScore,
      COALESCE(JSON_ARRAYAGG(a.nombre), JSON_ARRAY()) AS allergens
    FROM platos p
    LEFT JOIN plato_alergenos pa ON pa.plato_id = p.id
    LEFT JOIN alergenos a ON a.id = pa.alergeno_id
    WHERE p.disponible = TRUE
    GROUP BY p.id, p.nombre, p.categoria, p.precio, p.calorias, p.health_score
    ORDER BY p.id
    `
  );

  context.catalog = catalogRows.map((item) => ({
    id: normalizarNumero(item.id),
    name: normalizarTexto(item.nombre),
    category: normalizarTexto(item.categoria),
    price: normalizarNumero(item.precio),
    calories: normalizarNumero(item.calorias),
    healthScore: normalizarNumero(item.healthScore),
    allergens: parseJsonArray(item.allergens).map((allergen) => normalizarTexto(allergen))
  }));

  return context;
}

module.exports = {
  buildAssistantContext
};
