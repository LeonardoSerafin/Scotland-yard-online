import { useEffect, useRef } from 'react';
import type { GameState } from '../types';
import { MRX_COLOR, TRANSPORT_INFO } from '../game/rules';

export function MoveLog({ state }: { state: GameState }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [state.history.length]);

  if (!state.history.length) return <div className="mini">Nessuna mossa.</div>;

  return (
    <div className="log" ref={ref}>
      {state.history.map((m) => {
        const p = state.players.find((pl) => pl.id === m.playerId)!;
        const col = p.isMrX ? MRX_COLOR : p.color;
        const tr = TRANSPORT_INFO[m.transport]?.label ?? m.transport;
        return (
          <div className="l" key={m.seq}>
            <span className="dot" style={{ background: col }} />
            <b>{p.name}</b> <span className="mini">T{m.round}</span> {m.from}→<b>{m.to}</b>{' '}
            <span className="mini">
              [{tr}
              {m.double ? ' · doppia' : ''}
              {m.reveal ? ' · ⚑' : ''}]
            </span>
          </div>
        );
      })}
    </div>
  );
}
