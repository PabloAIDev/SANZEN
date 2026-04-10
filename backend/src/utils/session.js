const crypto = require('crypto');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DEV_SESSION_SECRET = 'sanzen-session-secret-dev';
const SESSION_SECRET = getSessionSecret();
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12;

function getSessionSecret() {
  const configuredSecret = process.env.SESSION_SECRET?.trim();

  if (configuredSecret) {
    return configuredSecret;
  }

  if (IS_PRODUCTION) {
    throw new Error('SESSION_SECRET es obligatorio cuando NODE_ENV=production.');
  }

  console.warn('SESSION_SECRET no configurado. Usando secreto de desarrollo solo para entorno local.');
  return DEV_SESSION_SECRET;
}

function base64urlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64urlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

function createSessionToken(usuario) {
  const payload = {
    userId: usuario.id,
    email: usuario.email,
    exp: Date.now() + SESSION_DURATION_MS
  };

  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token) {
  if (typeof token !== 'string' || token.trim() === '') {
    return null;
  }

  const [encodedPayload, signature] = token.split('.');

  if (!encodedPayload || !signature || sign(encodedPayload) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload));

    if (!payload?.userId || !payload?.exp || payload.exp < Date.now()) {
      return null;
    }

    return {
      userId: Number(payload.userId),
      email: typeof payload.email === 'string' ? payload.email : ''
    };
  } catch {
    return null;
  }
}

module.exports = {
  createSessionToken,
  verifySessionToken
};
