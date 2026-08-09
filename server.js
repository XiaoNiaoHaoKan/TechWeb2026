const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const DATA_PATH = path.join(__dirname, 'data', 'store.json');
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'artaround';
const useMongo = Boolean(MONGO_URI);
let dbClient = null;
let db = null;

app.use(cors());
app.use(express.json());



function readData() {
  const text = fs.readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(text);
}

function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
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

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint API non trovato.' });
});

app.use(express.static(path.join(__dirname)));

app.put('/api/visits/:id', async (req, res) => {
  const updated = await updateVisit(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Visita non trovata' });
  }
  res.json(updated);
});

app.put('/api/items/:id', async (req, res) => {
  const updated = await updateItem(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Item non trovato' });
  }
  res.json(updated);
});

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
