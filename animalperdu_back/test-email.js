
require("dotenv").config();

const { envoyerEmail } = require("./services/email.service");

async function testerEmail() {
  try {
    console.log("Test de l'envoi de l'email...");

    const resultat = await envoyerEmail({
      destinataire: "contact@animalperdu.lilotcadeaux.com",
      sujet: "Test d'envoi - Animal Perdu",
      texte: "Félicitations ! L'envoi des emails depuis Animal Perdu fonctionne.",
      html: `
        <h2>Bonjour !</h2>
        <p>Félicitations !</p>
        <p>L'envoi des emails depuis <strong>Animal Perdu</strong> fonctionne correctement.</p>
      `,
    });

    console.log("Email envoyé avec succès !");
    console.log("Identifiant :", resultat.messageId);
  } catch (erreur) {
    console.error("Erreur lors de l'envoi :", erreur.message);
  }
}

testerEmail();