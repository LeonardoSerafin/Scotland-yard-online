/**
 * Configurazione della mappa.
 *
 * Le coordinate dei nodi (in src/data/stations.ts) provengono dalla
 * digitalizzazione del tabellone. Per allinearle con precisione all'immagine
 * reale (`/scotyardfull.jpg`, 1600x1204) si applica nella vista "immagine reale"
 * una trasformazione affine (scala + traslazione per asse) ricavata da un fit
 * sui cerchi stampati: RMS ~4px su 178/199 stazioni.
 */
export const MAP = {
  viewBox: { width: 1600, height: 1204 },
  boardImage: '/scotyardfull.jpg',
  calibration: { scaleX: 0.9711, scaleY: 0.969, offsetX: 11.91, offsetY: 14.62 },
};
