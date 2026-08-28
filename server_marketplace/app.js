const express = require('express');
const path = require('path');
const cors = require('cors');
const { ROOT_DIR } = require('./config/constants');
const repository = require('./data/repository');
const storage = require('./data/storage');
const { registerApiRoutes } = require('./routes/api');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  registerApiRoutes(app, repository, storage);

  app.use(express.static(ROOT_DIR));

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Endpoint API non trovato.' });
    }

    return res.sendFile(path.join(ROOT_DIR, 'marketplace.html'));
  });

  return app;
}

module.exports = {
  createApp
};
