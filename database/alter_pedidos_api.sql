USE sanzen_db;

ALTER TABLE pedidos
ADD COLUMN public_id VARCHAR(100) NULL AFTER id,
ADD COLUMN direccion_nombre VARCHAR(100) NULL AFTER es_suscripcion,
ADD COLUMN direccion_linea VARCHAR(255) NULL AFTER direccion_nombre,
ADD COLUMN direccion_instrucciones VARCHAR(255) NULL AFTER direccion_linea;

ALTER TABLE pedidos
ADD CONSTRAINT uq_pedidos_public_id UNIQUE (public_id);
