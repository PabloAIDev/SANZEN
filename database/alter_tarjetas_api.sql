USE sanzen_db;

ALTER TABLE tarjetas
ADD COLUMN cvv VARCHAR(10) NULL AFTER fecha_caducidad;
