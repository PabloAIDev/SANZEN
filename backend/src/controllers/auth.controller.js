const pool = require('../config/db');
const { hashPassword, verifyPassword, esHashBcrypt } = require('../utils/passwords');
const { createSessionToken } = require('../utils/session');

function emailValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor ?? '').trim());
}

function passwordValida(valor) {
  return String(valor ?? '').trim().length >= 6;
}

async function listUsuarios(req, res) {
  try {
    const [rows] = await pool.query(
      `
      SELECT id, nombre, email
      FROM usuarios
      ORDER BY id
      `
    );

    res.json(rows.map(usuario => ({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email
    })));
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ message: 'No se han podido cargar los usuarios.' });
  }
}

async function login(req, res) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';

    if (!emailValido(email) || !passwordValida(password)) {
      res.status(400).json({ message: 'Introduce un email válido y una password de al menos 6 caracteres.' });
      return;
    }

    const [[usuario]] = await pool.query(
      `
      SELECT id, nombre, email, password_hash
      FROM usuarios
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    const credencialesValidas = usuario
      ? await verifyPassword(password, usuario.password_hash)
      : false;

    if (!usuario || !credencialesValidas) {
      res.status(401).json({ message: 'Credenciales incorrectas.' });
      return;
    }

    if (!esHashBcrypt(usuario.password_hash)) {
      const passwordHash = await hashPassword(password);
      await pool.query(
        `
        UPDATE usuarios
        SET password_hash = ?
        WHERE id = ?
        `,
        [passwordHash, usuario.id]
      );
    }

    res.json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      token: createSessionToken(usuario)
    });
  } catch (error) {
    console.error('Error al iniciar sesion:', error);
    res.status(500).json({ message: 'No se ha podido iniciar sesion.' });
  }
}

async function register(req, res) {
  const connection = await pool.getConnection();

  try {
    const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';

    if (nombre.length < 2 || !emailValido(email) || !passwordValida(password)) {
      res.status(400).json({ message: 'Nombre válido, email válido y password de al menos 6 caracteres son obligatorios.' });
      return;
    }

    const [[usuarioExistente]] = await connection.query(
      `
      SELECT id
      FROM usuarios
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    if (usuarioExistente) {
      res.status(409).json({ message: 'Ya existe un usuario con ese email.' });
      return;
    }

    await connection.beginTransaction();

    const passwordHash = await hashPassword(password);

    const [usuarioResult] = await connection.query(
      `
      INSERT INTO usuarios (nombre, email, password_hash)
      VALUES (?, ?, ?)
      `,
      [nombre, email, passwordHash]
    );

    await connection.query(
      `
      INSERT INTO perfiles (usuario_id, objetivo_nutricional)
      VALUES (?, NULL)
      `,
      [usuarioResult.insertId]
    );

    await connection.commit();

    res.status(201).json({
      id: usuarioResult.insertId,
      nombre,
      email
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ message: 'No se ha podido registrar el usuario.' });
  } finally {
    connection.release();
  }
}

module.exports = {
  listUsuarios,
  login,
  register
};
