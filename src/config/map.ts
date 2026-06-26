/**
 * Configurazione della mappa.
 *
 * Le coordinate dei nodi (in src/data/stations.ts) sono espresse nello spazio
 * dell'immagine del tabellone (1600 x 1204). L'immagine reale viene quindi
 * mostrata a piena risoluzione nel viewBox e i nodi vi cadono sopra allineati.
 *
 * `calibration` permette una micro-correzione dell'overlay dei nodi sulla foto,
 * se la stampa del tabellone differisse leggermente.
 */
export const MAP = {
  viewBox: { width: 1600, height: 1204 },
  boardImage: '/scotyardfull.jpg',
  calibration: { offsetX: 0, offsetY: 0, scale: 1 },
};
