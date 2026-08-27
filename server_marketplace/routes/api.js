const { getNextId } = require('../utils/id');

function registerApiRoutes(app, repository, storage) {
  const {
    fetchCollection,
    commitItem,
    commitVisit,
    getUserByName,
    updateUser,
    getVisitById,
    getItemById,
    updateVisit,
    updateItem,
    deleteVisit,
    deleteItem,
    findUser,
    listUsers
  } = repository;
  const { writePurchasedItemSnapshot } = storage;

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

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Endpoint API non trovato.' });
  });
}

module.exports = {
  registerApiRoutes
};
