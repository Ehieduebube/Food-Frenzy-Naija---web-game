import { seeded } from '../../art/svg';
import { LEVELS, REGIONS } from '../../levels/levels';
import type { RegionConfig, RegionId } from '../../levels/types';

export const STEP = 106; // vertical px between levels
export const REGION_GAP = 170; // room between regions for the region sign
export const BOTTOM = 150; // start area under level 1
export const TOP_EXTRA = 230; // carnival gate above the last level
export const GATE_Y = 210; // bottom of the gate, where the road ends
export const ROAD_HALF = 34; // half the road width in px
export const TRACK_MAX = 560; // max width of the strip the road winds through (matches .ffn-map-track)

export interface NodePos {
  id: number;
  x: number; // percent of the track width
  y: number; // px from the top of the map
}

export interface Band {
  region: RegionConfig;
  top: number;
  height: number;
  /** y of the region sign */
  signY: number;
}

export interface MapLayout {
  total: number;
  nodes: NodePos[];
  bands: Band[];
  /** Road points from the start area (bottom) to the gate (top). */
  road: { x: number; y: number }[];
}

export function computeLayout(): MapLayout {
  const regionIndex = (id: number) => REGIONS.findIndex((r) => id >= r.firstLevel && id <= r.lastLevel);
  const fromBottom = LEVELS.map((l, i) => BOTTOM + i * STEP + regionIndex(l.id) * REGION_GAP);
  const total = fromBottom[fromBottom.length - 1] + STEP / 2 + REGION_GAP + TOP_EXTRA;
  const nodes: NodePos[] = LEVELS.map((l, i) => ({ id: l.id, x: 50 + 26 * Math.sin(i * 0.92), y: total - fromBottom[i] }));
  const bandTop = REGIONS.map((r, k) => {
    if (k === REGIONS.length - 1) return total;
    const lastIdx = LEVELS.findIndex((l) => l.id === r.lastLevel);
    return fromBottom[lastIdx] + STEP / 2 + REGION_GAP - 10;
  });
  const bands = REGIONS.map((region, k) => {
    const bottom = k === 0 ? 0 : bandTop[k - 1];
    const top = total - bandTop[k];
    return { region, top, height: bandTop[k] - bottom, signY: top + (k === REGIONS.length - 1 ? GATE_Y + 26 : 18) };
  });
  const road = [{ x: nodes[0].x, y: total + 20 }, ...nodes.map((n) => ({ x: n.x, y: n.y })), { x: 50, y: GATE_Y - 20 }];
  return { total, nodes, bands, road };
}

/** Road centre (percent of track width) at a given height, by linear interpolation between points. */
export function roadXAt(road: { x: number; y: number }[], y: number): number {
  for (let i = 0; i < road.length - 1; i++) {
    const a = road[i];
    const b = road[i + 1];
    const lo = Math.min(a.y, b.y);
    const hi = Math.max(a.y, b.y);
    if (y >= lo && y <= hi) {
      const t = hi === lo ? 0 : (y - a.y) / (b.y - a.y);
      return a.x + (b.x - a.x) * t;
    }
  }
  return 50;
}

/** Smooth path through points (Catmull-Rom converted to cubic Béziers). */
export function pathThrough(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    d += ` C${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6} ${p2.x} ${p2.y}`;
  }
  return d;
}

/* ───────────── ground ───────────── */

const GROUND: Record<RegionId, { base: [string, string]; dark: string; light: string; confetti?: boolean }> = {
  mainland: { base: ['#93d35b', '#7fc44a'], dark: '#5c9a32', light: '#c2ea86' },
  balogun: { base: ['#b5d25e', '#9dc64f'], dark: '#7f9a34', light: '#e0ef96' },
  lekki: { base: ['#9cd86c', '#86cb58'], dark: '#5f9e3c', light: '#c8f094' },
  carnival: { base: ['#86cd5e', '#6fbc4c'], dark: '#4f9a38', light: '#b6e884', confetti: true },
};

const patternCache = new Map<RegionId, string>();

/** Tileable grass texture: tufts, light patches and little flowers. */
function grassTile(region: RegionId): string {
  const cached = patternCache.get(region);
  if (cached) return cached;
  const g = GROUND[region];
  const rnd = seeded(region.length * 977 + 13);
  let body = '';
  for (let i = 0; i < 5; i++) {
    body += `<ellipse cx="${(rnd() * 220).toFixed(0)}" cy="${(rnd() * 220).toFixed(0)}" rx="${(18 + rnd() * 26).toFixed(0)}" ry="${(8 + rnd() * 12).toFixed(0)}" fill="${g.light}" opacity=".35"/>`;
  }
  for (let i = 0; i < 16; i++) {
    const x = rnd() * 210 + 5;
    const y = rnd() * 210 + 8;
    body += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} q1 -6 3 -9 M${(x + 3).toFixed(1)} ${y.toFixed(1)} q0 -7 1 -10 M${(x + 6).toFixed(1)} ${y.toFixed(1)} q-1 -6 -3 -9" stroke="${g.dark}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".7"/>`;
  }
  for (let i = 0; i < 5; i++) {
    const x = (rnd() * 210 + 5).toFixed(1);
    const y = (rnd() * 210 + 5).toFixed(1);
    body += `<circle cx="${x}" cy="${y}" r="2.6" fill="#fff"/><circle cx="${x}" cy="${y}" r="1.1" fill="#ffc93a"/>`;
  }
  if (g.confetti) {
    const colors = ['#e8341c', '#ffc93a', '#1f6fd8', '#c45fae'];
    for (let i = 0; i < 10; i++) {
      body += `<rect x="${(rnd() * 210).toFixed(0)}" y="${(rnd() * 210).toFixed(0)}" width="5" height="3" rx="1" fill="${colors[i % 4]}" transform="rotate(${(rnd() * 180).toFixed(0)})" opacity=".8"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">${body}</svg>`;
  const url = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
  patternCache.set(region, url);
  return url;
}

export function groundStyle(region: RegionId): { backgroundColor: string; backgroundImage: string } {
  const g = GROUND[region];
  return {
    backgroundColor: g.base[1],
    backgroundImage: `${grassTile(region)}, linear-gradient(180deg, ${g.base[0]}, ${g.base[1]})`,
  };
}
