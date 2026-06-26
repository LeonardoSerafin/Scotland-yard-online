import { useMemo, useRef, useState } from 'react';
import type { GameState, Move, Player } from '../types';
import { STATIONS, STATION_BY_ID } from '../data/stations';
import { EDGES } from '../data/connections';
import { positionsAtStep } from '../game/engine';
import { TRANSPORT_INFO } from '../game/rules';
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

const TCOL: Record<string, string> = {
  taxi: TRANSPORT_INFO.taxi.color,
  bus: TRANSPORT_INFO.bus.color,
  underground: TRANSPORT_INFO.underground.color,
};
const EDGE_COLOR: Record<string, string> = { ...TCOL, water: TRANSPORT_INFO.water.color };
const EDGE_ORDER = ['water', 'taxi', 'bus', 'underground'];
const RING_ORDER = ['taxi', 'bus', 'underground'] as const;
const BODY_FILL = '#202a40';
const BODY_STROKE = 'rgba(255,255,255,0.30)';

const W = MAP.viewBox.width;
const H = MAP.viewBox.height;
const ASPECT = H / W;
const MIN_W = W * 0.16;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function normVB(x: number, y: number, w: number): VB {
  w = clamp(w, MIN_W, W);
  const h = w * ASPECT;
  return { x: clamp(x, 0, W - w), y: clamp(y, 0, H - h), w, h };
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

export function MapView({ state, mode, view, validSet, replayStep, imageOpacity, onNodeClick }: Props) {
  const [vb, setVb] = useState<VB>(() => normVB(0, 0, W));
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pan = useRef<{ cx: number; cy: number; vb: VB } | null>(null);
  const pinch = useRef<{ dist: number; vb: VB; mx: number; my: number } | null>(null);

  const rectOf = () => svgRef.current!.getBoundingClientRect();
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

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
      setVb(normVB(s.vb.x + fx * s.vb.w - fx * w, s.vb.y + fy * s.vb.h - fy * (w * ASPECT), w));
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
    const w = vb.w * (e.deltaY > 0 ? 1.15 : 0.87);
    setVb(normVB(vb.x + fx * vb.w - fx * w, vb.y + fy * vb.h - fy * (w * ASPECT), w));
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
    view === 'real' ? `translate(${cal.offsetX} ${cal.offsetY}) scale(${cal.scaleX} ${cal.scaleY})` : undefined;

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
          <image href={MAP.boardImage} x={0} y={0} width={W} height={H} opacity={imageOpacity} preserveAspectRatio="xMidYMid meet" />
        )}

        <g transform={overlayTransform}>
          {view === 'schematic' &&
            EDGE_ORDER.map((type) =>
              EDGES.filter((e) => e[2] === type).map(([a, b], i) => {
                const A = STATION_BY_ID[a];
                const B = STATION_BY_ID[b];
                return (
                  <line key={`${type}-${i}`} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                    stroke={EDGE_COLOR[type]} strokeWidth={type === 'water' || type === 'underground' ? 3 : 2.4}
                    strokeDasharray={type === 'water' ? '7 5' : undefined} opacity={type === 'taxi' ? 0.4 : 0.55} />
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
              <line key={`seg-${i}`} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={col}
                strokeWidth={highlight ? 8 : 5} strokeLinecap="round"
                strokeDasharray={move.transport === 'black' ? '2 11' : undefined} opacity={highlight ? 0.98 : 0.4} />
            );
          })}

          {STATIONS.map((s) => {
            const types = RING_ORDER.filter((t) => s.t.includes(t));
            const isValid = validSet?.has(s.id) ?? false;
            const clickable = mode === 'setup' || isValid;
            const dimmed = mode !== 'setup' && validSet != null && !isValid;
            const players = tokens[s.id] ?? [];
            const solo = players.length === 1 ? players[0] : null;
            const rBody = 13, rRing = 17, ringW = 5.5, gap = 9;
            const bodyFill = solo ? (solo.isMrX ? '#111827' : solo.color) : BODY_FILL;
            const bodyStroke = solo ? (solo.isMrX ? '#ff3b6b' : '#0a0d16') : BODY_STROKE;
            const label = solo ? (solo.isMrX ? 'X' : solo.id.replace('D', '')) : String(s.id);
            const fontSize = solo ? 14 : s.id >= 100 ? 10 : 12;
            return (
              <g
                key={s.id}
                data-node={s.id}
                onClick={() => clickable && onNodeClick(s.id)}
                style={{ cursor: clickable ? 'pointer' : 'default', pointerEvents: clickable ? 'auto' : 'none', opacity: dimmed ? 0.35 : 1 }}
              >
                {isValid && (
                  <circle cx={s.x} cy={s.y} r={rRing + 5} fill="none" stroke="#27c281" strokeWidth={3.5}
                    style={{ filter: 'drop-shadow(0 0 7px #27c281)' }} />
                )}
                {/* corpo scuro (numero bianco oppure segnalino giocatore) */}
                <circle cx={s.x} cy={s.y} r={rBody} fill={bodyFill} stroke={bodyStroke} strokeWidth={solo?.isMrX ? 2.5 : 1.2} />
                {/* anello mezzi disponibili */}
                {types.length === 1 ? (
                  <circle cx={s.x} cy={s.y} r={rRing} fill="none" stroke={TCOL[types[0]]} strokeWidth={ringW} />
                ) : (
                  types.map((t, i) => (
                    <path key={t} d={arcPath(s.x, s.y, rRing, (i * 360) / types.length + gap / 2, ((i + 1) * 360) / types.length - gap / 2)}
                      fill="none" stroke={TCOL[t]} strokeWidth={ringW} strokeLinecap="round" />
                  ))
                )}
                <text x={s.x} y={s.y} fontSize={fontSize} fontWeight={800} fill="#ffffff"
                  textAnchor="middle" dominantBaseline="central"
                  style={{ paintOrder: 'stroke', stroke: '#0a0d16', strokeWidth: solo ? 0.6 : 0.4 }}>
                  {label}
                </text>
                {players.length > 1 && players.map((p, i) => {
                  const off = (i - (players.length - 1) / 2) * 15;
                  return (
                    <g key={p.id}>
                      <circle cx={s.x + off} cy={s.y} r={10} fill={p.isMrX ? '#111827' : p.color}
                        stroke={p.isMrX ? '#ff3b6b' : '#fff'} strokeWidth={2} />
                      <text x={s.x + off} y={s.y} fontSize={11} fontWeight={800} fill="#fff"
                        textAnchor="middle" dominantBaseline="central">
                        {p.isMrX ? 'X' : p.id.replace('D', '')}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="zoombtns">
        <button onClick={() => zoomBy(0.8)} aria-label="Zoom +">+</button>
        <button onClick={() => zoomBy(1.25)} aria-label="Zoom -">−</button>
        <button onClick={fit} aria-label="Adatta" style={{ fontSize: 13 }}>⤢</button>
      </div>

      <div className="legend">
        <div className="legend-title">Anello stazione = mezzi</div>
        <span><i className="ring" style={{ background: TCOL.taxi }} />Taxi</span>
        <span><i className="ring" style={{ background: TCOL.bus }} />Bus</span>
        <span><i className="ring" style={{ background: TCOL.underground }} />Metro</span>
      </div>
    </div>
  );
}
