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
  state, setConfig, setStart, randomStarts, begin, setupTarget, setSetupTarget,
}: Props) {
  const cfg = state.config;
  const patch = (p: Partial<GameConfig>) => setConfig({ ...cfg, ...p });
  const allPlaced = state.players.every((p) => p.start != null);

  return (
    <>
      <section className="card">
        <h3>1 · Giocatori</h3>
        <label className="f">
          <span>Numero investigatori</span>
          <select value={cfg.detectiveCount} onChange={(e) => patch({ detectiveCount: Number(e.target.value) })}>
            {[2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} investigatori + Mr X</option>
            ))}
          </select>
        </label>
      </section>

      <section className="card">
        <h3>2 · Posizioni di partenza</h3>
        <p className="hint">Tocca un giocatore qui sotto, poi tocca la sua stazione sulla mappa. Oppure usa le partenze casuali.</p>
        {state.players.map((p) => (
          <div
            key={p.id}
            className={'playerline selectable' + (setupTarget === p.id ? ' turn' : '')}
            onClick={(e) => { if ((e.target as HTMLElement).tagName !== 'INPUT') setSetupTarget(p.id); }}
          >
            <span className="dot" style={{ background: p.isMrX ? MRX_COLOR : p.color }} />
            <span className="nm">{p.name}</span>
            <input
              style={{ width: 84, marginLeft: 'auto' }}
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

      <details className="card adv">
        <summary>Impostazioni avanzate (opzionali)</summary>
        <div className="row" style={{ marginTop: 10 }}>
          <label className="f">
            <span>Turni totali</span>
            <input type="number" min={10} max={40} value={cfg.totalRounds}
              onChange={(e) => patch({ totalRounds: Number(e.target.value) || 24 })} />
          </label>
          <label className="f">
            <span>Turni rivelazione</span>
            <input type="text" value={cfg.revealRounds.join(', ')}
              onChange={(e) => patch({ revealRounds: e.target.value.split(',').map((x) => parseInt(x.trim(), 10)).filter((x) => x > 0) })} />
          </label>
        </div>

        <div className="mini" style={{ marginTop: 6 }}>Biglietti investigatori (ciascuno)</div>
        <div className="row">
          <T label="Taxi" v={cfg.det.taxi} on={(v) => patch({ det: { ...cfg.det, taxi: v } })} />
          <T label="Bus" v={cfg.det.bus} on={(v) => patch({ det: { ...cfg.det, bus: v } })} />
          <T label="Metro" v={cfg.det.underground} on={(v) => patch({ det: { ...cfg.det, underground: v } })} />
        </div>
        <div className="mini" style={{ marginTop: 8 }}>Biglietti Mr X</div>
        <div className="row">
          <T label="Taxi" v={cfg.mrx.taxi} on={(v) => patch({ mrx: { ...cfg.mrx, taxi: v } })} />
          <T label="Bus" v={cfg.mrx.bus} on={(v) => patch({ mrx: { ...cfg.mrx, bus: v } })} />
          <T label="Metro" v={cfg.mrx.underground} on={(v) => patch({ mrx: { ...cfg.mrx, underground: v } })} />
        </div>
        <div className="row" style={{ marginTop: 6 }}>
          <T label="Black" v={cfg.mrx.black} on={(v) => patch({ mrx: { ...cfg.mrx, black: v } })} />
          <T label="Doppia" v={cfg.mrx.double} on={(v) => patch({ mrx: { ...cfg.mrx, double: v } })} />
          <div style={{ flex: 1 }} />
        </div>

        <label className="toggle" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={cfg.transferToMrX} onChange={(e) => patch({ transferToMrX: e.target.checked })} />
          Biglietti usati dagli investigatori vanno a Mr X (regola ufficiale)
        </label>
        <label className="toggle">
          <input type="checkbox" checked={cfg.freeMode} onChange={(e) => patch({ freeMode: e.target.checked })} />
          Modalità libera (nessuna validazione delle mosse)
        </label>
      </details>

      <button className="btn" onClick={begin} disabled={!allPlaced}>
        {allPlaced ? '▶ Inizia partita' : 'Imposta tutte le partenze per iniziare'}
      </button>
    </>
  );
}

function T({ label, v, on }: { label: string; v: number; on: (v: number) => void }) {
  return (
    <label className="f" style={{ margin: 0 }}>
      <span>{label}</span>
      <input type="number" min={0} max={60} value={v} onChange={(e) => on(parseInt(e.target.value, 10) || 0)} />
    </label>
  );
}
