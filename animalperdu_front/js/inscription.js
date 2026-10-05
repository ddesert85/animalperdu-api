
/**
 * Gestion du formulaire de création de compte propriétaire.
 * Le mot de passe sera choisi depuis le lien d'activation reçu par e-mail.
 */

const registerForm = document.getElementById("register-form");

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const feedback = document.getElementById("register-feedback");
  const submit = document.getElementById("register-submit");

  const nom = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const telephone = document.getElementById("register-phone").value.trim();
  const telephoneSecondaire = document.getElementById("register-phone-secondary").value.trim();
  const adresse = document.getElementById("register-address").value.trim();
  const codePostal = document.getElementById("register-postal").value.trim();
  const ville = document.getElementById("register-city").value.trim();

  feedback.style.color = "#a12e2e";
  feedback.textContent = "Création du compte en cours…";
  submit.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/inscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
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

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      feedback.textContent =
        result.message ||
        result.erreur ||
        "Impossible de créer le compte.";
      return;
    }

    feedback.style.color = "#315c45";
    feedback.textContent =
      result.message ||
      "Votre demande d'inscription a été enregistrée. Consultez votre boîte mail pour activer votre compte.";

    registerForm.reset();

  } catch (error) {
    feedback.textContent =
      "Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.";

    console.error("Erreur lors de l'inscription :", error);

  } finally {
    submit.disabled = false;
  }
});