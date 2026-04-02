const pool = require('../config/db');

async function getPlatos(req, res) {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        p.id,
        p.nombre,
        p.descripcion,
        p.categoria,
        p.calorias,
        p.precio,
        p.health_score AS healthScore,
        p.imagen,
        p.disponible,
        p.protein_g,
        p.carbohydrates_g,
        p.fat_g,
        p.fiber_g,
        COALESCE(
          JSON_ARRAYAGG(a.nombre),
          JSON_ARRAY()
        ) AS allergens
      FROM platos p
      LEFT JOIN plato_alergenos pa ON pa.plato_id = p.id
      LEFT JOIN alergenos a ON a.id = pa.alergeno_id
      GROUP BY
        p.id,
        p.nombre,
        p.descripcion,
        p.categoria,
        p.calorias,
        p.precio,
        p.health_score,
        p.imagen,
        p.disponible,
        p.protein_g,
        p.carbohydrates_g,
        p.fat_g,
        p.fiber_g
      ORDER BY p.id
      `
    );

    const platos = rows.map(plato => ({
      ...plato,
      disponible: Boolean(plato.disponible),
      allergens: parseJsonArray(plato.allergens)
    }));

    res.json(platos);
  } catch (error) {
    console.error('Error al obtener platos:', error);
    res.status(500).json({ message: 'No se han podido obtener los platos.' });
  }
}

function parseJsonArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

module.exports = {
  getPlatos
};
