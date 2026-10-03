require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const testRoutes = require('./routes/test.routes');
const healthRoutes = require('./routes/health.routes');
const medaillesRoutes = require('./routes/medailles.routes');
const authRoutes = require('./routes/auth.routes');
const proprietaireRoutes = require('./routes/proprietaire.routes');

const app = express();

// Autoriser les requêtes extérieures (depuis ton front-end local par exemple)
app.use(cors());
app.use(express.json());
// Rendre les photos des animaux accessibles
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', authRoutes);

app.use('/api', testRoutes);
app.use('/api', healthRoutes);
app.use('/api', medaillesRoutes);
app.use('/api', proprietaireRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});