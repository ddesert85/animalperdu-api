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

        const data = await response.json();

        if (!response.ok) {
            fiche.textContent =
                data.message ||
                "Impossible de récupérer les informations de l'animal.";
            return;
        }

        // Récupération des données de l'animal
        const animal = data.donnees;

        if (!animal) {
            fiche.textContent =
                "Les informations de cet animal sont indisponibles.";
            return;
        }

        afficherAnimal(animal);

    } catch (error) {
        console.error("Erreur :", error);

        fiche.textContent =
            "Une erreur est survenue lors du chargement des informations.";
    }

    // Création d'un bloc d'information
    function ajouterInformation(titre, valeur) {
        if (!valeur) return;

        const bloc = document.createElement("div");
        bloc.className = "animal-info";

        const label = document.createElement("h3");
        label.textContent = titre;

        const texte = document.createElement("p");
        texte.textContent = valeur;

        bloc.append(label, texte);
        fiche.appendChild(bloc);
    }

    // Affichage de la fiche de l'animal
    function afficherAnimal(animal) {
        fiche.replaceChildren();

        // Photo
if (animal.photo_url) {
  const photo = document.createElement("img");

  photo.src = animal.photo_url.startsWith("http")
    ? animal.photo_url
    : `${API_URL}${animal.photo_url}`;

  photo.alt = `Photo de ${animal.nom_animal || "l'animal"}`;
  photo.className = "photo";

  fiche.appendChild(photo);
}

        // Nom
        const nom = document.createElement("h2");
        nom.className = "animal-name";
        nom.textContent = animal.nom_animal || "Animal";

        fiche.appendChild(nom);

        // Espèce et race
        const identification = document.createElement("p");
        identification.className = "animal-identification";

        identification.textContent =
            [animal.espece, animal.race]
                .filter(Boolean)
                .join(" • ") || "Informations non renseignées";

        fiche.appendChild(identification);

        // Informations complémentaires
        ajouterInformation("Sexe", animal.sexe);
        ajouterInformation("Description", animal.description);
        ajouterInformation(
            "Informations de santé",
            animal.informations_sante
        );

        // Numéro de téléphone
        if (animal.telephone) {
            const contact = document.createElement("div");
            contact.className = "animal-contact";

            const titre = document.createElement("h3");
            titre.textContent = "Contacter le propriétaire";

            const telephone = document.createElement("p");
            telephone.className = "animal-phone";
            telephone.textContent = animal.telephone;

            contact.append(titre, telephone);

            fiche.appendChild(contact);
        }
    }
});
