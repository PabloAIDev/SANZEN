# Modulo de Asistente IA

## Objetivo

El asistente virtual de SANZEN se ha disenado como una ayuda conversacional integrada en la app para mejorar la experiencia de compra y de gestion de la suscripcion semanal. Su finalidad es resolver dudas de uso, recomendar platos y orientar al usuario hacia la pantalla correcta sin ejecutar acciones criticas por si solo.

## Alcance funcional

El asistente puede:

- recomendar platos en funcion del perfil nutricional y del contexto actual
- comparar pedido individual y suscripcion semanal
- explicar bloqueos del flujo, como minimos de pedido o perfil incompleto
- resumir el carrito, la suscripcion actual y el ultimo pedido
- sugerir navegacion a paginas como `Menu`, `Perfil`, `Pago`, `Suscripcion` o `Mis pedidos`

El asistente no puede:

- confirmar pedidos automaticamente
- modificar el perfil por si solo
- ejecutar pagos
- cambiar datos sensibles

## Arquitectura

La solucion se ha implementado con una arquitectura cliente-servidor:

- Frontend Ionic + Angular:
  - muestra el chat como un asistente flotante
  - envia el mensaje del usuario y la pantalla actual
  - conserva una memoria conversacional corta durante la sesion
- Backend Node.js + Express:
  - valida la sesion disponible
  - construye un contexto seguro del usuario
  - llama al modelo de IA si hay `OPENAI_API_KEY`
  - devuelve una respuesta estructurada con texto y acciones sugeridas

## Flujo tecnico

1. El usuario abre el asistente y escribe un mensaje.
2. El frontend envia:
   - mensaje actual
   - pantalla actual
   - historial corto de la conversacion
   - contexto cliente no sensible
3. El backend completa el contexto con informacion real de la base de datos:
   - perfil
   - suscripcion
   - ultimo pedido
   - catalogo de platos
4. El backend llama a OpenAI o, si no hay clave, utiliza un fallback local.
5. La respuesta se devuelve en JSON con:
   - `message`
   - `actions`
   - `source`

## Contexto utilizado por la IA

El asistente recibe solo informacion necesaria para responder:

- pantalla actual
- autenticacion del usuario
- perfil nutricional resumido
- carrito actual y su estado respecto al minimo
- estado de suscripcion y proxima entrega
- ultimo pedido guardado
- catalogo resumido de platos

No se envian a la IA:

- password
- CVV
- numero completo de tarjeta
- secretos de sesion

## Memoria conversacional

El asistente conserva los ultimos mensajes de la sesion para entender preguntas encadenadas como:

- "Y sin gluten?"
- "Entonces, que me recomiendas?"
- "Y si quiero modificarla?"

Cuando cambia el usuario o se cierra sesion, la conversacion se limpia para evitar mezclar contexto entre usuarios distintos.

## Seguridad y control

- El modelo se invoca solo desde backend.
- El frontend no expone la clave de OpenAI.
- Las acciones del asistente son solo sugerencias de navegacion.
- El asistente no ejecuta cambios de negocio sin intervencion del usuario.

## Limitaciones actuales

- No hay memoria persistente entre sesiones.
- No tiene voz.
- No ejecuta acciones automaticas sobre pedidos o perfil.
- El resumen de pedidos se centra en el ultimo pedido disponible, no en analitica historica avanzada.

## Pruebas realizadas

Se han verificado:

- respuestas basicas con IA real y con fallback local
- preguntas encadenadas con memoria corta
- reinicio del chat al cambiar de usuario
- build y tests del frontend

## Valor para el TFG

El asistente aporta valor real al proyecto porque:

- mejora la usabilidad de una app con varios flujos de compra
- demuestra integracion controlada entre frontend, backend, base de datos y modelo de IA
- mantiene una aproximacion segura y defendible, sin automatizar decisiones sensibles
