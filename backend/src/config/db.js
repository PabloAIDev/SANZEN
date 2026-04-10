const mysql = require('mysql2/promise');
require('dotenv').config();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function getRequiredEnv(name, fallbackValue) {
  const value = process.env[name];

  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  if (IS_PRODUCTION) {
    throw new Error(`${name} es obligatorio cuando NODE_ENV=production.`);
  }

  return fallbackValue;
}

const pool = mysql.createPool({
  host: getRequiredEnv('DB_HOST', 'localhost'),
  port: Number(getRequiredEnv('DB_PORT', '3306')),
  user: getRequiredEnv('DB_USER', 'root'),
  password: getRequiredEnv('DB_PASSWORD', ''),
  database: getRequiredEnv('DB_NAME', 'sanzen_db'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
