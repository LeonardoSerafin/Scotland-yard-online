import type { GameConfig } from '../types';

/** Le 18 carte di partenza ufficiali. */
export const STD_START = [
  13, 26, 29, 34, 50, 53, 91, 94, 103, 112, 117, 132, 138, 141, 155, 174, 197, 198,
];

/** Colori dei segnalini investigatori. */
export const DET_COLORS = ['#ff5a5a', '#4dd2ff', '#ffd24d', '#7cfc68', '#c792ff', '#ff9d4d'];

export const MRX_COLOR = '#ff3b6b';

/** Configurazione ufficiale di default (Ravensburger). */
export function defaultConfig(): GameConfig {
  return {
    detectiveCount: 4,
    totalRounds: 24,
    revealRounds: [3, 8, 13, 18, 24],
    det: { taxi: 10, bus: 8, underground: 4 },
    mrx: { taxi: 11, bus: 8, underground: 4, black: 5, double: 2 },
    transferToMrX: true,
    freeMode: false,
  };
}

export const TRANSPORT_INFO: Record<string, { label: string; color: string }> = {
  taxi: { label: 'Taxi', color: '#f2c200' },
  bus: { label: 'Bus', color: '#19a974' },
  underground: { label: 'Metro', color: '#e53935' },
  water: { label: 'Battello', color: '#3b6bdb' },
  black: { label: 'Black', color: '#3a3f55' },
  double: { label: 'Doppia', color: '#9aa4c0' },
};
