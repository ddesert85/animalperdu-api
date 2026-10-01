const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { verifierToken } = require('../middleware/auth');

const router = express.Router();

router.post('/auth/inscription', async (req, res) => {
  const { nom, email, mot_de_passe, telephone, telephone_secondaire, adresse, code_postal, ville } = req.body;

  if (!nom?.trim() || !email?.trim() || !mot_de_passe || !telephone?.trim()) {
    return res.status(400).json({ statut: 'Erreur', message: 'Nom, email, téléphone et mot de passe sont obligatoires' });
  }
  const emailNormalise = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalise)) {
    return res.status(400).json({ statut: 'Erreur', message: 'Adresse email invalide' });
  }
  if (mot_de_passe.length < 12) {
    return res.status(400).json({ statut: 'Erreur', message: 'Le mot de passe doit contenir au moins 12 caractères' });
  }

  try {
    const [existing] = await pool.execute('SELECT id FROM utilisateurs WHERE email = ?', [emailNormalise]);
    if (existing.length) return res.status(409).json({ statut: 'Erreur', message: 'Cette adresse email est déjà utilisée' });

    const hash = await bcrypt.hash(mot_de_passe, 12);
    const [result] = await pool.execute(
      `INSERT INTO utilisateurs
       (nom, email, mot_de_passe, telephone, telephone_secondaire, adresse, code_postal, ville, role, actif)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'proprietaire', 1)`,
      [nom.trim(), emailNormalise, hash, telephone.trim(), telephone_secondaire?.trim() || null,
       adresse?.trim() || null, code_postal?.trim() || null, ville?.trim() || null]
    );

    return res.status(201).json({
      statut: 'Succès',
      message: 'Compte propriétaire créé',
      utilisateur: { id: result.insertId, nom: nom.trim(), email: emailNormalise, telephone: telephone.trim(), role: 'proprietaire' }
    });
  } catch (error) {
    console.error('Erreur inscription :', error);
    return res.status(500).json({ statut: 'Erreur', message: 'Une erreur est survenue lors de la création du compte' });
  }
});

router.post('/auth/connexion', async (req, res) => {
  const { email, mot_de_passe } = req.body;
  if (!email?.trim() || !mot_de_passe) return res.status(400).json({ statut: 'Erreur', message: 'Email et mot de passe obligatoires' });

  try {
    const [rows] = await pool.execute(
      'SELECT id, nom, email, telephone, telephone_secondaire, adresse, code_postal, ville, mot_de_passe, role, actif FROM utilisateurs WHERE email = ?',
      [email.trim().toLowerCase()]
    );
    if (!rows.length) return res.status(401).json({ statut: 'Erreur', message: 'Identifiants incorrects' });

    const user = rows[0];
    if (!user.actif) return res.status(403).json({ statut: 'Erreur', message: 'Ce compte est désactivé' });
    if (!(await bcrypt.compare(mot_de_passe, user.mot_de_passe))) {
      return res.status(401).json({ statut: 'Erreur', message: 'Identifiants incorrects' });
    }
    if (!process.env.JWT_SECRET) return res.status(500).json({ statut: 'Erreur', message: 'Configuration du serveur incorrecte' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' });
    return res.json({
      statut: 'Succès',
      message: 'Connexion réussie',
      token,
      utilisateur: {
        id: user.id, nom: user.nom, email: user.email, telephone: user.telephone,
        telephone_secondaire: user.telephone_secondaire, adresse: user.adresse,
        code_postal: user.code_postal, ville: user.ville, role: user.role
      }
    });
  } catch (error) {
    console.error('Erreur connexion :', error);
    return res.status(500).json({ statut: 'Erreur', message: 'Une erreur est survenue lors de la connexion' });
  }
});

router.get('/auth/profil', verifierToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, nom, email, telephone, telephone_secondaire, adresse, code_postal, ville, role, actif, created_at
       FROM utilisateurs WHERE id = ? AND actif = 1`,
      [req.utilisateur.id]
    );
    if (!rows.length) return res.status(401).json({ statut: 'Erreur', message: 'Compte introuvable ou désactivé' });
    return res.json({ statut: 'Succès', utilisateur: rows[0] });
  } catch (error) {
    console.error('Erreur profil :', error);
    return res.status(500).json({ statut: 'Erreur', message: 'Impossible de récupérer le profil' });
  }
});

module.exports = router;
