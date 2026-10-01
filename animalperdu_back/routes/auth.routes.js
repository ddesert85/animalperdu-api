
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { verifierToken } = require('../middleware/auth');

const router = express.Router();

// Inscription d'un propriétaire
router.post('/auth/inscription', async (req, res) => {
  const { nom, email, mot_de_passe } = req.body;

  if (!nom || !email || !mot_de_passe) {
    return res.status(400).json({
      statut: 'Erreur',
      message: 'Tous les champs sont obligatoires'
    });
  }

  const emailNormalise = email.trim().toLowerCase();

  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalise);

  if (!emailValide) {
    return res.status(400).json({
      statut: 'Erreur',
      message: 'Adresse email invalide'
    });
  }

  if (mot_de_passe.length < 12) {
    return res.status(400).json({
      statut: 'Erreur',
      message: 'Le mot de passe doit contenir au moins 12 caractères'
    });
  }

  try {
    const [utilisateurs] = await pool.query(
      'SELECT id FROM utilisateurs WHERE email = ?',
      [emailNormalise]
    );

    if (utilisateurs.length > 0) {
      return res.status(409).json({
        statut: 'Erreur',
        message: 'Cette adresse email est déjà utilisée'
      });
    }

    const motDePasseHache = await bcrypt.hash(mot_de_passe, 12);

    const [resultat] = await pool.query(
      `INSERT INTO utilisateurs
       (nom, email, mot_de_passe, role)
       VALUES (?, ?, ?, 'proprietaire')`,
      [nom.trim(), emailNormalise, motDePasseHache]
    );

    return res.status(201).json({
      statut: 'Succès',
      message: 'Compte propriétaire créé',
      utilisateur: {
        id: resultat.insertId,
        nom: nom.trim(),
        email: emailNormalise,
        role: 'proprietaire'
      }
    });

  } catch (error) {
    console.error('Erreur inscription :', error);

    return res.status(500).json({
      statut: 'Erreur',
      message: 'Une erreur est survenue lors de la création du compte'
    });
  }
});


// Connexion d'un utilisateur
router.post('/auth/connexion', async (req, res) => {
  const { email, mot_de_passe } = req.body;

  if (!email || !mot_de_passe) {
    return res.status(400).json({
      statut: 'Erreur',
      message: 'Email et mot de passe obligatoires'
    });
  }

  const emailNormalise = email.trim().toLowerCase();

  try {
    const [utilisateurs] = await pool.query(
      `SELECT id, nom, email, mot_de_passe, role, actif
       FROM utilisateurs
       WHERE email = ?`,
      [emailNormalise]
    );

    if (utilisateurs.length === 0) {
      return res.status(401).json({
        statut: 'Erreur',
        message: 'Identifiants incorrects'
      });
    }

    const utilisateur = utilisateurs[0];

    if (!utilisateur.actif) {
      return res.status(403).json({
        statut: 'Erreur',
        message: 'Ce compte est désactivé'
      });
    }

    const motDePasseValide = await bcrypt.compare(
      mot_de_passe,
      utilisateur.mot_de_passe
    );

    if (!motDePasseValide) {
      return res.status(401).json({
        statut: 'Erreur',
        message: 'Identifiants incorrects'
      });
    }

    if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET absent du fichier .env');

  return res.status(500).json({
    statut: 'Erreur',
    message: 'Configuration du serveur incorrecte'
  });
}

const token = jwt.sign(
  {
    id: utilisateur.id,
    role: utilisateur.role
  },
  process.env.JWT_SECRET,
  {
    expiresIn: '2h'
  }
);

    return res.json({
      statut: 'Succès',
      message: 'Connexion réussie',
      token,
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        email: utilisateur.email,
        role: utilisateur.role
      }
    });

  } catch (error) {
    console.error('Erreur connexion :', error);

    return res.status(500).json({
      statut: 'Erreur',
      message: 'Une erreur est survenue lors de la connexion'
    });
  }
});

// Route temporaire de vérification du token
router.get('/auth/profil', verifierToken, (req, res) => {
  res.json({
    statut: 'Succès',
    message: 'Authentification valide',
    utilisateur: req.utilisateur
  });
});

module.exports = router;