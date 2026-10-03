
document.addEventListener("DOMContentLoaded", async () => {
    const fiche = document.getElementById("fiche");

    // Récupération du jeton dans l'URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
        fiche.textContent = "Aucun identifiant d'animal n'a été fourni.";
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/medailles/${encodeURIComponent(token)}`
        );

        const animal = await response.json();

        if (!response.ok) {
            fiche.textContent =
                animal.message || "Impossible de récupérer les informations de l'animal.";
            return;
        }

        afficherAnimal(animal);

    } catch (error) {
        console.error("Erreur :", error);
        fiche.textContent =
            "Une erreur est survenue lors du chargement des informations.";
    }

    function afficherAnimal(animal) {
        fiche.innerHTML = "";

        const nom = document.createElement("h2");
        nom.textContent = animal.nom_animal || "Animal";

        const espece = document.createElement("p");
        espece.textContent = `Espèce : ${animal.espece || "Non renseignée"}`;

        fiche.appendChild(nom);
        fiche.appendChild(espece);

        if (animal.race) {
            const race = document.createElement("p");
            race.textContent = `Race : ${animal.race}`;
            fiche.appendChild(race);
        }

        if (animal.sexe) {
            const sexe = document.createElement("p");
            sexe.textContent = `Sexe : ${animal.sexe}`;
            fiche.appendChild(sexe);
        }

        if (animal.description) {
            const description = document.createElement("p");
            description.textContent = animal.description;
            fiche.appendChild(description);
        }

        if (animal.informations_sante) {
            const sante = document.createElement("p");
            sante.textContent = `Informations de santé : ${animal.informations_sante}`;
            fiche.appendChild(sante);
        }

        if (animal.photo_url) {
            const photo = document.createElement("img");
            photo.src = animal.photo_url;
            photo.alt = `Photo de ${animal.nom_animal || "l'animal"}`;
            photo.className = "photo";
            fiche.appendChild(photo);
        }

        if (animal.telephone) {
            const contact = document.createElement("a");
            contact.href = `tel:${animal.telephone}`;
            contact.textContent = "Appeler le propriétaire";
            contact.className = "call-button";
            fiche.appendChild(contact);
        }
    }
});