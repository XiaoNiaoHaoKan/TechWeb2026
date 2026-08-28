# Avvio del Marketplace

Questa guida descrive come avviare il marketplace ArtAround in locale.

## Prerequisiti

- Node.js versione LTS e npm
- MongoDB locale oppure Docker

## Primo avvio

Aprire un terminale nella cartella del progetto e installare le dipendenze:

```bash
cd Marketplace
npm install
```

Avviare MongoDB con Docker Compose:

```bash
docker compose up -d mongo
```

Il database utilizzato e `artaround`, sulla porta `27017`. Se MongoDB e gia installato come servizio, si puo usare invece:

```bash
sudo systemctl start mongod
```

Avviare il marketplace:

```bash
npm start
```

Aprire [http://localhost:8002](http://localhost:8002).

## Avvii successivi

Aprire un terminale nella cartella del progetto, avviare MongoDB e poi il server:

```bash
cd Marketplace
docker compose start mongo
npm start
```

Se si usa MongoDB come servizio di sistema, sostituire il comando Docker con:

```bash
sudo systemctl start mongod
```

Per fermare il server Node.js, premere `Ctrl+C`. Per fermare anche MongoDB in Docker:

```bash
docker compose stop mongo
```

## Sviluppo

Per riavviare automaticamente il server dopo le modifiche:

```bash
npm run dev
```

La porta predefinita e `8002`. E possibile cambiarla impostando la variabile d'ambiente `PORT`.
