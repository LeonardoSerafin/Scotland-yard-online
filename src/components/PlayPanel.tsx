import type { GameState, Transport } from '../types';
import { currentActor } from '../game/engine';
import { MRX_COLOR, TRANSPORT_INFO } from '../game/rules';
import { MoveLog } from './MoveLog';

interface Props {
  state: GameState;
  selTransport: Transport | null;
  setSelTransport: (t: Transport | null) => void;
  toggleDoubleMove: () => void;
  undo: () => void;
  goReplay: () => void;
}

const DET_TRANSPORTS: Transport[] = ['taxi', 'bus', 'underground'];
const MRX_TRANSPORTS: Transport[] = ['taxi', 'bus', 'underground', 'black'];

export function PlayPanel({ state, selTransport, setSelTransport, toggleDoubleMove, undo, goReplay }: Props) {
  if (!state.started) {
    return <div className="notice">Nessuna partita avviata. Vai su « Setup » e premi Inizia partita.</div>;
  }

  const actor = currentActor(state);

  return (
    <>
      {state.over && state.result ? (
        <div className={'banner ' + (state.result.who === 'det' ? 'cap' : 'win')}>
          {(state.result.who === 'det' ? '🚓 Investigatori vincono — ' : '🕵️ Mr X vince — ') + state.result.msg}
        </div>
      ) : (
        actor && (
          <section className="card">
            <h3>Turno {state.round} / {state.config.totalRounds}</h3>
            <div className="turnhead">
              <span className="dot big" style={{ background: actor.isMrX ? MRX_COLOR : actor.color }} />
              <b>Tocca a {actor.name}</b>
            </div>
            {actor.isMrX && (
              <p className="hint">
                Mossa #{state.mrxMoveNo + 1} di Mr X.{' '}
                {state.config.revealRounds.includes(state.mrxMoveNo + 1) ? (
                  <b style={{ color: '#ff8fa6' }}>⚑ Turno di rivelazione: mostra la posizione agli investigatori.</b>
                ) : (
                  'Posizione nascosta.'
                )}
              </p>
            )}

            <div className="transports">
              {(actor.isMrX ? MRX_TRANSPORTS : DET_TRANSPORTS).map((t) => {
                const n = actor.tickets[t] ?? 0;
                const disabled = !state.config.freeMode && n <= 0;
                return (
                  <button
                    key={t}
                    className={selTransport === t ? 'sel' : ''}
                    disabled={disabled}
                    onClick={() => setSelTransport(selTransport === t ? null : t)}
                  >
                    {TRANSPORT_INFO[t].label}
                    <small> ({n})</small>
                    <span className="c" style={{ background: TRANSPORT_INFO[t].color }} />
                  </button>
                );
              })}
            </div>

            {actor.isMrX && (
              <button
                className="btn sec"
                style={state.doubleActive ? { borderColor: MRX_COLOR, color: '#ff8fa6' } : undefined}
                onClick={toggleDoubleMove}
              >
                {state.doubleActive
                  ? `✓ Doppia mossa attiva (${actor.secondDone ? '2ª mossa' : '1ª mossa'})`
                  : `⏩ Usa doppia mossa (${actor.tickets.double ?? 0})`}
              </button>
            )}

            <p className="hint" style={{ marginTop: 8 }}>
              {selTransport ? (
                <>Clicca una <b style={{ color: '#27c281' }}>stazione evidenziata</b> sulla mappa.</>
              ) : (
                'Seleziona un mezzo, poi clicca la destinazione.'
              )}
            </p>
          </section>
        )
      )}

      <section className="card">
        <h3>Giocatori</h3>
        {state.players.map((p) => {
          const isTurn = !state.over && actor?.id === p.id;
          const order: Transport[] | string[] = p.isMrX
            ? ['taxi', 'bus', 'underground', 'black', 'double']
            : ['taxi', 'bus', 'underground'];
          return (
            <div key={p.id} className={'playerline' + (isTurn ? ' turn' : '')}>
              <span className="dot" style={{ background: p.isMrX ? MRX_COLOR : p.color }} />
              <div style={{ flex: 1 }}>
                <div className="nm">{p.name}</div>
                <div className="tix">
                  {order.map((t) => {
                    const n = (p.tickets as Record<string, number>)[t] ?? 0;
                    return (
                      <span key={t} className={'t' + (n <= 1 ? ' low' : '')}>
                        {t === 'double' ? 'Doppia' : TRANSPORT_INFO[t].label}: {n}
                      </span>
                    );
                  })}
                </div>
              </div>
              <span className="ps">{p.pos ?? '—'}</span>
            </div>
          );
        })}
      </section>

      <div className="row">
        <button className="btn sec" onClick={undo}>↶ Annulla</button>
        <button className="btn sec" onClick={goReplay}>⏮ Replay</button>
      </div>

      <section className="card">
        <h3>Cronologia</h3>
        <MoveLog state={state} />
      </section>
    </>
  );
}
