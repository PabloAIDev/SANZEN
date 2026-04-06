const pool = require('../config/db');
const { obtenerUserIdSeguro } = require('../middleware/auth');
const { hashPassword } = require('../utils/passwords');

function esErrorEmailDuplicado(error) {
  return error?.code === 'ER_DUP_ENTRY';
}

const PASSWORD_SENTINEL = '********';
const SOLO_LETRAS_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]+$/;
const CALLE_NUMERO_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s,./ºª#-]+$/;

const TARJETA_ENMASCARADA_REGEX = /^\*{4}\s\*{4}\s\*{4}\s\d{4}$/;

function textoValido(valor, minimo) {
  return typeof valor === 'string' && valor.trim().length >= minimo;
}

function textoSoloLetrasValido(valor, minimo) {
  return textoValido(valor, minimo) && SOLO_LETRAS_REGEX.test(String(valor ?? '').trim());
}

function emailValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor ?? '').trim());
}

function passwordValida(valor) {
  return String(valor ?? '').trim().length >= 6;
}

function codigoPostalValido(valor) {
  return /^\d{5}$/.test(String(valor ?? '').trim());
}

function telefonoValido(valor) {
  return /^\d{9}$/.test(String(valor ?? '').replace(/\s/g, ''));
}

function nombreTitularValido(valor) {
  return textoSoloLetrasValido(valor, 3);
}

function numeroTarjetaValido(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  return /^\d{16}$/.test(digitos);
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

function cvvValido(valor) {
  return /^\d{3}$/.test(String(valor ?? '').trim());
}

function numeroTarjetaEnmascaradoValido(valor) {
  return TARJETA_ENMASCARADA_REGEX.test(String(valor ?? '').trim());
}

function direccionValida(direccion) {
  return direccion &&
    textoValido(direccion.nombre, 2) &&
    calleNumeroValido(direccion.calleNumero) &&
    textoSoloLetrasValido(direccion.ciudad, 2) &&
    codigoPostalValido(direccion.codigoPostal) &&
    textoSoloLetrasValido(direccion.provincia, 2) &&
    telefonoValido(direccion.telefono);
}

function calleNumeroValido(valor) {
  return textoValido(valor, 5) && CALLE_NUMERO_REGEX.test(String(valor ?? '').trim());
}

function tarjetaTieneDatos(tarjeta) {
  return tarjeta && (
    String(tarjeta.nombreTitular ?? '').trim() !== '' ||
    String(tarjeta.numeroTarjeta ?? '').trim() !== '' ||
    String(tarjeta.fechaCaducidad ?? '').trim() !== '' ||
    String(tarjeta.cvv ?? '').trim() !== ''
  );
}

function tarjetaValida(tarjeta) {
  return tarjeta &&
    nombreTitularValido(tarjeta.nombreTitular) &&
    numeroTarjetaValido(tarjeta.numeroTarjeta) &&
    fechaCaducidadValida(tarjeta.fechaCaducidad) &&
    cvvValido(tarjeta.cvv);
}

function tarjetaGuardadaUsable(tarjeta) {
  return tarjeta &&
    nombreTitularValido(tarjeta.nombreTitular) &&
    numeroTarjetaEnmascaradoValido(tarjeta.numeroTarjeta) &&
    fechaCaducidadValida(tarjeta.fechaCaducidad);
}

function tarjetaPersistibleValida(tarjeta) {
  return tarjetaValida(tarjeta) || tarjetaGuardadaUsable(tarjeta);
}

function validarPerfil(perfil, opciones = {}) {
  if (!textoSoloLetrasValido(perfil.nombre, 2)) {
    return 'El nombre debe tener al menos 2 letras y no puede incluir números.';
  }

  if (!emailValido(perfil.email)) {
    return 'Introduce un email válido.';
  }

  if (!opciones.omitirPassword && !passwordValida(perfil.password)) {
    return 'La password debe tener al menos 6 caracteres.';
  }

  if (!direccionValida(perfil.direccionPrincipal)) {
    return 'La dirección principal no es válida.';
  }

  if (tarjetaTieneDatos(perfil.tarjetaPrincipal) && !tarjetaPersistibleValida(perfil.tarjetaPrincipal)) {
    return 'La tarjeta principal no es válida.';
  }

  return null;
}

async function getPerfil(req, res) {
  try {
    const userIdResult = obtenerUserIdSeguro(req.query.userId, req.authUserId);

    if (!userIdResult.userId) {
      res.status(userIdResult.status ?? 400).json({ message: userIdResult.error });
      return;
    }
    const userId = userIdResult.userId;

    const perfilRespuesta = await construirRespuestaPerfil(pool, userId);

    if (!perfilRespuesta) {
      res.json(obtenerPerfilVacio());
      return;
    }
    res.json(perfilRespuesta);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ message: 'No se ha podido obtener el perfil.' });
  }
}

async function upsertPerfil(req, res) {
  const connection = await pool.getConnection();

  try {
    const userIdResult = obtenerUserIdSeguro(req.body.userId, req.authUserId);
    const perfil = req.body;

    if (!userIdResult.userId) {
      res.status(userIdResult.status ?? 400).json({ message: userIdResult.error });
      return;
    }
    const userId = userIdResult.userId;

    if (!perfil || typeof perfil !== 'object') {
      res.status(400).json({ message: 'El perfil no tiene el formato esperado.' });
      return;
    }

    const [[usuarioConEmail]] = await connection.query(
      `
      SELECT id
      FROM usuarios
      WHERE email = ? AND id <> ?
      LIMIT 1
      `,
      [perfil.email ?? '', userId]
    );

    if (usuarioConEmail) {
      res.status(409).json({ message: 'Ese email ya está siendo utilizado por otro usuario.' });
      return;
    }

    const [[usuarioActual]] = await connection.query(
      `
      SELECT password_hash
      FROM usuarios
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    );

    const passwordSinCambios = !perfil.password || perfil.password === PASSWORD_SENTINEL;
    const errorValidacion = validarPerfil(perfil, { omitirPassword: passwordSinCambios });

    if (errorValidacion) {
      res.status(400).json({ message: errorValidacion });
      return;
    }

    await connection.beginTransaction();

    const passwordHash = passwordSinCambios
      ? usuarioActual?.password_hash ?? ''
      : await hashPassword(perfil.password ?? '');

    await connection.query(
      `
      UPDATE usuarios
      SET nombre = ?, email = ?, password_hash = ?
      WHERE id = ?
      `,
      [
        perfil.nombre ?? '',
        perfil.email ?? '',
        passwordHash,
        userId
      ]
    );

    const [perfilRows] = await connection.query(
      `
      SELECT id
      FROM perfiles
      WHERE usuario_id = ?
      LIMIT 1
      `,
      [userId]
    );

    let perfilId = perfilRows.length > 0 ? perfilRows[0].id : null;

    if (perfilId) {
      await connection.query(
        `
        UPDATE perfiles
        SET objetivo_nutricional = ?
        WHERE id = ?
        `,
        [perfil.objetivoNutricional ?? null, perfilId]
      );
    } else {
      const [perfilResult] = await connection.query(
        `
        INSERT INTO perfiles (usuario_id, objetivo_nutricional)
        VALUES (?, ?)
        `,
        [userId, perfil.objetivoNutricional ?? null]
      );

      perfilId = perfilResult.insertId;
    }

    await connection.query('DELETE FROM perfil_alergenos WHERE perfil_id = ?', [perfilId]);
    await connection.query('DELETE FROM perfil_preferencias WHERE perfil_id = ?', [perfilId]);

    if (Array.isArray(perfil.alergenos) && perfil.alergenos.length > 0) {
      const [alergenosRows] = await connection.query(
        `
        SELECT id, nombre
        FROM alergenos
        WHERE nombre IN (?)
        `,
        [perfil.alergenos]
      );

      for (const alergeno of alergenosRows) {
        await connection.query(
          `
          INSERT INTO perfil_alergenos (perfil_id, alergeno_id)
          VALUES (?, ?)
          `,
          [perfilId, alergeno.id]
        );
      }
    }

    if (Array.isArray(perfil.preferenciasComposicion) && perfil.preferenciasComposicion.length > 0) {
      const [preferenciasRows] = await connection.query(
        `
        SELECT id, nombre
        FROM preferencias_composicion
        WHERE nombre IN (?)
        `,
        [perfil.preferenciasComposicion]
      );

      for (const preferencia of preferenciasRows) {
        await connection.query(
          `
          INSERT INTO perfil_preferencias (perfil_id, preferencia_id)
          VALUES (?, ?)
          `,
          [perfilId, preferencia.id]
        );
      }
    }

    if (perfil.direccionPrincipal) {
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

      if (direccionRows.length > 0) {
        await connection.query(
          `
          UPDATE direcciones
          SET nombre = ?, calle_numero = ?, ciudad = ?, codigo_postal = ?, provincia = ?, telefono = ?, instrucciones = ?, es_principal = TRUE
          WHERE id = ?
          `,
          [
            perfil.direccionPrincipal.nombre ?? '',
            perfil.direccionPrincipal.calleNumero ?? '',
            perfil.direccionPrincipal.ciudad ?? '',
            perfil.direccionPrincipal.codigoPostal ?? '',
            perfil.direccionPrincipal.provincia ?? '',
            perfil.direccionPrincipal.telefono ?? '',
            perfil.direccionPrincipal.instrucciones ?? '',
            direccionRows[0].id
          ]
        );
      } else {
        await connection.query(
          `
          INSERT INTO direcciones (
            usuario_id,
            nombre,
            calle_numero,
            ciudad,
            codigo_postal,
            provincia,
            telefono,
            instrucciones,
            es_principal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
          `,
          [
            userId,
            perfil.direccionPrincipal.nombre ?? '',
            perfil.direccionPrincipal.calleNumero ?? '',
            perfil.direccionPrincipal.ciudad ?? '',
            perfil.direccionPrincipal.codigoPostal ?? '',
            perfil.direccionPrincipal.provincia ?? '',
            perfil.direccionPrincipal.telefono ?? '',
            perfil.direccionPrincipal.instrucciones ?? ''
          ]
        );
      }
    }

    if (perfil.tarjetaPrincipal) {
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

      const tarjetaValidaCompleta = tarjetaValida(perfil.tarjetaPrincipal);
      const tarjetaPersistible = tarjetaValidaCompleta
        ? {
            nombreTitular: perfil.tarjetaPrincipal.nombreTitular ?? '',
            numeroEnmascarado: enmascararTarjeta(perfil.tarjetaPrincipal.numeroTarjeta ?? ''),
            fechaCaducidad: perfil.tarjetaPrincipal.fechaCaducidad ?? ''
          }
        : tarjetaGuardadaUsable(perfil.tarjetaPrincipal)
          ? {
              nombreTitular: perfil.tarjetaPrincipal.nombreTitular ?? '',
              numeroEnmascarado: String(perfil.tarjetaPrincipal.numeroTarjeta ?? '').trim(),
              fechaCaducidad: perfil.tarjetaPrincipal.fechaCaducidad ?? ''
            }
          : null;

      if (!tarjetaPersistible) {
        throw Object.assign(new Error('La tarjeta principal no es vÃ¡lida.'), { status: 400 });
      }

      if (tarjetaRows.length > 0) {
        await connection.query(
          `
          UPDATE tarjetas
          SET nombre_titular = ?, numero_enmascarado = ?, fecha_caducidad = ?, cvv = NULL, es_principal = TRUE
          WHERE id = ?
          `,
          [
            tarjetaPersistible.nombreTitular,
            tarjetaPersistible.numeroEnmascarado,
            tarjetaPersistible.fechaCaducidad,
            tarjetaRows[0].id
          ]
        );
      } else if (tarjetaValidaCompleta) {
        await connection.query(
          `
          INSERT INTO tarjetas (
            usuario_id,
            nombre_titular,
            numero_enmascarado,
            fecha_caducidad,
            es_principal
          ) VALUES (?, ?, ?, ?, TRUE)
          `,
          [
            userId,
            tarjetaPersistible.nombreTitular,
            tarjetaPersistible.numeroEnmascarado,
            tarjetaPersistible.fechaCaducidad
          ]
        );
      } else {
        throw Object.assign(new Error('La tarjeta principal no es vÃ¡lida.'), { status: 400 });
      }
    }

    await connection.commit();
    const perfilActualizado = await construirRespuestaPerfil(connection, userId);
    res.json(perfilActualizado ?? obtenerPerfilVacio());
  } catch (error) {
    await connection.rollback();
    if (error.status) {
      res.status(error.status).json({ message: error.message });
      return;
    }

    if (esErrorEmailDuplicado(error)) {
      res.status(409).json({ message: 'Ese email ya está siendo utilizado por otro usuario.' });
      return;
    }

    console.error('Error al guardar perfil:', error);
    res.status(500).json({ message: 'No se ha podido guardar el perfil.' });
  } finally {
    connection.release();
  }
}

function obtenerPerfilVacio() {
  return {
    nombre: '',
    email: '',
    password: '',
    alergenos: [],
    objetivoNutricional: null,
    preferenciasComposicion: [],
    direccionPrincipal: null,
    tarjetaPrincipal: null
  };
}

function enmascararTarjeta(numeroTarjeta) {
  const digitos = String(numeroTarjeta ?? '').replace(/\D/g, '');

  if (digitos.length < 4) {
    const numeroNormalizado = String(numeroTarjeta ?? '').trim();
    return numeroTarjetaEnmascaradoValido(numeroNormalizado) ? numeroNormalizado : '';
  }

  return `**** **** **** ${digitos.slice(-4)}`;
}

async function construirRespuestaPerfil(executor, userId) {
  const [[usuario]] = await executor.query(
    `
    SELECT id, nombre, email, password_hash
    FROM usuarios
    WHERE id = ?
    LIMIT 1
    `,
    [userId]
  );

  if (!usuario) {
    return null;
  }

  const [[perfil]] = await executor.query(
    `
    SELECT id, objetivo_nutricional
    FROM perfiles
    WHERE usuario_id = ?
    LIMIT 1
    `,
    [userId]
  );

  const [alergenosRows] = perfil
    ? await executor.query(
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
    ? await executor.query(
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

  const [[direccion]] = await executor.query(
    `
    SELECT nombre, calle_numero, ciudad, codigo_postal, provincia, telefono, instrucciones
    FROM direcciones
    WHERE usuario_id = ?
    ORDER BY es_principal DESC, id ASC
    LIMIT 1
    `,
    [userId]
  );

  const [[tarjeta]] = await executor.query(
    `
    SELECT nombre_titular, numero_enmascarado, fecha_caducidad
    FROM tarjetas
    WHERE usuario_id = ?
    ORDER BY es_principal DESC, id ASC
    LIMIT 1
    `,
    [userId]
  );

  return {
    nombre: usuario.nombre ?? '',
    email: usuario.email ?? '',
    password: usuario.password_hash ? PASSWORD_SENTINEL : '',
    alergenos: alergenosRows.map(alergeno => alergeno.nombre),
    objetivoNutricional: perfil?.objetivo_nutricional ?? null,
    preferenciasComposicion: preferenciasRows.map(preferencia => preferencia.nombre),
    direccionPrincipal: direccion
      ? {
          nombre: direccion.nombre ?? '',
          calleNumero: direccion.calle_numero ?? '',
          ciudad: direccion.ciudad ?? '',
          codigoPostal: direccion.codigo_postal ?? '',
          provincia: direccion.provincia ?? '',
          telefono: direccion.telefono ?? '',
          instrucciones: direccion.instrucciones ?? ''
        }
      : null,
    tarjetaPrincipal: tarjeta
      ? {
          nombreTitular: tarjeta.nombre_titular ?? '',
          numeroTarjeta: enmascararTarjeta(tarjeta.numero_enmascarado ?? ''),
          fechaCaducidad: tarjeta.fecha_caducidad ?? '',
          cvv: ''
        }
      : null
  };
}

module.exports = {
  getPerfil,
  upsertPerfil
};
