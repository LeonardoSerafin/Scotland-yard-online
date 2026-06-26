import { useEffect } from 'react';
import type { GameState } from '../types';
import { positionsAtStep } from '../game/engine';
import { MRX_COLOR, TRANSPORT_INFO } from '../game/rules';
import { MoveLog } from './MoveLog';

interface Props {
  state: GameState;
  step: number;
  setStep: (n: number) => void;
  playing: boolean;
  togglePlay: () => void;
}

export function ReplayPanel({ state, step, setStep, playing, togglePlay }: Props) {
  const total = state.history.length;

  // avanzamento automatico
  useEffect(() => {
    if (!playing) return;
    if (step >= total) {
      togglePlay();
      return;
    }
    const id = window.setTimeout(() => setStep(Math.min(total, step + 1)), 900);
    return () => window.clearTimeout(id);
  }, [playing, step, total, setStep, togglePlay]);

  if (!total) {
    return <div className="notice">Nessuna mossa da rivedere. Gioca qualche turno in « Partita ».</div>;
  }

  const clamp = (n: number) => Math.max(0, Math.min(total, n));
  const pos = positionsAtStep(state, step);
  const last = step > 0 ? state.history[step - 1] : null;

  return (
    <>
      <section className="card">
        <h3>Replay</h3>
        <div className="replaybar">
          <button className="btn sec" onClick={() => setStep(0)}>⏮</button>
          <button className="btn sec" onClick={() => setStep(clamp(step - 1))}>◀</button>
          <button className="btn" onClick={togglePlay}>{playing ? '⏸' : '▶'}</button>
          <button className="btn sec" onClick={() => setStep(clamp(step + 1))}>▶</button>
          <button className="btn sec" onClick={() => setStep(total)}>⏭</button>
        </div>
        <input
          type="range"
          min={0}
          max={total}
          value={step}
          onChange={(e) => setStep(Number(e.target.value))}
          style={{ width: '100%', marginTop: 8 }}
        />
        <div className="mini" style={{ textAlign: 'center', marginTop: 4 }}>
          Mossa {step} / {total}
        </div>
      </section>

      <section className="card">
        <h3>Posizioni al passo {step}</h3>
        {last ? (
          <div className="playerline">
            <span
              className="dot"
              style={{ background: state.players.find((p) => p.id === last.playerId)?.isMrX ? MRX_COLOR : state.players.find((p) => p.id === last.playerId)?.color }}
            />
            <span className="nm">{state.players.find((p) => p.id === last.playerId)?.name}</span>
            <span style={{ marginLeft: 'auto' }}>
              {last.from}→<b>{last.to}</b> · {TRANSPORT_INFO[last.transport]?.label ?? last.transport}
              {last.double ? ' (doppia)' : ''}
            </span>
          </div>
        ) : (
          <div className="mini">Posizioni iniziali.</div>
        )}
        {state.players.map((p) => (
          <div key={p.id} className="playerline">
            <span className="dot" style={{ background: p.isMrX ? MRX_COLOR : p.color }} />
            <span className="nm">{p.name}</span>
            <span className="ps">{pos[p.id] ?? '—'}</span>
          </div>
        ))}
      </section>

      <section className="card">
        <h3>Cronologia completa</h3>
        <MoveLog state={state} />
      </section>
    </>
  );
}
