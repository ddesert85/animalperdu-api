require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

// Autoriser les requêtes extérieures (depuis ton front-end local par exemple)
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.get('/api/health', async (req, res) => {
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

app.get('/api/test', (req, res) => {
  res.json({
    statut: 'OK',
    message: 'La route de test fonctionne'
  });
});

app.get('/api/medailles/:id', async (req, res) => {

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});