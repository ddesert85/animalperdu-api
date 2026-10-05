/**
 * Configuration centrale de l'application Animal Perdu
 */

// Choisir l'environnement : "local" ou "production"
const ENVIRONNEMENT = "production";

// Adresses des API
const API_URLS = {
  local: "http://localhost:3000",
  production: "https://api.animalperdu.lilotcadeaux.com"
};

// Adresses principales du frontend
const FRONTEND_URLS = {
  local: "http://127.0.0.1:5500/animalperdu_front",
  production: "https://animalperdu.lilotcadeaux.com"
};

// Configuration active
const API_URL = API_URLS[ENVIRONNEMENT];
const API_BASE_URL = `${API_URL}/api`;

const FRONTEND_BASE_URL = FRONTEND_URLS[ENVIRONNEMENT];

// Adresse de la page d'activation
const ACTIVATION_URL = `${FRONTEND_BASE_URL}/pages/activation.html`;