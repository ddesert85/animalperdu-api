
/**
 * Fiche détaillée d'une médaille
 */

const token = sessionStorage.getItem("animalperdu_token");

const feedback = document.getElementById("detail-feedback");
const detailContainer = document.getElementById("medal-detail");
const logoutButton = document.getElementById("logout-button");

// Éléments de la fenêtre modale
const editButton = document.getElementById("edit-medal-button");
const editModal = document.getElementById("edit-modal");
const editForm = document.getElementById("edit-medal-form");
const cancelEditButton = document.getElementById("cancel-edit-button");
const saveEditButton = document.getElementById("save-edit-button");

// Récupération de l'identifiant dans l'URL
const parametres = new URLSearchParams(window.location.search);
const medalId = parametres.get("id");

// Stockage des données de la médaille
let medailleActuelle = null;

// Affichage sécurisé des valeurs
function afficher(id, valeur) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent =
      valeur === null || valeur === undefined || valeur === ""
        ? "Non renseigné"
        : valeur;
  }
}

// Formatage des dates
function formaterDate(date) {
  if (!date) {
    return "Jamais";
  }

  const valeur = new Date(date);

  if (Number.isNaN(valeur.getTime())) {
    return "Date inconnue";
  }

  return valeur.toLocaleString("fr-FR");
}

// Formatage d'une date pour un champ HTML date
function formaterDateInput(date) {
  if (!date) return "";

  const valeur = new Date(date);

  if (Number.isNaN(valeur.getTime())) {
    return "";
  }

  return valeur.toISOString().slice(0, 10);
}

// Ouverture de la fenêtre avec les données existantes
function ouvrirModal() {
  if (!medailleActuelle) return;

  document.getElementById("edit-pet-name").value =
    medailleActuelle.nom_animal || "";

  document.getElementById("edit-pet-species").value =
    medailleActuelle.espece || "";

  document.getElementById("edit-pet-breed").value =
    medailleActuelle.race || "";

  document.getElementById("edit-pet-sex").value =
    medailleActuelle.sexe || "";

  document.getElementById("edit-pet-birth").value =
    formaterDateInput(medailleActuelle.date_naissance);

  document.getElementById("edit-pet-description").value =
    medailleActuelle.description || "";

  document.getElementById("edit-pet-health").value =
    medailleActuelle.informations_sante || "";

  document.getElementById("edit-owner-name").value =
    medailleActuelle.nom_proprietaire || "";

  document.getElementById("edit-owner-phone").value =
    medailleActuelle.telephone || "";

  document.getElementById("edit-owner-phone-secondary").value =
    medailleActuelle.telephone_secondaire || "";

  document.getElementById("edit-owner-address").value =
    medailleActuelle.adresse || "";

  document.getElementById("edit-owner-postal").value =
    medailleActuelle.code_postal || "";

  document.getElementById("edit-owner-city").value =
    medailleActuelle.ville || "";

  editModal.hidden = false;
}

// Fermeture de la fenêtre
function fermerModal() {
  editModal.hidden = true;
}

// Déconnexion
logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem("animalperdu_token");
  window.location.href = "./connexion.html";
});

// Boutons de la fenêtre
editButton.addEventListener("click", ouvrirModal);
cancelEditButton.addEventListener("click", fermerModal);

// Enregistrement des modifications
editForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!medailleActuelle) {
    feedback.textContent = "Aucune médaille à modifier.";
    return;
  }

  const modifications = {
    nom_animal: document.getElementById("edit-pet-name").value.trim(),
    espece: document.getElementById("edit-pet-species").value.trim(),
    race: document.getElementById("edit-pet-breed").value.trim(),
    sexe: document.getElementById("edit-pet-sex").value.trim(),
    date_naissance:
      document.getElementById("edit-pet-birth").value || null,
    description:
      document.getElementById("edit-pet-description").value.trim(),
    informations_sante:
      document.getElementById("edit-pet-health").value.trim(),

    nom_proprietaire:
      document.getElementById("edit-owner-name").value.trim(),
    telephone:
      document.getElementById("edit-owner-phone").value.trim(),
    telephone_secondaire:
      document.getElementById("edit-owner-phone-secondary").value.trim(),
    adresse:
      document.getElementById("edit-owner-address").value.trim(),
    code_postal:
      document.getElementById("edit-owner-postal").value.trim(),
    ville:
      document.getElementById("edit-owner-city").value.trim()
  };

  saveEditButton.disabled = true;
  saveEditButton.textContent = "Enregistrement...";

  try {
    const response = await fetch(
      `${API_BASE_URL}/admin/medailles/${encodeURIComponent(medalId)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(modifications)
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || "Impossible d'enregistrer les modifications."
      );
    }

    fermerModal();

    feedback.textContent =
      data.message || "Les modifications ont été enregistrées.";

    await chargerDetail();

  } catch (error) {
    console.error("Erreur enregistrement médaille :", error);
    feedback.textContent = error.message;

  } finally {
    saveEditButton.disabled = false;
    saveEditButton.textContent = "Enregistrer";
  }
});

// Chargement de la fiche
async function chargerDetail() {
  if (!token) {
    window.location.href = "./connexion.html";
    return;
  }

  if (!medalId || !/^[1-9]\d*$/.test(medalId)) {
    feedback.textContent = "Identifiant de médaille invalide.";
    return;
  }

  try {
    // Vérification du rôle administrateur
    const profilResponse = await fetch(`${API_BASE_URL}/auth/profil`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const profilData = await profilResponse.json().catch(() => ({}));

    if (!profilResponse.ok || profilData.utilisateur?.role !== "admin") {
      throw new Error("Accès réservé aux administrateurs.");
    }

    // Récupération de la médaille
    const response = await fetch(
      `${API_BASE_URL}/admin/medailles/${encodeURIComponent(medalId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Impossible de charger la fiche.");
    }

    const medaille = data.medaille;
  
    if (!medaille) {
      throw new Error("Les informations de la médaille sont absentes.");
    }

    medailleActuelle = medaille;

    // Médaille
    afficher("medal-id", medaille.id);
    afficher("medal-status", medaille.statut);
    afficher("medal-created", formaterDate(medaille.created_at));
    afficher("medal-last-scan", formaterDate(medaille.dernier_scan));

    // Animal
afficher("pet-name", medaille.nom_animal);
afficher("pet-species", medaille.espece);
afficher("pet-breed", medaille.race);
afficher("pet-sex", medaille.sexe);
afficher("pet-birth", medaille.date_naissance);
afficher("pet-description", medaille.description);
afficher("pet-health", medaille.informations_sante);

// Photo de l'animal
const petPhoto = document.getElementById("pet-photo");

if (petPhoto) {
  if (medaille.photo_url) {
    petPhoto.src = `${API_BASE_URL.replace(/\/api\/?$/, "")}${medaille.photo_url}`;
    petPhoto.alt = `Photo de ${medaille.nom_animal || "l'animal"}`;
    petPhoto.hidden = false;

    petPhoto.onerror = () => {
      petPhoto.hidden = true;
      console.error("Impossible de charger la photo :", medaille.photo_url);
    };
  } else {
    petPhoto.hidden = true;
  }
}
    // Propriétaire
    afficher("owner-name", medaille.nom_proprietaire);
    afficher("owner-email", medaille.email_proprietaire);
    afficher("owner-phone", medaille.telephone);
    afficher("owner-phone-secondary", medaille.telephone_secondaire);
    afficher("owner-address", medaille.adresse);
    afficher("owner-postal", medaille.code_postal);
    afficher("owner-city", medaille.ville);

    afficher(
      "owner-active",
      Number(medaille.compte_actif) === 1 ? "Oui" : "Non"
    );

    detailContainer.hidden = false;

  } catch (error) {
    console.error("Erreur fiche administrateur :", error);
    feedback.textContent = error.message;
  }
}

chargerDetail();

// Suppression d'une médaille
const deleteMedalButton = document.getElementById("delete-medal-button");

if (deleteMedalButton) {
  deleteMedalButton.addEventListener("click", async () => {
    const confirmation = confirm(
      "Attention : cette action est définitive. Veux-tu vraiment supprimer cette médaille ?"
    );

    if (!confirmation) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/medailles/${medalId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Impossible de supprimer la médaille.");
      }

      alert("La médaille a bien été supprimée.");

      window.location.href = "admin.html";

    } catch (error) {
      console.error("Erreur suppression médaille :", error);
      alert(error.message || "Une erreur est survenue.");
    }
  });
}