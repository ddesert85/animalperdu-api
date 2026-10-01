const express = require('express');
const pool = require('../config/database');

const router = express.Router();

router.get('/medailles/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT
        id,
        token,
        nom_animal,
        espece,
        nom_proprietaire,
        telephone,
        email,
        adresse,
        photo_url,
        statut,
        dernier_scan
      FROM medailles
      WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        statut: 'Erreur',
        message: 'Médaille introuvable'
      });
    }

    await pool.query(
      `UPDATE medailles
       SET dernier_scan = NOW()
       WHERE id = ?`,
      [id]
    );

    res.json({
      statut: 'Succès',
      donnees: rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      statut: 'Erreur',
      message: 'Erreur lors de la récupération de la médaille',
      erreur: error.message
    });
  }
});

module.exports = router;