/**
 * Espace propriétaire Animal Perdu.
 */
const token = sessionStorage.getItem("animalperdu_token");
const feedback = document.getElementById("dashboard-feedback");
const ownerInformation = document.getElementById("owner-information");
const medalsSection = document.getElementById("medals-section");
const logoutButton = document.getElementById("logout-button");
const medalsList = document.getElementById("medals-list");
const medalsFeedback = document.getElementById("medals-feedback");

if (!token) window.location.href = "./connexion.html";

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    sessionStorage.removeItem("animalperdu_token");
    window.location.href = "./connexion.html";
    throw new Error("Session expirée ou compte désactivé.");
  }
  if (!response.ok) throw new Error(data.message || "Une erreur est survenue.");
  return data;
}

function afficherMedaille(m) {
  const article = document.createElement("article");
  article.className = "medal-card";
  const title = document.createElement("h3");
  title.textContent = m.nom_animal || "Animal";
  const detail = document.createElement("p");
  detail.textContent = `${m.espece || ""}${m.race ? ` — ${m.race}` : ""}`;
  const state = document.createElement("p");
  state.textContent = `Statut : ${m.statut}`;
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.textContent = m.statut === "active" ? "Désactiver" : "Réactiver";
  toggle.addEventListener("click", async () => {
    toggle.disabled = true;
    try {
      await api(`/mes-medailles/${m.id}/statut`, {
        method: "PATCH",
        body: JSON.stringify({ statut: m.statut === "active" ? "inactive" : "active" })
      });
      await chargerMedailles();
    } catch (e) {
      medalsFeedback.textContent = e.message;
      toggle.disabled = false;
    }
  });
  article.append(title, detail, state, toggle);
  return article;
}

async function chargerMedailles() {
  try {
    const data = await api("/mes-medailles");
    medalsList.replaceChildren();
    if (!data.medailles?.length) {
      medalsFeedback.textContent = "Vous n'avez pas encore de médaille.";
      return;
    }
    medalsFeedback.textContent = "";
    data.medailles.forEach(m => medalsList.appendChild(afficherMedaille(m)));
  } catch (e) {
    medalsFeedback.textContent = e.message;
  }
}

async function chargerEspace() {
  try {
    const data = await api("/auth/profil");
    const u = data.utilisateur;
    document.getElementById("owner-name").textContent = u.nom || "Non renseigné";
    document.getElementById("owner-email").textContent = u.email || "Non renseigné";
    feedback.textContent = `Bienvenue ${u.nom || ""} dans votre espace propriétaire !`;
    ownerInformation.hidden = false;
    medalsSection.hidden = false;
    await chargerMedailles();
  } catch (e) {
    feedback.textContent = e.message;
  }
}

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem("animalperdu_token");
  window.location.href = "./connexion.html";
});
if (token) chargerEspace();
