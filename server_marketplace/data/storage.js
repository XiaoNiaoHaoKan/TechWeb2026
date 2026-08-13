const fs = require('fs');
const path = require('path');
const {
  DATA_DIR,
  DATA_FILES,
  DATA_FILE_NAMES,
  ACCOUNT_FILES,
  MARKETPLACE_ROOT
} = require('../config/constants');
const { sanitizeSegment, formatDateTimeParts } = require('../utils/format');

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

module.exports = {
  readData,
  saveData,
  readJsonArray,
  writeJsonArray,
  groupUsersByRole,
  writePurchasedItemSnapshot
};
