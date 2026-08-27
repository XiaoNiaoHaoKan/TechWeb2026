const { MongoClient } = require('mongodb');
const { MONGO_URI, MONGO_DB_NAME } = require('../config/constants');
const { readData } = require('./storage');

let dbClient = null;
let db = null;

function stripMongoId(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

async function connectMongo() {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI non configurato: il marketplace richiede MongoDB, i file JSON non sono più supportati.');
  }
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

// Migrates the legacy JSON data into MongoDB the first time each collection is empty.
async function seedMongo() {
  const initial = readData();
  const collections = ['museums', 'users', 'items', 'visits'];

  for (const name of collections) {
    const coll = db.collection(name);
    const count = await coll.estimatedDocumentCount();
    if (count === 0 && initial[name]?.length) {
      await coll.insertMany(initial[name]);
    }
  }
}

async function fetchCollection(name) {
  const result = await db.collection(name).find().sort({ id: 1 }).toArray();
  return result.map((doc) => stripMongoId(doc));
}

async function commitItem(item) {
  await db.collection('items').insertOne(item);
  return item;
}

async function commitVisit(visit) {
  await db.collection('visits').insertOne(visit);
  return visit;
}

async function getUserByName(username) {
  const user = await db.collection('users').findOne({ username });
  return stripMongoId(user);
}

async function commitUser(user) {
  await db.collection('users').updateOne(
    { username: user.username },
    { $set: { credit: user.credit, purchases: user.purchases } },
    { upsert: true }
  );
  return user;
}

async function updateUser(username, update) {
  const result = await db.collection('users').findOneAndUpdate(
    { username },
    { $set: update },
    { returnDocument: 'after' }
  );
  if (!result.value) return null;
  return stripMongoId(result.value);
}

async function getVisitById(visitId) {
  const visit = await db.collection('visits').findOne({ id: visitId });
  return stripMongoId(visit);
}

async function getItemById(itemId) {
  const item = await db.collection('items').findOne({ id: itemId });
  return stripMongoId(item);
}

async function updateItem(id, update) {
  const result = await db.collection('items').findOneAndUpdate({ id }, { $set: update }, { returnDocument: 'after' });
  if (!result.value) return null;
  return stripMongoId(result.value);
}

async function updateVisit(id, update) {
  const result = await db.collection('visits').findOneAndUpdate({ id }, { $set: update }, { returnDocument: 'after' });
  if (!result.value) return null;
  return stripMongoId(result.value);
}

async function deleteVisit(visitId) {
  const result = await db.collection('visits').deleteOne({ id: visitId });
  return result.deletedCount > 0;
}

async function deleteItem(itemId) {
  const result = await db.collection('items').deleteOne({ id: itemId });
  return result.deletedCount > 0;
}

async function findUser(username, password) {
  const user = await db.collection('users').findOne({ username, password });
  return stripMongoId(user);
}

async function listUsers() {
  const users = await fetchCollection('users');
  return users.map(({ password, ...user }) => user);
}

module.exports = {
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
