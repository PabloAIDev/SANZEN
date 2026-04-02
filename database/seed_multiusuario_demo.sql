USE sanzen_db;

INSERT INTO usuarios (nombre, email, password_hash)
SELECT 'Ana Lopez', 'ana@sanzen.local', 'ana12345'
WHERE NOT EXISTS (
  SELECT 1 FROM usuarios WHERE email = 'ana@sanzen.local'
);

INSERT INTO usuarios (nombre, email, password_hash)
SELECT 'Marta Ruiz', 'marta@sanzen.local', 'marta12345'
WHERE NOT EXISTS (
  SELECT 1 FROM usuarios WHERE email = 'marta@sanzen.local'
);

INSERT INTO perfiles (usuario_id, objetivo_nutricional)
SELECT u.id, 'masa-muscular'
FROM usuarios u
WHERE u.email = 'ana@sanzen.local'
  AND NOT EXISTS (SELECT 1 FROM perfiles p WHERE p.usuario_id = u.id);

INSERT INTO perfiles (usuario_id, objetivo_nutricional)
SELECT u.id, 'perder-peso'
FROM usuarios u
WHERE u.email = 'marta@sanzen.local'
  AND NOT EXISTS (SELECT 1 FROM perfiles p WHERE p.usuario_id = u.id);

INSERT INTO direcciones (
  usuario_id,
  nombre,
  calle_numero,
  ciudad,
  codigo_postal,
  provincia,
  telefono,
  instrucciones,
  es_principal
)
SELECT u.id, 'Casa', 'Avenida del Puerto 22', 'Valencia', '46021', 'Valencia', '611223344', 'Porteria 2B', TRUE
FROM usuarios u
WHERE u.email = 'ana@sanzen.local'
  AND NOT EXISTS (SELECT 1 FROM direcciones d WHERE d.usuario_id = u.id);

INSERT INTO direcciones (
  usuario_id,
  nombre,
  calle_numero,
  ciudad,
  codigo_postal,
  provincia,
  telefono,
  instrucciones,
  es_principal
)
SELECT u.id, 'Trabajo', 'Calle Alcala 101', 'Madrid', '28009', 'Madrid', '622334455', 'Recepcion principal', TRUE
FROM usuarios u
WHERE u.email = 'marta@sanzen.local'
  AND NOT EXISTS (SELECT 1 FROM direcciones d WHERE d.usuario_id = u.id);

INSERT INTO tarjetas (
  usuario_id,
  nombre_titular,
  numero_enmascarado,
  fecha_caducidad,
  cvv,
  es_principal
)
SELECT u.id, 'Ana Lopez', '4242 4242 4242 4242', '09/29', '321', TRUE
FROM usuarios u
WHERE u.email = 'ana@sanzen.local'
  AND NOT EXISTS (SELECT 1 FROM tarjetas t WHERE t.usuario_id = u.id);

INSERT INTO tarjetas (
  usuario_id,
  nombre_titular,
  numero_enmascarado,
  fecha_caducidad,
  cvv,
  es_principal
)
SELECT u.id, 'Marta Ruiz', '5555 6666 7777 8888', '11/30', '654', TRUE
FROM usuarios u
WHERE u.email = 'marta@sanzen.local'
  AND NOT EXISTS (SELECT 1 FROM tarjetas t WHERE t.usuario_id = u.id);
