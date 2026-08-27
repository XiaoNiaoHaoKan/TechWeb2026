const { MongoClient } = require('mongodb');
const { MONGO_URI, MONGO_DB_NAME } = require('../config/constants');
const { readData, saveData } = require('./storage');

const useMongo = Boolean(MONGO_URI);
let dbClient = null;
let db = null;

function stripMongoId(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

async function connectMongo() {
  if (!useMongo) return;
  dbClient = new MongoClient(MONGO_URI);
  await dbClient.connect();
  db = dbClient.db(MONGO_DB_NAME);
  await seedMongo();
}

async function closeMongo() {
  if (!dbClient) return;
  await dbClient.close();
  dbClient = null;
  db = null;
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
  return result.map((doc) => stripMongoId(doc));
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
  return stripMongoId(user);
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
  return stripMongoId(result.value);
}

async function getVisitById(visitId) {
  if (!db) {
    const { visits } = readData();
    return visits.find((entry) => entry.id === visitId) || null;
  }

  const visit = await db.collection('visits').findOne({ id: visitId });
  return stripMongoId(visit);
}

async function getItemById(itemId) {
  if (!db) {
    const { items } = readData();
    return items.find((entry) => entry.id === itemId) || null;
  }

  const item = await db.collection('items').findOne({ id: itemId });
  return stripMongoId(item);
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
  return stripMongoId(result.value);
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
  return stripMongoId(result.value);
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

  const user = await db.collection('users').findOne({ username, password });
  return stripMongoId(user);
}

async function listUsers() {
  const users = await fetchCollection('users');
  return users.map(({ password, ...user }) => user);
}

module.exports = {
  useMongo,
  connectMongo,
  closeMongo,
  fetchCollection,
  commitItem,
  commitVisit,
  getUserByName,
  commitUser,
  updateUser,
  getVisitById,
  getItemById,
  updateItem,
  updateVisit,
  deleteVisit,
  deleteItem,
  findUser,
  listUsers
};
