const express = require('express');
const crypto = require('crypto');
const pool = require('../config/database');
const { verifierToken } = require('../middleware/auth');

const router = express.Router();

// Fiche publique consultée depuis le QR code : seuls les champs utiles sont exposés.
router.get('/medailles/:id', async (req, res) => {
  const id = String(req.params.id || '').trim();
  try {
    const [rows] = await pool.execute(
      `SELECT m.id, m.nom_animal, m.espece, m.race, m.sexe, m.description,
              m.informations_sante, m.photo_url, m.statut,
              u.nom AS nom_proprietaire, u.telephone, u.telephone_secondaire
       FROM medailles m
       JOIN utilisateurs u ON u.id = m.utilisateur_id
       WHERE (m.id = ? OR m.token = ?) AND u.actif = 1
       LIMIT 1`,
      [id, id]
    );
    if (!rows.length) return res.status(404).json({ statut: 'Erreur', message: 'Médaille introuvable' });
    const medal = rows[0];
    if (medal.statut !== 'active') return res.status(403).json({ statut: 'Erreur', message: 'Cette médaille est désactivée' });

    await pool.execute('UPDATE medailles SET dernier_scan = NOW() WHERE id = ?', [medal.id]);
    return res.json({ statut: 'Succès', donnees: medal });
  } catch (error) {
    console.error('Erreur fiche publique :', error);
    return res.status(500).json({ statut: 'Erreur', message: 'Impossible de récupérer la fiche de l’animal' });
  }
});

module.exports = router;
