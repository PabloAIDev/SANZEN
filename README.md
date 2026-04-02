# SANZEN

Aplicacion Ionic + Angular para pedidos de comida asiatica saludable, conectada a un backend Node.js + Express con persistencia en MySQL.

## Tecnologias

- Frontend: Ionic, Angular y TypeScript
- Backend: Node.js y Express
- Base de datos: MySQL
- Testing frontend: Karma y Jasmine
- IA: OpenAI API con fallback local de desarrollo

## Estructura

- `miApp/`: app Ionic + Angular
- `backend/`: API REST y logica de negocio
- `database/`: scripts SQL y seeds auxiliares
- `docs/`: documentacion funcional y tecnica

## Puesta en marcha

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd miApp
npm install
npm start
```

## Configuracion del asistente IA

En `backend/.env` puedes activar la IA real anadiendo:

```bash
OPENAI_API_KEY=tu_clave
OPENAI_MODEL=gpt-4o-mini
```

Si `OPENAI_API_KEY` no esta configurada, el asistente sigue funcionando con respuestas locales de respaldo para desarrollo.

Documentacion ampliada del modulo IA:

- `docs/asistente-ia-tfg.md`

## Funcionalidad actual

- Registro e inicio de sesion
- Asistente virtual por chat con contexto real de la app
- Memoria conversacional corta durante la sesion
- Reinicio automatico de la conversacion al cambiar de usuario
- Perfil de usuario con:
  - alergenos
  - objetivo nutricional
  - preferencias de composicion
  - direccion principal
  - tarjeta principal
- Pedido individual con minimo de 20 EUR
- Suscripcion semanal con minimo de 5 platos
- Primer pedido guiado desde `Inicio`
- Conservacion de la ultima seleccion semanal
- Pausa y reactivacion de suscripcion sin perder la seleccion semanal
- Modificacion de pedidos de suscripcion
- Renovacion semanal manual
- Historial de pedidos
- Gestion de suscripcion: activar, pausar, revisar y renovar

## Flujos principales

### Primer pedido

1. Desde `Inicio`, el usuario pulsa `Haz tu primer pedido`.
2. Elige `Suscripcion semanal` o `Pedido individual`.
3. Selecciona filtros y platos en `Menu`.
4. En `Carrito`, al ir al pago:
   - si no hay sesion, pasa por `Login`
   - si falta perfil, pasa por `Perfil`
5. Si es el primer pedido con suscripcion, en `Pago` puede elegir el dia semanal de entrega.
6. En `Pago`, revisa resumen, entrega y tarjeta.
7. Se genera el pedido y, si aplica, se guarda o actualiza la suscripcion.

### Usuario existente

- Si el usuario ya tiene sesion y perfil completo, puede ir casi directo de `Menu` a `Pago`.
- Si el usuario inicia un primer pedido como invitado y luego entra con una cuenta existente, el flujo temporal mantiene el modo elegido:
  - un pedido individual sigue siendo individual
  - un pedido con suscripcion sigue usando la seleccion temporal creada en ese proceso
- En pedidos posteriores se reutilizan direccion, tarjeta y preferencias guardadas.

### Suscripcion semanal

- La suscripcion guarda la ultima seleccion confirmada.
- Si se pausa, el pedido individual vuelve a empezar con carrito vacio.
- Si se reactiva, vuelve a cargarse la ultima seleccion semanal.
- Desde `Gestionar suscripcion` se puede:
  - cambiar el dia semanal
  - revisar la seleccion actual
  - ir a modificarla en `Menu`
  - lanzar `Renovacion semanal`
- La fecha de entrega semanal tiene en cuenta pedidos anteriores para mover el nuevo pedido a la semana posterior cuando corresponde.

## Seguridad minima implementada

- Contrasenas guardadas con hash
- Token de sesion simple
- Proteccion basica de endpoints por usuario autenticado
- Perfil remoto sin password real ni CVV visible

## Testing

### Frontend

```bash
cd miApp
npm test -- --watch=false --browsers=ChromeHeadless
```

### Build

```bash
cd miApp
npm run build
```

## Estado actual del proyecto

La base funcional y el modulo IA estan cerrados para continuar con la memoria final del TFG y el cierre del proyecto.
