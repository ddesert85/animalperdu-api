require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// Configuration de la connexion PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Route de test avec requête BDD
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      statut: 'OK',
      message: 'API et Base de données PostgreSQL opérationnelles',
      horodate_bdd: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      statut: 'Erreur',
      message: 'Échec de connexion à la BDD',
      erreur: error.message,
      detail: error.stack
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});