const express = require('express');
const pool = require('../config/database');

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS now');

    res.json({
      statut: 'OK',
      message: 'API et Base de données MySQL opérationnelles',
      horodate_bdd: rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      statut: 'Erreur',
      message: 'Échec de connexion à la BDD',
      erreur: error.message,
    });
  }
});

module.exports = router;