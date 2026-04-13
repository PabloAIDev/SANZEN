# Assistant Architecture

## 1. Objetivo del asistente

El asistente de SANZEN ayuda al usuario a:

- entender el flujo de la app y los bloqueos actuales
- revisar perfil, carrito, suscripcion y pedidos
- recomendar platos compatibles con su perfil
- responder consultas de salud de forma prudente usando solo los datos reales disponibles

No ejecuta cambios de negocio. Solo responde con texto y, como mucho, con acciones de navegacion sugeridas.

## 2. Flujo real de extremo a extremo

Diagrama textual:

`Frontend -> POST /api/assistant/chat -> assistant.controller -> buildAssistantContext -> generateAssistantResponse -> Rules / OpenAI / Fallback -> Sanitizer (solo salida OpenAI) -> JSON final`

Montaje real de ruta:

- `backend/src/app.js` monta `POST /api/assistant/chat`
- `backend/src/routes/assistant.routes.js` expone `router.post('/chat', chatWithAssistant)`
- `backend/src/controllers/assistant.controller.js` normaliza la entrada y llama al servicio

## 3. Que entra desde frontend

Entrada HTTP real en `assistant.controller.js`:

- `message`: string, obligatorio, recortado a 600 caracteres
- `screen`: string, recortado a 40 caracteres, con fallback a `inicio`
- `language`: `es` o `en`
- `history`: array de mensajes `{ role, text }`, normalizado a maximo 6 turnos validos
- `context`: objeto opcional enviado por frontend

La sesion es opcional en la ruta (`attachOptionalSession`). Si existe usuario autenticado, el backend amplía el contexto con datos de BD.

## 4. Que contexto resuelve backend

`backend/src/services/assistant-context.service.js` construye el contexto final mezclando `clientContext` con datos propios del backend.

Datos que resuelve o normaliza:

- `screen`, `language`, `userAuthenticated`
- `user.name`
- `profile`: alergenos, objetivo, preferencias, campos faltantes y estado de completitud
- `cart`: modo, totales, minimo, items
- `subscription`: activa, dia, proxima entrega, seleccion semanal
- `firstOrder`
- `lastOrder`, `nextScheduledOrder`, `ordersSummary`
- `catalog`: platos disponibles desde BD, enriquecidos con nombres/descripciones/alergenos del contexto cliente si vienen traducidos o personalizados
- `appRules`: minimo pedido individual y minimo suscripcion

Si hay usuario autenticado consulta BD para usuario, perfil, direccion, tarjeta, suscripcion, pedidos y catalogo.

## 5. Cuando responde por reglas

La logica local vive en `backend/src/services/assistant/assistant.rules.js`.

Orden real antes de OpenAI:

1. Consultas de salud detectadas por patrones
2. Consultas estructuradas sobre catalogo/platos
3. Preguntas guiadas por reglas sobre app, perfil, pago, carrito, pedidos o suscripcion

Ejemplos de respuestas por reglas:

- como funciona SANZEN
- primer pedido
- diferencia entre pedido individual y suscripcion
- estado del perfil para pagar
- resumen del carrito
- ultimo pedido
- proxima entrega
- consultas tipo "que platos con X", "sin gluten", "para cenar", "mas ligeros", "con mas fibra"

Nota importante:

- las respuestas estructuradas de catalogo siguen devolviendo `source: "fallback"` porque asi estaba implementado antes del refactor y se ha conservado

## 6. Cuando llama a OpenAI

La integracion OpenAI vive en `backend/src/services/assistant/assistant.openai.js`.

Solo se intenta usar OpenAI si existe `process.env.OPENAI_API_KEY`.

Orden real:

- si la consulta es de salud y hay candidatos compatibles, primero se construye un fallback local y luego se intenta OpenAI
- si no es salud y no ha entrado una respuesta estructurada ni una regla local, se intenta OpenAI

Configuracion real actual:

- endpoint: `https://api.openai.com/v1/chat/completions`
- modelo por defecto: `gpt-4o-mini`
- timeout por defecto: `12000 ms`
- `temperature: 0.35`
- formato esperado: `json_object`

El prompt usa:

- contexto real de app construido en backend
- historial reciente normalizado
- contexto extra para salud o recomendaciones cuando aplica

## 7. Como funciona el fallback

Fallback real en `backend/src/services/assistant/index.js` y `assistant.rules.js`:

- salud sin candidatos compatibles: respuesta local directa con acciones a menu/perfil
- salud con candidatos y sin OpenAI: fallback local de salud
- salud con OpenAI que falla o devuelve basura: fallback local de salud
- flujo general sin OpenAI: `buildFallbackResponse(...)`

`buildFallbackResponse(...)` hace este orden:

1. `buildSafeRecommendationFallback(...)` si la consulta era de salud o recomendacion abierta y no hay respuesta fiable
2. `buildRuleBasedResponse(...)` por si una regla local puede resolverlo
3. mensaje por defecto segun pantalla + acciones por defecto

## 8. Como se sanea y valida la salida

El saneado final de payload esta en `backend/src/services/assistant/assistant.sanitizer.js`.

Importante:

- este saneado estricto se aplica a la salida que viene de OpenAI
- las respuestas construidas localmente por reglas/fallback usan `buildResponse(...)` y no pasan por este saneado final

Validaciones reales del payload OpenAI:

- `message` se recorta, colapsa espacios y limita a 800 caracteres
- solo se aceptan acciones `navigate`
- solo se aceptan targets en whitelist
- `/menu?subscriptionSelection=1&...` se normaliza a `/menu?subscriptionSelection=1`
- las labels se regeneran desde el target y el idioma; no se confia en la label del modelo
- maximo 2 acciones

Whitelist real de targets:

- `/inicio`
- `/menu`
- `/resumen`
- `/pago`
- `/perfil`
- `/suscripcion`
- `/mis-pedidos`
- `/como-funciona`
- `/login`
- `/menu?subscriptionSelection=1`

## 9. Estructura de respuesta final

Contrato real que recibe frontend:

```json
{
  "message": "texto",
  "actions": [
    {
      "type": "navigate",
      "target": "/ruta",
      "label": "Texto"
    }
  ],
  "source": "rules | fallback | openai"
}
```

Detalles reales:

- `message`: siempre string
- `actions`: array, maximo 2 acciones
- `source`: se conserva para indicar origen de la respuesta

## 10. Archivos reales implicados tras el refactor

Servicio del asistente:

- `backend/src/services/assistant.service.js`
  - shim de compatibilidad; sigue siendo el import publico usado por el controlador y los tests
- `backend/src/services/assistant/index.js`
  - fachada publica real
  - exporta `generateAssistantResponse(...)`
  - orquesta el flujo general
- `backend/src/services/assistant/assistant.config.js`
  - constantes, labels, patrones y configuracion OpenAI
- `backend/src/services/assistant/assistant.rules.js`
  - reglas locales, deteccion de intents, scoring/filtros de platos, salud, fallback local y utilidades compartidas del dominio
- `backend/src/services/assistant/assistant.openai.js`
  - construccion de prompt/mensajes, llamada a OpenAI, parseo inicial y construccion de contexto de modelo
- `backend/src/services/assistant/assistant.sanitizer.js`
  - saneado/validacion de la salida generada por OpenAI

Integracion de API:

- `backend/src/app.js`
- `backend/src/routes/assistant.routes.js`
- `backend/src/controllers/assistant.controller.js`
- `backend/src/services/assistant-context.service.js`
- `backend/test/assistant.service.test.js`

## 11. Limitaciones y riesgos actuales

- `assistant.rules.js` sigue siendo el modulo mas grande. Es intencional: una division mas fina ahora aumentaba riesgo de romper heuristicas acopladas.
- La deteccion por reglas depende de patrones de texto en ES/EN. Hay riesgo de falsos positivos o negativos.
- Las recomendaciones de salud siguen limitadas por los datos reales de SANZEN. Por ejemplo, no hay sodio, grasas saturadas, colesterol dietetico ni datos digestivos/FODMAP.
- La robustez de OpenAI depende de red, clave y de que el modelo siga devolviendo JSON util. Si falla, el sistema cae a fallback local.
- Hay normalizacion de historial tanto en controlador como en servicio. Hoy se mantiene consistente, pero es una duplicidad real del sistema.

## 12. Decisiones de diseño importantes

- Se ha mantenido `backend/src/services/assistant.service.js` como punto de entrada compatible para no tocar contratos con controlador, rutas ni tests existentes.
- La firma publica se mantiene: `generateAssistantResponse({ message, context, history = [], language = 'es' })`.
- No se ha cambiado el orden de decision del asistente. Se conserva la arquitectura hibrida: contexto real backend -> reglas/catalogo -> OpenAI cuando toca -> fallback -> saneado final en rama OpenAI.
- Se ha eliminado la duplicidad interna de una rama de salud no usada (`buildHealthSupportResponse`) para evitar deriva entre dos flujos equivalentes. No formaba parte del contrato publico.
- No se han cambiado rutas, payloads ni forma de respuesta consumida por frontend.
