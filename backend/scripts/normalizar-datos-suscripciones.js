const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const resumen = {
    planesActualizados: 0,
    suscripcionesDesactivadas: 0,
    suscripcionesRecuperadas: 0
  };

  try {
    await connection.beginTransaction();

    const [planResult] = await connection.query(
      `
      UPDATE suscripciones
      SET plan_semanal = 5
      WHERE plan_semanal <> 5
      `
    );
    resumen.planesActualizados = planResult.affectedRows ?? 0;

    const [usuariosDuplicados] = await connection.query(
      `
      SELECT usuario_id
      FROM suscripciones
      WHERE activa = TRUE
      GROUP BY usuario_id
      HAVING COUNT(*) > 1
      `
    );

    for (const fila of usuariosDuplicados) {
      const [suscripcionesActivas] = await connection.query(
        `
        SELECT id
        FROM suscripciones
        WHERE usuario_id = ? AND activa = TRUE
        ORDER BY updated_at DESC, id DESC
        `,
        [fila.usuario_id]
      );

      const [suscripcionPrincipal, ...suscripcionesAntiguas] = suscripcionesActivas;

      for (const suscripcion of suscripcionesAntiguas) {
        await connection.query(
          `
          UPDATE suscripciones
          SET activa = FALSE
          WHERE id = ?
          `,
          [suscripcion.id]
        );
        resumen.suscripcionesDesactivadas += 1;
      }

      await recuperarPlatosSiFaltan(connection, suscripcionPrincipal.id, fila.usuario_id, resumen);
    }

    const [suscripcionesActivasSinPlatos] = await connection.query(
      `
      SELECT s.id, s.usuario_id
      FROM suscripciones s
      LEFT JOIN suscripcion_platos sp ON sp.suscripcion_id = s.id
      WHERE s.activa = TRUE
      GROUP BY s.id, s.usuario_id
      HAVING COALESCE(SUM(sp.cantidad), 0) = 0
      `
    );

    for (const suscripcion of suscripcionesActivasSinPlatos) {
      await recuperarPlatosSiFaltan(connection, suscripcion.id, suscripcion.usuario_id, resumen);
    }

    await connection.commit();
    console.log('Normalización completada:', resumen);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

async function recuperarPlatosSiFaltan(connection, suscripcionId, usuarioId, resumen) {
  const [platosActuales] = await connection.query(
    `
    SELECT COALESCE(SUM(cantidad), 0) AS total
    FROM suscripcion_platos
    WHERE suscripcion_id = ?
    `,
    [suscripcionId]
  );

  if (Number(platosActuales[0]?.total ?? 0) > 0) {
    return;
  }

  const [pedidoRows] = await connection.query(
    `
    SELECT id
    FROM pedidos
    WHERE usuario_id = ? AND es_suscripcion = TRUE
    ORDER BY fecha_creacion DESC, id DESC
    LIMIT 1
    `,
    [usuarioId]
  );

  if (pedidoRows.length === 0) {
    return;
  }

  const pedidoId = pedidoRows[0].id;
  const [lineas] = await connection.query(
    `
    SELECT
      lp.plato_id,
      SUM(lp.cantidad) AS cantidad
    FROM lineas_pedido lp
    INNER JOIN platos p ON p.id = lp.plato_id
    WHERE lp.pedido_id = ?
      AND (lp.tipo_linea = 'suscripcion' OR p.categoria <> 'Postre')
    GROUP BY lp.plato_id
    ORDER BY lp.plato_id
    `,
    [pedidoId]
  );

  if (lineas.length === 0) {
    return;
  }

  await connection.query('DELETE FROM suscripcion_platos WHERE suscripcion_id = ?', [suscripcionId]);

  for (const linea of lineas) {
    await connection.query(
      `
      INSERT INTO suscripcion_platos (suscripcion_id, plato_id, cantidad)
      VALUES (?, ?, ?)
      `,
      [suscripcionId, linea.plato_id, Number(linea.cantidad)]
    );
  }

  resumen.suscripcionesRecuperadas += 1;
}

main().catch(error => {
  console.error('No se ha podido normalizar las suscripciones:', error);
  process.exit(1);
});
