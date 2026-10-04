/**
 * Configuration centrale de l'API Animal Perdu
 */

// Choisir l'environnement : "local" ou "production"
const ENVIRONNEMENT = "local";

const API_URLS = {
  local: "http://localhost:3000",
  production: "https://api.animalperdu.lilotcadeaux.com"
};

const API_URL = API_URLS[ENVIRONNEMENT];
const API_BASE_URL = `${API_URL}/api`;