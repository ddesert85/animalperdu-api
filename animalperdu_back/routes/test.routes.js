const express = require('express');

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    statut: 'OK',
    message: 'La route de test fonctionne'
  });
});

module.exports = router;