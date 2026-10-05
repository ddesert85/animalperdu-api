const express = require('express');

const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');

const pool = require('../config/database');

const { verifierToken, verifierAdmin } = require('../middleware/auth');

const router = express.Router();
const crypto = require("crypto");
const { envoyerEmail } = require("../services/email.service");



router.post(
  '/auth/inscription',
  verifierToken,
  verifierAdmin,
  async (req, res) => {
  const {
    nom,
    email,
    telephone,
    telephone_secondaire,
    adresse,
    code_postal,
    ville
  } = req.body;

  if (!nom?.trim() || !email?.trim() || !telephone?.trim()) {
    return res.status(400).json({
      statut: 'Erreur',
      message: 'Nom, email et téléphone sont obligatoires'
    });
  }

  const emailNormalise = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalise)) {
    return res.status(400).json({
      statut: 'Erreur',
      message: 'Adresse email invalide'
    });
  }

  try {
    const [existing] = await pool.execute(
      'SELECT id FROM utilisateurs WHERE email = ?',
      [emailNormalise]
    );

    if (existing.length) {
      return res.status(409).json({
        statut: 'Erreur',
        message: 'Cette adresse email est déjà utilisée'
      });
    }

    // Génération du mot de passe aléatoire inutilisable
    const motDePasseAleatoire = crypto.randomBytes(48).toString('hex');
    const hash = await bcrypt.hash(motDePasseAleatoire, 12);

    // Génération du jeton d'activation
    const token = crypto.randomBytes(32).toString('hex');

    // Seule l'empreinte du jeton sera enregistrée
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [result] = await pool.execute(
      `INSERT INTO utilisateurs
      (
        nom,
        email,
        mot_de_passe,
        telephone,
        telephone_secondaire,
        adresse,
        code_postal,
        ville,
        role,
        actif,
        token_activation,
        token_expiration
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'proprietaire', 0, ?, ?)`,
      [
        nom.trim(),
        emailNormalise,
        hash,
        telephone.trim(),
        telephone_secondaire?.trim() || null,
        adresse?.trim() || null,
        code_postal?.trim() || null,
        ville?.trim() || null,
        tokenHash,
        expiration
      ]
    );

    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/+$/, '');

    if (!frontendUrl) {
      throw new Error('FRONTEND_URL non configurée');
    }

    const lienActivation =
      `${frontendUrl}/pages/activation.html?token=${token}`;

    try {
      await envoyerEmail({
        destinataire: emailNormalise,
        sujet: 'Activez votre compte Animal Perdu',

        texte:
          `Bonjour ${nom.trim()},\n\n` +
          `Votre compte Animal Perdu a été créé.\n\n` +
          `Pour choisir votre mot de passe et activer votre compte, cliquez sur ce lien :\n` +
          `${lienActivation}\n\n` +
          `Ce lien est valable pendant 24 heures.\n\n` +
          `Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,

        html: `
          <h2>Bienvenue sur Animal Perdu !</h2>

          <p>Bonjour ${nom.trim()},</p>

          <p>Votre compte a été créé.</p>

          <p>
            Pour choisir votre mot de passe et activer votre compte,
            cliquez sur le bouton ci-dessous :
          </p>

          <p>
            <a href="${lienActivation}"
               style="display:inline-block;padding:12px 20px;background:#287a45;color:white;text-decoration:none;border-radius:5px;">
              Activer mon compte
            </a>
          </p>

          <p>Ce lien est valable pendant 24 heures.</p>

          <p>
            Si vous n'êtes pas à l'origine de cette demande,
            ignorez cet email.
          </p>
        `
      });

    } catch (erreurEmail) {
      // Si l'email échoue, on supprime le compte créé
      await pool.execute(
        'DELETE FROM utilisateurs WHERE id = ? AND actif = 0',
        [result.insertId]
      );

      throw erreurEmail;
    }

    return res.status(201).json({
      statut: 'Succès',
      message: 'Un email d’activation vient de vous être envoyé.'
    });

  } catch (error) {
    console.error('Erreur inscription :', error);

    return res.status(500).json({
      statut: 'Erreur',
      message: 'Une erreur est survenue lors de la création du compte',
      code: error.code || 'ERREUR_INCONNUE'
    });
  }
});

router.post('/auth/connexion', async (req, res) => {

  const { email, mot_de_passe } = req.body;

  if (!email?.trim() || !mot_de_passe) {
    return res.status(400).json({ statut: 'Erreur', message: 'Email et mot de passe obligatoires' });
  }

  try {

    const [rows] = await pool.execute(
      'SELECT id, nom, email, telephone, telephone_secondaire, adresse, code_postal, ville, mot_de_passe, role, actif FROM utilisateurs WHERE email = ?',
      [email.trim().toLowerCase()]
    );

    if (!rows.length) {
      return res.status(401).json({ statut: 'Erreur', message: 'Identifiants incorrects' });
    }

    const user = rows[0];

    if (!user.actif) {
      return res.status(403).json({ statut: 'Erreur', message: 'Ce compte est désactivé' });
    }

    if (!(await bcrypt.compare(mot_de_passe, user.mot_de_passe))) {
      return res.status(401).json({ statut: 'Erreur', message: 'Identifiants incorrects' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ statut: 'Erreur', message: 'Configuration du serveur incorrecte' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.json({
      statut: 'Succès',
      message: 'Connexion réussie',
      token,
      utilisateur: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        telephone: user.telephone,
        telephone_secondaire: user.telephone_secondaire,
        adresse: user.adresse,
        code_postal: user.code_postal,
        ville: user.ville,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Erreur connexion :', error);
    return res.status(500).json({ statut: 'Erreur', message: 'Une erreur est survenue lors de la connexion' });
  }

});


router.post('/auth/activation', async (req, res) => {

  const { token, mot_de_passe } = req.body;

  if (!token || !mot_de_passe) {
    return res.status(400).json({
      statut: 'Erreur',
      message: 'Le lien et le mot de passe sont obligatoires'
    });
  }

  if (mot_de_passe.length < 12) {
    return res.status(400).json({
      statut: 'Erreur',
      message: 'Le mot de passe doit contenir au moins 12 caractères'
    });
  }

  try {

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const [rows] = await pool.execute(
      `SELECT id
       FROM utilisateurs
       WHERE token_activation = ?
         AND token_expiration > NOW()
         AND actif = 0`,
      [tokenHash]
    );

    if (!rows.length) {
      return res.status(400).json({
        statut: 'Erreur',
        message: 'Ce lien d’activation est invalide ou expiré.'
      });
    }

    const hash = await bcrypt.hash(mot_de_passe, 12);

    const [result] = await pool.execute(
      `UPDATE utilisateurs
       SET mot_de_passe = ?,
           actif = 1,
           token_activation = NULL,
           token_expiration = NULL
       WHERE id = ?
         AND actif = 0
         AND token_activation = ?
         AND token_expiration > NOW()`,
      [hash, rows[0].id, tokenHash]
    );

    if (result.affectedRows !== 1) {
      return res.status(400).json({
        statut: 'Erreur',
        message: 'Ce lien d’activation est invalide ou expiré.'
      });
    }

    return res.json({
      statut: 'Succès',
      message: 'Votre compte est activé. Vous pouvez maintenant vous connecter.'
    });

  } catch (error) {

    console.error('Erreur activation :', error);

    return res.status(500).json({
      statut: 'Erreur',
      message: 'Une erreur est survenue lors de l’activation du compte'
    });
  }

});

router.get('/auth/profil', verifierToken, async (req, res) => {

  try {

    const [rows] = await pool.execute(
      `SELECT id, nom, email, telephone, telephone_secondaire, adresse, code_postal, ville, role, actif, created_at
       FROM utilisateurs WHERE id = ? AND actif = 1`,
      [req.utilisateur.id]
    );

    if (!rows.length) {
      return res.status(401).json({ statut: 'Erreur', message: 'Compte introuvable ou désactivé' });
    }

    return res.json({ statut: 'Succès', utilisateur: rows[0] });

  } catch (error) {
    console.error('Erreur profil :', error);
    return res.status(500).json({ statut: 'Erreur', message: 'Impossible de récupérer le profil' });
  }

});

// MODIFICATION DU PROFIL PROPRIÉTAIRE
router.put('/auth/profil', verifierToken, async (req, res) => {

  const {
    nom,
    telephone,
    telephone_secondaire,
    adresse,
    code_postal,
    ville
  } = req.body;

  if (!nom?.trim() || !telephone?.trim()) {
    return res.status(400).json({
      statut: 'Erreur',
      message: 'Le nom et le téléphone sont obligatoires'
    });
  }

  try {

    await pool.execute(
      `UPDATE utilisateurs
       SET nom = ?,
           telephone = ?,
           telephone_secondaire = ?,
           adresse = ?,
           code_postal = ?,
           ville = ?
       WHERE id = ? AND actif = 1`,
      [
        nom.trim(),
        telephone.trim(),
        telephone_secondaire?.trim() || null,
        adresse?.trim() || null,
        code_postal?.trim() || null,
        ville?.trim() || null,
        req.utilisateur.id
      ]
    );

    const [rows] = await pool.execute(
      `SELECT id, nom, email, telephone, telephone_secondaire,
              adresse, code_postal, ville, role, actif, created_at
       FROM utilisateurs
       WHERE id = ? AND actif = 1`,
      [req.utilisateur.id]
    );

    if (!rows.length) {
      return res.status(401).json({
        statut: 'Erreur',
        message: 'Compte introuvable ou désactivé'
      });
    }

    return res.json({
      statut: 'Succès',
      message: 'Profil mis à jour',
      utilisateur: rows[0]
    });

  } catch (error) {
    console.error('Erreur modification profil :', error);
    return res.status(500).json({
      statut: 'Erreur',
      message: 'Impossible de modifier le profil'
    });
  }

});

module.exports = router;

