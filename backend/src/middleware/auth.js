const { verifySessionToken } = require('../utils/session');

function obtenerTokenDesdeRequest(req) {
  const authorization = req.headers.authorization;

  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    return authorization.slice(7).trim();
  }

  const customToken = req.headers['x-session-token'];
  return typeof customToken === 'string' ? customToken.trim() : '';
}

function requireSession(req, res, next) {
  const token = obtenerTokenDesdeRequest(req);
  const session = verifySessionToken(token);

  if (!session?.userId) {
    res.status(401).json({ message: 'Sesión no válida o caducada.' });
    return;
  }

  req.authUserId = session.userId;
  next();
}

function attachOptionalSession(req, _res, next) {
  const token = obtenerTokenDesdeRequest(req);
  const session = verifySessionToken(token);

  req.authUserId = session?.userId ?? null;
  next();
}

function obtenerUserIdSeguro(valor, authUserId) {
  const userId = Number(valor);

  if (!Number.isInteger(userId) || userId <= 0) {
    return { error: 'userId es obligatorio.' };
  }

  if (userId !== authUserId) {
    return { error: 'No tienes permisos para acceder a este recurso.', status: 403 };
  }

  return { userId };
}

module.exports = {
  requireSession,
  attachOptionalSession,
  obtenerUserIdSeguro
};
