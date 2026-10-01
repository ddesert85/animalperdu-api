const express = require('express');
const pool = require('../config/database');

const router = express.Router();

router.get('/medailles/:id', async (req, res) => {
  const { id } = req.params;

  try {
const [rows] = await pool.query(
  `SELECT
    id,
    nom_animal,
    espece,
    nom_proprietaire,
    telephone,
    photo_url,
    statut
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
    
    if (rows[0].statut !== 'actif') {
  return res.status(403).json({
    statut: 'Erreur',
    message: 'Cette médaille est désactivée'
  });
}

    await pool.query(
      `UPDATE medailles
       SET dernier_scan = NOW()
       WHERE id = ?`,
      [id]
    );

    const medaille = rows[0];

    res.json({
    statut: 'Succès',
    donnees: {
    nom_animal: medaille.nom_animal,
    espece: medaille.espece,
    nom_proprietaire: medaille.nom_proprietaire,
    telephone: medaille.telephone,
    photo_url: medaille.photo_url
  }
});

  } catch (error) {
    console.error(error);

    res.status(500).json({
      statut: 'Erreur',
      message: 'Une erreur est survenue lors de la récupération de la médaille'
    });
  }
});

module.exports = router;