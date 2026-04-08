const pool = require('../config/db');
const TARJETA_ENMASCARADA_REGEX = /^\*{4}\s\*{4}\s\*{4}\s\d{4}$/;

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

function normalizarIdioma(valor) {
  return valor === 'en' ? 'en' : 'es';
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

function numeroTarjetaEnmascaradoValido(valor) {
  return TARJETA_ENMASCARADA_REGEX.test(normalizarTexto(valor));
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
    (numeroTarjetaEnmascaradoValido(tarjeta.numero_enmascarado) || numeroTarjetaValido(tarjeta.numero_enmascarado)) &&
    fechaCaducidadValida(tarjeta.fecha_caducidad)
  );
}

function emailValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarTexto(valor));
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function obtenerCamposFaltantesDireccion(direccion) {
  if (!direccion) {
    return [
      'nombre de entrega',
      'calle y numero',
      'ciudad',
      'codigo postal',
      'provincia',
      'telefono'
    ];
  }

  const missing = [];

  if (!textoValido(direccion.nombre, 2)) {
    missing.push('nombre de entrega');
  }

  if (!textoValido(direccion.calle_numero, 5)) {
    missing.push('calle y numero');
  }

  if (!textoValido(direccion.ciudad, 2)) {
    missing.push('ciudad');
  }

  if (!codigoPostalValido(direccion.codigo_postal)) {
    missing.push('codigo postal');
  }

  if (!textoValido(direccion.provincia, 2)) {
    missing.push('provincia');
  }

  if (!telefonoValido(direccion.telefono)) {
    missing.push('telefono');
  }

  return missing;
}

function obtenerCamposFaltantesTarjeta(tarjeta) {
  if (!tarjeta) {
    return [
      'nombre del titular',
      'numero de tarjeta',
      'fecha de caducidad'
    ];
  }

  const missing = [];

  if (!textoValido(tarjeta.nombre_titular, 3)) {
    missing.push('nombre del titular');
  }

  if (!numeroTarjetaEnmascaradoValido(tarjeta.numero_enmascarado) && !numeroTarjetaValido(tarjeta.numero_enmascarado)) {
    missing.push('numero de tarjeta');
  }

  if (!fechaCaducidadValida(tarjeta.fecha_caducidad)) {
    missing.push('fecha de caducidad');
  }

  return missing;
}

function obtenerCamposBasicosFaltantes(usuario, direccion) {
  const missing = [];

  if (!textoValido(usuario?.nombre, 2)) {
    missing.push('nombre');
  }

  if (!emailValido(usuario?.email)) {
    missing.push('email');
  }

  return unique([
    ...missing,
    ...obtenerCamposFaltantesDireccion(direccion)
  ]);
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

function normalizarCatalogoCliente(context) {
  if (!Array.isArray(context?.catalog)) {
    return [];
  }

  return context.catalog
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: normalizarNumero(item.id),
      name: normalizarTexto(item.name),
      description: normalizarTexto(item.description),
      category: normalizarTexto(item.category),
      allergens: normalizarArrayTextos(item.allergens),
      ingredients: normalizarArrayTextos(item.ingredients),
      sideDishes: normalizarArrayTextos(item.sideDishes ?? item.side_dishes)
    }))
    .filter((item) => item.id > 0);
}

function crearMapaCatalogoCliente(catalogoCliente) {
  return new Map(
    catalogoCliente.map((item) => [item.id, item])
  );
}

function aplicarNombreCliente(itemId, fallback, catalogoClienteMap) {
  return catalogoClienteMap.get(itemId)?.name || normalizarTexto(fallback);
}

function enriquecerPlatoDesdeCliente(plato, catalogoClienteMap) {
  const traduccionCliente = catalogoClienteMap.get(plato.id);

  if (!traduccionCliente) {
    return plato;
  }

  return {
    ...plato,
    name: traduccionCliente.name || plato.name,
    description: traduccionCliente.description || plato.description,
    allergens: traduccionCliente.allergens.length ? traduccionCliente.allergens : plato.allergens,
    ingredients: traduccionCliente.ingredients.length ? traduccionCliente.ingredients : plato.ingredients,
    sideDishes: traduccionCliente.sideDishes.length ? traduccionCliente.sideDishes : plato.sideDishes
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
    basicComplete: Boolean(profile.basicComplete),
    addressComplete: Boolean(profile.addressComplete),
    cardComplete: Boolean(profile.cardComplete),
    profileCompleteForPayment: Boolean(profile.profileCompleteForPayment),
    missingBasicFields: normalizarArrayTextos(profile.missingBasicFields),
    missingPaymentFields: normalizarArrayTextos(profile.missingPaymentFields)
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
  const catalogoCliente = normalizarCatalogoCliente(clientContext);
  const catalogoClienteMap = crearMapaCatalogoCliente(catalogoCliente);
  const context = {
    screen: normalizarTexto(screen) || 'inicio',
    language: normalizarIdioma(clientContext?.language),
    userAuthenticated: Boolean(userId),
    user: null,
    profile: normalizarProfileContext(clientContext),
    subscription: normalizarSubscriptionContext(clientContext),
    cart: normalizarCartContext(clientContext),
    firstOrder: normalizarFirstOrderContext(clientContext),
    lastOrder: null,
    nextScheduledOrder: null,
    ordersSummary: {
      totalOrders: 0,
      recentOrders: []
    },
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
          name: normalizarTexto(user.nombre)
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
      SELECT nombre_titular, numero_enmascarado, fecha_caducidad
      FROM tarjetas
      WHERE usuario_id = ?
      ORDER BY es_principal DESC, id ASC
      LIMIT 1
      `,
      [userId]
    );

    const missingBasicFields = obtenerCamposBasicosFaltantes(user, direccion);
    const missingPaymentFields = unique([
      ...obtenerCamposFaltantesDireccion(direccion),
      ...obtenerCamposFaltantesTarjeta(tarjeta)
    ]);

    context.profile = {
      name: context.user?.name ?? context.profile.name,
      allergies: alergenosRows.map((row) => normalizarTexto(row.nombre)),
      objective: perfil?.objetivo_nutricional ?? null,
      compositionPreferences: preferenciasRows.map((row) => normalizarTexto(row.nombre)),
      basicComplete: missingBasicFields.length === 0,
      addressComplete: direccionCompleta(direccion),
      cardComplete: tarjetaCompleta(tarjeta),
      profileCompleteForPayment: direccionCompleta(direccion) && tarjetaCompleta(tarjeta),
      missingBasicFields,
      missingPaymentFields
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
          name: aplicarNombreCliente(normalizarNumero(item.plato_id), item.nombre, catalogoClienteMap),
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

    const [[countRow]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM pedidos
      WHERE usuario_id = ?
      `,
      [userId]
    );

    const [recentOrderRows] = await pool.query(
      `
      SELECT
        numero_pedido,
        fecha_entrega_programada,
        total,
        es_suscripcion
      FROM pedidos
      WHERE usuario_id = ?
      ORDER BY fecha_creacion DESC, id DESC
      LIMIT 3
      `,
      [userId]
    );

    const [upcomingOrderRows] = await pool.query(
      `
      SELECT
        numero_pedido,
        fecha_entrega_programada,
        total,
        es_suscripcion
      FROM pedidos
      WHERE usuario_id = ? AND fecha_entrega_programada >= NOW()
      ORDER BY fecha_entrega_programada ASC, id ASC
      LIMIT 1
      `,
      [userId]
    );

    context.ordersSummary = {
      totalOrders: normalizarNumero(countRow?.total),
      recentOrders: recentOrderRows.map((pedido) => ({
        number: normalizarTexto(pedido.numero_pedido),
        deliveryDate: pedido.fecha_entrega_programada
          ? new Date(pedido.fecha_entrega_programada).toISOString()
          : '',
        total: normalizarNumero(pedido.total),
        subscription: Boolean(pedido.es_suscripcion)
      }))
    };

    context.nextScheduledOrder = upcomingOrderRows[0]
      ? {
          number: normalizarTexto(upcomingOrderRows[0].numero_pedido),
          deliveryDate: upcomingOrderRows[0].fecha_entrega_programada
            ? new Date(upcomingOrderRows[0].fecha_entrega_programada).toISOString()
            : '',
          total: normalizarNumero(upcomingOrderRows[0].total),
          subscription: Boolean(upcomingOrderRows[0].es_suscripcion)
        }
      : null;

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
          name: aplicarNombreCliente(normalizarNumero(item.plato_id), item.nombre, catalogoClienteMap),
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
      p.descripcion,
      p.categoria,
      p.precio,
      p.calorias,
      p.health_score AS healthScore,
      p.protein_g,
      p.carbohydrates_g,
      p.fat_g,
      p.fiber_g,
      COALESCE(JSON_ARRAYAGG(a.nombre), JSON_ARRAY()) AS allergens
    FROM platos p
    LEFT JOIN plato_alergenos pa ON pa.plato_id = p.id
    LEFT JOIN alergenos a ON a.id = pa.alergeno_id
    WHERE p.disponible = TRUE
    GROUP BY
      p.id,
      p.nombre,
      p.descripcion,
      p.categoria,
      p.precio,
      p.calorias,
      p.health_score,
      p.protein_g,
      p.carbohydrates_g,
      p.fat_g,
      p.fiber_g
    ORDER BY p.id
    `
  );

  context.catalog = catalogRows.map((item) => enriquecerPlatoDesdeCliente({
    id: normalizarNumero(item.id),
    name: normalizarTexto(item.nombre),
    description: normalizarTexto(item.descripcion),
    category: normalizarTexto(item.categoria),
    price: normalizarNumero(item.precio),
    calories: normalizarNumero(item.calorias),
    healthScore: normalizarNumero(item.healthScore),
    proteinG: normalizarNumero(item.protein_g),
    carbohydratesG: normalizarNumero(item.carbohydrates_g),
    fatG: normalizarNumero(item.fat_g),
    fiberG: normalizarNumero(item.fiber_g),
    allergens: parseJsonArray(item.allergens).map((allergen) => normalizarTexto(allergen)),
    ingredients: [],
    sideDishes: []
  }, catalogoClienteMap));

  return context;
}

module.exports = {
  buildAssistantContext
};
