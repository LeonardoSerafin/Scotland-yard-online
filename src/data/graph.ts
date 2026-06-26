import type { Transport } from '../types';
import { EDGES } from './connections';
import { STATIONS } from './stations';

/**
 * Grafo non orientato del tabellone.
 * `adjacency[transport][node]` = insieme delle stazioni raggiungibili da `node`
 * con quel mezzo.
 */
const BASE_TYPES: Transport[] = ['taxi', 'bus', 'underground', 'water'];

const adjacency: Record<string, Record<number, Set<number>>> = {
  taxi: {},
  bus: {},
  underground: {},
  water: {},
};

for (const type of BASE_TYPES) {
  for (const s of STATIONS) adjacency[type][s.id] = new Set<number>();
}
for (const [a, b, t] of EDGES) {
  adjacency[t][a].add(b);
  adjacency[t][b].add(a);
}

/**
 * Stazioni vicine raggiungibili da `node` con un dato mezzo.
 * Il biglietto `black` raggiunge i vicini di QUALSIASI mezzo (incluso il battello).
 */
export function neighbors(node: number, transport: Transport): Set<number> {
  if (transport === 'black') {
    const all = new Set<number>();
    for (const type of BASE_TYPES) {
      for (const n of adjacency[type][node] ?? []) all.add(n);
    }
    return all;
  }
  return adjacency[transport][node] ?? new Set<number>();
}

/** Verifica integrità del grafo (usata nei test). */
export function graphIntegrity() {
  const ids = new Set(STATIONS.map((s) => s.id));
  const missing = [...Array(199)].map((_, i) => i + 1).filter((n) => !ids.has(n));
  const badEdges = EDGES.filter(([a, b]) => !ids.has(a) || !ids.has(b));
  return { stationCount: STATIONS.length, edgeCount: EDGES.length, missing, badEdges };
}
