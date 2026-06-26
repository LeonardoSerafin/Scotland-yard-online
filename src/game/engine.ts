import type { GameConfig, GameState, Move, Player, Transport } from '../types';
import { neighbors } from '../data/graph';
import { DET_COLORS, MRX_COLOR } from './rules';

/**
 * Motore di gioco PURO: ogni funzione che modifica lo stato restituisce
 * un NUOVO oggetto stato (clonato), senza effetti collaterali. Nessuna
 * dipendenza dal DOM o da React: completamente testabile.
 */

const clone = <T>(o: T): T =>
  typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o));

export function newGameState(config: GameConfig): GameState {
  const players: Player[] = [];
  players.push({
    id: 'X',
    name: 'Mr X',
    isMrX: true,
    color: MRX_COLOR,
    pos: null,
    start: null,
    secondDone: false,
    tickets: {
      taxi: config.mrx.taxi,
      bus: config.mrx.bus,
      underground: config.mrx.underground,
      black: config.mrx.black,
      double: config.mrx.double,
    },
  });
  for (let i = 0; i < config.detectiveCount; i++) {
    players.push({
      id: 'D' + (i + 1),
      name: 'Det ' + (i + 1),
      isMrX: false,
      color: DET_COLORS[i % DET_COLORS.length],
      pos: null,
      start: null,
      tickets: { taxi: config.det.taxi, bus: config.det.bus, underground: config.det.underground },
    });
  }
  return {
    config,
    players,
    started: false,
    over: false,
    result: null,
    history: [],
    round: 1,
    mrxMoveNo: 0,
    queue: [],
    curActorIdx: 0,
    doubleActive: false,
  };
}

// ---- accessor di sola lettura ----
export const playerById = (s: GameState, id: string) => s.players.find((p) => p.id === id);
export const mrX = (s: GameState) => s.players.find((p) => p.isMrX)!;
export const detectives = (s: GameState) => s.players.filter((p) => !p.isMrX);
export const currentActor = (s: GameState): Player | null => {
  const id = s.queue[s.curActorIdx];
  return id != null ? playerById(s, id) ?? null : null;
};

function buildQueue(s: GameState) {
  s.queue = s.players.map((p) => p.id);
  s.curActorIdx = 0;
}

/** Destinazioni valide per un giocatore, eventualmente filtrate per mezzo. */
export function possibleDestinations(
  s: GameState,
  player: Player,
  transport?: Transport,
): Set<number> {
  const res = new Set<number>();
  if (player.pos == null) return res;
  const occupied = new Set(
    detectives(s)
      .filter((d) => d !== player && d.pos != null)
      .map((d) => d.pos as number),
  );
  const list: Transport[] = transport
    ? [transport]
    : player.isMrX
      ? ['taxi', 'bus', 'underground', 'black']
      : ['taxi', 'bus', 'underground'];
  for (const t of list) {
    if (!s.config.freeMode && (player.tickets[t] ?? 0) <= 0) continue;
    for (const n of neighbors(player.pos, t)) {
      if (!occupied.has(n)) res.add(n);
    }
  }
  return res;
}

function endGame(s: GameState, who: 'det' | 'mrx', msg: string) {
  s.over = true;
  s.result = { who, msg };
}

function advanceActor(s: GameState) {
  s.curActorIdx++;
  if (s.curActorIdx >= s.queue.length) {
    s.round++;
    if (s.round > s.config.totalRounds) {
      endGame(s, 'mrx', `Mr X e' sfuggito per tutti i ${s.config.totalRounds} turni!`);
      return;
    }
    buildQueue(s);
    skipStuckDetectives(s);
  }
}

function skipStuckDetectives(s: GameState) {
  for (;;) {
    const a = currentActor(s);
    if (!a || a.isMrX) break;
    if (possibleDestinations(s, a).size === 0) {
      s.curActorIdx++;
      if (s.curActorIdx >= s.queue.length) {
        s.round++;
        if (s.round > s.config.totalRounds) {
          endGame(s, 'mrx', 'Mr X e\' sfuggito!');
          return;
        }
        buildQueue(s);
      }
    } else break;
  }
}

export interface StartResult {
  state: GameState;
  error?: string;
}

/** Avvia la partita usando le partenze già impostate sui giocatori. */
export function startGame(prev: GameState): StartResult {
  const s = clone(prev);
  const missing = s.players.filter((p) => p.start == null);
  if (missing.length) {
    return { state: prev, error: 'Imposta la partenza di: ' + missing.map((p) => p.name).join(', ') };
  }
  s.players.forEach((p) => (p.pos = p.start));
  s.started = true;
  s.over = false;
  s.result = null;
  s.round = 1;
  s.mrxMoveNo = 0;
  s.history = [];
  s.doubleActive = false;
  mrX(s).secondDone = false;
  buildQueue(s);
  return { state: s };
}

export interface MoveResult {
  state: GameState;
  error?: string;
}

/** Esegue una mossa del giocatore di turno verso `to` con `transport`. */
export function applyMove(prev: GameState, to: number, transport: Transport): MoveResult {
  if (!prev.started || prev.over) return { state: prev };
  const s = clone(prev);
  const a = currentActor(s);
  if (!a) return { state: prev };
  const from = a.pos;

  if (!s.config.freeMode) {
    if ((a.tickets[transport] ?? 0) <= 0) return { state: prev, error: `Biglietto ${transport} esaurito` };
    if (!possibleDestinations(s, a, transport).has(to)) return { state: prev, error: 'Mossa non valida' };
  }

  // paga il biglietto
  a.tickets[transport] = (a.tickets[transport] ?? 0) - 1;
  let mrxMoveNo: number | null = null;
  if (a.isMrX) {
    s.mrxMoveNo++;
    mrxMoveNo = s.mrxMoveNo;
  } else if (s.config.transferToMrX && (transport === 'taxi' || transport === 'bus' || transport === 'underground')) {
    const x = mrX(s);
    x.tickets[transport] = (x.tickets[transport] ?? 0) + 1;
  }

  const reveal = a.isMrX && s.config.revealRounds.includes(mrxMoveNo as number);
  const isDoubleFirst = !!(a.isMrX && s.doubleActive && !a.secondDone);
  a.pos = to;

  const move: Move = {
    seq: s.history.length + 1,
    round: s.round,
    playerId: a.id,
    from,
    to,
    transport,
    mrxMoveNo,
    reveal,
    double: isDoubleFirst,
  };
  s.history.push(move);

  // controlli di cattura
  if (a.isMrX) {
    if (detectives(s).some((d) => d.pos === to)) {
      endGame(s, 'det', `Catturato! Un investigatore era gia' sulla ${to}.`);
      return { state: s };
    }
  } else if (to === mrX(s).pos && mrX(s).pos != null) {
    endGame(s, 'det', `Mr X catturato sulla ${to} da ${a.name}!`);
    return { state: s };
  }

  // doppia mossa: prima tappa => Mr X resta di turno
  if (a.isMrX && s.doubleActive && !a.secondDone) {
    a.secondDone = true;
    return { state: s };
  }
  if (a.isMrX) {
    a.secondDone = false;
    s.doubleActive = false;
  }

  advanceActor(s);

  // se ora tocca a Mr X ma e' bloccato => vincono gli investigatori
  if (s.started && !s.over) {
    const c = currentActor(s);
    if (c && c.isMrX && possibleDestinations(s, mrX(s)).size === 0) {
      endGame(s, 'det', 'Mr X e\' bloccato, nessuna mossa possibile!');
    }
  }
  return { state: s };
}

/** Arma/disarma la doppia mossa di Mr X (consuma/restituisce il biglietto). */
export function toggleDouble(prev: GameState): MoveResult {
  const s = clone(prev);
  const x = mrX(s);
  if (s.doubleActive) {
    s.doubleActive = false;
    x.tickets.double = (x.tickets.double ?? 0) + 1;
    return { state: s };
  }
  if (!s.config.freeMode && (x.tickets.double ?? 0) <= 0) {
    return { state: prev, error: 'Nessun biglietto doppia mossa' };
  }
  x.tickets.double = Math.max(0, (x.tickets.double ?? 0) - 1);
  s.doubleActive = true;
  return { state: s };
}

/** Annulla l'ultima mossa, ripristinando biglietti, posizioni e turno. */
export function undo(prev: GameState): GameState {
  if (prev.history.length === 0) return prev;
  const s = clone(prev);
  const m = s.history.pop()!;
  const p = playerById(s, m.playerId)!;
  p.tickets[m.transport] = (p.tickets[m.transport] ?? 0) + 1;
  if (!p.isMrX && s.config.transferToMrX && (m.transport === 'taxi' || m.transport === 'bus' || m.transport === 'underground')) {
    const x = mrX(s);
    x.tickets[m.transport] = (x.tickets[m.transport] ?? 0) - 1;
  }
  if (p.isMrX) s.mrxMoveNo = Math.max(0, s.mrxMoveNo - 1);
  if (m.double) mrX(s).tickets.double = (mrX(s).tickets.double ?? 0) + 1;
  p.pos = m.from;
  s.over = false;
  s.result = null;
  s.doubleActive = false;
  mrX(s).secondDone = false;
  rebuildTurnPointer(s);
  return s;
}

function rebuildTurnPointer(s: GameState) {
  s.round = 1;
  buildQueue(s);
  let i = 0;
  while (i < s.history.length) {
    const a = playerById(s, s.queue[s.curActorIdx])!;
    const m = s.history[i];
    if (a.isMrX && m.double) {
      i++;
      continue; // la prima tappa della doppia non avanza il turno
    }
    s.curActorIdx++;
    if (s.curActorIdx >= s.queue.length) {
      s.round++;
      buildQueue(s);
    }
    i++;
  }
  if (s.round > s.config.totalRounds) s.round = s.config.totalRounds;
}

/** Posizioni di tutti i giocatori dopo `step` mosse (per il replay). */
export function positionsAtStep(s: GameState, step: number): Record<string, number | null> {
  const cur: Record<string, number | null> = {};
  s.players.forEach((p) => (cur[p.id] = p.start));
  for (let i = 0; i < step && i < s.history.length; i++) {
    const m = s.history[i];
    cur[m.playerId] = m.to;
  }
  return cur;
}
