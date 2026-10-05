
/**
 * Administration Animal Perdu
 */

const token = sessionStorage.getItem("animalperdu_token");

const feedback = document.getElementById("admin-feedback");
const logoutButton = document.getElementById("logout-button");
const searchForm = document.getElementById("search-form");
const searchEmail = document.getElementById("search-email");
const medalsList = document.getElementById("medals-list");

// Vérification de la connexion
if (!token) {
  window.location.href = "./connexion.html";
}

// Déconnexion
logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem("animalperdu_token");
  window.location.href = "./connexion.html";
});

// Vérification du rôle administrateur
async function verifierAccesAdmin() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/profil`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error("Session expirée ou compte désactivé.");
    }

    if (data.utilisateur?.role !== "admin") {
      feedback.textContent = "Accès réservé aux administrateurs.";
      sessionStorage.removeItem("animalperdu_token");

      setTimeout(() => {
        window.location.href = "./connexion.html";
      }, 1500);

      return false;
    }

    feedback.textContent = "Accès administrateur autorisé.";
    return true;

  } catch (error) {
    feedback.textContent = error.message;
    sessionStorage.removeItem("animalperdu_token");

    setTimeout(() => {
      window.location.href = "./connexion.html";
    }, 1500);

    return false;
  }
}

// Affichage de la date du dernier scan
function formaterDate(date) {
  if (!date) {
    return "Jamais scannée";
  }

  const valeur = new Date(date);

  if (Number.isNaN(valeur.getTime())) {
    return "Date inconnue";
  }

  return valeur.toLocaleString("fr-FR");
}

// Chargement des médailles
async function chargerMedailles() {
  medalsList.innerHTML = `
    <tr>
      <td colspan="6">Chargement des médailles...</td>
    </tr>
  `;

  try {
    const response = await fetch(`${API_BASE_URL}/admin/medailles`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || "Impossible de récupérer les médailles."
      );
    }

    const medailles = data.medailles || [];

    if (medailles.length === 0) {
      medalsList.innerHTML = `
        <tr>
          <td colspan="6">Aucune médaille enregistrée.</td>
        </tr>
      `;
      return;
    }

    medalsList.innerHTML = "";

    medailles.forEach((medaille) => {
      const ligne = document.createElement("tr");

      const valeurs = [
        medaille.id,
        medaille.email_proprietaire || "Propriétaire inconnu",
        medaille.nom_animal || "Sans nom",
        medaille.statut || "Inconnu",
        formaterDate(medaille.dernier_scan),
        "À venir"
      ];

      valeurs.forEach((valeur) => {
        const cellule = document.createElement("td");
        cellule.textContent = valeur;
        ligne.appendChild(cellule);
      });
// Rendre la ligne cliquable pour ouvrir la fiche
ligne.style.cursor = "pointer";
ligne.title = "Cliquer pour consulter la fiche de cette médaille";

ligne.addEventListener("click", () => {
  window.location.href =
    `./admin-detail.html?id=${encodeURIComponent(medaille.id)}`;
});

medalsList.appendChild(ligne);
    });

  } catch (error) {
    console.error("Erreur chargement médailles :", error);

    medalsList.innerHTML = `
      <tr>
        <td colspan="6">Erreur lors du chargement des médailles.</td>
      </tr>
    `;

    feedback.textContent = error.message;
  }
}

// Recherche par e-mail
searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = searchEmail.value.trim().toLowerCase();

  await chargerMedailles();

  if (!email) {
    return;
  }

  const lignes = medalsList.querySelectorAll("tr");
  let resultat = 0;

  lignes.forEach((ligne) => {
    const emailCellule = ligne.cells[1];

    if (emailCellule) {
      const correspond = emailCellule.textContent
        .toLowerCase()
        .includes(email);

      ligne.style.display = correspond ? "" : "none";

      if (correspond) {
        resultat++;
      }
    }
  });

  if (resultat === 0) {
    feedback.textContent = "Aucune médaille trouvée pour cet e-mail.";
  } else {
    feedback.textContent = `${resultat} médaille(s) trouvée(s).`;
  }
});

// Initialisation
async function initialiserAdmin() {
  const autorise = await verifierAccesAdmin();

  if (autorise) {
    await chargerMedailles();
  }
}

if (token) {
  initialiserAdmin();
}

const createUserForm = document.getElementById("create-user-form");

if (createUserForm) {
  createUserForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const feedback = document.getElementById("create-user-feedback");

    const nom = document.getElementById("create-user-name").value.trim();
    const email = document.getElementById("create-user-email").value.trim();
    const telephone = document.getElementById("create-user-phone").value.trim();
    const telephoneSecondaire = document
      .getElementById("create-user-phone-secondary")
      .value.trim();
    const adresse = document
      .getElementById("create-user-address")
      .value.trim();
    const codePostal = document
      .getElementById("create-user-postal")
      .value.trim();
    const ville = document
      .getElementById("create-user-city")
      .value.trim();

    feedback.style.color = "#315c45";
    feedback.textContent = "Création du compte en cours…";

    try {
      const token = sessionStorage.getItem("animalperdu_token");

      const response = await fetch(`${API_BASE_URL}/auth/inscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          nom,
          email,
          telephone,
          telephone_secondaire: telephoneSecondaire || null,
          adresse: adresse || null,
          code_postal: codePostal || null,
          ville: ville || null
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Impossible de créer l'utilisateur.");
      }

      feedback.style.color = "#315c45";
      feedback.textContent =
        result.message ||
        "L'utilisateur a été créé. Un email d'activation lui a été envoyé.";

      createUserForm.reset();

    } catch (error) {
      console.error(error);

      feedback.style.color = "#a12e2e";
      feedback.textContent = error.message;
    }
  });
}