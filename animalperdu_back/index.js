require('dotenv').config();
const express = require('express');
const cors = require('cors');
const testRoutes = require('./routes/test.routes');
const healthRoutes = require('./routes/health.routes');
const medaillesRoutes = require('./routes/medailles.routes');

const app = express();

// Autoriser les requêtes extérieures (depuis ton front-end local par exemple)
app.use(cors());
app.use(express.json());

app.use('/api', testRoutes);
app.use('/api', healthRoutes);
app.use('/api', medaillesRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});