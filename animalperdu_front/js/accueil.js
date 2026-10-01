
const params = new URLSearchParams(window.location.search);
const idMedaille = params.get("id");
const home = document.getElementById("home-page");
const header = document.getElementById("home-header");
const medal = document.getElementById("medal-page");

function afficherConnexion(){
  home.hidden = true;
  medal.hidden = true;
  header.hidden = false;
}
function afficherAccueil(){
  medal.hidden = true;
  home.hidden = false;
  header.hidden = false;
}
if(idMedaille !== null){
  home.hidden = true;
  header.hidden = true;
  medal.hidden = false;
  chargerMedaille(idMedaille);
}
async function chargerMedaille(id){
  const fiche=document.getElementById("fiche");
  if(!/^\d+$/.test(id)||Number(id)<=0){fiche.textContent="Médaille introuvable.";return;}
  fiche.textContent="Chargement de la fiche...";
  try{
    const response=await fetch(`${API_BASE_URL}/medailles/${encodeURIComponent(id)}`);
    const data=await response.json();
    if(!response.ok){
      if(response.status===403)fiche.textContent="Cette médaille a été désactivée par son propriétaire.";
      else if(response.status===404)fiche.textContent="Cette médaille n'existe pas ou n'est plus disponible.";
      else fiche.textContent="Impossible de récupérer les informations de cet animal.";
      return;
    }
    const animal=data.donnees;
    fiche.replaceChildren();
    const titre=document.createElement("h2");titre.className="animal-name";titre.textContent=animal.nom_animal||"Animal";
    const espece=document.createElement("p");espece.className="animal-species";espece.textContent=animal.espece||"";fiche.append(titre,espece);
    if(animal.photo_url){const photo=document.createElement("img");photo.className="photo";photo.src=animal.photo_url;photo.alt="Photo de "+(animal.nom_animal||"l’animal");fiche.appendChild(photo);}
    const owner=document.createElement("div");owner.className="owner";owner.textContent="Propriétaire : "+(animal.nom_proprietaire||"");fiche.appendChild(owner);
    if(animal.telephone){const call=document.createElement("a");call.className="call-button";call.href="tel:"+animal.telephone;call.textContent="Appeler le propriétaire";fiche.appendChild(call);}
  }catch(error){
    fiche.textContent="Impossible de charger les informations. Veuillez réessayer.";
    console.error("Erreur lors du chargement de la médaille :",error);
  }
}
