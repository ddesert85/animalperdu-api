/**
 * Espace propriétaire Animal Perdu.
 */

// Récupération du token
const token = sessionStorage.getItem("animalperdu_token");

// Éléments principaux
const feedback = document.getElementById("dashboard-feedback");
const ownerInformation = document.getElementById("owner-information");
const medalsSection = document.getElementById("medals-section");
const logoutButton = document.getElementById("logout-button");

const medalsList = document.getElementById("medals-list");
const medalsFeedback = document.getElementById("medals-feedback");

// Profil
const profileForm = document.getElementById("profile-form");
const editProfileButton = document.getElementById("edit-profile-button");
const cancelProfileButton = document.getElementById("cancel-profile-button");
const profileFeedback = document.getElementById("profile-feedback");
const profileSubmit = document.getElementById("profile-submit");

// Médaille
const medalForm = document.getElementById("medal-form");
const medalModal = document.getElementById("medal-modal");
const closeMedalModal = document.getElementById("close-medal-modal");
const cancelMedalButton = document.getElementById("cancel-medal-button");
const medalModalTitle = document.getElementById("medal-modal-title");
const medalSubmit = document.getElementById("medal-submit");
const medalFormFeedback = document.getElementById("medal-form-feedback");

let medailleEnCours = null;
let photoExistante = null;

// Redirection si non connecté
if (!token) {
  window.location.href = "./connexion.html";
}

/**
 * Fonction centrale pour les appels API.
 */
async function api(path, options = {}) {

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    sessionStorage.removeItem("animalperdu_token");
    window.location.href = "./connexion.html";

    throw new Error("Session expirée ou compte désactivé.");
  }

  if (!response.ok) {
    throw new Error(data.message || "Une erreur est survenue.");
  }

  return data;
}

/**
 * Affichage d'une valeur de profil.
 */
function afficherValeur(id, valeur) {
  document.getElementById(id).textContent =
    valeur || "Non renseigné";
}

/**
 * Affichage du profil propriétaire.
 */
function afficherProfil(u) {

  afficherValeur("owner-name", u.nom);
  afficherValeur("owner-email", u.email);
  afficherValeur("owner-phone", u.telephone);
  afficherValeur("owner-phone-secondary", u.telephone_secondaire);
  afficherValeur("owner-address", u.adresse);
  afficherValeur("owner-postal-code", u.code_postal);
  afficherValeur("owner-city", u.ville);

}

/**
 * Préremplissage du formulaire de profil.
 */
function remplirFormulaireProfil(u) {

  document.getElementById("profile-name").value = u.nom || "";
  document.getElementById("profile-email").value = u.email || "";
  document.getElementById("profile-phone").value = u.telephone || "";
  document.getElementById("profile-phone-secondary").value =
    u.telephone_secondaire || "";
  document.getElementById("profile-address").value = u.adresse || "";
  document.getElementById("profile-postal-code").value = u.code_postal || "";
  document.getElementById("profile-city").value = u.ville || "";

}

/**
 * Ouverture de la modification du profil.
 */
editProfileButton.addEventListener("click", () => {

  profileFeedback.textContent = "";

  const profil = {
    nom: document.getElementById("owner-name").textContent,
    email: document.getElementById("owner-email").textContent,
    telephone: document.getElementById("owner-phone").textContent,
    telephone_secondaire: document.getElementById("owner-phone-secondary").textContent,
    adresse: document.getElementById("owner-address").textContent,
    code_postal: document.getElementById("owner-postal-code").textContent,
    ville: document.getElementById("owner-city").textContent
  };

  for (const key in profil) {
    if (profil[key] === "Non renseigné") {
      profil[key] = "";
    }
  }

  remplirFormulaireProfil(profil);

  profileForm.hidden = false;
  document.getElementById("owner-profile-display").hidden = true;

});

/**
 * Annulation de la modification du profil.
 */
cancelProfileButton.addEventListener("click", () => {

  profileForm.hidden = true;
  document.getElementById("owner-profile-display").hidden = false;

  profileFeedback.textContent = "";

});

/**
 * Enregistrement du profil.
 */
profileForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  profileSubmit.disabled = true;
  profileFeedback.textContent = "Enregistrement en cours…";

  const profil = {
    nom: document.getElementById("profile-name").value.trim(),
    telephone: document.getElementById("profile-phone").value.trim(),
    telephone_secondaire: document.getElementById("profile-phone-secondary").value.trim(),
    adresse: document.getElementById("profile-address").value.trim(),
    code_postal: document.getElementById("profile-postal-code").value.trim(),
    ville: document.getElementById("profile-city").value.trim()
  };

  try {

    const data = await api("/auth/profil", {
      method: "PUT",
      body: JSON.stringify(profil)
    });

    afficherProfil(data.utilisateur);

    profileForm.hidden = true;
    document.getElementById("owner-profile-display").hidden = false;

    profileFeedback.textContent = "";

    feedback.textContent = "Votre profil a été mis à jour.";

  } catch (error) {

    profileFeedback.textContent = error.message;

  } finally {

    profileSubmit.disabled = false;

  }

});

/**
 * Affichage d'une médaille.
 */
function afficherMedaille(m) {

  const article = document.createElement("article");
  article.className = "medal-card";

  // Photo de l'animal
  if (m.photo_url) {
    const photo = document.createElement("img");

    photo.src = new URL(
      m.photo_url,
      new URL(API_BASE_URL).origin
    ).href;

    photo.alt = `Photo de ${m.nom_animal || "l'animal"}`;
    photo.className = "medal-card-photo";

    photo.style.width = "100%";
    photo.style.aspectRatio = "4 / 3";
    photo.style.objectFit = "cover";
    photo.style.borderRadius = "10px";
    photo.style.marginBottom = "12px";
    photo.style.display = "block";

    photo.onerror = () => {
      photo.remove();
    };

    article.appendChild(photo);
  }

  const title = document.createElement("h3");
  title.textContent = m.nom_animal || "Animal";

  const detail = document.createElement("p");
  detail.textContent =
    `${m.espece || ""}${m.race ? ` — ${m.race}` : ""}`;

  const state = document.createElement("p");

  const statutTexte = {
    active: "Active",
    inactive: "Inactive"
  };

  state.textContent =
    `Statut : ${statutTexte[m.statut] || "Non renseigné"}`;

  // Bouton modifier
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.textContent = "Modifier";

  editButton.addEventListener("click", () => {
    ouvrirModificationMedaille(m);
  });

  article.append(title, detail, state, editButton);

  return article;
}
/**
 * Chargement des médailles.
 */
async function chargerMedailles() {

  try {

    const data = await api("/mes-medailles");

    medalsList.replaceChildren();

    if (!data.medailles?.length) {
      medalsFeedback.textContent =
        "Vous n'avez pas encore de médaille.";
      return;
    }

    medalsFeedback.textContent = "";

    data.medailles.forEach(m => {
      medalsList.appendChild(afficherMedaille(m));
    });

  } catch (error) {

    medalsFeedback.textContent = error.message;

  }

}

/**
 * Ouverture de la fenêtre modale.
 */
function ouvrirModalMedaille() {

  medalModal.hidden = false;
  document.body.classList.add("modal-open");

}

/**
 * Fermeture de la fenêtre modale.
 */
function fermerModalMedaille() {

  medalModal.hidden = true;
  document.body.classList.remove("modal-open");

  medalForm.reset();

  medailleEnCours = null;
  photoExistante = null;

  medalFormFeedback.textContent = "";

  medalModalTitle.textContent = "Ajouter une médaille";
  medalSubmit.textContent = "Créer la médaille";

}

/**
 * Fermeture de la modale.
 */
closeMedalModal.addEventListener("click", fermerModalMedaille);
cancelMedalButton.addEventListener("click", fermerModalMedaille);

medalModal.addEventListener("click", (event) => {

  if (event.target === medalModal) {
    fermerModalMedaille();
  }

});

/**
 * Préremplissage pour modifier une médaille.
 */
function ouvrirModificationMedaille(m) {

  medailleEnCours = m;
  photoExistante = m.photo_url || null;

  medalForm.reset();

  document.getElementById("animal-name").value = m.nom_animal || "";
  document.getElementById("animal-species").value = m.espece || "";
  document.getElementById("animal-breed").value = m.race || "";
  document.getElementById("animal-sex").value = m.sexe || "";
  document.getElementById("animal-birthdate").value =
    m.date_naissance ? String(m.date_naissance).slice(0, 10) : "";
  document.getElementById("animal-description").value =
    m.description || "";
  document.getElementById("animal-health").value =
    m.informations_sante || "";

  medalModalTitle.textContent = `Modifier ${m.nom_animal}`;
  medalSubmit.textContent = "Enregistrer les modifications";

  medalFormFeedback.textContent = photoExistante
    ? "La photo actuelle sera conservée si vous n'en sélectionnez pas une nouvelle."
    : "";

  ouvrirModalMedaille();

}

/**
 * Création ou modification d'une médaille.
 */
medalForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  medalSubmit.disabled = true;

  // Mémoriser le mode avant de fermer la fenêtre
  const modification = Boolean(medailleEnCours);
  const idMedaille = medailleEnCours?.id;

  const medaille = new FormData();

  medaille.append(
    "nom_animal",
    document.getElementById("animal-name").value.trim()
  );

  medaille.append(
    "espece",
    document.getElementById("animal-species").value
  );

  medaille.append(
    "race",
    document.getElementById("animal-breed").value.trim()
  );

  medaille.append(
    "sexe",
    document.getElementById("animal-sex").value
  );

  medaille.append(
    "date_naissance",
    document.getElementById("animal-birthdate").value
  );

  medaille.append(
    "description",
    document.getElementById("animal-description").value.trim()
  );

  medaille.append(
    "informations_sante",
    document.getElementById("animal-health").value.trim()
  );

  const photo = document.getElementById("animal-photo").files[0];

  if (photo) {
    medaille.append("photo", photo);
  }

  medalFormFeedback.textContent = "Enregistrement en cours…";

  try {

    if (modification) {

      await api(`/mes-medailles/${idMedaille}`, {
        method: "PUT",
        body: medaille
      });

    } else {

      await api("/mes-medailles", {
        method: "POST",
        body: medaille
      });

    }

    fermerModalMedaille();

    await chargerMedailles();

    medalsFeedback.textContent = modification
      ? "Médaille modifiée avec succès."
      : "Médaille créée avec succès.";

  } catch (error) {

    medalFormFeedback.textContent = error.message;

  } finally {

    medalSubmit.disabled = false;

  }

});

/**
 * Chargement de l'espace propriétaire.
 */
async function chargerEspace() {

  try {

    const data = await api("/auth/profil");
    const u = data.utilisateur;

    afficherProfil(u);

    feedback.textContent =
      `Bienvenue ${u.nom || ""} dans votre espace propriétaire !`;

    ownerInformation.hidden = false;
    medalsSection.hidden = false;

    await chargerMedailles();

  } catch (error) {

    feedback.textContent = error.message;

  }

}

/**
 * Déconnexion.
 */
logoutButton.addEventListener("click", () => {

  sessionStorage.removeItem("animalperdu_token");
  window.location.href = "./connexion.html";

});

// Initialisation
if (token) {
  chargerEspace();
}

