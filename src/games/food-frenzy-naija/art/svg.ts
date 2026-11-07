/** Helpers for building SVG artwork as strings (turned into cached data URIs for <img> tags). */

export function svgDoc(body: string, defs = '', viewBox = '0 0 100 100'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><defs>${defs}</defs>${body}</svg>`;
}

const urlCache = new Map<string, string>();
export function svgUrl(svg: string): string {
  let url = urlCache.get(svg);
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    urlCache.set(svg, url);
  }
  return url;
}

/** Deterministic pseudo-random numbers for texture placement. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const f1 = (n: number) => n.toFixed(1);

export const radial = (id: string, stops: [number, string][], cx = '38%', cy = '32%', r = '72%') =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join('')}</radialGradient>`;

export const linear = (id: string, stops: [number, string][], x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join('')}</linearGradient>`;

export const shadow = (cx = 50, cy = 89, rx = 30, ry = 5.5, o = 0.22) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#2a1005" opacity="${o}"/>`;

/** A closed bumpy blob around (cx, cy): used for akara, oil spills and other organic shapes. */
export function blobPath(cx: number, cy: number, rx: number, ry: number, bumps: number, amp: number, seed: number): string {
  const rnd = seeded(seed);
  const pts: [number, number][] = [];
  const n = bumps * 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (i % 2 === 0 ? amp * (0.6 + rnd() * 0.8) : -amp * (0.2 + rnd() * 0.5));
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  // smooth closed curve through points (Catmull-Rom to Bezier)
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${f1(c1x)} ${f1(c1y)} ${f1(c2x)} ${f1(c2y)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d + 'Z';
}

/** Scatter small rotated ellipses (rice grains, spice, sugar) inside a test region. */
export function scatter(
  count: number,
  seed: number,
  inside: (x: number, y: number) => boolean,
  box: [number, number, number, number],
  draw: (x: number, y: number, rot: number, r: () => number) => string,
): string {
  const rnd = seeded(seed);
  let out = '';
  let placed = 0;
  let tries = 0;
  while (placed < count && tries < count * 40) {
    tries++;
    const x = box[0] + rnd() * (box[2] - box[0]);
    const y = box[1] + rnd() * (box[3] - box[1]);
    if (!inside(x, y)) continue;
    out += draw(x, y, Math.floor(rnd() * 180), rnd);
    placed++;
  }
  return out;
}
