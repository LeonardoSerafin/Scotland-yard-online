import { useMemo, useRef, useState } from 'react';
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
  imageOpacity: number;
  onNodeClick: (id: number) => void;
}

interface VB { x: number; y: number; w: number; h: number }

const EDGE_COLOR: Record<string, string> = {
  taxi: '#f2c200',
  bus: '#19a974',
  underground: '#e53935',
  water: '#3b6bdb',
};
const EDGE_ORDER = ['water', 'taxi', 'bus', 'underground'];

const W = MAP.viewBox.width;
const H = MAP.viewBox.height;
const ASPECT = H / W;
const MIN_W = W * 0.16; // zoom massimo
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Mantiene il viewBox sempre dentro la mappa: niente "esplosioni". */
function normVB(x: number, y: number, w: number): VB {
  w = clamp(w, MIN_W, W);
  const h = w * ASPECT;
  return { x: clamp(x, 0, W - w), y: clamp(y, 0, H - h), w, h };
}

export function MapView({ state, mode, view, validSet, replayStep, imageOpacity, onNodeClick }: Props) {
  const [vb, setVbState] = useState<VB>(() => normVB(0, 0, W));
  const svgRef = useRef<SVGSVGElement>(null);
  const setVb = (v: VB) => setVbState(v);

  // gesture (pointer multipli per pinch)
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pan = useRef<{ cx: number; cy: number; vb: VB } | null>(null);
  const pinch = useRef<{ dist: number; vb: VB; mx: number; my: number } | null>(null);

  const rectOf = () => svgRef.current!.getBoundingClientRect();
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const onNode = (e.target as Element).closest('[data-node]');
    if (pointers.current.size >= 2) {
      const [p1, p2] = [...pointers.current.values()];
      pinch.current = { dist: dist(p1, p2) || 1, vb: { ...vb }, mx: (p1.x + p2.x) / 2, my: (p1.y + p2.y) / 2 };
      pan.current = null;
    } else if (!onNode) {
      pan.current = { cx: e.clientX, cy: e.clientY, vb: { ...vb } };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = rectOf();
    if (pinch.current && pointers.current.size >= 2) {
      const [p1, p2] = [...pointers.current.values()];
      const d = dist(p1, p2) || 1;
      const s = pinch.current;
      const w = s.vb.w * (s.dist / d);
      const fx = (s.mx - r.left) / r.width;
      const fy = (s.my - r.top) / r.height;
      const sx = s.vb.x + fx * s.vb.w;
      const sy = s.vb.y + fy * s.vb.h;
      setVb(normVB(sx - fx * w, sy - fy * (w * ASPECT), w));
    } else if (pan.current) {
      const s = pan.current;
      setVb(normVB(
        s.vb.x - (e.clientX - s.cx) * (s.vb.w / r.width),
        s.vb.y - (e.clientY - s.cy) * (s.vb.h / r.height),
        s.vb.w,
      ));
    }
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      pan.current = { cx: p.x, cy: p.y, vb: { ...vb } };
    } else if (pointers.current.size === 0) {
      pan.current = null;
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    const r = rectOf();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    const sx = vb.x + fx * vb.w;
    const sy = vb.y + fy * vb.h;
    const w = vb.w * (e.deltaY > 0 ? 1.15 : 0.87);
    setVb(normVB(sx - fx * w, sy - fy * (w * ASPECT), w));
  };

  const zoomBy = (f: number) => {
    const cx = vb.x + vb.w / 2;
    const cy = vb.y + vb.h / 2;
    const w = vb.w * f;
    setVb(normVB(cx - w / 2, cy - (w * ASPECT) / 2, w));
  };
  const fit = () => setVb(normVB(0, 0, W));

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

  const segs: { move: Move; highlight: boolean }[] = useMemo(() => {
    if (mode === 'replay') {
      return state.history.slice(0, replayStep).map((m, i) => ({ move: m, highlight: i === replayStep - 1 }));
    }
    if (state.history.length) return [{ move: state.history[state.history.length - 1], highlight: true }];
    return [];
  }, [state.history, mode, replayStep]);

  const cal = MAP.calibration;
  const overlayTransform =
    view === 'real'
      ? `translate(${cal.offsetX} ${cal.offsetY}) scale(${cal.scaleX} ${cal.scaleY})`
      : undefined;

  return (
    <div className="mapwrap">
      <svg
        ref={svgRef}
        className="map-svg"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
        onWheel={onWheel}
      >
        <rect data-bg x={-4000} y={-4000} width={12000} height={12000} fill="#0a0d16" />

        {view === 'real' && (
          <image
            href={MAP.boardImage}
            x={0}
            y={0}
            width={W}
            height={H}
            opacity={imageOpacity}
            preserveAspectRatio="xMidYMid meet"
          />
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
                  opacity: dimmed ? (view === 'real' ? 0.5 : 0.3) : 1,
                }}
              >
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={isValid ? (multi ? 17 : 15) : multi ? 15 : 13}
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
        <button onClick={() => zoomBy(0.8)} aria-label="Zoom +">+</button>
        <button onClick={() => zoomBy(1.25)} aria-label="Zoom -">−</button>
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
