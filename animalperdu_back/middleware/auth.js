const jwt = require('jsonwebtoken');

function verifierToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      statut: 'Erreur',
      message: 'Authentification requise'
    });
  }

  const token = authorization.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.utilisateur = {
      id: decoded.id,
      role: decoded.role
    };

    next();

  } catch (error) {
    return res.status(401).json({
      statut: 'Erreur',
      message: 'Session invalide ou expirée'
    });
  }
}

function verifierAdmin(req, res, next) {
  if (req.utilisateur?.role !== 'admin') {
    return res.status(403).json({
      statut: 'Erreur',
      message: 'Accès réservé à l’administrateur'
    });
  }

  next();
}

module.exports = {
  verifierToken,
  verifierAdmin
};