const pool = require('../config/db');
const { obtenerUserIdSeguro } = require('../middleware/auth');

async function getPedidos(req, res) {
  try {
    const userIdResult = obtenerUserIdSeguro(req.query.userId, req.authUserId);

    if (!userIdResult.userId) {
      res.status(userIdResult.status ?? 400).json({ message: userIdResult.error });
      return;
    }
    const userId = userIdResult.userId;
    const [pedidosRows] = await pool.query(
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
      WHERE usuario_id = ?
      ORDER BY fecha_creacion DESC
      `,
      [userId]
    );

    if (pedidosRows.length === 0) {
      res.json([]);
      return;
    }

    const pedidoIds = pedidosRows.map(pedido => pedido.id);
    const [lineasRows] = await pool.query(
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
      [pedidoIds]
    );

    const pedidos = pedidosRows.map(pedido => ({
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

    await connection.beginTransaction();

    const [direccionRows] = await connection.query(
      `
      SELECT id
      FROM direcciones
      WHERE usuario_id = ?
      ORDER BY es_principal DESC, id ASC
      LIMIT 1
      `,
      [userId]
    );

    if (direccionRows.length === 0) {
      throw new Error('No existe una direccion guardada para el usuario.');
    }

    const direccionId = direccionRows[0].id;
    let tarjetaId = null;

    if (pedido.metodoPago === 'tarjeta') {
      const [tarjetaRows] = await connection.query(
        `
        SELECT id
        FROM tarjetas
        WHERE usuario_id = ?
        ORDER BY es_principal DESC, id ASC
        LIMIT 1
        `,
        [userId]
      );

      tarjetaId = tarjetaRows.length > 0 ? tarjetaRows[0].id : null;
    }

    let suscripcionId = null;
    let fechaEntregaProgramada = new Date(pedido.fechaEntregaProgramada);

    if (pedido.esSuscripcion) {
      const [suscripcionRows] = await connection.query(
        `
        SELECT id, dia_entrega
        FROM suscripciones
        WHERE usuario_id = ? AND activa = TRUE
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
        `,
        [userId]
      );

      suscripcionId = suscripcionRows.length > 0 ? suscripcionRows[0].id : null;

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
        pedido.total,
        pedido.esSuscripcion,
        pedido.direccionEntrega?.nombre ?? '',
        pedido.direccionEntrega?.linea ?? '',
        pedido.direccionEntrega?.instrucciones ?? ''
      ]
    );

    for (const item of pedido.items) {
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
          item.tipoLinea ?? 'extra'
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

    await connection.commit();
    res.status(201).json(pedido);
  } catch (error) {
    await connection.rollback();
    console.error('Error al guardar pedido:', error);
    res.status(500).json({ message: 'No se ha podido guardar el pedido.' });
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

module.exports = {
  getPedidos,
  createPedido
};
