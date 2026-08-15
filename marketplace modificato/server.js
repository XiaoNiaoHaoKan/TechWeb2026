const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const DATA_DIR = path.join(__dirname, 'data');
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
const MARKETPLACE_ROOT = path.join(__dirname, 'museum_marketplace');
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'artaround';
const useMongo = Boolean(MONGO_URI);
let dbClient = null;
let db = null;

app.use(cors());
app.use(express.json());



function getMuseumDataFilePath(museumId, type) {
  const folderName = sanitizeSegment(museumId || 'sconosciuto');
  return path.join(DATA_DIR, folderName, DATA_FILE_NAMES[type]);
}

function readMuseumEntries(museums, type) {
  const entries = [];
  const legacyPath = type === 'items' ? DATA_FILES.legacyItems : DATA_FILES.legacyVisits;
  const museumIds = new Set((museums || []).map((museum) => museum.id));

  for (const museum of museums || []) {
    const filePath = getMuseumDataFilePath(museum.id, type);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    entries.push(...readJsonArray(filePath));
  }

  if (fs.existsSync(legacyPath)) {
    const legacyEntries = readJsonArray(legacyPath);
    entries.push(...legacyEntries.filter((entry) => !museumIds.has(entry.museumId)));
  }

  return entries;
}

function readData() {
  const museums = readJsonArray(DATA_FILES.museums);
  const items = readMuseumEntries(museums, 'items');
  const visits = readMuseumEntries(museums, 'visits');
  const users = [
    ...readJsonArray(ACCOUNT_FILES.authors),
    ...readJsonArray(ACCOUNT_FILES.visitors),
    ...readJsonArray(ACCOUNT_FILES.admins),
    ...readJsonArray(ACCOUNT_FILES.others)
  ];

  return { museums, users, items, visits };
}

function saveData(data) {
  writeJsonArray(DATA_FILES.museums, data.museums || []);

  const groupedItems = (data.items || []).reduce((acc, item) => {
    const museumId = item.museumId || 'sconosciuto';
    if (!acc[museumId]) {
      acc[museumId] = [];
    }
    acc[museumId].push(item);
    return acc;
  }, {});

  const groupedVisits = (data.visits || []).reduce((acc, visit) => {
    const museumId = visit.museumId || 'sconosciuto';
    if (!acc[museumId]) {
      acc[museumId] = [];
    }
    acc[museumId].push(visit);
    return acc;
  }, {});

  const museumIds = new Set([
    ...(data.museums || []).map((museum) => museum.id),
    ...Object.keys(groupedItems),
    ...Object.keys(groupedVisits)
  ]);

  for (const museumId of museumIds) {
    writeJsonArray(getMuseumDataFilePath(museumId, 'items'), groupedItems[museumId] || []);
    writeJsonArray(getMuseumDataFilePath(museumId, 'visits'), groupedVisits[museumId] || []);
  }

  const grouped = groupUsersByRole(data.users || []);
  writeJsonArray(ACCOUNT_FILES.authors, grouped.authors);
  writeJsonArray(ACCOUNT_FILES.visitors, grouped.visitors);
  writeJsonArray(ACCOUNT_FILES.admins, grouped.admins);
  writeJsonArray(ACCOUNT_FILES.others, grouped.others);
}

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File dati obbligatorio non trovato: ${filePath}`);
  }

  const text = fs.readFileSync(filePath, 'utf8');
  if (!text.trim()) {
    return [];
  }

  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : [];
}

function writeJsonArray(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function groupUsersByRole(users) {
  return users.reduce(
    (acc, user) => {
      if (user.role === 'author') {
        acc.authors.push(user);
      } else if (user.role === 'visitor') {
        acc.visitors.push(user);
      } else if (user.role === 'admin') {
        acc.admins.push(user);
      } else {
        acc.others.push(user);
      }
      return acc;
    },
    { authors: [], visitors: [], admins: [], others: [] }
  );
}

function sanitizeSegment(value, fallback = 'sconosciuto') {
  const normalized = String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_');
  return normalized || fallback;
}

function formatDateTimeParts(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}-${minutes}-${seconds}`
  };
}

function writePurchasedItemSnapshot(item, visitorUsername) {
  const storeData = readData();
  const fromStore = (storeData.items || []).find((entry) => entry.id === item.id);
  const museum = (storeData.museums || []).find((entry) => entry.id === item.museumId);

  const museumName = sanitizeSegment(museum?.name || item.museumId || 'museo');
  const title = sanitizeSegment(item.title || item.id || 'contenuto');
  const author = sanitizeSegment(item.createdBy || item.author || 'autore');
  const visitor = sanitizeSegment(visitorUsername || 'visitatore');
  const now = new Date();
  const { date, time } = formatDateTimeParts(now);

  const museumDir = path.join(MARKETPLACE_ROOT, museumName);
  fs.mkdirSync(museumDir, { recursive: true });

  const fileName = `${date}_${time}_${title}_${author}_${visitor}.json`;
  const targetPath = path.join(museumDir, fileName);
  fs.writeFileSync(targetPath, JSON.stringify(fromStore || item, null, 2), 'utf8');
}

function getNextId(entries, prefix) {
  const max = entries.reduce((acc, entry) => {
    const id = String(entry.id || '');
    const value = Number(id.replace(`${prefix}-`, ''));
    return Number.isFinite(value) ? Math.max(acc, value) : acc;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

async function connectMongo() {
  if (!useMongo) return;
  dbClient = new MongoClient(MONGO_URI);
  await dbClient.connect();
  db = dbClient.db(MONGO_DB_NAME);
  await seedMongo();
}

async function seedMongo() {
  const initial = readData();
  const collections = ['museums', 'users', 'items', 'visits'];

  for (const name of collections) {
    const coll = db.collection(name);
    const count = await coll.estimatedDocumentCount();
    if (count === 0) {
      await coll.insertMany(initial[name]);
    }
  }
}

async function fetchCollection(name) {
  if (!db) {
    return readData()[name];
  }
  const result = await db.collection(name).find().sort({ id: 1 }).toArray();
  return result.map((doc) => {
    const { _id, ...rest } = doc;
    return rest;
  });
}

async function commitItem(item) {
  if (!db) {
    const data = readData();
    data.items.push(item);
    saveData(data);
    return item;
  }

  await db.collection('items').insertOne(item);
  return item;
}

async function commitVisit(visit) {
  if (!db) {
    const data = readData();
    data.visits.push(visit);
    saveData(data);
    return visit;
  }

  await db.collection('visits').insertOne(visit);
  return visit;
}

async function getUserByName(username) {
  if (!db) {
    const { users } = readData();
    return users.find((u) => u.username === username) || null;
  }
  const user = await db.collection('users').findOne({ username });
  if (!user) return null;
  const { _id, ...rest } = user;
  return rest;
}

async function commitUser(user) {
  if (!db) {
    const data = readData();
    const index = data.users.findIndex((entry) => entry.username === user.username);
    if (index !== -1) {
      data.users[index] = user;
    } else {
      data.users.push(user);
    }
    saveData(data);
    return user;
  }

  await db.collection('users').updateOne(
    { username: user.username },
    { $set: { credit: user.credit, purchases: user.purchases } },
    { upsert: true }
  );
  return user;
}

async function updateUser(username, update) {
  if (!db) {
    const data = readData();
    const index = data.users.findIndex((entry) => entry.username === username);
    if (index === -1) return null;
    data.users[index] = { ...data.users[index], ...update };
    saveData(data);
    return data.users[index];
  }

  const result = await db.collection('users').findOneAndUpdate(
    { username },
    { $set: update },
    { returnDocument: 'after' }
  );
  if (!result.value) return null;
  const { _id, ...rest } = result.value;
  return rest;
}

async function getVisitById(visitId) {
  if (!db) {
    const { visits } = readData();
    return visits.find((entry) => entry.id === visitId) || null;
  }

  const visit = await db.collection('visits').findOne({ id: visitId });
  if (!visit) return null;
  const { _id, ...rest } = visit;
  return rest;
}

async function getItemById(itemId) {
  if (!db) {
    const { items } = readData();
    return items.find((entry) => entry.id === itemId) || null;
  }

  const item = await db.collection('items').findOne({ id: itemId });
  if (!item) return null;
  const { _id, ...rest } = item;
  return rest;
}

async function updateItem(id, update) {
  if (!db) {
    const data = readData();
    const index = data.items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    data.items[index] = { ...data.items[index], ...update, id };
    saveData(data);
    return data.items[index];
  }

  const result = await db.collection('items').findOneAndUpdate({ id }, { $set: update }, { returnDocument: 'after' });
  if (!result.value) return null;
  const { _id, ...rest } = result.value;
  return rest;
}

async function updateVisit(id, update) {
  if (!db) {
    const data = readData();
    const index = data.visits.findIndex((visit) => visit.id === id);
    if (index === -1) return null;
    data.visits[index] = { ...data.visits[index], ...update, id };
    saveData(data);
    return data.visits[index];
  }

  const result = await db.collection('visits').findOneAndUpdate({ id }, { $set: update }, { returnDocument: 'after' });
  if (!result.value) return null;
  const { _id, ...rest } = result.value;
  return rest;
}

async function deleteVisit(visitId) {
  if (!db) {
    const data = readData();
    const index = data.visits.findIndex((visit) => visit.id === visitId);
    if (index === -1) return false;
    data.visits.splice(index, 1);
    saveData(data);
    return true;
  }

  const result = await db.collection('visits').deleteOne({ id: visitId });
  return result.deletedCount > 0;
}

async function deleteItem(itemId) {
  if (!db) {
    const data = readData();
    const index = data.items.findIndex((item) => item.id === itemId);
    if (index === -1) return false;
    data.items.splice(index, 1);
    saveData(data);
    return true;
  }

  const result = await db.collection('items').deleteOne({ id: itemId });
  return result.deletedCount > 0;
}

async function findUser(username, password) {
  if (!db) {
    const { users } = readData();
    return users.find((u) => u.username === username && u.password === password) || null;
  }

  return db.collection('users').findOne({ username, password });
}

async function listUsers() {
  const users = await fetchCollection('users');
  return users.map(({ password, ...user }) => user);
}

app.get('/api/museums', async (req, res) => {
  const museums = await fetchCollection('museums');
  res.json(museums);
});

app.get('/api/items', async (req, res) => {
  const items = await fetchCollection('items');
  res.json(items);
});

app.get('/api/visits', async (req, res) => {
  const visits = await fetchCollection('visits');
  res.json(visits);
});

app.get('/api/users', async (req, res) => {
  const users = await listUsers();
  res.json(users);
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await findUser(username, password);

  if (!user) {
    return res.status(401).json({ error: 'Credenziali errate' });
  }

  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

app.post('/api/items', async (req, res) => {
  const { actorUsername, ...payload } = req.body;
  const actor = await getUserByName(actorUsername);
  if (!actor || actor.role !== 'author') {
    return res.status(403).json({ error: 'Solo gli autori possono creare contenuti.' });
  }

  const items = await fetchCollection('items');
  const item = { ...payload };
  item.id = getNextId(items, 'item');
  item.createdBy = actor.username;
  await commitItem(item);
  res.status(201).json(item);
});

app.post('/api/visits', async (req, res) => {
  const visits = await fetchCollection('visits');
  const visit = { ...req.body };
  visit.id = getNextId(visits, 'visit');
  await commitVisit(visit);
  res.status(201).json(visit);
});

app.post('/api/purchase/visit/:visitId', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Nome utente richiesto' });
  }

  const visit = await getVisitById(req.params.visitId);
  if (!visit) {
    return res.status(404).json({ error: 'Visita non trovata' });
  }

  const user = await getUserByName(username);
  if (!user) {
    return res.status(404).json({ error: 'Utente non trovato' });
  }

  if (user.role !== 'visitor') {
    return res.status(403).json({ error: 'Solo i visitatori possono acquistare visite.' });
  }

  const purchases = user.purchases || [];
  if (purchases.some((purchase) => purchase.visitId === visit.id)) {
    return res.status(400).json({ error: 'Visita già acquistata.' });
  }

  const cost = Number(visit.price || 0);
  if (user.credit < cost) {
    return res.status(400).json({ error: 'Credito insufficiente.' });
  }

  const updatedUser = {
    ...user,
    credit: Number((user.credit - cost).toFixed(2)),
    purchases: [...purchases, { visitId: visit.id, price: cost, boughtAt: new Date().toISOString() }]
  };

  const savedUser = await updateUser(username, updatedUser);
  if (!savedUser) {
    return res.status(500).json({ error: 'Impossibile aggiornare il credito.' });
  }

  // Elimina la visita dal database dopo l'acquisto
  await deleteVisit(visit.id);

  const { password, ...safeUser } = savedUser;
  res.json(safeUser);
});

app.post('/api/purchase/item/:itemId', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Nome utente richiesto' });
  }

  const item = await getItemById(req.params.itemId);
  if (!item) {
    return res.status(404).json({ error: 'Contenuto non trovato' });
  }

  const user = await getUserByName(username);
  if (!user) {
    return res.status(404).json({ error: 'Utente non trovato' });
  }

  if (user.role !== 'visitor') {
    return res.status(403).json({ error: 'Solo i visitatori possono acquistare contenuti.' });
  }

  const purchases = user.purchases || [];
  if (purchases.some((purchase) => purchase.itemId === item.id)) {
    return res.status(400).json({ error: 'Contenuto già acquistato.' });
  }

  const cost = Number(item.price || 0);
  if (user.credit < cost) {
    return res.status(400).json({ error: 'Credito insufficiente.' });
  }

  try {
    writePurchasedItemSnapshot(item, username);
  } catch (error) {
    console.error('Errore durante la scrittura del file acquisto:', error);
    return res.status(500).json({ error: 'Impossibile creare il file dell\'acquisto.' });
  }

  const updatedUser = {
    ...user,
    credit: Number((user.credit - cost).toFixed(2)),
    purchases: [...purchases, { itemId: item.id, price: cost, boughtAt: new Date().toISOString() }]
  };

  const savedUser = await updateUser(username, updatedUser);
  if (!savedUser) {
    return res.status(500).json({ error: 'Impossibile aggiornare il credito.' });
  }

  if (item.createdBy && cost > 0) {
    const seller = await getUserByName(item.createdBy);
    if (seller) {
      const savedSeller = await updateUser(seller.username, {
        ...seller,
        credit: Number((Number(seller.credit || 0) + cost).toFixed(2))
      });
      if (!savedSeller) {
        return res.status(500).json({ error: 'Impossibile accreditare l\'autore del contenuto.' });
      }
    }
  }

  await deleteItem(item.id);

  const { password, ...safeUser } = savedUser;
  res.json(safeUser);
});

async function handleDeleteVisitRequest(req, res) {
  const username =
    req.body?.username ||
    req.query?.username;

  if (!username) {
    return res.status(400).json({
      error: "Nome utente richiesto.",
    });
  }

  const user = await getUserByName(username);

  if (!user) {
    return res.status(404).json({
      error: "Utente non trovato.",
    });
  }

  const visit = await getVisitById(req.params.id);

  if (!visit) {
    return res.status(404).json({
      error: "Visita non trovata.",
    });
  }

  const authorized =
    user.role === "admin" ||
    (
      user.role === "author" &&
      visit.createdBy === user.username
    );

  if (!authorized) {
    return res.status(403).json({
      error: "Non puoi eliminare questa visita.",
    });
  }

  const deleted = await deleteVisit(visit.id);

  if (!deleted) {
    return res.status(500).json({
      error: "Impossibile eliminare la visita.",
    });
  }

  return res.json({
    ok: true,
  });
}

async function handleDeleteItemRequest(req, res) {
  const username = req.body?.username || req.query?.username;
  if (!username) {
    return res.status(400).json({ error: 'Nome utente richiesto' });
  }

  const user = await getUserByName(username);
  if (!user) {
    return res.status(404).json({ error: 'Utente non trovato' });
  }

  const item = await getItemById(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Contenuto non trovato' });
  }

  const isAdmin = user.role === 'admin';
  const isOwnerAuthor = user.role === 'author' && item.createdBy === user.username;
  if (!isAdmin && !isOwnerAuthor) {
    return res.status(403).json({ error: 'Non autorizzato a eliminare questo contenuto.' });
  }

  const deleted = await deleteItem(item.id);
  if (!deleted) {
    return res.status(500).json({ error: 'Impossibile eliminare il contenuto.' });
  }

  return res.json({ ok: true });
}

app.delete('/api/items/:id', handleDeleteItemRequest);

// Fallback endpoint when DELETE is blocked by proxies/clients.
app.post('/api/items/:id/delete', handleDeleteItemRequest);

app.delete(
  "/api/visits/:id",
  handleDeleteVisitRequest,
);

app.post(
  "/api/visits/:id/delete",
  handleDeleteVisitRequest,
);



app.put('/api/visits/:id', async (req, res) => {
  const { actorUsername } = req.body;

  const actor = await getUserByName(actorUsername);
  const visit = await getVisitById(req.params.id);

  if (!actor) {
    return res.status(401).json({
      error: 'Utente non autenticato.',
    });
  }

  if (!visit) {
    return res.status(404).json({
      error: 'Visita non trovata.',
    });
  }

  const authorized =
    actor.role === 'admin' ||
    (
      actor.role === 'author' &&
      visit.createdBy === actor.username
    );

  if (!authorized) {
    return res.status(403).json({
      error: 'Non puoi modificare questa visita.',
    });
  }

  const {
    actorUsername: ignoredActor,
    id,
    createdBy,
    ...changes
  } = req.body;

  const updated = await updateVisit(
    req.params.id,
    changes,
  );

  res.json(updated);
});

app.put('/api/items/:id', async (req, res) => {
  const { actorUsername } = req.body;

  const actor = await getUserByName(actorUsername);
  const item = await getItemById(req.params.id);

  if (!actor) {
    return res.status(401).json({
      error: 'Utente non autenticato.',
    });
  }

  if (!item) {
    return res.status(404).json({
      error: 'Item non trovato.',
    });
  }

  const authorized =
    actor.role === 'admin' ||
    (
      actor.role === 'author' &&
      item.createdBy === actor.username
    );

  if (!authorized) {
    return res.status(403).json({
      error: 'Non puoi modificare questo item.',
    });
  }

  const {
    actorUsername: ignoredActor,
    id,
    createdBy,
    ...changes
  } = req.body;

  const updated = await updateItem(
    req.params.id,
    changes,
  );

  if (!updated) {
    return res.status(404).json({
      error: 'Item non trovato.',
    });
  }

  return res.json(updated);
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint API non trovato.' });
});

app.use(express.static(path.join(__dirname)));

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

process.on('SIGINT', async () => {
  if (dbClient) {
    await dbClient.close();
  }
  process.exit();
});

connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`ArtAround Marketplace server avviato su http://localhost:${PORT}`);
    if (useMongo) {
      console.log(`Connesso a MongoDB su ${MONGO_URI}`);
    }
  });
}).catch((error) => {
  console.error('Errore durante la connessione a MongoDB:', error);
  process.exit(1);
});
