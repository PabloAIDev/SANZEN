require('dotenv').config();
const app = require('./app');
const pool = require('./config/db');

const port = Number(process.env.PORT || 3000);

async function startServer() {
  try {
    await pool.query('SELECT 1');

    app.listen(port, () => {
      console.log(`Servidor SANZEN escuchando en http://localhost:${port}`);
    });
  } catch (error) {
    console.error('No se ha podido iniciar la API por un problema con MySQL.');
    console.error(error.message);
    process.exit(1);
  }
}

startServer();
