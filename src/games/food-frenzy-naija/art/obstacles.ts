/** Original obstacle and booster artwork. */
import type { BoosterId } from '../engine/game';
import { blobPath, f1, linear, radial, shadow, svgDoc, svgUrl } from './svg';

const OL = '#3d1705';

function basket(): string {
  const defs =
    linear('bk', [
      [0, '#f0c27a'],
      [1, '#a86c2c'],
    ]) +
    radial('tom', [
      [0, '#ff8a6a'],
      [0.5, '#e8301c'],
      [1, '#9a140a'],
    ]);
  const tomato = (x: number, y: number, r: number) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#tom)" stroke="${OL}" stroke-width="2"/>
<path d="M${x - 4} ${y - r + 2} L${x} ${y - r - 1} L${x + 4} ${y - r + 2} M${x} ${y - r - 1} L${x} ${y - r + 3}" stroke="#2e8a2a" stroke-width="2.4" stroke-linecap="round" fill="none"/>
<ellipse cx="${x - r * 0.35}" cy="${y - r * 0.35}" rx="${f1(r * 0.3)}" ry="${f1(r * 0.18)}" fill="#fff" opacity=".55"/>`;
  const pepper = (x: number, y: number) =>
    `<path d="M${x} ${y} C${x + 9} ${y - 3} ${x + 13} ${y + 6} ${x + 8} ${y + 11} C${x + 3} ${y + 14} ${x - 4} ${y + 9} ${x} ${y} Z" fill="#ff9a1a" stroke="${OL}" stroke-width="1.8"/>
<path d="M${x + 1} ${y} L${x - 2} ${y - 5}" stroke="#2e8a2a" stroke-width="2.4" stroke-linecap="round"/>`;
  let weave = '';
  for (let y = 56; y < 88; y += 8) weave += `<path d="M14 ${y} H86" stroke="#7d4a18" stroke-width="1.5" opacity=".6"/>`;
  for (let row = 0; row < 4; row++) {
    for (let x = 18 + (row % 2) * 6; x < 84; x += 12) {
      const y = 52 + row * 8;
      weave += `<path d="M${x} ${y + 1} Q${x + 3} ${y + 4} ${x} ${y + 7}" stroke="#ffe0a8" stroke-width="2" fill="none" opacity=".7"/>`;
    }
  }
  const body = `${shadow(50, 92, 36, 4.5, 0.3)}
${tomato(30, 40, 12)}${tomato(66, 38, 12)}${pepper(42, 26)}${tomato(48, 42, 13)}
<path d="M10 48 H90 L82 88 C81 91 79 92 76 92 H24 C21 92 19 91 18 88 Z" fill="url(#bk)" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/>
${weave}
<rect x="7" y="43" width="86" height="11" rx="5.5" fill="#c98c42" stroke="${OL}" stroke-width="2.6"/>
<path d="M12 48.5 Q16 45 20 48.5 T28 48.5 T36 48.5 T44 48.5 T52 48.5 T60 48.5 T68 48.5 T76 48.5 T84 48.5 T90 48.5" stroke="#ffd79a" stroke-width="1.8" fill="none"/>`;
  return svgDoc(body, defs);
}

function crate(hp: number): string {
  const defs =
    linear('wd', [
      [0, '#d99a58'],
      [1, '#a8672f'],
    ]) +
    radial('pep', [
      [0, '#ff7a5a'],
      [0.6, '#e2261a'],
      [1, '#94120a'],
    ]);
  const planks = [10, 37, 64]
    .map(
      (y, i) => `<rect x="8" y="${y}" width="84" height="26" rx="3" fill="url(#wd)" stroke="${OL}" stroke-width="2"/>
<path d="M14 ${y + 8} Q40 ${y + 5 + i} 86 ${y + 9}" stroke="#8a5222" stroke-width="1.2" fill="none" opacity=".55"/>
<path d="M18 ${y + 17} Q50 ${y + 20} 82 ${y + 16}" stroke="#8a5222" stroke-width="1.1" fill="none" opacity=".45"/>`,
    )
    .join('');
  const nails = [
    [14, 15],
    [86, 15],
    [14, 85],
    [86, 85],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#5a3a1e" stroke="#2a1608" stroke-width="1"/>`)
    .join('');
  const peppers = (cx: number, cy: number, s: number) =>
    `<g transform="translate(${cx} ${cy}) scale(${s})">
<path d="M-8 -2 C-8 -12 8 -12 8 -2 C8 8 2 12 0 12 C-2 12 -8 8 -8 -2 Z" fill="url(#pep)" stroke="${OL}" stroke-width="2"/>
<path d="M0 -10 L0 -16 M-4 -11 L4 -11" stroke="#2e8a2a" stroke-width="3" stroke-linecap="round"/>
<ellipse cx="-3" cy="-5" rx="2.4" ry="1.6" fill="#fff" opacity=".6"/></g>`;
  let extra = '';
  if (hp >= 3) {
    extra = [24, 76]
      .map(
        (x) => `<rect x="${x - 5}" y="6" width="10" height="88" rx="2" fill="#9aa3ad" stroke="#3a4049" stroke-width="2"/>
<rect x="${x - 2}" y="8" width="3" height="84" fill="#d8dee5" opacity=".7"/>
${[16, 50, 84].map((y) => `<circle cx="${x}" cy="${y}" r="2" fill="#5a636e"/>`).join('')}`,
      )
      .join('');
  }
  let crack = '';
  if (hp === 1) {
    crack = `<path d="M18 40 H82 V61 H18 Z" fill="#3a1606"/>
${peppers(36, 52, 0.75)}${peppers(56, 50, 0.85)}${peppers(72, 54, 0.7)}
<path d="M18 40 L28 46 L36 40 L46 47 L56 40 L64 46 L74 40 L82 45" stroke="${OL}" stroke-width="2" fill="#c08040"/>
<path d="M30 12 L38 24 L34 32 M66 70 L58 80 L62 88" stroke="${OL}" stroke-width="1.8" fill="none"/>`;
  }
  const center = hp === 1 ? '' : peppers(50, 50, 1.05);
  const body = `${shadow(50, 95, 40, 4, 0.3)}
<rect x="5" y="6" width="90" height="88" rx="6" fill="#7a4a1e" stroke="${OL}" stroke-width="2.6"/>
${planks}${crack}${center}${extra}${nails}`;
  return svgDoc(body, defs);
}

function wrap(layers: number): string {
  // Narrow leaf strips tied with twine: the food stays visible between them so players can plan matches.
  const strip = (rot: number, color: string, w: number) =>
    `<g transform="rotate(${rot} 50 50)">
<path d="M-6 50 C20 ${50 - w} 80 ${50 - w} 106 50 C80 ${50 + w} 20 ${50 + w} -6 50 Z" fill="${color}" stroke="#1b5a20" stroke-width="2.2" opacity=".86"/>
<path d="M0 50 H100" stroke="#c6f5ad" stroke-width="1.5" opacity=".85"/>
${[20, 38, 56, 74].map((x) => `<path d="M${x} 50 L${x + 6} ${50 - w * 0.6} M${x} 50 L${x + 6} ${50 + w * 0.6}" stroke="#c6f5ad" stroke-width="1.1" opacity=".6"/>`).join('')}
</g>`;
  const knot = `<circle cx="50" cy="50" r="7" fill="#d9b06a" stroke="${OL}" stroke-width="2"/>
<path d="M45 46 L55 54 M55 46 L45 54" stroke="#8a5f22" stroke-width="1.6"/>
<path d="M50 56 C46 66 42 70 38 74 M50 56 C54 66 58 70 62 74" stroke="${OL}" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M50 56 C46 66 42 70 38 74 M50 56 C54 66 58 70 62 74" stroke="#d9b06a" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  const body =
    layers >= 2
      ? `${strip(-45, '#2f9a3a', 11)}${strip(45, '#3aac44', 11)}${strip(0, '#4bbd4f', 8)}${knot}`
      : `${strip(-45, '#3aac44', 8.5)}${strip(45, '#4bbd4f', 8.5)}${knot}`;
  return svgDoc(body);
}

function oil(layers: number): string {
  const defs =
    layers >= 2
      ? radial('oil', [
          [0, '#e8582a'],
          [0.6, '#b2300e'],
          [1, '#6e1604'],
        ], '45%', '40%', '65%')
      : radial('oil', [
          [0, '#ffa04a'],
          [0.6, '#e2541c'],
          [1, '#b4320e'],
        ], '45%', '40%', '65%');
  const body = `<path d="${blobPath(50, 52, 40, 36, 7, 0.12, layers * 7)}" fill="url(#oil)" opacity="${layers >= 2 ? 0.92 : 0.78}"/>
${layers >= 2 ? `<path d="${blobPath(50, 52, 28, 24, 6, 0.14, 99)}" fill="#7a1a06" opacity=".45"/>` : ''}
<ellipse cx="36" cy="34" rx="10" ry="4.5" fill="#fff" opacity=".4" transform="rotate(-25 36 34)"/>
<circle cx="66" cy="68" r="3" fill="#fff" opacity=".35"/>`;
  return svgDoc(body, defs);
}

export const OBSTACLE_ART = {
  basket: svgUrl(basket()),
  crate: [svgUrl(crate(1)), svgUrl(crate(1)), svgUrl(crate(2)), svgUrl(crate(3))],
  wrap: [svgUrl(wrap(1)), svgUrl(wrap(1)), svgUrl(wrap(2))],
  oil: [svgUrl(oil(1)), svgUrl(oil(1)), svgUrl(oil(2))],
};

export function crateArt(hp: number): string {
  return OBSTACLE_ART.crate[Math.max(1, Math.min(3, hp))];
}
export function wrapArt(layers: number): string {
  return OBSTACLE_ART.wrap[Math.max(1, Math.min(2, layers))];
}
export function oilArt(layers: number): string {
  return OBSTACLE_ART.oil[Math.max(1, Math.min(2, layers))];
}

/* ───────────── boosters ───────────── */

function ladle(): string {
  const defs = linear('wood', [
    [0, '#f0c27a'],
    [1, '#a8672c'],
  ]);
  const body = `${shadow(50, 90, 26, 4.5)}
<g transform="rotate(38 50 50)">
<rect x="45" y="2" width="10" height="56" rx="5" fill="url(#wood)" stroke="${OL}" stroke-width="2.6"/>
<path d="M47 8 V50" stroke="#ffe2b0" stroke-width="2" opacity=".7" stroke-linecap="round"/>
<ellipse cx="50" cy="72" rx="20" ry="18" fill="url(#wood)" stroke="${OL}" stroke-width="2.6"/>
<ellipse cx="50" cy="70" rx="14" ry="12" fill="#b87632" stroke="#7a4a1e" stroke-width="1.6"/>
<ellipse cx="45" cy="66" rx="5" ry="3" fill="#fff" opacity=".35"/>
</g>`;
  return svgDoc(body, defs);
}

function pot(): string {
  const defs =
    linear('pot', [
      [0, '#4a70d8'],
      [1, '#1c2f78'],
    ]) +
    linear('lid', [
      [0, '#6a8ae6'],
      [1, '#2a3f90'],
    ]);
  const flower = (x: number, y: number) =>
    `${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="${x}" cy="${y - 4}" rx="2.4" ry="4" fill="#ffb02e" transform="rotate(${a} ${x} ${y})"/>`).join('')}<circle cx="${x}" cy="${y}" r="2.2" fill="#e2361a"/>`;
  const body = `${shadow(50, 92, 36, 5)}
<path d="M30 16 C26 10 34 6 32 0 M50 14 C46 8 54 4 52 -2 M70 16 C66 10 74 6 72 0" stroke="#ffffff" stroke-width="3" fill="none" opacity=".75" stroke-linecap="round"/>
<path d="M8 50 C2 50 2 60 10 60" stroke="${OL}" stroke-width="6" fill="none" stroke-linecap="round"/>
<path d="M92 50 C98 50 98 60 90 60" stroke="${OL}" stroke-width="6" fill="none" stroke-linecap="round"/>
<path d="M12 40 H88 V74 C88 84 78 90 66 90 H34 C22 90 12 84 12 74 Z" fill="url(#pot)" stroke="${OL}" stroke-width="2.6"/>
${flower(30, 66)}${flower(50, 70)}${flower(70, 66)}
<path d="M18 48 V76" stroke="#a9c0ff" stroke-width="3" opacity=".5" stroke-linecap="round"/>
<path d="M14 40 C14 34 22 28 50 28 C78 28 86 34 86 40 Z" fill="url(#lid)" stroke="${OL}" stroke-width="2.6"/>
<path d="M10 40 H90" stroke="${OL}" stroke-width="4" stroke-linecap="round"/>
<path d="M14 40 C14 37 28 33 50 33" stroke="#f05a24" stroke-width="3" fill="none"/>
<rect x="42" y="18" width="16" height="10" rx="5" fill="#2a3f90" stroke="${OL}" stroke-width="2.4"/>
<ellipse cx="34" cy="33" rx="9" ry="2.4" fill="#fff" opacity=".35"/>`;
  return svgDoc(body, defs);
}

function shuffle(): string {
  const defs = linear('cal', [
    [0, '#e3a75a'],
    [1, '#8a5020'],
  ]);
  const arrow = (rot: number, color: string) =>
    `<g transform="rotate(${rot} 50 50)">
<path d="M18 46 A32 32 0 0 1 74 26" stroke="${OL}" stroke-width="10" fill="none" stroke-linecap="round"/>
<path d="M18 46 A32 32 0 0 1 74 26" stroke="${color}" stroke-width="6" fill="none" stroke-linecap="round"/>
<path d="M66 12 L84 26 L64 36 Z" fill="${color}" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>
</g>`;
  const body = `${shadow(50, 90, 26, 4.5)}
<path d="M28 52 H72 C72 66 62 74 50 74 C38 74 28 66 28 52 Z" fill="url(#cal)" stroke="${OL}" stroke-width="2.4"/>
<path d="M32 58 Q50 64 68 58" stroke="#ffe0a8" stroke-width="1.6" fill="none"/>
${arrow(0, '#3fbf4a')}${arrow(180, '#ff8a1e')}`;
  return svgDoc(body, defs);
}

function extraMoves(): string {
  const defs = radial('mv', [
    [0, '#9df07a'],
    [0.6, '#38b23a'],
    [1, '#1d6e22'],
  ]);
  const body = `${shadow(50, 92, 30, 4.5)}
<circle cx="50" cy="50" r="40" fill="url(#mv)" stroke="${OL}" stroke-width="2.8"/>
<circle cx="50" cy="50" r="33" fill="none" stroke="#d8ffc0" stroke-width="2" opacity=".6" stroke-dasharray="6 5"/>
<path d="M22 50 H40 M31 41 V59" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
<path d="M68 31 H52 L50 48 C54 46 60 46 64 49 C70 54 68 66 60 68 C55 70 50 68 47 65" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<ellipse cx="36" cy="26" rx="12" ry="5" fill="#fff" opacity=".35" transform="rotate(-25 36 26)"/>`;
  return svgDoc(body, defs);
}

export const BOOSTER_ART: Record<BoosterId, string> = {
  ladle: svgUrl(ladle()),
  pot: svgUrl(pot()),
  shuffle: svgUrl(shuffle()),
  moves: svgUrl(extraMoves()),
};
