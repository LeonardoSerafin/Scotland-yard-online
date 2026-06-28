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
  validCount: number | null;
}

const DET_TRANSPORTS: Transport[] = ['taxi', 'bus', 'underground'];
const MRX_TRANSPORTS: Transport[] = ['taxi', 'bus', 'underground', 'black'];

export function PlayPanel({
  state, selTransport, setSelTransport, toggleDoubleMove, undo, goReplay, validCount,
}: Props) {
  if (!state.started) {
    return <div className="notice">Nessuna partita avviata. Vai su « Setup » e premi <b>Inizia partita</b>.</div>;
  }

  const actor = currentActor(state);

  return (
    <>
      {state.over && state.result ? (
        <div className={'banner ' + (state.result.who === 'det' ? 'cap' : 'win')}>
          {(state.result.who === 'det' ? '🚓 Vincono gli investigatori — ' : '🕵️ Vince Mr X — ') + state.result.msg}
        </div>
      ) : (
        actor && (
          <section className="card turncard">
            <div className="turnhead">
              <span className="dot big" style={{ background: actor.isMrX ? MRX_COLOR : actor.color }} />
              <div>
                <b>Tocca a {actor.name}</b>
                <div className="mini">Turno {state.round} / {state.config.totalRounds}</div>
              </div>
            </div>

            {actor.isMrX && state.config.revealRounds.includes(state.mrxMoveNo + 1) && (
              <div className="reveal-badge">⚑ Turno di rivelazione — mostra la posizione di Mr X agli investigatori</div>
            )}

            <div className="step-label">1 · Scegli il mezzo</div>
            <div className="transports">
              {(actor.isMrX ? MRX_TRANSPORTS : DET_TRANSPORTS).map((t) => {
                const n = actor.tickets[t] ?? 0;
                const forcedT =
                  actor.isMrX && state.doubleActive && actor.secondDone
                    ? state.history[state.history.length - 1]?.transport ?? null
                    : null;
                const disabled = (!state.config.freeMode && n <= 0) || (forcedT != null && t !== forcedT);
                return (
                  <button
                    key={t}
                    className={selTransport === t ? 'sel' : ''}
                    disabled={disabled}
                    onClick={() => setSelTransport(selTransport === t ? null : t)}
                  >
                    {TRANSPORT_INFO[t].label}
                    <small> {n}</small>
                    <span className="c" style={{ background: TRANSPORT_INFO[t].color }} />
                  </button>
                );
              })}
            </div>
            {actor.isMrX && state.doubleActive && actor.secondDone && (
              <p className="hint ok-hint">Doppia mossa: la 2ª tappa usa lo stesso mezzo della 1ª.</p>
            )}

            {actor.isMrX && (
              <button
                className={'btn sec double-btn' + (state.doubleActive ? ' on' : '')}
                onClick={toggleDoubleMove}
              >
                {state.doubleActive
                  ? `✓ Doppia mossa attiva (${actor.secondDone ? '2ª mossa' : '1ª mossa'})`
                  : `⏩ Doppia mossa (${actor.tickets.double ?? 0} rimaste)`}
              </button>
            )}

            <div className="step-label">2 · Tocca la destinazione</div>
            {selTransport ? (
              validCount && validCount > 0 ? (
                <p className="hint ok-hint">
                  {validCount} {validCount === 1 ? 'stazione raggiungibile' : 'stazioni raggiungibili'} evidenziate in verde sulla mappa. Toccane una.
                </p>
              ) : (
                <p className="hint warn-hint">Nessuna stazione raggiungibile con {TRANSPORT_INFO[selTransport].label}. Scegli un altro mezzo.</p>
              )
            ) : (
              <p className="hint">Seleziona prima un mezzo qui sopra.</p>
            )}
          </section>
        )
      )}

      <section className="card">
        <h3>Giocatori</h3>
        {state.players.map((p) => {
          const isTurn = !state.over && actor?.id === p.id;
          const order: string[] = p.isMrX
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
        <button className="btn sec" onClick={undo} disabled={!state.history.length}>↶ Annulla mossa</button>
        <button className="btn sec" onClick={goReplay} disabled={!state.history.length}>⏪ Replay</button>
      </div>

      <section className="card">
        <h3>Cronologia</h3>
        <MoveLog state={state} />
      </section>
    </>
  );
}
