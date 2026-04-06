const pool = require('../config/db');
const { obtenerUserIdSeguro } = require('../middleware/auth');
const PEDIDO_MINIMO_INDIVIDUAL = 20;
const DESCUENTO_SUSCRIPCION_POR_PLAN = Object.freeze({
  5: 20
});
const METODOS_PAGO_VALIDOS = new Set(['tarjeta', 'bizum', 'efectivo']);
const TARJETA_ENMASCARADA_REGEX = /^\*{4}\s\*{4}\s\*{4}\s\d{4}$/;

function crearErrorHttp(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function textoValido(valor, minimo) {
  return typeof valor === 'string' && valor.trim().length >= minimo;
}

function codigoPostalValido(valor) {
  return /^\d{5}$/.test(String(valor ?? '').trim());
}

function telefonoValido(valor) {
  return /^\d{9}$/.test(String(valor ?? '').replace(/\s/g, ''));
}

function numeroTarjetaValido(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  return /^\d{16}$/.test(digitos);
}

function numeroTarjetaEnmascaradoValido(valor) {
  return TARJETA_ENMASCARADA_REGEX.test(String(valor ?? '').trim());
}

function fechaCaducidadValida(valor) {
  const coincidencia = String(valor ?? '').trim().match(/^(\d{2})\/(\d{2}|\d{4})$/);

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

function direccionGuardadaValida(direccion) {
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

function tarjetaGuardadaValida(tarjeta) {
  return Boolean(
    tarjeta &&
    textoValido(tarjeta.nombre_titular, 3) &&
    (numeroTarjetaEnmascaradoValido(tarjeta.numero_enmascarado) || numeroTarjetaValido(tarjeta.numero_enmascarado)) &&
    fechaCaducidadValida(tarjeta.fecha_caducidad)
  );
}

function obtenerFechaValida(valor, mensaje) {
  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    throw crearErrorHttp(400, mensaje);
  }

  return fecha;
}

function esCantidadValida(valor) {
  return Number.isInteger(Number(valor)) && Number(valor) > 0;
}

function obtenerDescuentoPorcentajeSuscripcion(planSemanal) {
  return DESCUENTO_SUSCRIPCION_POR_PLAN[Number(planSemanal)] ?? 0;
}

function construirLineaDireccion(direccion) {
  return [
    direccion?.calle_numero,
    direccion?.codigo_postal,
    direccion?.ciudad,
    direccion?.provincia
  ].filter(Boolean).join(', ');
}

async function getPedidos(req, res) {
  try {
    const userIdResult = obtenerUserIdSeguro(req.query.userId, req.authUserId);

    if (!userIdResult.userId) {
      res.status(userIdResult.status ?? 400).json({ message: userIdResult.error });
      return;
    }
    const userId = userIdResult.userId;
    const pedidos = await obtenerPedidosPersistidos(pool, { userId });
    res.json(pedidos);
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    res.status(500).json({ message: 'No se han podido obtener los pedidos.' });
  }
}

async function createPedido(req, res) {
  const connection = await pool.getConnection();

  try {
    const pedido = req.body;
    const userIdResult = obtenerUserIdSeguro(req.body.userId, req.authUserId);

    if (!userIdResult.userId) {
      res.status(userIdResult.status ?? 400).json({ message: userIdResult.error });
      return;
    }
    const userId = userIdResult.userId;

    if (!pedido || !pedido.numeroPedido || !Array.isArray(pedido.items) || pedido.items.length === 0) {
      res.status(400).json({ message: 'El pedido no tiene el formato esperado.' });
      return;
    }

    if (!METODOS_PAGO_VALIDOS.has(pedido.metodoPago)) {
      res.status(400).json({ message: 'El método de pago no es válido.' });
      return;
    }

    if (!textoValido(pedido.franjaEntrega, 3)) {
      res.status(400).json({ message: 'La franja de entrega no es válida.' });
      return;
    }

    const fechaEntregaProgramadaBase = obtenerFechaValida(
      pedido.fechaEntregaProgramada,
      'La fecha de entrega programada no es válida.'
    );

    const platosIds = [...new Set(pedido.items.map(item => Number(item?.platoId)).filter(id => Number.isInteger(id) && id > 0))];

    if (pedido.items.some(item => !Number.isInteger(Number(item?.platoId)) || Number(item?.platoId) <= 0 || !esCantidadValida(item?.cantidad))) {
      res.status(400).json({ message: 'El pedido contiene líneas no válidas.' });
      return;
    }

    await connection.beginTransaction();

    const [direccionRows] = await connection.query(
      `
      SELECT id, nombre, calle_numero, ciudad, codigo_postal, provincia, telefono, instrucciones
      FROM direcciones
      WHERE usuario_id = ?
      ORDER BY es_principal DESC, id ASC
      LIMIT 1
      `,
      [userId]
    );

    if (direccionRows.length === 0 || !direccionGuardadaValida(direccionRows[0])) {
      throw crearErrorHttp(400, 'Necesitas una dirección principal válida para confirmar el pedido.');
    }

    const direccionId = direccionRows[0].id;
    let tarjetaId = null;

    if (pedido.metodoPago === 'tarjeta') {
      const [tarjetaRows] = await connection.query(
        `
        SELECT id, nombre_titular, numero_enmascarado, fecha_caducidad
        FROM tarjetas
        WHERE usuario_id = ?
        ORDER BY es_principal DESC, id ASC
        LIMIT 1
        `,
        [userId]
      );

      if (tarjetaRows.length === 0 || !tarjetaGuardadaValida(tarjetaRows[0])) {
        throw crearErrorHttp(400, 'Necesitas una tarjeta principal válida para pagar con tarjeta.');
      }

      tarjetaId = tarjetaRows[0].id;
    }

    const [platosRows] = await connection.query(
      `
      SELECT id, precio
      FROM platos
      WHERE id IN (?)
      `,
      [platosIds]
    );

    if (platosRows.length !== platosIds.length) {
      throw crearErrorHttp(400, 'El pedido contiene platos no válidos o no disponibles.');
    }

    const precioPorPlatoId = new Map(
      platosRows.map(plato => [Number(plato.id), Number(plato.precio)])
    );
    const itemsNormalizados = pedido.items.map(item => {
      const platoId = Number(item.platoId);
      const cantidad = Number(item.cantidad);
      const precioUnitario = precioPorPlatoId.get(platoId);

      if (typeof precioUnitario !== 'number') {
        throw crearErrorHttp(400, 'El pedido contiene platos no válidos o no disponibles.');
      }

      return {
        ...item,
        platoId,
        cantidad,
        precioUnitario,
        subtotal: Number((precioUnitario * cantidad).toFixed(2)),
        tipoLinea: item.tipoLinea === 'suscripcion' ? 'suscripcion' : 'extra'
      };
    });

    const subtotalCalculado = Number(
      itemsNormalizados.reduce((total, item) => total + item.subtotal, 0).toFixed(2)
    );
    let totalCalculado = subtotalCalculado;

    if (!pedido.esSuscripcion && totalCalculado < PEDIDO_MINIMO_INDIVIDUAL) {
      throw crearErrorHttp(400, 'El pedido individual debe alcanzar un mínimo de 20 EUR.');
    }

    let suscripcionId = null;
    let fechaEntregaProgramada = new Date(fechaEntregaProgramadaBase);

    if (pedido.esSuscripcion) {
      const [suscripcionRows] = await connection.query(
        `
        SELECT id, dia_entrega, plan_semanal
        FROM suscripciones
        WHERE usuario_id = ? AND activa = TRUE
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
        `,
        [userId]
      );

      suscripcionId = suscripcionRows.length > 0 ? suscripcionRows[0].id : null;

      if (!suscripcionId) {
        throw crearErrorHttp(400, 'No existe una suscripción activa válida para este pedido.');
      }

      const descuentoPorcentaje = obtenerDescuentoPorcentajeSuscripcion(suscripcionRows[0].plan_semanal);
      const descuentoAplicado = Number((subtotalCalculado * (descuentoPorcentaje / 100)).toFixed(2));
      totalCalculado = Number((subtotalCalculado - descuentoAplicado).toFixed(2));

      const totalPlatosSuscripcion = itemsNormalizados
        .filter(item => item.tipoLinea === 'suscripcion')
        .reduce((total, item) => total + item.cantidad, 0);

      if (totalPlatosSuscripcion < 5) {
        throw crearErrorHttp(400, 'El pedido de suscripción debe incluir al menos 5 platos de suscripción.');
      }

      const [[ultimoPedidoCliente]] = await connection.query(
        `
        SELECT fecha_entrega_programada
        FROM pedidos
        WHERE usuario_id = ?
        ORDER BY fecha_entrega_programada DESC, id DESC
        LIMIT 1
        `,
        [userId]
      );

      if (
        ultimoPedidoCliente?.fecha_entrega_programada &&
        !Number.isNaN(fechaEntregaProgramada.getTime())
      ) {
        avanzarHastaSemanaPosterior(
          fechaEntregaProgramada,
          new Date(ultimoPedidoCliente.fecha_entrega_programada)
        );
      }
    }

    const [pedidoResult] = await connection.query(
      `
      INSERT INTO pedidos (
        public_id,
        usuario_id,
        direccion_id,
        tarjeta_id,
        suscripcion_id,
        numero_pedido,
        fecha_creacion,
        fecha_entrega_programada,
        franja_entrega,
        metodo_pago,
        estado,
        total,
        es_suscripcion,
        direccion_nombre,
        direccion_linea,
        direccion_instrucciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        pedido.id,
        userId,
        direccionId,
        tarjetaId,
        suscripcionId,
        pedido.numeroPedido,
        formatearFechaMysql(pedido.fechaCreacion),
        formatearFechaMysql(fechaEntregaProgramada.toISOString()),
        pedido.franjaEntrega,
        pedido.metodoPago,
        pedido.estado,
        totalCalculado,
        pedido.esSuscripcion,
        direccionRows[0].nombre ?? '',
        construirLineaDireccion(direccionRows[0]),
        direccionRows[0].instrucciones ?? ''
      ]
    );

    for (const item of itemsNormalizados) {
      await connection.query(
        `
        INSERT INTO lineas_pedido (
          pedido_id,
          plato_id,
          cantidad,
          precio_unitario,
          subtotal,
          tipo_linea
        ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          pedidoResult.insertId,
          item.platoId,
          item.cantidad,
          item.precioUnitario,
          item.subtotal,
          item.tipoLinea
        ]
      );
    }

    if (pedido.esSuscripcion && suscripcionId && !Number.isNaN(fechaEntregaProgramada.getTime())) {
      await sincronizarPlatosSuscripcionDesdePedido(connection, suscripcionId, pedidoResult.insertId);

      const siguienteEntrega = new Date(fechaEntregaProgramada);
      siguienteEntrega.setDate(siguienteEntrega.getDate() + 7);
      siguienteEntrega.setHours(13, 0, 0, 0);

      await connection.query(
        `
        UPDATE suscripciones
        SET proxima_entrega = ?
        WHERE id = ?
        `,
        [formatearFechaMysql(siguienteEntrega.toISOString()), suscripcionId]
      );
    }

    const pedidoPersistido = await obtenerPedidoPersistido(connection, {
      userId,
      pedidoId: pedidoResult.insertId
    });

    if (!pedidoPersistido) {
      throw crearErrorHttp(500, 'No se ha podido reconstruir el pedido guardado.');
    }

    await connection.commit();
    res.status(201).json(pedidoPersistido);
  } catch (error) {
    await connection.rollback();
    if (!error.status) {
      console.error('Error al guardar pedido:', error);
    }
    res.status(error.status ?? 500).json({
      message: error.status ? error.message : 'No se ha podido guardar el pedido.'
    });
  } finally {
    connection.release();
  }
}

function formatearFechaMysql(valor) {
  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return formatearFechaLocalMysql(new Date());
  }

  return formatearFechaLocalMysql(fecha);
}

function formatearFechaLocalMysql(fecha) {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  const hours = String(fecha.getHours()).padStart(2, '0');
  const minutes = String(fecha.getMinutes()).padStart(2, '0');
  const seconds = String(fecha.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function sincronizarPlatosSuscripcionDesdePedido(connection, suscripcionId, pedidoId) {
  const [lineasSuscripcion] = await connection.query(
    `
    SELECT plato_id, cantidad
    FROM lineas_pedido
    WHERE pedido_id = ? AND tipo_linea = 'suscripcion'
    ORDER BY id
    `,
    [pedidoId]
  );

  if (lineasSuscripcion.length === 0) {
    return;
  }

  await connection.query('DELETE FROM suscripcion_platos WHERE suscripcion_id = ?', [suscripcionId]);

  for (const linea of lineasSuscripcion) {
    await connection.query(
      `
      INSERT INTO suscripcion_platos (suscripcion_id, plato_id, cantidad)
      VALUES (?, ?, ?)
      `,
      [suscripcionId, linea.plato_id, Number(linea.cantidad)]
    );
  }
}

function avanzarHastaSemanaPosterior(fechaCandidata, ultimaEntrega) {
  while (esMismaSemanaOAnterior(fechaCandidata, ultimaEntrega)) {
    fechaCandidata.setDate(fechaCandidata.getDate() + 7);
  }
}

function esMismaSemanaOAnterior(fechaCandidata, ultimaEntrega) {
  const inicioSemanaCandidata = obtenerInicioSemana(fechaCandidata);
  const inicioSemanaUltima = obtenerInicioSemana(ultimaEntrega);

  return inicioSemanaCandidata.getTime() <= inicioSemanaUltima.getTime();
}

function obtenerInicioSemana(fecha) {
  const inicioSemana = new Date(fecha);
  inicioSemana.setHours(0, 0, 0, 0);

  const diaSemana = inicioSemana.getDay();
  const desplazamientoLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  inicioSemana.setDate(inicioSemana.getDate() + desplazamientoLunes);

  return inicioSemana;
}

async function obtenerPedidoPersistido(executor, { userId, pedidoId }) {
  const pedidos = await obtenerPedidosPersistidos(executor, {
    userId,
    pedidoIds: [pedidoId]
  });

  return pedidos[0] ?? null;
}

async function obtenerPedidosPersistidos(executor, { userId, pedidoIds = null }) {
  const filtros = ['usuario_id = ?'];
  const parametros = [userId];

  if (Array.isArray(pedidoIds) && pedidoIds.length > 0) {
    filtros.push('id IN (?)');
    parametros.push(pedidoIds);
  }

  const [pedidosRows] = await executor.query(
    `
    SELECT
      id,
      COALESCE(public_id, CAST(id AS CHAR)) AS publicId,
      numero_pedido,
      fecha_creacion,
      fecha_entrega_programada,
      estado,
      total,
      franja_entrega,
      metodo_pago,
      es_suscripcion,
      direccion_nombre,
      direccion_linea,
      direccion_instrucciones
    FROM pedidos
    WHERE ${filtros.join(' AND ')}
    ORDER BY fecha_creacion DESC, id DESC
    `,
    parametros
  );

  if (pedidosRows.length === 0) {
    return [];
  }

  const idsPedidos = pedidosRows.map(pedido => pedido.id);
  const [lineasRows] = await executor.query(
    `
    SELECT
      lp.pedido_id,
      lp.plato_id,
      lp.cantidad,
      lp.precio_unitario,
      lp.subtotal,
      lp.tipo_linea,
      p.nombre,
      p.imagen
    FROM lineas_pedido lp
    INNER JOIN platos p ON p.id = lp.plato_id
    WHERE lp.pedido_id IN (?)
    ORDER BY lp.id
    `,
    [idsPedidos]
  );

  return pedidosRows.map(pedido => ({
    id: pedido.publicId,
    numeroPedido: pedido.numero_pedido,
    fechaCreacion: new Date(pedido.fecha_creacion).toISOString(),
    fechaEntregaProgramada: new Date(pedido.fecha_entrega_programada).toISOString(),
    estado: pedido.estado,
    items: lineasRows
      .filter(linea => linea.pedido_id === pedido.id)
      .map(linea => ({
        platoId: linea.plato_id,
        nombre: linea.nombre,
        cantidad: linea.cantidad,
        precioUnitario: Number(linea.precio_unitario),
        subtotal: Number(linea.subtotal),
        imagen: linea.imagen,
        tipoLinea: linea.tipo_linea
      })),
    total: Number(pedido.total),
    franjaEntrega: pedido.franja_entrega,
    direccionEntrega: {
      nombre: pedido.direccion_nombre ?? '',
      linea: pedido.direccion_linea ?? '',
      instrucciones: pedido.direccion_instrucciones ?? ''
    },
    metodoPago: pedido.metodo_pago,
    esSuscripcion: Boolean(pedido.es_suscripcion)
  }));
}

module.exports = {
  getPedidos,
  createPedido
};
