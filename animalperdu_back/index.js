require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/database');
const testRoutes = require('./routes/test.routes');
const healthRoutes = require('./routes/health.routes');

const app = express();

// Autoriser les requêtes extérieures (depuis ton front-end local par exemple)
app.use(cors());
app.use(express.json());

app.use('/api', testRoutes);
app.use('/api', healthRoutes);

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