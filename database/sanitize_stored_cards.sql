USE sanzen_db;

UPDATE tarjetas
SET
  numero_enmascarado = CASE
    WHEN LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(numero_enmascarado, ''), ' ', ''), '-', ''), '*', ''), '.', '')) >= 4
      THEN CONCAT(
        '**** **** **** ',
        RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(numero_enmascarado, ''), ' ', ''), '-', ''), '*', ''), '.', ''), 4)
      )
    ELSE NULL
  END,
  cvv = NULL;
