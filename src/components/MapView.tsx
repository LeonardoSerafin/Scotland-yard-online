import { useCallback, useMemo, useRef, useState } from 'react';
import type { GameState, Move, Player } from '../types';
import { STATIONS, STATION_BY_ID } from '../data/stations';
import { EDGES } from '../data/connections';
import { positionsAtStep } from '../game/engine';
import { MAP } from '../config/map';

export type MapMode = 'setup' | 'play' | 'replay';
export type MapViewKind = 'schematic' | 'real';

interface Props {
  state: GameState;
  mode: MapMode;
  view: MapViewKind;
  validSet: Set<number> | null;
  replayStep: number;
  onNodeClick: (id: number) => void;
}

const EDGE_COLOR: Record<string, string> = {
  taxi: '#f2c200',
  bus: '#19a974',
  underground: '#e53935',
  water: '#3b6bdb',
};
const EDGE_ORDER = ['water', 'taxi', 'bus', 'underground'];

export function MapView({ state, mode, view, validSet, replayStep, onNodeClick }: Props) {
  const { width, height } = MAP.viewBox;
  const [vb, setVb] = useState({ x: 0, y: 0, w: width, h: height });
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  // ---- pan/zoom: il pan parte SOLO dallo sfondo, mai dai nodi ----
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as Element;
      if (target.closest('[data-node]')) return; // click su nodo: non fare pan
      drag.current = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y };
      (e.currentTarget as Element).setAttribute('data-grab', '1');
    },
    [vb],
  );
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    setVb((p) => ({
      ...p,
      x: drag.current!.vx - (e.clientX - drag.current!.x) * (p.w / r.width),
      y: drag.current!.vy - (e.clientY - drag.current!.y) * (p.h / r.height),
    }));
  }, []);
  const endDrag = useCallback((e: React.PointerEvent) => {
    drag.current = null;
    (e.currentTarget as Element).removeAttribute('data-grab');
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    setVb((p) => {
      const cx = p.x + ((e.clientX - r.left) / r.width) * p.w;
      const cy = p.y + ((e.clientY - r.top) / r.height) * p.h;
      const f = e.deltaY > 0 ? 1.12 : 0.89;
      const nw = Math.min(width * 2.4, Math.max(width * 0.18, p.w * f));
      const nh = nw * (p.h / p.w);
      return { x: cx - (cx - p.x) * (nw / p.w), y: cy - (cy - p.y) * (nh / p.h), w: nw, h: nh };
    });
  }, [width]);

  const zoom = (f: number) =>
    setVb((p) => {
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const nw = Math.min(width * 2.4, Math.max(width * 0.18, p.w * f));
      const nh = nw * (p.h / p.w);
      return { x: cx - (cx - p.x) * (nw / p.w), y: cy - (cy - p.y) * (nh / p.h), w: nw, h: nh };
    });
  const fit = () => setVb({ x: 0, y: 0, w: width, h: height });

  // ---- token (posizioni dei giocatori) ----
  const tokens = useMemo(() => {
    const byNode: Record<number, Player[]> = {};
    if (mode === 'replay') {
      const pos = positionsAtStep(state, replayStep);
      state.players.forEach((p) => {
        const n = pos[p.id];
        if (n != null) (byNode[n] ??= []).push(p);
      });
    } else {
      state.players.forEach((p) => {
        if (p.pos != null) (byNode[p.pos] ??= []).push(p);
      });
    }
    return byNode;
  }, [state, mode, replayStep]);

  // ---- segmenti di percorso ----
  const segs: { move: Move; highlight: boolean }[] = useMemo(() => {
    if (mode === 'replay') {
      return state.history.slice(0, replayStep).map((m, i) => ({ move: m, highlight: i === replayStep - 1 }));
    }
    if (state.history.length) {
      return [{ move: state.history[state.history.length - 1], highlight: true }];
    }
    return [];
  }, [state.history, mode, replayStep]);

  const cal = MAP.calibration;
  const overlayTransform =
    view === 'real' ? `translate(${cal.offsetX} ${cal.offsetY}) scale(${cal.scale})` : undefined;

  return (
    <div className="mapwrap">
      <svg
        ref={svgRef}
        className="map-svg"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onWheel={onWheel}
      >
        <rect data-bg x={-4000} y={-4000} width={12000} height={12000} fill="#0a0d16" />

        {view === 'real' && (
          <image href={MAP.boardImage} x={0} y={0} width={width} height={height} preserveAspectRatio="xMidYMid meet" />
        )}

        <g transform={overlayTransform}>
          {view === 'schematic' &&
            EDGE_ORDER.map((type) =>
              EDGES.filter((e) => e[2] === type).map(([a, b], i) => {
                const A = STATION_BY_ID[a];
                const B = STATION_BY_ID[b];
                return (
                  <line
                    key={`${type}-${i}`}
                    x1={A.x}
                    y1={A.y}
                    x2={B.x}
                    y2={B.y}
                    stroke={EDGE_COLOR[type]}
                    strokeWidth={type === 'water' || type === 'underground' ? 3 : 2.2}
                    strokeDasharray={type === 'water' ? '7 5' : undefined}
                    opacity={0.55}
                  />
                );
              }),
            )}

          {/* segmenti percorso */}
          {segs.map(({ move, highlight }, i) => {
            if (move.from == null) return null;
            const A = STATION_BY_ID[move.from];
            const B = STATION_BY_ID[move.to];
            const p = state.players.find((pl) => pl.id === move.playerId);
            const col = p?.isMrX ? '#ff3b6b' : p?.color ?? '#fff';
            return (
              <line
                key={`seg-${i}`}
                x1={A.x}
                y1={A.y}
                x2={B.x}
                y2={B.y}
                stroke={col}
                strokeWidth={highlight ? 8 : 5}
                strokeLinecap="round"
                strokeDasharray={move.transport === 'black' ? '2 11' : undefined}
                opacity={highlight ? 0.98 : 0.4}
              />
            );
          })}

          {/* nodi */}
          {STATIONS.map((s) => {
            const multi = s.t.length > 1;
            const isValid = validSet?.has(s.id) ?? false;
            const clickable = mode === 'setup' || isValid;
            const dimmed = mode !== 'setup' && validSet != null && !isValid;
            const fill = s.t.includes('underground')
              ? '#ffd9d9'
              : s.t.includes('bus')
                ? '#d9ffe9'
                : view === 'real'
                  ? '#ffffff'
                  : '#cfd6ea';
            return (
              <g
                key={s.id}
                data-node={s.id}
                onClick={() => clickable && onNodeClick(s.id)}
                style={{
                  cursor: clickable ? 'pointer' : 'default',
                  pointerEvents: clickable ? 'auto' : 'none',
                  opacity: dimmed ? (view === 'real' ? 0.45 : 0.3) : 1,
                }}
              >
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={multi ? 15 : 13}
                  fill={fill}
                  stroke={isValid ? '#27c281' : '#0a0d16'}
                  strokeWidth={isValid ? 4 : 1.5}
                  style={isValid ? { filter: 'drop-shadow(0 0 6px #27c281)' } : undefined}
                />
                <text
                  x={s.x}
                  y={s.y}
                  fontSize={11}
                  fontWeight={700}
                  fill="#10131c"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {s.id}
                </text>
              </g>
            );
          })}

          {/* token giocatori */}
          {Object.entries(tokens).flatMap(([node, arr]) => {
            const s = STATION_BY_ID[Number(node)];
            if (!s) return [];
            return arr.map((p, i) => {
              const off = arr.length > 1 ? (i - (arr.length - 1) / 2) * 16 : 0;
              return (
                <g key={`tk-${p.id}`} style={{ pointerEvents: 'none' }}>
                  <circle
                    cx={s.x + off}
                    cy={s.y}
                    r={p.isMrX ? 17 : 14}
                    fill={p.isMrX ? '#111827' : p.color}
                    stroke={p.isMrX ? '#ff3b6b' : '#fff'}
                    strokeWidth={p.isMrX ? 3 : 2.5}
                  />
                  <text
                    x={s.x + off}
                    y={s.y}
                    fontSize={13}
                    fontWeight={800}
                    fill="#fff"
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ paintOrder: 'stroke', stroke: '#000', strokeWidth: 0.6 }}
                  >
                    {p.isMrX ? 'X' : p.id.replace('D', '')}
                  </text>
                </g>
              );
            });
          })}
        </g>
      </svg>

      <div className="zoombtns">
        <button onClick={() => zoom(0.82)} aria-label="Zoom +">+</button>
        <button onClick={() => zoom(1.22)} aria-label="Zoom -">−</button>
        <button onClick={fit} aria-label="Adatta" style={{ fontSize: 13 }}>⤢</button>
      </div>

      <div className="legend">
        <span><i style={{ background: '#f2c200' }} />Taxi</span>
        <span><i style={{ background: '#19a974' }} />Bus</span>
        <span><i style={{ background: '#e53935' }} />Metro</span>
        <span><i style={{ background: '#3b6bdb' }} />Battello</span>
      </div>
    </div>
  );
}
