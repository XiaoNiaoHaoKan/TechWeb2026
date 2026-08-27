const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DATA_FILES = {
  museums: path.join(DATA_DIR, 'musei.json'),
  legacyItems: path.join(DATA_DIR, 'contenuti.json'),
  legacyVisits: path.join(DATA_DIR, 'visite.json')
};
const DATA_FILE_NAMES = {
  items: 'contenuti.json',
  visits: 'visite.json'
};
const ACCOUNT_FILES = {
  authors: path.join(DATA_DIR, 'accounts', 'autori.json'),
  visitors: path.join(DATA_DIR, 'accounts', 'visitatori.json'),
  admins: path.join(DATA_DIR, 'accounts', 'amministratori.json'),
  others: path.join(DATA_DIR, 'accounts', 'altri.json')
};
const MARKETPLACE_ROOT = path.join(ROOT_DIR, 'museum_marketplace');
const PORT = process.env.PORT || 8002;
// Shared MongoDB database "artaround", same one used by the Jack and Luigi servers.
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/artaround';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'artaround';

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  DATA_FILES,
  DATA_FILE_NAMES,
  ACCOUNT_FILES,
  MARKETPLACE_ROOT,
  PORT,
  MONGO_URI,
  MONGO_DB_NAME
};
