const formulaire = document.getElementById("activation-form");
const message = document.getElementById("activation-message");
const lienConnexion = document.getElementById("connexion-link");

const params = new URLSearchParams(window.location.search);
const token = params.get("token");

if (!token) {
  message.textContent = "Le lien d'activation est absent ou invalide.";
  formulaire.hidden = true;
}

formulaire.addEventListener("submit", async (event) => {
  event.preventDefault();

  const motDePasse = document.getElementById("mot_de_passe").value;
  const confirmation = document.getElementById("confirmation").value;

  message.textContent = "";
  lienConnexion.hidden = true;

  if (motDePasse.length < 12) {
    message.textContent =
      "Le mot de passe doit contenir au moins 12 caractères.";
    return;
  }

  if (motDePasse !== confirmation) {
    message.textContent = "Les deux mots de passe ne correspondent pas.";
    return;
  }

  const bouton = formulaire.querySelector("button[type='submit']");
  bouton.disabled = true;
  bouton.textContent = "Activation en cours...";

  try {
    const reponse = await fetch(`${API_BASE_URL}/auth/activation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        mot_de_passe: motDePasse,
      }),
    });

    const resultat = await reponse.json();

    if (!reponse.ok) {
      throw new Error(resultat.message || "L'activation a échoué.");
    }

    message.textContent =
      "Votre compte est activé ! Vous pouvez maintenant vous connecter.";

    formulaire.hidden = true;
    lienConnexion.hidden = false;

  } catch (erreur) {
    message.textContent = erreur.message;

  } finally {
    bouton.disabled = false;
    bouton.textContent = "Activer mon compte";
  }
});
