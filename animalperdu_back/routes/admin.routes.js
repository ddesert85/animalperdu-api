
const express = require('express');

const pool = require('../config/database');
const { verifierToken, verifierAdmin } = require('../middleware/auth');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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



// Récupération de toutes les médailles pour l'administration
router.get(
  '/admin/medailles',
  verifierToken,
  verifierAdmin,
  async (req, res) => {
    try {
      const [medailles] = await pool.execute(
        `SELECT
          m.id,
          m.utilisateur_id,
          u.email AS email_proprietaire,
          m.nom_animal,
          m.espece,
          m.statut,
          m.dernier_scan,
          m.created_at
        FROM medailles m
        LEFT JOIN utilisateurs u ON u.id = m.utilisateur_id
        ORDER BY m.created_at DESC`
      );

      return res.json({
        statut: 'Succès',
        medailles
      });

    } catch (error) {
      console.error('Erreur récupération admin des médailles :', error);

      return res.status(500).json({
        statut: 'Erreur',
        message: 'Impossible de récupérer les médailles'
      });
    }
  }
);


// Récupération du détail d'une médaille pour l'administration
router.get(
  '/admin/medailles/:id',
  verifierToken,
  verifierAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          statut: 'Erreur',
          message: 'Identifiant de médaille invalide'
        });
      }

      const [medailles] = await pool.execute(
        `SELECT
          m.id,
          m.utilisateur_id,
          m.token,
          m.nom_animal,
          m.espece,
          m.race,
          m.sexe,
          m.date_naissance,
          m.description,
          m.informations_sante,
          m.photo_url,
          m.statut,
          m.dernier_scan,
          m.created_at,
          m.updated_at,
          u.nom AS nom_proprietaire,
          u.email AS email_proprietaire,
          u.telephone,
          u.telephone_secondaire,
          u.adresse,
          u.code_postal,
          u.ville,
          u.actif AS compte_actif
        FROM medailles m
        LEFT JOIN utilisateurs u ON u.id = m.utilisateur_id
        WHERE m.id = ?
        LIMIT 1`,
        [id]
      );

      if (medailles.length === 0) {
        return res.status(404).json({
          statut: 'Erreur',
          message: 'Médaille introuvable'
        });
      }

      return res.json({
        statut: 'Succès',
        medaille: medailles[0]
      });

    } catch (error) {
      console.error('Erreur récupération détail médaille :', error);

      return res.status(500).json({
        statut: 'Erreur',
        message: 'Impossible de récupérer les détails de la médaille'
      });
    }
  }
);


// Modification des informations d'une médaille et de son propriétaire
router.put(
  '/admin/medailles/:id',
  verifierToken,
  verifierAdmin,
  async (req, res) => {

    const connection = await pool.getConnection();

    try {

      const id = Number(req.params.id);

      const {
        nom_animal,
        espece,
        race,
        sexe,
        date_naissance,
        description,
        informations_sante,
        nom_proprietaire,
        telephone,
        telephone_secondaire,
        adresse,
        code_postal,
        ville,
        statut
      } = req.body;

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          statut: 'Erreur',
          message: 'Identifiant de médaille invalide'
        });
      }

      if (
        statut !== undefined &&
        !['active', 'inactive'].includes(statut)
      ) {
        return res.status(400).json({
          statut: 'Erreur',
          message: 'Statut invalide'
        });
      }

      await connection.beginTransaction();

      const [medailles] = await connection.execute(
        `SELECT utilisateur_id
         FROM medailles
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [id]
      );

      if (medailles.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          statut: 'Erreur',
          message: 'Médaille introuvable'
        });
      }

      const utilisateurId = medailles[0].utilisateur_id;

      await connection.execute(
        `UPDATE medailles
         SET nom_animal = ?,
             espece = ?,
             race = ?,
             sexe = ?,
             date_naissance = ?,
             description = ?,
             informations_sante = ?,
             statut = COALESCE(?, statut)
         WHERE id = ?`,
        [
          nom_animal || null,
          espece || null,
          race || null,
          sexe || null,
          date_naissance || null,
          description || null,
          informations_sante || null,
          statut ?? null,
          id
        ]
      );

      if (utilisateurId !== null) {
        await connection.execute(
          `UPDATE utilisateurs
           SET nom = ?,
               telephone = ?,
               telephone_secondaire = ?,
               adresse = ?,
               code_postal = ?,
               ville = ?
           WHERE id = ?`,
          [
            nom_proprietaire || null,
            telephone || null,
            telephone_secondaire || null,
            adresse || null,
            code_postal || null,
            ville || null,
            utilisateurId
          ]
        );
      }

      await connection.commit();

      return res.json({
        statut: 'Succès',
        message: 'Les informations ont été modifiées'
      });

    } catch (error) {

      await connection.rollback();

      console.error('Erreur modification médaille :', error);

      return res.status(500).json({
        statut: 'Erreur',
        message: 'Impossible de modifier les informations'
      });

    } finally {

      connection.release();

    }
  }
);

// Suppression d'une médaille depuis l'administration
router.delete(
  '/admin/medailles/:id',
  verifierToken,
  verifierAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          statut: 'Erreur',
          message: 'Identifiant de médaille invalide'
        });
      }

      // Récupération de la photo associée
      const [medailles] = await pool.execute(
        'SELECT photo_url FROM medailles WHERE id = ?',
        [id]
      );

      if (medailles.length === 0) {
        return res.status(404).json({
          statut: 'Erreur',
          message: 'Médaille introuvable'
        });
      }

      const photoUrl = medailles[0].photo_url;

      // Suppression de la médaille en base de données
      await pool.execute(
        'DELETE FROM medailles WHERE id = ?',
        [id]
      );

      // Suppression de la photo si elle se trouve dans uploads
      if (photoUrl && photoUrl.startsWith('/uploads/')) {
        const nomFichier = path.basename(photoUrl);
        const cheminPhoto = path.join(uploadDir, nomFichier);

        try {
          await fs.promises.unlink(cheminPhoto);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.error('Erreur suppression photo :', error);
          }
        }
      }

      return res.json({
        statut: 'Succès',
        message: 'La médaille et sa photo ont été supprimées'
      });

    } catch (error) {
      console.error('Erreur suppression médaille admin :', error);

      return res.status(500).json({
        statut: 'Erreur',
        message: 'Impossible de supprimer la médaille'
      });
    }
  }
);


// Suppression d'un propriétaire et de toutes ses médailles
router.delete(
  '/admin/proprietaires/:id',
  verifierToken,
  verifierAdmin,
  async (req, res) => {
    const connection = await pool.getConnection();

    let photosASupprimer = [];

    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          statut: 'Erreur',
          message: 'Identifiant du propriétaire invalide'
        });
      }

      await connection.beginTransaction();

      // Vérification du compte et de son rôle
      const [utilisateurs] = await connection.execute(
        `SELECT id, role
         FROM utilisateurs
         WHERE id = ?
         FOR UPDATE`,
        [id]
      );

      if (utilisateurs.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          statut: 'Erreur',
          message: 'Propriétaire introuvable'
        });
      }

      if (utilisateurs[0].role !== 'proprietaire') {
        await connection.rollback();

        return res.status(403).json({
          statut: 'Erreur',
          message: 'La suppression est réservée aux comptes propriétaires'
        });
      }

      // Récupération des photos de toutes ses médailles
      const [medailles] = await connection.execute(
        `SELECT photo_url
         FROM medailles
         WHERE utilisateur_id = ?`,
        [id]
      );

      photosASupprimer = medailles
        .map(m => m.photo_url)
        .filter(photo =>
          typeof photo === 'string' &&
          photo.startsWith('/uploads/')
        );

      // Suppression de toutes ses médailles
      await connection.execute(
        'DELETE FROM medailles WHERE utilisateur_id = ?',
        [id]
      );

      // Suppression du compte propriétaire
      await connection.execute(
        `DELETE FROM utilisateurs
         WHERE id = ? AND role = 'proprietaire'`,
        [id]
      );

      await connection.commit();

      // Suppression des photos qui ne sont plus utilisées
      for (const photoUrl of new Set(photosASupprimer)) {
        const nomFichier = path.basename(photoUrl);
        const cheminPhoto = path.join(uploadDir, nomFichier);

        try {
          await fs.promises.unlink(cheminPhoto);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.error('Erreur suppression photo propriétaire :', error);
          }
        }
      }

      return res.json({
        statut: 'Succès',
        message: 'Le propriétaire et ses médailles ont été supprimés',
        nombreMedailles: medailles.length
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }

      console.error('Erreur suppression propriétaire :', error);

      return res.status(500).json({
        statut: 'Erreur',
        message: 'Impossible de supprimer le propriétaire'
      });

    } finally {
      connection.release();
    }
  }
);

// Création d'une médaille par l'administrateur
router.post(
  '/admin/medailles',
  verifierToken,
  verifierAdmin,
  recevoirPhoto,
  async (req, res) => {

    const {
      utilisateur_id,
      nom_animal,
      espece,
      race,
      sexe,
      date_naissance,
      description,
      informations_sante
    } = req.body;

    if (!utilisateur_id) {
      return res.status(400).json({
        statut: 'Erreur',
        message: 'Le propriétaire est obligatoire'
      });
    }

    if (!nom_animal?.trim() || !espece?.trim()) {
      return res.status(400).json({
        statut: 'Erreur',
        message: 'Le nom de l’animal et l’espèce sont obligatoires'
      });
    }

    const utilisateurId = Number(utilisateur_id);

    if (!Number.isInteger(utilisateurId) || utilisateurId <= 0) {
      return res.status(400).json({
        statut: 'Erreur',
        message: 'Identifiant de propriétaire invalide'
      });
    }

    const token = crypto.randomBytes(32).toString('hex');

    let photo_url = null;
    let cheminPhoto = null;

    try {

      // Vérification que le propriétaire existe bien
      const [utilisateurs] = await pool.execute(
        `SELECT id
         FROM utilisateurs
         WHERE id = ? AND role = 'proprietaire'
         LIMIT 1`,
        [utilisateurId]
      );

      if (utilisateurs.length === 0) {
        return res.status(404).json({
          statut: 'Erreur',
          message: 'Propriétaire introuvable'
        });
      }

      // Compression automatique de la photo
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

      // Création de la médaille
      const [result] = await pool.execute(
        `INSERT INTO medailles
         (
           utilisateur_id,
           token,
           nom_animal,
           espece,
           race,
           sexe,
           date_naissance,
           description,
           informations_sante,
           photo_url,
           statut
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          utilisateurId,
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
          utilisateur_id: utilisateurId,
          token,
          nom_animal: nom_animal.trim(),
          espece: espece.trim(),
          photo_url,
          statut: 'active'
        }
      });

    } catch (error) {

      console.error('Erreur création médaille admin :', error);

      // Suppression de la photo si la base de données échoue
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

// Récupération des propriétaires pour la création d'une médaille
router.get(
  '/admin/proprietaires',
  verifierToken,
  verifierAdmin,
  async (req, res) => {
    try {
      const [utilisateurs] = await pool.execute(
        `SELECT id, nom, email
         FROM utilisateurs
         WHERE role = 'proprietaire'
         ORDER BY nom ASC`
      );

      return res.json({
        statut: 'Succès',
        proprietaires: utilisateurs
      });

    } catch (error) {
      console.error('Erreur récupération des propriétaires :', error);

      return res.status(500).json({
        statut: 'Erreur',
        message: 'Impossible de récupérer les propriétaires'
      });
    }
  }
);

module.exports = router;
