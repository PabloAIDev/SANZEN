const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

function esHashBcrypt(valor) {
  return typeof valor === 'string' && /^\$2[aby]\$\d{2}\$/.test(valor);
}

async function hashPassword(password) {
  return bcrypt.hash(String(password ?? ''), SALT_ROUNDS);
}

async function verifyPassword(password, storedValue) {
  if (!storedValue) {
    return false;
  }

  if (esHashBcrypt(storedValue)) {
    return bcrypt.compare(String(password ?? ''), storedValue);
  }

  return String(password ?? '') === String(storedValue);
}

module.exports = {
  esHashBcrypt,
  hashPassword,
  verifyPassword
};
