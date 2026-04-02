const pool = require('../config/db');
const { obtenerUserIdSeguro } = require('../middleware/auth');

async function getSuscripcion(req, res) {
  try {
    const userIdResult = obtenerUserIdSeguro(req.query.userId, req.authUserId);

    if (!userIdResult.userId) {
      res.status(userIdResult.status ?? 400).json({ message: userIdResult.error });
      return;
    }
    const userId = userIdResult.userId;
    const [[suscripcion]] = await pool.query(
      `
      SELECT
        id,
        activa,
        plan_semanal,
        dia_entrega,
        descuento_porcentaje,
        precio_original,
        descuento_aplicado,
        precio_final,
        proxima_entrega
      FROM suscripciones
      WHERE usuario_id = ?
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
      `,
      [userId]
    );

    if (!suscripcion) {
      res.json(obtenerSuscripcionVacia());
      return;
    }

    let platosRows = await obtenerPlatosSuscripcion(pool, suscripcion.id);

    if (platosRows.length === 0 && Boolean(suscripcion.activa)) {
      platosRows = await recuperarPlatosDesdeUltimoPedido(pool, userId, suscripcion.id);
    }

    const platosSeleccionadosIds = [];

    for (const plato of platosRows) {
      for (let i = 0; i < plato.cantidad; i += 1) {
        platosSeleccionadosIds.push(plato.plato_id);
      }
    }

    res.json({
      activa: Boolean(suscripcion.activa),
      planSemanal: 5,
      diaEntrega: suscripcion.dia_entrega,
      platosPorSemana: 5,
      platosSeleccionadosIds,
      precioOriginal: Number(suscripcion.precio_original ?? 0),
      descuentoAplicado: Number(suscripcion.descuento_aplicado ?? 0),
      precioEstimado: Number(suscripcion.precio_final ?? 0),
      proximaEntrega: construirTextoEntrega(suscripcion.dia_entrega, suscripcion.proxima_entrega),
      proximaEntregaIso: suscripcion.proxima_entrega
        ? new Date(suscripcion.proxima_entrega).toISOString()
        : null
    });
  } catch (error) {
    console.error('Error al obtener suscripcion:', error);
    res.status(500).json({ message: 'No se ha podido obtener la suscripcion.' });
  }
}

async function upsertSuscripcion(req, res) {
  const connection = await pool.getConnection();

  try {
    const userIdResult = obtenerUserIdSeguro(req.body.userId, req.authUserId);
    const suscripcion = req.body;

    if (!userIdResult.userId) {
      res.status(userIdResult.status ?? 400).json({ message: userIdResult.error });
      return;
    }
    const userId = userIdResult.userId;

    await connection.beginTransaction();

    const [suscripcionRows] = await connection.query(
      `
      SELECT id
      FROM suscripciones
      WHERE usuario_id = ?
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
      `,
      [userId]
    );

    let suscripcionId = suscripcionRows.length > 0 ? suscripcionRows[0].id : null;
    const proximaEntregaMysql = calcularProximaEntregaMysql(suscripcion.diaEntrega);
    const descuentoPorcentaje = Number(((suscripcion.descuentoAplicado > 0 && suscripcion.precioOriginal > 0)
      ? (suscripcion.descuentoAplicado / suscripcion.precioOriginal) * 100
      : 0).toFixed(2));

    if (suscripcionId) {
      await connection.query(
        `
        UPDATE suscripciones
        SET activa = ?, plan_semanal = ?, dia_entrega = ?, descuento_porcentaje = ?, precio_original = ?, descuento_aplicado = ?, precio_final = ?, proxima_entrega = ?
        WHERE id = ?
        `,
        [
          Boolean(suscripcion.activa),
          5,
          suscripcion.diaEntrega,
          descuentoPorcentaje,
          suscripcion.precioOriginal ?? 0,
          suscripcion.descuentoAplicado ?? 0,
          suscripcion.precioEstimado ?? 0,
          proximaEntregaMysql,
          suscripcionId
        ]
      );
    } else {
      const [result] = await connection.query(
        `
        INSERT INTO suscripciones (
          usuario_id,
          activa,
          plan_semanal,
          dia_entrega,
          descuento_porcentaje,
          precio_original,
          descuento_aplicado,
          precio_final,
          proxima_entrega
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          userId,
          Boolean(suscripcion.activa),
          5,
          suscripcion.diaEntrega,
          descuentoPorcentaje,
          suscripcion.precioOriginal ?? 0,
          suscripcion.descuentoAplicado ?? 0,
          suscripcion.precioEstimado ?? 0,
          proximaEntregaMysql
        ]
      );

      suscripcionId = result.insertId;
    }

    await connection.query('DELETE FROM suscripcion_platos WHERE suscripcion_id = ?', [suscripcionId]);

    if (Array.isArray(suscripcion.platosSeleccionadosIds) && suscripcion.platosSeleccionadosIds.length > 0) {
      const cantidadesPorPlato = new Map();

      for (const platoId of suscripcion.platosSeleccionadosIds) {
        cantidadesPorPlato.set(platoId, (cantidadesPorPlato.get(platoId) ?? 0) + 1);
      }

      for (const [platoId, cantidad] of cantidadesPorPlato.entries()) {
        await connection.query(
          `
          INSERT INTO suscripcion_platos (suscripcion_id, plato_id, cantidad)
          VALUES (?, ?, ?)
          `,
          [suscripcionId, platoId, cantidad]
        );
      }
    }

    await connection.commit();
    res.json(suscripcion);
  } catch (error) {
    await connection.rollback();
    console.error('Error al guardar suscripcion:', error);
    res.status(500).json({ message: 'No se ha podido guardar la suscripcion.' });
  } finally {
    connection.release();
  }
}

async function simularRenovacionSemanal(req, res) {
  const connection = await pool.getConnection();

  try {
    const userIdResult = obtenerUserIdSeguro(req.body.userId, req.authUserId);

    if (!userIdResult.userId) {
      res.status(userIdResult.status ?? 400).json({ message: userIdResult.error });
      return;
    }
    const userId = userIdResult.userId;

    await connection.beginTransaction();

    const [suscripcionRows] = await connection.query(
      `
      SELECT
        id,
        activa,
        dia_entrega,
        descuento_porcentaje,
        proxima_entrega
      FROM suscripciones
      WHERE usuario_id = ? AND activa = TRUE
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
      `,
      [userId]
    );

    if (suscripcionRows.length === 0) {
      res.status(400).json({ message: 'No hay una suscripción activa para renovar.' });
      return;
    }

    const suscripcion = suscripcionRows[0];

    let platosRows = await obtenerPlatosSuscripcionDetalle(connection, suscripcion.id);

    if (platosRows.length === 0) {
      await recuperarPlatosDesdeUltimoPedido(connection, userId, suscripcion.id);
      platosRows = await obtenerPlatosSuscripcionDetalle(connection, suscripcion.id);
    }

    const totalUnidades = platosRows.reduce((total, plato) => total + Number(plato.cantidad), 0);

    if (totalUnidades < 5) {
      res.status(400).json({ message: 'La suscripción debe tener al menos 5 platos para generar la renovación.' });
      return;
    }

    const [[direccion]] = await connection.query(
      `
      SELECT id, nombre, calle_numero, ciudad, codigo_postal, provincia, instrucciones
      FROM direcciones
      WHERE usuario_id = ?
      ORDER BY es_principal DESC, id ASC
      LIMIT 1
      `,
      [userId]
    );

    const [[tarjeta]] = await connection.query(
      `
      SELECT id
      FROM tarjetas
      WHERE usuario_id = ?
      ORDER BY es_principal DESC, id ASC
      LIMIT 1
      `,
      [userId]
    );

    if (!direccion || !tarjeta) {
      res.status(400).json({ message: 'Necesitas una dirección y una tarjeta guardadas para simular la renovación semanal.' });
      return;
    }

    const fechaCreacion = new Date();
    const fechaEntregaProgramada = suscripcion.proxima_entrega
      ? new Date(suscripcion.proxima_entrega)
      : calcularProximaEntregaDate(suscripcion.dia_entrega);

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
      esMismoDiaOPosteriorAnterior(
        fechaEntregaProgramada,
        new Date(ultimoPedidoCliente.fecha_entrega_programada)
      )
    ) {
      avanzarHastaSemanaPosterior(
        fechaEntregaProgramada,
        new Date(ultimoPedidoCliente.fecha_entrega_programada),
        13
      );
    }

    const subtotal = platosRows.reduce(
      (total, plato) => total + Number(plato.precio) * Number(plato.cantidad),
      0
    );
    const descuento = Number(
      (subtotal * (Number(suscripcion.descuento_porcentaje ?? 0) / 100)).toFixed(2)
    );
    const total = Number((subtotal - descuento).toFixed(2));
    const publicId = `sub-renov-${userId}-${Date.now()}`;
    const numeroPedido = generarNumeroPedido();

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
        publicId,
        userId,
        direccion.id,
        tarjeta.id,
        suscripcion.id,
        numeroPedido,
        formatearFechaMysql(fechaCreacion.toISOString()),
        formatearFechaMysql(fechaEntregaProgramada.toISOString()),
        '13:00-16:00',
        'tarjeta',
        'confirmado',
        total,
        true,
        direccion.nombre ?? '',
        construirLineaDireccion(direccion),
        direccion.instrucciones ?? ''
      ]
    );

    for (const plato of platosRows) {
      const precioUnitario = Number(plato.precio);
      const cantidad = Number(plato.cantidad);

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
          plato.plato_id,
          cantidad,
          precioUnitario,
          Number((precioUnitario * cantidad).toFixed(2)),
          'suscripcion'
        ]
      );
    }

    const siguienteEntrega = new Date(fechaEntregaProgramada);
    siguienteEntrega.setDate(siguienteEntrega.getDate() + 7);

    await connection.query(
      `
      UPDATE suscripciones
      SET proxima_entrega = ?
      WHERE id = ?
      `,
      [formatearFechaMysql(siguienteEntrega.toISOString()), suscripcion.id]
    );

    await connection.commit();

    res.status(201).json({
      pedidoId: publicId,
      numeroPedido,
      fechaEntregaProgramada: fechaEntregaProgramada.toISOString(),
      proximaEntrega: construirTextoEntrega(suscripcion.dia_entrega, siguienteEntrega),
      proximaEntregaIso: siguienteEntrega.toISOString()
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error al simular la renovación semanal:', error);
    res.status(500).json({ message: 'No se ha podido simular la renovación semanal.' });
  } finally {
    connection.release();
  }
}

function obtenerSuscripcionVacia() {
  return {
    activa: false,
    planSemanal: 5,
    diaEntrega: 'lunes',
    platosPorSemana: 5,
    platosSeleccionadosIds: [],
    precioOriginal: 0,
    descuentoAplicado: 0,
    precioEstimado: 0,
    proximaEntrega: 'lunes',
    proximaEntregaIso: null
  };
}

async function obtenerPlatosSuscripcion(executor, suscripcionId) {
  const [platosRows] = await executor.query(
    `
    SELECT plato_id, cantidad
    FROM suscripcion_platos
    WHERE suscripcion_id = ?
    ORDER BY id
    `,
    [suscripcionId]
  );

  return platosRows;
}

async function obtenerPlatosSuscripcionDetalle(executor, suscripcionId) {
  const [platosRows] = await executor.query(
    `
    SELECT
      sp.plato_id,
      sp.cantidad,
      p.nombre,
      p.imagen,
      p.precio
    FROM suscripcion_platos sp
    INNER JOIN platos p ON p.id = sp.plato_id
    WHERE sp.suscripcion_id = ?
    ORDER BY sp.id
    `,
    [suscripcionId]
  );

  return platosRows;
}

async function recuperarPlatosDesdeUltimoPedido(executor, userId, suscripcionId) {
  const pedidoMasReciente = [];
  const [pedidoRows] = await executor.query(
    `
    SELECT id
    FROM pedidos
    WHERE usuario_id = ? AND es_suscripcion = TRUE
    ORDER BY fecha_creacion DESC
    LIMIT 1
    `,
    [userId]
  );

  if (pedidoRows.length === 0) {
    return [];
  }

  const pedidoId = pedidoRows[0].id;
  const [lineasPedidoReciente] = await executor.query(
    `
    SELECT
      lp.plato_id,
      lp.cantidad
    FROM lineas_pedido lp
    INNER JOIN platos pl ON pl.id = lp.plato_id
    WHERE lp.pedido_id = ?
      AND (lp.tipo_linea = 'suscripcion' OR pl.categoria <> 'Postre')
    ORDER BY lp.id
    `,
    [pedidoId]
  );

  for (const linea of lineasPedidoReciente) {
    pedidoMasReciente.push({
      plato_id: linea.plato_id,
      cantidad: Number(linea.cantidad)
    });
  }

  if (pedidoMasReciente.length === 0) {
    return [];
  }

  await executor.query('DELETE FROM suscripcion_platos WHERE suscripcion_id = ?', [suscripcionId]);

  for (const linea of pedidoMasReciente) {
    await executor.query(
      `
      INSERT INTO suscripcion_platos (suscripcion_id, plato_id, cantidad)
      VALUES (?, ?, ?)
      `,
      [suscripcionId, linea.plato_id, linea.cantidad]
    );
  }

  return pedidoMasReciente;
}

function formatearFechaMysql(valor) {
  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return null;
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

function calcularProximaEntregaMysql(diaEntrega) {
  const mapaDias = {
    lunes: 1,
    martes: 2,
    miercoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
    domingo: 0
  };

  const hoy = new Date();
  const fechaEntrega = new Date(hoy);
  const diaObjetivo = mapaDias[diaEntrega] ?? 1;
  let diasHastaEntrega = (diaObjetivo - hoy.getDay() + 7) % 7;

  if (diasHastaEntrega === 0 && hoy.getHours() >= 13) {
    diasHastaEntrega = 7;
  }

  fechaEntrega.setDate(hoy.getDate() + diasHastaEntrega);
  fechaEntrega.setHours(13, 0, 0, 0);

  return formatearFechaMysql(fechaEntrega);
}

function calcularProximaEntregaDate(diaEntrega) {
  const fechaEntregaMysql = calcularProximaEntregaMysql(diaEntrega);
  return fechaEntregaMysql ? new Date(fechaEntregaMysql.replace(' ', 'T')) : new Date();
}

function construirTextoEntrega(diaEntrega, fechaEntrega) {
  if (!fechaEntrega) {
    return diaEntrega;
  }

  const fecha = new Date(fechaEntrega);
  const fechaFormateada = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long'
  }).format(fecha);

  return `${diaEntrega} ${fechaFormateada}`;
}

function construirLineaDireccion(direccion) {
  const partes = [
    direccion.calle_numero,
    direccion.codigo_postal,
    direccion.ciudad,
    direccion.provincia
  ].filter(Boolean);

  return partes.join(', ');
}

function generarNumeroPedido() {
  const fecha = new Date();
  const marca = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(
    fecha.getDate()
  ).padStart(2, '0')}`;
  const sufijo = Math.floor(1000 + Math.random() * 9000);

  return `SZ-${marca}-${sufijo}`;
}

function esMismoDiaOPosteriorAnterior(fechaCandidata, ultimaEntrega) {
  const candidata = new Date(fechaCandidata);
  const ultima = new Date(ultimaEntrega);

  candidata.setHours(0, 0, 0, 0);
  ultima.setHours(0, 0, 0, 0);

  return candidata.getTime() <= ultima.getTime();
}

function avanzarHastaSemanaPosterior(fechaCandidata, ultimaEntrega, horaInicio) {
  while (esMismaSemanaOAnterior(fechaCandidata, ultimaEntrega)) {
    fechaCandidata.setDate(fechaCandidata.getDate() + 7);
    fechaCandidata.setHours(horaInicio, 0, 0, 0);
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

module.exports = {
  getSuscripcion,
  upsertSuscripcion,
  simularRenovacionSemanal
};
