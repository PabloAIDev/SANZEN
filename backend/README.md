# Backend SANZEN

API REST de SANZEN construida con Node.js, Express y MySQL.

## Preparacion

1. Copia `.env.example` a `.env`.
2. Configura las credenciales de MySQL.
3. Arranca el servidor:

```bash
npm install
npm run dev
```

## Endpoints principales

### Salud

- `GET /api/health`

### Autenticacion

- `GET /api/auth/users`
- `POST /api/auth/login`
- `POST /api/auth/register`

### Asistente

- `POST /api/assistant/chat`

### Catalogo

- `GET /api/platos`

### Perfil

- `GET /api/perfil`
- `PUT /api/perfil`

### Pedidos

- `GET /api/pedidos`
- `POST /api/pedidos`

### Suscripcion

- `GET /api/suscripciones`
- `PUT /api/suscripciones`
- `POST /api/suscripciones/simular-renovacion`

## Funcionalidad actual

- Login y registro
- Asistente virtual por chat
- Sesion con token simple
- Proteccion basica por usuario autenticado
- Hash de contrasenas
- Perfil con direccion y tarjeta
- Persistencia de pedidos
- Persistencia de suscripcion semanal
- Sincronizacion de `suscripcion_platos` con el ultimo pedido semanal confirmado
- Renovacion semanal manual

## Configuracion del asistente IA

Variables disponibles en `.env`:

```bash
OPENAI_API_KEY=tu_clave
OPENAI_MODEL=gpt-4o-mini
SESSION_SECRET=tu_secreto
```

Si no configuras `OPENAI_API_KEY`, la ruta del asistente sigue respondiendo con un fallback local para desarrollo.

El modulo IA usa:

- contexto seguro construido en backend
- historial corto de conversacion
- respuesta estructurada con `message`, `actions` y `source`

Documentacion ampliada:

- `../docs/asistente-ia-tfg.md`

## Notas de negocio

- Pedido individual: minimo de 20 EUR
- Suscripcion semanal: minimo de 5 platos
- El primer pedido con suscripcion puede elegir el dia semanal de entrega desde `Pago`
- La fecha de entrega de pedidos semanales tiene en cuenta pedidos anteriores para avanzar a la semana posterior cuando corresponde
- La renovacion semanal genera un nuevo pedido y actualiza `proxima_entrega`
- Al pausar la suscripcion, el carrito individual vuelve a empezar a 0, pero la seleccion semanal queda guardada para una futura reactivacion
