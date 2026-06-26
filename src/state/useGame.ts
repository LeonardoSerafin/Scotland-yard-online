import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameConfig, GameState, Transport } from '../types';
import {
  applyMove,
  newGameState,
  startGame,
  toggleDouble,
  undo as undoMove,
} from '../game/engine';
import { defaultConfig } from '../game/rules';

const LS_KEY = 'scotlandyard_state_v2';

function loadInitial(): GameState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      if (parsed && Array.isArray(parsed.players)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return newGameState(defaultConfig());
}

export interface UseGame {
  state: GameState;
  flash: string | null;
  setFlash: (m: string | null) => void;
  // setup
  setConfig: (cfg: GameConfig) => void;
  setStart: (playerId: string, station: number | null) => void;
  randomStarts: () => void;
  begin: () => void;
  // play
  move: (to: number, transport: Transport) => void;
  toggleDoubleMove: () => void;
  undo: () => void;
  // game lifecycle
  reset: () => void;
  importState: (s: GameState) => void;
}

export function useGame(): UseGame {
  const [state, setState] = useState<GameState>(loadInitial);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  const showFlash = useCallback((m: string | null) => {
    setFlash(m);
    window.clearTimeout(flashTimer.current);
    if (m) flashTimer.current = window.setTimeout(() => setFlash(null), 2400);
  }, []);

  // persistenza automatica
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      /* quota / private mode */
    }
  }, [state]);

  const STD = useCallback(() => state, [state]);
  void STD;

  const setConfig = useCallback((cfg: GameConfig) => {
    setState((prev) => {
      const next = newGameState(cfg);
      // preserva le partenze già scelte quando possibile
      prev.players.forEach((p) => {
        const np = next.players.find((q) => q.id === p.id);
        if (np && p.start != null) {
          np.start = p.start;
          np.pos = p.start;
        }
      });
      return next;
    });
  }, []);

  const setStart = useCallback((playerId: string, station: number | null) => {
    setState((prev) => {
      const next = structuredClone(prev);
      const p = next.players.find((q) => q.id === playerId);
      if (p) {
        p.start = station;
        p.pos = station;
      }
      return next;
    });
  }, []);

  const randomStarts = useCallback(() => {
    setState((prev) => {
      const next = structuredClone(prev);
      const pool = [
        13, 26, 29, 34, 50, 53, 91, 94, 103, 112, 117, 132, 138, 141, 155, 174, 197, 198,
      ];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      next.players.forEach((p, i) => {
        p.start = pool[i];
        p.pos = pool[i];
      });
      return next;
    });
  }, []);

  const begin = useCallback(() => {
    setState((prev) => {
      const r = startGame(prev);
      if (r.error) {
        showFlash(r.error);
        return prev;
      }
      return r.state;
    });
  }, [showFlash]);

  const move = useCallback(
    (to: number, transport: Transport) => {
      setState((prev) => {
        const r = applyMove(prev, to, transport);
        if (r.error) {
          showFlash(r.error);
          return prev;
        }
        return r.state;
      });
    },
    [showFlash],
  );

  const toggleDoubleMove = useCallback(() => {
    setState((prev) => {
      const r = toggleDouble(prev);
      if (r.error) {
        showFlash(r.error);
        return prev;
      }
      return r.state;
    });
  }, [showFlash]);

  const undo = useCallback(() => setState((prev) => undoMove(prev)), []);

  const reset = useCallback(() => {
    setState(newGameState(defaultConfig()));
  }, []);

  const importState = useCallback((s: GameState) => setState(s), []);

  return {
    state,
    flash,
    setFlash: showFlash,
    setConfig,
    setStart,
    randomStarts,
    begin,
    move,
    toggleDoubleMove,
    undo,
    reset,
    importState,
  };
}
