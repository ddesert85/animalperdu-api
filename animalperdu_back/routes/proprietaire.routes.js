const express = require('express');
const router = express.Router();

const pool = require('../config/database');
const { verifierToken } = require('../middleware/auth');

const crypto = require('crypto');

// Récupérer les médailles du propriétaire connecté
router.get('/mes-medailles', verifierToken, async (req, res) => {
  try {
    const [medailles] = await pool.execute(
      `SELECT
        id,
        nom_animal,
        espece,
        photo_url,
        statut
      FROM medailles
      WHERE utilisateur_id = ?`,
      [req.utilisateur.id]
    );

    res.json({
      statut: 'Succès',
      medailles
    });

  } catch (error) {
    console.error('Erreur récupération médailles :', error);

    res.status(500).json({
      statut: 'Erreur',
      message: 'Impossible de récupérer les médailles'
    });
  }
});


// Ajouter une médaille pour le propriétaire connecté
router.post('/mes-medailles', verifierToken, async (req, res) => {
  const {
    nom_animal,
    espece,
    nom_proprietaire,
    telephone,
    email,
    adresse
  } = req.body;

  if (!nom_animal || !espece || !nom_proprietaire || !telephone) {
    return res.status(400).json({
      statut: 'Erreur',
      message: 'Le nom de l’animal, l’espèce, le propriétaire et le téléphone sont obligatoires'
    });
  }

  const token = crypto.randomBytes(32).toString('hex');

  try {
    const [resultat] = await pool.execute(
      `INSERT INTO medailles (
        token,
        nom_animal,
        espece,
        nom_proprietaire,
        telephone,
        email,
        adresse,
        statut,
        utilisateur_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'actif', ?)`,
      [
        token,
        nom_animal.trim(),
        espece.trim(),
        nom_proprietaire.trim(),
        telephone.trim(),
        email?.trim() || null,
        adresse?.trim() || null,
        req.utilisateur.id
      ]
    );

    res.status(201).json({
      statut: 'Succès',
      message: 'Médaille créée avec succès',
      medaille: {
        id: resultat.insertId,
        token,
        nom_animal,
        espece,
        statut: 'actif'
      }
    });

  } catch (error) {
    console.error('Erreur création médaille :', error);

    res.status(500).json({
      statut: 'Erreur',
      message: 'Impossible de créer la médaille'
    });
  }
});


// Modifier une médaille appartenant au propriétaire connecté
router.put('/mes-medailles/:id', verifierToken, async (req, res) => {
  const id = Number(req.params.id);

  const {
    nom_animal,
    espece,
    nom_proprietaire,
    telephone,
    email,
    adresse
  } = req.body;

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      statut: 'Erreur',
      message: 'Identifiant de médaille invalide'
    });
  }

  if (!nom_animal || !espece || !nom_proprietaire || !telephone) {
    return res.status(400).json({
      statut: 'Erreur',
      message: 'Le nom de l’animal, l’espèce, le propriétaire et le téléphone sont obligatoires'
    });
  }

  try {
    const [resultat] = await pool.execute(
      `UPDATE medailles
       SET nom_animal = ?,
           espece = ?,
           nom_proprietaire = ?,
           telephone = ?,
           email = ?,
           adresse = ?
       WHERE id = ?
         AND utilisateur_id = ?`,
      [
        nom_animal.trim(),
        espece.trim(),
        nom_proprietaire.trim(),
        telephone.trim(),
        email?.trim() || null,
        adresse?.trim() || null,
        id,
        req.utilisateur.id
      ]
    );

    if (resultat.affectedRows === 0) {
      return res.status(404).json({
        statut: 'Erreur',
        message: 'Médaille introuvable ou non autorisée'
      });
    }

    return res.json({
      statut: 'Succès',
      message: 'Médaille modifiée avec succès'
    });

  } catch (error) {
    console.error('Erreur modification médaille :', error);

    return res.status(500).json({
      statut: 'Erreur',
      message: 'Impossible de modifier la médaille'
    });
  }
});


// Désactiver une médaille appartenant au propriétaire connecté
router.patch('/mes-medailles/:id/desactiver', verifierToken, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      statut: 'Erreur',
      message: 'Identifiant de médaille invalide'
    });
  }

  try {
    const [resultat] = await pool.execute(
      `UPDATE medailles
       SET statut = 'inactif'
       WHERE id = ?
         AND utilisateur_id = ?
         AND statut = 'actif'`,
      [id, req.utilisateur.id]
    );

    if (resultat.affectedRows === 0) {
      return res.status(404).json({
        statut: 'Erreur',
        message: 'Médaille introuvable, déjà inactive ou non autorisée'
      });
    }

    return res.json({
      statut: 'Succès',
      message: 'Médaille désactivée avec succès'
    });

  } catch (error) {
    console.error('Erreur désactivation médaille :', error);

    return res.status(500).json({
      statut: 'Erreur',
      message: 'Impossible de désactiver la médaille'
    });
  }
});

module.exports = router;