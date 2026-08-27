# ArtAround Marketplace

Applicazione marketplace / editor per la gestione di visite museali generiche.

## Caratteristiche incluse

- Client-side in JavaScript vanilla e Bootstrap
- Backend Node.js con Express
- Dati iniziali con 2 musei, 12 contenuti e 3 visite da 10 opere ciascuna
- Login con account predefiniti:
  - `autore1` / `12345678`
  - `autore2` / `12345678`
  - `visitatore1` / `12345678`
  - `visitatore2` / `12345678`
- Filtri per museo, linguaggio, prezzo e licenza
- Creazione contenuti e visite per autori
- Visualizzazione delle visite e delle sequenze logistiche

## Avvio

1. Apri una shell nella cartella del progetto
2. Esegui `npm install`
3. Esegui `npm start`
4. Apri `http://localhost:8000`

## Struttura del progetto

- `server_marketplace/index.js` - server Express per API e static files
- `index.html` - interfaccia marketplace
- `public/app.js` - logica client-side
- `public/style.css` - stili personalizzati
- `data/store.json` - database locale dei musei, contenuti, visite e utenti

# Scelte progettuali vedere questo [file](SCELTE_PROGETTUALI.md)