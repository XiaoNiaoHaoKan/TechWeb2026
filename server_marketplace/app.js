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
    res.status(404).sendFile(path.join(ROOT_DIR, 'index.html'));
  });

  return app;
}

module.exports = {
  createApp
};
