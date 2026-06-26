import { describe, expect, it } from 'vitest';
import { defaultConfig } from './rules';
import {
  applyMove,
  currentActor,
  mrX,
  newGameState,
  playerById,
  positionsAtStep,
  possibleDestinations,
  startGame,
  toggleDouble,
  undo,
} from './engine';
import { graphIntegrity, neighbors } from '../data/graph';

function setup(starts: Record<string, number>, mutate?: (c: ReturnType<typeof defaultConfig>) => void) {
  const cfg = defaultConfig();
  cfg.detectiveCount = 2;
  mutate?.(cfg);
  let s = newGameState(cfg);
  for (const id in starts) playerById(s, id)!.start = starts[id];
  const r = startGame(s);
  expect(r.error).toBeUndefined();
  return r.state;
}

describe('grafo', () => {
  it('ha 199 stazioni, 468 collegamenti, nessun nodo mancante', () => {
    const g = graphIntegrity();
    expect(g.stationCount).toBe(199);
    expect(g.edgeCount).toBe(468);
    expect(g.missing).toEqual([]);
    expect(g.badEdges).toEqual([]);
  });
  it('adiacenze coerenti (13 in taxi -> 14,23,24,4)', () => {
    expect([...neighbors(13, 'taxi')].sort((a, b) => a - b)).toEqual([4, 14, 23, 24]);
  });
  it('black raggiunge i vicini di ogni mezzo', () => {
    const taxi = neighbors(13, 'taxi');
    const black = neighbors(13, 'black');
    for (const n of taxi) expect(black.has(n)).toBe(true);
  });
});

describe('turni e mosse', () => {
  it('Mr X muove per primo, poi gli investigatori in ordine', () => {
    const s = setup({ X: 13, D1: 50, D2: 91 });
    expect(currentActor(s)!.id).toBe('X');
    const a = applyMove(s, 23, 'taxi').state;
    expect(currentActor(a)!.id).toBe('D1');
    const b = applyMove(a, 49, 'taxi').state; // 50->49 taxi
    expect(currentActor(b)!.id).toBe('D2');
  });

  it('scala il biglietto e lo trasferisce a Mr X (regola ufficiale)', () => {
    const s = setup({ X: 13, D1: 50, D2: 91 });
    const a = applyMove(s, 23, 'taxi').state; // Mr X taxi
    const xTaxiBefore = mrX(a).tickets.taxi!;
    const b = applyMove(a, 49, 'taxi').state; // D1 taxi -> va a Mr X
    expect(playerById(b, 'D1')!.tickets.taxi).toBe(9);
    expect(mrX(b).tickets.taxi).toBe(xTaxiBefore + 1);
  });

  it('rifiuta mosse non valide e stazioni occupate', () => {
    const s = setup({ X: 13, D1: 24, D2: 91 });
    // 24 occupata da D1 -> esclusa dalle destinazioni di Mr X
    const dest = possibleDestinations(s, mrX(s), 'taxi');
    expect(dest.has(24)).toBe(false);
    expect(dest.has(23)).toBe(true);
    const r = applyMove(s, 24, 'taxi');
    expect(r.error).toBeDefined();
  });
});

describe('rivelazione e doppia mossa', () => {
  it('marca il turno di rivelazione', () => {
    const s = setup({ X: 13, D1: 50, D2: 91 }, (c) => (c.revealRounds = [1]));
    const a = applyMove(s, 23, 'taxi').state;
    expect(a.history[0].reveal).toBe(true);
  });

  it('la doppia mossa fa muovere Mr X due volte restando di turno', () => {
    const s = setup({ X: 13, D1: 50, D2: 91 });
    const armed = toggleDouble(s).state;
    expect(armed.doubleActive).toBe(true);
    expect(mrX(armed).tickets.double).toBe(1);
    const m1 = applyMove(armed, 23, 'taxi').state; // prima tappa
    expect(currentActor(m1)!.id).toBe('X'); // ancora Mr X
    expect(m1.history[0].double).toBe(true);
    const m2 = applyMove(m1, 37, 'taxi').state; // 23->37 seconda tappa
    expect(currentActor(m2)!.id).toBe('D1'); // ora tocca agli investigatori
    expect(m2.mrxMoveNo).toBe(2);
  });
});

describe('cattura e fine partita', () => {
  it('un investigatore che raggiunge Mr X vince', () => {
    const s = setup({ X: 13, D1: 22, D2: 91 });
    const a = applyMove(s, 23, 'taxi').state; // Mr X -> 23
    const b = applyMove(a, 23, 'taxi').state; // D1 22->23 cattura
    expect(b.over).toBe(true);
    expect(b.result!.who).toBe('det');
  });
});

describe('undo e replay', () => {
  it('undo ripristina biglietti e posizione', () => {
    const s = setup({ X: 13, D1: 50, D2: 91 });
    const a = applyMove(s, 23, 'taxi').state;
    const b = undo(a);
    expect(b.history.length).toBe(0);
    expect(mrX(b).pos).toBe(13);
    expect(mrX(b).tickets.taxi).toBe(11);
    expect(currentActor(b)!.id).toBe('X');
  });

  it('positionsAtStep ricostruisce le posizioni', () => {
    const s = setup({ X: 13, D1: 50, D2: 91 });
    const a = applyMove(s, 23, 'taxi').state;
    expect(positionsAtStep(a, 0).X).toBe(13);
    expect(positionsAtStep(a, 1).X).toBe(23);
  });
});
