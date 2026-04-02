const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const perfilRoutes = require('./routes/perfil.routes');
const platosRoutes = require('./routes/platos.routes');
const pedidosRoutes = require('./routes/pedidos.routes');
const suscripcionesRoutes = require('./routes/suscripciones.routes');
const assistantRoutes = require('./routes/assistant.routes');
const { requireSession, attachOptionalSession } = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'API SANZEN operativa' });
});

app.use('/api/auth', authRoutes);
app.use('/api/assistant', attachOptionalSession, assistantRoutes);
app.use('/api/platos', platosRoutes);
app.use('/api/pedidos', requireSession, pedidosRoutes);
app.use('/api/perfil', requireSession, perfilRoutes);
app.use('/api/suscripciones', requireSession, suscripcionesRoutes);

module.exports = app;
