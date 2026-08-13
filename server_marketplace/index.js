const { createApp } = require('./app');
const { PORT, MONGO_URI } = require('./config/constants');
const repository = require('./data/repository');

const app = createApp();

process.on('SIGINT', async () => {
  await repository.closeMongo();
  process.exit();
});

repository.connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`ArtAround Marketplace server avviato su http://localhost:${PORT}`);
    if (repository.useMongo) {
      console.log(`Connesso a MongoDB su ${MONGO_URI}`);
    }
  });
}).catch((error) => {
  console.error('Errore durante la connessione a MongoDB:', error);
  process.exit(1);
});
