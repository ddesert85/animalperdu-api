
/**
 * Gestion du formulaire de connexion propriétaire.
 */

const loginForm = document.getElementById("login-form");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const feedback = document.getElementById("login-feedback");
  const submit = document.getElementById("login-submit");
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  feedback.style.color = "#a12e2e";
  feedback.textContent = "Connexion en cours…";
  submit.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/connexion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        mot_de_passe: password
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      feedback.textContent =
        result.message ||
        result.erreur ||
        "Adresse e-mail ou mot de passe incorrect.";
      return;
    }

    if (!result.token) {
      feedback.textContent =
        "Connexion réussie, mais aucun jeton d'authentification n'a été reçu.";
      return;
    }

    // Conservation du jeton pour les prochaines pages sécurisées.
    sessionStorage.setItem("animalperdu_token", result.token);

    feedback.style.color = "#315c45";
    feedback.textContent = "Connexion validée. Redirection…";

    window.location.href = "./proprietaire.html";

  } catch (error) {
    feedback.textContent =
      "Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.";

    console.error("Erreur de connexion :", error);

  } finally {
    submit.disabled = false;
  }
});