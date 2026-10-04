
const express = require('express');

const pool = require('../config/database');
const { verifierToken, verifierAdmin } = require('../middleware/auth');

const router = express.Router();

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

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          statut: 'Erreur',
          message: 'Identifiant de médaille invalide'
        });
      }

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
        ville
      } = req.body;

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
             informations_sante = ?
         WHERE id = ?`,
        [
          nom_animal || null,
          espece || null,
          race || null,
          sexe || null,
          date_naissance || null,
          description || null,
          informations_sante || null,
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
)

module.exports = router;