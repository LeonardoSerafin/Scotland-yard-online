// Tipi condivisi dell'applicazione Scotland Yard Tracker.

/** Mezzi di trasporto. `black` e `double` sono solo di Mr X. */
export type Transport = 'taxi' | 'bus' | 'underground' | 'water' | 'black';

/** Tipi di biglietto posseduti (i Transport + `double` per la doppia mossa). */
export type Ticket = Transport | 'double';

export interface Station {
  id: number;
  x: number;
  y: number;
  /** Mezzi disponibili nella stazione (taxi/bus/underground). */
  t: string[];
}

export interface Player {
  id: string; // 'X' per Mr X, 'D1'..'Dn' per gli investigatori
  name: string;
  isMrX: boolean;
  color: string;
  pos: number | null;
  start: number | null;
  tickets: Partial<Record<Ticket, number>>;
  /** Interno: indica che Mr X ha già fatto la prima mossa di una doppia. */
  secondDone?: boolean;
}

export interface Move {
  seq: number;
  round: number;
  playerId: string;
  from: number | null;
  to: number;
  transport: Transport;
  /** Numero progressivo della mossa di Mr X (per i turni di rivelazione). */
  mrxMoveNo: number | null;
  reveal: boolean;
  /** È la prima mossa di una doppia mossa. */
  double: boolean;
}

export interface GameConfig {
  detectiveCount: number;
  totalRounds: number;
  revealRounds: number[];
  det: { taxi: number; bus: number; underground: number };
  mrx: { taxi: number; bus: number; underground: number; black: number; double: number };
  /** Regola ufficiale: i biglietti spesi dagli investigatori passano a Mr X. */
  transferToMrX: boolean;
  /** Disattiva la validazione delle mosse. */
  freeMode: boolean;
}

export type Winner = 'det' | 'mrx';

export interface GameState {
  config: GameConfig;
  players: Player[];
  started: boolean;
  over: boolean;
  result: { who: Winner; msg: string } | null;
  history: Move[];
  round: number;
  mrxMoveNo: number;
  /** Ordine dei giocatori nel turno corrente (id). */
  queue: string[];
  curActorIdx: number;
  /** Doppia mossa armata per la mossa corrente di Mr X. */
  doubleActive: boolean;
}
