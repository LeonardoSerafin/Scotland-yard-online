import { useMemo, useRef, useState } from 'react';
import './index.css';
import type { GameState, Transport } from './types';
import { useGame } from './state/useGame';
import { currentActor, possibleDestinations } from './game/engine';
import { MapView, type MapViewKind } from './components/MapView';
import { SetupPanel } from './components/SetupPanel';
import { PlayPanel } from './components/PlayPanel';
import { ReplayPanel } from './components/ReplayPanel';

type Tab = 'setup' | 'play' | 'replay';

export default function App() {
  const game = useGame();
  const { state } = game;

  const [tab, setTab] = useState<Tab>(state.started ? 'play' : 'setup');
  const [view, setView] = useState<MapViewKind>('schematic');
  const [selTransport, setSelTransport] = useState<Transport | null>(null);
  const [replayStep, setReplayStep] = useState(state.history.length);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [setupTarget, setSetupTarget] = useState<string | null>('X');
  const fileRef = useRef<HTMLInputElement>(null);

  // stazioni cliccabili nella vista corrente
  const validSet = useMemo(() => {
    if (tab !== 'play' || !state.started || state.over) return null;
    const actor = currentActor(state);
    if (!actor || !selTransport) return null;
    return possibleDestinations(state, actor, selTransport);
  }, [tab, state, selTransport]);

  const onNodeClick = (id: number) => {
    if (tab === 'setup') {
      if (!setupTarget) {
        game.setFlash('Prima seleziona un giocatore nella lista');
        return;
      }
      game.setStart(setupTarget, id);
      const next = state.players.find((p) => p.id !== setupTarget && p.start == null);
      setSetupTarget(next ? next.id : null);
    } else if (tab === 'play' && selTransport) {
      game.move(id, selTransport);
      setSelTransport(null);
    }
  };

  const goTo = (t: Tab) => {
    if (t === 'replay') setReplayStep(state.history.length);
    if (t === 'play') setSelTransport(null);
    setTab(t);
  };
  const begin = () => {
    game.begin();
    setSelTransport(null);
    setTab('play');
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'scotland-yard-partita.json';
    a.click();
  };
  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(String(r.result)) as GameState;
        if (obj && Array.isArray(obj.players)) {
          game.importState(obj);
          setTab(obj.started ? 'play' : 'setup');
          game.setFlash('Partita importata');
        }
      } catch {
        game.setFlash('File non valido');
      }
    };
    r.readAsText(f);
    e.target.value = '';
  };

  return (
    <div className="app">
      <header>
        <h1>Scotland <span>Yard</span> · Tracker</h1>
        <nav className="tabs">
          {(['setup', 'play', 'replay'] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => goTo(t)}>
              {t === 'setup' ? 'Setup' : t === 'play' ? 'Partita' : 'Replay'}
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <div className="topbtns">
          <button onClick={exportJson}>⬇ Esporta</button>
          <button onClick={() => fileRef.current?.click()}>⬆ Importa</button>
          <button
            onClick={() => {
              if (confirm('Nuova partita? Lo stato attuale verrà perso (puoi prima esportare).')) {
                game.reset();
                setTab('setup');
                setSetupTarget('X');
                setSelTransport(null);
              }
            }}
          >
            ✦ Nuova
          </button>
        </div>
      </header>

      <main>
        <div className="mapcol">
          <div className="mapcontrols">
            <div className="seg">
              <button className={view === 'schematic' ? 'active' : ''} onClick={() => setView('schematic')}>
                Schematica
              </button>
              <button className={view === 'real' ? 'active' : ''} onClick={() => setView('real')}>
                Immagine reale
              </button>
            </div>
          </div>
          <MapView
            state={state}
            mode={tab}
            view={view}
            validSet={validSet}
            replayStep={replayStep}
            onNodeClick={onNodeClick}
          />
        </div>

        <aside className="side">
          {tab === 'setup' && (
            <SetupPanel
              state={state}
              setConfig={game.setConfig}
              setStart={game.setStart}
              randomStarts={game.randomStarts}
              begin={begin}
              setupTarget={setupTarget}
              setSetupTarget={setSetupTarget}
            />
          )}
          {tab === 'play' && (
            <PlayPanel
              state={state}
              selTransport={selTransport}
              setSelTransport={setSelTransport}
              toggleDoubleMove={game.toggleDoubleMove}
              undo={game.undo}
              goReplay={() => goTo('replay')}
            />
          )}
          {tab === 'replay' && (
            <ReplayPanel
              state={state}
              step={replayStep}
              setStep={setReplayStep}
              playing={replayPlaying}
              togglePlay={() => setReplayPlaying((p) => !p)}
            />
          )}
        </aside>
      </main>

      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
      {game.flash && <div className="flash">{game.flash}</div>}
    </div>
  );
}
