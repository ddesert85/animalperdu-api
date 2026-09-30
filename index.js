const express = require('express');
const app = express();

// Middleware pour analyser le JSON
app.use(express.json());

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ statut: 'OK', message: 'API Express opérationnelle' });
});

// Port d'écoute
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});