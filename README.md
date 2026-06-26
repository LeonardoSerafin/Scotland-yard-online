# Scotland Yard · Tracker

Web app di supporto alle partite di **Scotland Yard** (edizione a 199 stazioni).
Non sostituisce il gioco: Mr X la usa su un solo dispositivo per registrare le
proprie mosse e quelle degli investigatori. A fine partita si ripercorre tutta
la storia, turno per turno, vedendo come Mr X è scappato o è stato catturato.

## Funzionalità

- **Mappa sempre caricata**, in due viste commutabili:
  - _Schematica_ — disegnata dal codice dalle coordinate reali (nodi allineati al 100%).
  - _Immagine reale_ — la foto del tabellone (`public/scotyardfull.jpg`) con i nodi sovrapposti.
- **Grafo ufficiale** delle 199 stazioni con collegamenti taxi / bus / metro / battello.
- **Validazione mosse**: dopo aver scelto un mezzo si illuminano solo le stazioni
  raggiungibili (escluse quelle occupate dagli investigatori); il biglietto viene scalato.
- **Regole complete**: black ticket, doppia mossa, turni di rivelazione (3, 8, 13, 18, 24),
  passaggio dei biglietti spesi a Mr X, rilevamento di cattura / fuga.
- **Replay** turno per turno con percorsi tracciati sulla mappa.
- **Salvataggio automatico** nel browser + esporta / importa partita in JSON.
- **Modalità libera** per registrare qualsiasi mossa senza validazione.

## Sviluppo

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # test dell'engine (vitest)
npm run build    # build di produzione in dist/
```

## Struttura

```
src/
  data/         grafo: stazioni, collegamenti, adiacenze
  game/         engine puro (testabile) + regole + test
  state/        hook React con persistenza localStorage
  components/    mappa SVG e pannelli (Setup / Partita / Replay)
  config/       configurazione mappa (immagine, viewBox, calibrazione)
```

La logica di gioco (`src/game/engine.ts`) è scritta come funzioni pure senza
dipendenze dal DOM, quindi è interamente coperta da test.

## Deploy su Vercel

Il repository è pronto per Vercel: importalo da GitHub, il framework **Vite**
viene rilevato automaticamente (vedi `vercel.json`). Nessuna configurazione
aggiuntiva necessaria.

## Crediti dati

Grafo delle stazioni e dei collegamenti basato su
[AlexElvers/scotland-yard-data](https://github.com/AlexElvers/scotland-yard-data).
Regole ufficiali Ravensburger / Hasbro.
