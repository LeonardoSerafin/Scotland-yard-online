import type { GameConfig, GameState } from '../types';
import { MRX_COLOR } from '../game/rules';

interface Props {
  state: GameState;
  setConfig: (cfg: GameConfig) => void;
  setStart: (playerId: string, station: number | null) => void;
  randomStarts: () => void;
  begin: () => void;
  setupTarget: string | null;
  setSetupTarget: (id: string | null) => void;
}

export function SetupPanel({
  state,
  setConfig,
  setStart,
  randomStarts,
  begin,
  setupTarget,
  setSetupTarget,
}: Props) {
  const cfg = state.config;
  const patch = (p: Partial<GameConfig>) => setConfig({ ...cfg, ...p });

  return (
    <>
      <section className="card">
        <h3>Configurazione</h3>
        <label className="f">
          <span>Numero investigatori</span>
          <select
            value={cfg.detectiveCount}
            onChange={(e) => patch({ detectiveCount: Number(e.target.value) })}
          >
            {[2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} investigatori
              </option>
            ))}
          </select>
        </label>
        <div className="row">
          <label className="f">
            <span>Turni totali</span>
            <input
              type="number"
              min={10}
              max={40}
              value={cfg.totalRounds}
              onChange={(e) => patch({ totalRounds: Number(e.target.value) || 24 })}
            />
          </label>
          <label className="f">
            <span>Turni rivelazione</span>
            <input
              type="text"
              value={cfg.revealRounds.join(', ')}
              onChange={(e) =>
                patch({
                  revealRounds: e.target.value
                    .split(',')
                    .map((x) => parseInt(x.trim(), 10))
                    .filter((x) => x > 0),
                })
              }
            />
          </label>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={cfg.transferToMrX}
            onChange={(e) => patch({ transferToMrX: e.target.checked })}
          />
          Biglietti usati dagli investigatori vanno a Mr X (regola ufficiale)
        </label>
        <label className="toggle">
          <input type="checkbox" checked={cfg.freeMode} onChange={(e) => patch({ freeMode: e.target.checked })} />
          Modalità libera (nessuna validazione)
        </label>
      </section>

      <section className="card">
        <h3>Biglietti</h3>
        <div className="mini">Investigatori (ciascuno)</div>
        <div className="row">
          <TicketInput label="Taxi" value={cfg.det.taxi} onChange={(v) => patch({ det: { ...cfg.det, taxi: v } })} />
          <TicketInput label="Bus" value={cfg.det.bus} onChange={(v) => patch({ det: { ...cfg.det, bus: v } })} />
          <TicketInput label="Metro" value={cfg.det.underground} onChange={(v) => patch({ det: { ...cfg.det, underground: v } })} />
        </div>
        <div className="mini" style={{ marginTop: 10 }}>Mr X</div>
        <div className="row">
          <TicketInput label="Taxi" value={cfg.mrx.taxi} onChange={(v) => patch({ mrx: { ...cfg.mrx, taxi: v } })} />
          <TicketInput label="Bus" value={cfg.mrx.bus} onChange={(v) => patch({ mrx: { ...cfg.mrx, bus: v } })} />
          <TicketInput label="Metro" value={cfg.mrx.underground} onChange={(v) => patch({ mrx: { ...cfg.mrx, underground: v } })} />
        </div>
        <div className="row" style={{ marginTop: 6 }}>
          <TicketInput label="Black" value={cfg.mrx.black} onChange={(v) => patch({ mrx: { ...cfg.mrx, black: v } })} />
          <TicketInput label="Doppia" value={cfg.mrx.double} onChange={(v) => patch({ mrx: { ...cfg.mrx, double: v } })} />
          <div style={{ flex: 1 }} />
        </div>
      </section>

      <section className="card">
        <h3>Posizioni di partenza</h3>
        <p className="hint">Seleziona un giocatore, poi clicca una stazione sulla mappa (oppure scrivi il numero).</p>
        {state.players.map((p) => (
          <div
            key={p.id}
            className={'playerline' + (setupTarget === p.id ? ' turn' : '')}
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName === 'INPUT') return;
              setSetupTarget(p.id);
            }}
          >
            <span className="dot" style={{ background: p.isMrX ? MRX_COLOR : p.color }} />
            <span className="nm">{p.name}</span>
            <input
              style={{ width: 90, marginLeft: 'auto' }}
              type="number"
              placeholder="—"
              value={p.start ?? ''}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setStart(p.id, v >= 1 && v <= 199 ? v : null);
              }}
            />
          </div>
        ))}
        <button className="btn sec" style={{ marginTop: 8 }} onClick={randomStarts}>
          🎲 Partenze casuali ufficiali
        </button>
      </section>

      <div>
        <button className="btn" onClick={begin}>▶ Inizia partita</button>
        <p className="mini" style={{ marginTop: 6 }}>
          Premendo Inizia, gli eventuali turni già giocati verranno azzerati.
        </p>
      </div>
    </>
  );
}

function TicketInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="f" style={{ margin: 0 }}>
      <span>{label}</span>
      <input
        type="number"
        min={0}
        max={60}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
      />
    </label>
  );
}
