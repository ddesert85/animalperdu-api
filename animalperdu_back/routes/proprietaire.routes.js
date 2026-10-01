const express = require('express');
const crypto = require('crypto');
const pool = require('../config/database');
const { verifierToken } = require('../middleware/auth');

const router = express.Router();

router.get('/mes-medailles', verifierToken, async (req, res) => {
  try {
    const [medailles] = await pool.execute(
      `SELECT id, token, nom_animal, espece, race, sexe, date_naissance,
              description, informations_sante, photo_url, statut, dernier_scan, created_at
       FROM medailles WHERE utilisateur_id = ? ORDER BY created_at DESC`,
      [req.utilisateur.id]
    );
    return res.json({ statut: 'Succès', medailles });
  } catch (error) {
    console.error('Erreur récupération médailles :', error);
    return res.status(500).json({ statut: 'Erreur', message: 'Impossible de récupérer les médailles' });
  }
});

router.post('/mes-medailles', verifierToken, async (req, res) => {
  const { nom_animal, espece, race, sexe, date_naissance, description, informations_sante, photo_url } = req.body;
  if (!nom_animal?.trim() || !espece?.trim()) {
    return res.status(400).json({ statut: 'Erreur', message: 'Le nom de l’animal et l’espèce sont obligatoires' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  try {
    const [result] = await pool.execute(
      `INSERT INTO medailles
       (utilisateur_id, token, nom_animal, espece, race, sexe, date_naissance, description, informations_sante, photo_url, statut)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [req.utilisateur.id, token, nom_animal.trim(), espece.trim(), race?.trim() || null,
       sexe || null, date_naissance || null, description?.trim() || null,
       informations_sante?.trim() || null, photo_url?.trim() || null]
    );
    return res.status(201).json({
      statut: 'Succès', message: 'Médaille créée avec succès',
      medaille: { id: result.insertId, token, nom_animal: nom_animal.trim(), espece: espece.trim(), statut: 'active' }
    });
  } catch (error) {
    console.error('Erreur création médaille :', error);
    return res.status(500).json({ statut: 'Erreur', message: 'Impossible de créer la médaille' });
  }
});

router.put('/mes-medailles/:id', verifierToken, async (req, res) => {
  const id = Number(req.params.id);
  const { nom_animal, espece, race, sexe, date_naissance, description, informations_sante, photo_url } = req.body;
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ statut: 'Erreur', message: 'Identifiant de médaille invalide' });
  if (!nom_animal?.trim() || !espece?.trim()) return res.status(400).json({ statut: 'Erreur', message: 'Le nom de l’animal et l’espèce sont obligatoires' });

  try {
    const [result] = await pool.execute(
      `UPDATE medailles SET nom_animal = ?, espece = ?, race = ?, sexe = ?, date_naissance = ?,
       description = ?, informations_sante = ?, photo_url = ?
       WHERE id = ? AND utilisateur_id = ?`,
      [nom_animal.trim(), espece.trim(), race?.trim() || null, sexe || null, date_naissance || null,
       description?.trim() || null, informations_sante?.trim() || null, photo_url?.trim() || null,
       id, req.utilisateur.id]
    );
    if (!result.affectedRows) return res.status(404).json({ statut: 'Erreur', message: 'Médaille introuvable ou non autorisée' });
    return res.json({ statut: 'Succès', message: 'Médaille modifiée avec succès' });
  } catch (error) {
    console.error('Erreur modification médaille :', error);
    return res.status(500).json({ statut: 'Erreur', message: 'Impossible de modifier la médaille' });
  }
});

router.patch('/mes-medailles/:id/statut', verifierToken, async (req, res) => {
  const id = Number(req.params.id);
  const { statut } = req.body;
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ statut: 'Erreur', message: 'Identifiant invalide' });
  if (!['active', 'inactive'].includes(statut)) return res.status(400).json({ statut: 'Erreur', message: 'Statut attendu : active ou inactive' });

  try {
    const [result] = await pool.execute(
      'UPDATE medailles SET statut = ? WHERE id = ? AND utilisateur_id = ?',
      [statut, id, req.utilisateur.id]
    );
    if (!result.affectedRows) return res.status(404).json({ statut: 'Erreur', message: 'Médaille introuvable ou non autorisée' });
    return res.json({ statut: 'Succès', message: statut === 'active' ? 'Médaille réactivée' : 'Médaille désactivée' });
  } catch (error) {
    console.error('Erreur changement statut :', error);
    return res.status(500).json({ statut: 'Erreur', message: 'Impossible de modifier le statut' });
  }
});

module.exports = router;
