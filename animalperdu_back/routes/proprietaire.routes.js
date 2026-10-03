
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');

const pool = require('../config/database');
const { verifierToken } = require('../middleware/auth');

const router = express.Router();

// Dossier de stockage des photos optimisées
const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Réception temporaire de la photo en mémoire
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 20 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    const formatsAutorises = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!formatsAutorises.includes(file.mimetype)) {
      return cb(
        new Error('Format de photo non accepté. Utilisez JPG, PNG ou WebP.')
      );
    }

    cb(null, true);
  }
});

// Gestion des erreurs d'envoi
function recevoirPhoto(req, res, next) {
  upload.single('photo')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        statut: 'Erreur',
        message: 'La photo est trop volumineuse. Limite : 20 Mo.'
      });
    }

    return res.status(400).json({
      statut: 'Erreur',
      message: error.message || 'Impossible de recevoir la photo.'
    });
  });
}

// Récupération des médailles du propriétaire
router.get('/mes-medailles', verifierToken, async (req, res) => {
  try {
    const [medailles] = await pool.execute(
      `SELECT id, token, nom_animal, espece, race, sexe, date_naissance,
              description, informations_sante, photo_url, statut, dernier_scan, created_at
       FROM medailles
       WHERE utilisateur_id = ?
       ORDER BY created_at DESC`,
      [req.utilisateur.id]
    );

    return res.json({
      statut: 'Succès',
      medailles
    });

  } catch (error) {
    console.error('Erreur récupération médailles :', error);

    return res.status(500).json({
      statut: 'Erreur',
      message: 'Impossible de récupérer les médailles'
    });
  }
});

// Création d'une médaille avec compression automatique de la photo
router.post(
  '/mes-medailles',
  verifierToken,
  recevoirPhoto,
  async (req, res) => {

    const {
      nom_animal,
      espece,
      race,
      sexe,
      date_naissance,
      description,
      informations_sante
    } = req.body;

    if (!nom_animal?.trim() || !espece?.trim()) {
      return res.status(400).json({
        statut: 'Erreur',
        message: 'Le nom de l’animal et l’espèce sont obligatoires'
      });
    }

    const token = crypto.randomBytes(32).toString('hex');

    let photo_url = null;
    let cheminPhoto = null;

    try {

      // Compression automatique si une photo est fournie
      if (req.file) {

        const nomFichier = `${crypto.randomUUID()}.webp`;

        cheminPhoto = path.join(uploadDir, nomFichier);

        await sharp(req.file.buffer)
          .rotate()
          .resize({
            width: 1200,
            height: 1200,
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({
            quality: 80,
            effort: 4
          })
          .toFile(cheminPhoto);

        photo_url = `/uploads/${nomFichier}`;
      }

      // Enregistrement de la médaille en base
      const [result] = await pool.execute(
        `INSERT INTO medailles
         (utilisateur_id, token, nom_animal, espece, race, sexe,
          date_naissance, description, informations_sante, photo_url, statut)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          req.utilisateur.id,
          token,
          nom_animal.trim(),
          espece.trim(),
          race?.trim() || null,
          sexe || null,
          date_naissance || null,
          description?.trim() || null,
          informations_sante?.trim() || null,
          photo_url
        ]
      );

      return res.status(201).json({
        statut: 'Succès',
        message: 'Médaille créée avec succès',
        medaille: {
          id: result.insertId,
          token,
          nom_animal: nom_animal.trim(),
          espece: espece.trim(),
          photo_url,
          statut: 'active'
        }
      });

    } catch (error) {
      console.error('Erreur création médaille :', error);

      // Nettoyage si une erreur survient après la création du fichier
      if (cheminPhoto) {
        try {
          await fs.promises.unlink(cheminPhoto);
        } catch (suppressionError) {
          console.error(
            'Erreur suppression photo :',
            suppressionError
          );
        }
      }

      return res.status(500).json({
        statut: 'Erreur',
        message: 'Impossible de créer la médaille'
      });
    }
  }
);


// Modification d'une médaille avec remplacement facultatif de la photo
router.put(
  '/mes-medailles/:id',
  verifierToken,
  recevoirPhoto,
  async (req, res) => {

    const id = Number(req.params.id);

    const {
      nom_animal,
      espece,
      race,
      sexe,
      date_naissance,
      description,
      informations_sante
    } = req.body;

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        statut: 'Erreur',
        message: 'Identifiant de médaille invalide'
      });
    }

    if (!nom_animal?.trim() || !espece?.trim()) {
      return res.status(400).json({
        statut: 'Erreur',
        message: 'Le nom de l’animal et l’espèce sont obligatoires'
      });
    }

    let nouveauCheminPhoto = null;

    try {

      // Vérifier que la médaille appartient au propriétaire
      const [medailles] = await pool.execute(
        `SELECT photo_url
         FROM medailles
         WHERE id = ? AND utilisateur_id = ?`,
        [id, req.utilisateur.id]
      );

      if (!medailles.length) {
        return res.status(404).json({
          statut: 'Erreur',
          message: 'Médaille introuvable ou non autorisée'
        });
      }

      const anciennePhoto = medailles[0].photo_url;
      let photo_url = anciennePhoto;

      // Si une nouvelle photo est envoyée, la compresser
      if (req.file) {

        const nomFichier = `${crypto.randomUUID()}.webp`;

        nouveauCheminPhoto = path.join(uploadDir, nomFichier);

        await sharp(req.file.buffer)
          .rotate()
          .resize({
            width: 1200,
            height: 1200,
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({
            quality: 80,
            effort: 4
          })
          .toFile(nouveauCheminPhoto);

        photo_url = `/uploads/${nomFichier}`;
      }

      await pool.execute(
        `UPDATE medailles
         SET nom_animal = ?,
             espece = ?,
             race = ?,
             sexe = ?,
             date_naissance = ?,
             description = ?,
             informations_sante = ?,
             photo_url = ?
         WHERE id = ? AND utilisateur_id = ?`,
        [
          nom_animal.trim(),
          espece.trim(),
          race?.trim() || null,
          sexe || null,
          date_naissance || null,
          description?.trim() || null,
          informations_sante?.trim() || null,
          photo_url,
          id,
          req.utilisateur.id
        ]
      );

      // Supprimer l'ancienne photo uniquement après la mise à jour réussie
      if (req.file && anciennePhoto?.startsWith('/uploads/')) {

        const ancienNom = path.basename(anciennePhoto);
        const ancienChemin = path.join(uploadDir, ancienNom);

        try {
          await fs.promises.unlink(ancienChemin);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.error('Erreur suppression ancienne photo :', error);
          }
        }
      }

      return res.json({
        statut: 'Succès',
        message: 'Médaille modifiée avec succès',
        photo_url
      });

    } catch (error) {

      console.error('Erreur modification médaille :', error);

      // Supprimer la nouvelle photo si l'enregistrement échoue
      if (nouveauCheminPhoto) {
        try {
          await fs.promises.unlink(nouveauCheminPhoto);
        } catch (suppressionError) {
          console.error('Erreur nettoyage nouvelle photo :', suppressionError);
        }
      }

      return res.status(500).json({
        statut: 'Erreur',
        message: 'Impossible de modifier la médaille'
      });
    }
  }
);

// Activation ou désactivation d'une médaille
router.patch('/mes-medailles/:id/statut', verifierToken, async (req, res) => {
  const id = Number(req.params.id);
  const { statut } = req.body;

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      statut: 'Erreur',
      message: 'Identifiant invalide'
    });
  }

  if (!['active', 'inactive'].includes(statut)) {
    return res.status(400).json({
      statut: 'Erreur',
      message: 'Statut attendu : active ou inactive'
    });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE medailles SET statut = ? WHERE id = ? AND utilisateur_id = ?',
      [statut, id, req.utilisateur.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        statut: 'Erreur',
        message: 'Médaille introuvable ou non autorisée'
      });
    }

    return res.json({
      statut: 'Succès',
      message: statut === 'active'
        ? 'Médaille réactivée'
        : 'Médaille désactivée'
    });

  } catch (error) {
    console.error('Erreur changement statut :', error);

    return res.status(500).json({
      statut: 'Erreur',
      message: 'Impossible de modifier le statut'
    });
  }
});

module.exports = router;