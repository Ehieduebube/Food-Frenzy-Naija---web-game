/**
 * Original illustrated Nigerian food icons, drawn as SVG.
 * Each food has its own silhouette and colour family so pieces read instantly on small screens:
 *   Jollof   - orange-red rice dome in a blue-rimmed enamel bowl
 *   Dodo     - fanned, golden-yellow fried plantain slices
 *   Puff-puff- a pyramid of smooth golden dough balls with sugar
 *   Akara    - craggy, darker bean fritters
 *   Suya     - diagonal skewers of spiced dark meat with onion rings
 *   Moi moi  - steamed pudding in a green leaf wrap, topped with egg
 *   Chin-chin- crunchy golden cubes in a red polka-dot cup
 */
import type { Food } from '../engine/types';
import { blobPath, f1, linear, radial, scatter, shadow, svgDoc, svgUrl } from './svg';

const OL = '#4a1a06';
const SW = 2.4;

function jollof(): string {
  const defs =
    radial('rice', [
      [0, '#ffc07a'],
      [0.5, '#f26a2b'],
      [1, '#bf3b16'],
    ]) +
    linear('bowl', [
      [0, '#ffffff'],
      [1, '#d5dbea'],
    ]);
  const inDome = (x: number, y: number) => ((x - 50) / 33) ** 2 + ((y - 55) / 34) ** 2 < 1 && y < 53;
  const grainsLight = scatter(46, 11, inDome, [16, 20, 84, 54], (x, y, rot) =>
    `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="2.7" ry="1.15" transform="rotate(${rot} ${f1(x)} ${f1(y)})" fill="#ffd9a0" opacity=".9"/>`,
  );
  const grainsDark = scatter(30, 23, inDome, [16, 20, 84, 54], (x, y, rot) =>
    `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="2.5" ry="1" transform="rotate(${rot} ${f1(x)} ${f1(y)})" fill="#9e2a0c" opacity=".45"/>`,
  );
  const peas = [
    [36, 33],
    [59, 28],
    [67, 42],
    [44, 45],
    [27, 47],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.1" fill="#57b847" stroke="#1f5e17" stroke-width="1.1"/><circle cx="${x - 1}" cy="${y - 1}" r="1" fill="#c9f2a8"/>`)
    .join('');
  const carrots = [
    [50, 34, 20],
    [31, 39, -15],
    [62, 49, 35],
    [72, 34, 5],
  ]
    .map(([x, y, r]) => `<rect x="${x - 2.6}" y="${y - 2.6}" width="5.2" height="5.2" rx="1" fill="#ffa01e" stroke="#9a4a06" stroke-width="1" transform="rotate(${r} ${x} ${y})"/>`)
    .join('');
  const body = `${shadow(50, 89, 33, 5.5)}
<path d="M15 55 C15 32 32 18 50 18 C68 18 85 32 85 55 Z" fill="url(#rice)" stroke="${OL}" stroke-width="${SW}"/>
${grainsDark}${grainsLight}${peas}${carrots}
<ellipse cx="39" cy="29" rx="11" ry="5" fill="#fff" opacity=".22" transform="rotate(-20 39 29)"/>
<path d="M8 53 H92 C91 74 73 88 50 88 C27 88 9 74 8 53 Z" fill="url(#bowl)" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
<path d="M8.4 54 H91.6 C91.3 57.5 90.7 60.5 89.8 63 H10.2 C9.3 60.5 8.7 57.5 8.4 54 Z" fill="#2f62d4"/>
<path d="M17 70 Q50 81 83 70" stroke="#e5413a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<path d="M22 75.5 Q50 85 78 75.5" stroke="#2f62d4" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/>
<path d="M8 53 H92" stroke="${OL}" stroke-width="${SW}" stroke-linecap="round"/>
<path d="M17 66 Q21 77 33 83" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/>`;
  return svgDoc(body, defs);
}

function dodo(): string {
  const defs = radial(
    'pl',
    [
      [0, '#fff3a0'],
      [0.42, '#ffd23a'],
      [0.78, '#f2901a'],
      [1, '#b5520c'],
    ],
    '50%',
    '50%',
    '60%',
  );
  const slice = (cx: number, cy: number, rot: number, seed: number) => {
    const spots = scatter(
      5,
      seed,
      (x, y) => ((x - cx) / 18) ** 2 + ((y - cy) / 10) ** 2 < 1 && ((x - cx) / 12) ** 2 + ((y - cy) / 6) ** 2 > 1,
      [cx - 20, cy - 12, cx + 20, cy + 12],
      (x, y, r, rnd) =>
        `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(2.2 + rnd() * 2)}" ry="${f1(1.4 + rnd())}" transform="rotate(${r} ${f1(x)} ${f1(y)})" fill="#b9580c" opacity=".55"/>`,
    );
    const seeds = [-5, 0, 5]
      .map((dx, i) => `<ellipse cx="${cx + dx}" cy="${cy + (i - 1) * 0.6}" rx="1.3" ry=".8" fill="#a8641c" opacity=".7"/>`)
      .join('');
    return `<g transform="rotate(${rot} ${cx} ${cy})">
<ellipse cx="${cx}" cy="${cy + 2.5}" rx="21" ry="12.5" fill="#8a3a08"/>
<ellipse cx="${cx}" cy="${cy}" rx="21" ry="12.5" fill="url(#pl)" stroke="${OL}" stroke-width="${SW}"/>
${spots}
<ellipse cx="${cx}" cy="${cy}" rx="10.5" ry="5.5" fill="none" stroke="#ffeaa0" stroke-width="1.4" opacity=".75"/>
${seeds}
<ellipse cx="${cx - 7}" cy="${cy - 5}" rx="7" ry="2.4" fill="#fff" opacity=".45"/>
</g>`;
  };
  const body = `${shadow(50, 88, 31, 5)}
${slice(36, 36, -24, 3)}${slice(62, 47, -24, 5)}${slice(42, 66, -24, 7)}`;
  return svgDoc(body, defs);
}

function puffPuff(): string {
  const defs = radial(
    'pp',
    [
      [0, '#ffe9b0'],
      [0.35, '#f5b75c'],
      [0.8, '#c97626'],
      [1, '#8c4614'],
    ],
    '36%',
    '30%',
    '75%',
  );
  const ball = (cx: number, cy: number, seed: number) => {
    const sugar = scatter(
      11,
      seed,
      (x, y) => (x - cx) ** 2 + (y - cy) ** 2 < 15 ** 2 && y < cy + 4,
      [cx - 16, cy - 16, cx + 16, cy + 10],
      (x, y, _r, rnd) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(0.7 + rnd() * 0.8)}" fill="#fffdf5" opacity=".95"/>`,
    );
    const pores = scatter(
      5,
      seed + 50,
      (x, y) => (x - cx) ** 2 + (y - cy) ** 2 < 14 ** 2,
      [cx - 15, cy - 15, cx + 15, cy + 15],
      (x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="1.1" fill="#a65a1c" opacity=".35"/>`,
    );
    return `<circle cx="${cx}" cy="${cy}" r="19" fill="url(#pp)" stroke="${OL}" stroke-width="${SW}"/>
${pores}${sugar}
<ellipse cx="${cx - 6}" cy="${cy - 8}" rx="7" ry="4" fill="#fff" opacity=".45" transform="rotate(-25 ${cx - 6} ${cy - 8})"/>`;
  };
  const body = `${shadow(50, 88, 34, 5.5)}
${ball(31, 66, 1)}${ball(69, 66, 2)}
<ellipse cx="50" cy="56" rx="16" ry="6" fill="#5a2608" opacity=".25"/>
${ball(50, 39, 3)}`;
  return svgDoc(body, defs);
}

function akara(): string {
  const defs = radial(
    'ak',
    [
      [0, '#ffb35a'],
      [0.45, '#dc6c2a'],
      [0.85, '#a5401a'],
      [1, '#73260b'],
    ],
    '40%',
    '35%',
    '70%',
  );
  const fritter = (cx: number, cy: number, rx: number, ry: number, seed: number) => {
    const d = blobPath(cx, cy, rx, ry, 10, 0.1, seed);
    const inside = (x: number, y: number) => ((x - cx) / (rx - 4)) ** 2 + ((y - cy) / (ry - 4)) ** 2 < 1;
    const bumps = scatter(16, seed + 1, inside, [cx - rx, cy - ry, cx + rx, cy + ry], (x, y, _r, rnd) =>
      `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(1.4 + rnd() * 1.6)}" fill="#ffc27a" opacity=".55"/>`,
    );
    const holes = scatter(12, seed + 2, inside, [cx - rx, cy - ry, cx + rx, cy + ry], (x, y, _r, rnd) =>
      `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(0.9 + rnd())}" fill="#5e1e07" opacity=".55"/>`,
    );
    const pepper = scatter(4, seed + 3, inside, [cx - rx, cy - ry, cx + rx, cy + ry], (x, y, r) =>
      `<rect x="${f1(x)}" y="${f1(y)}" width="2.6" height="1.5" rx=".5" fill="#e8301c" transform="rotate(${r} ${f1(x)} ${f1(y)})"/>`,
    );
    return `<path d="${blobPath(cx, cy + 3, rx, ry, 10, 0.1, seed)}" fill="#5e1e07" opacity=".55"/>
<path d="${d}" fill="url(#ak)" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
${holes}${bumps}${pepper}
<ellipse cx="${cx - rx * 0.35}" cy="${cy - ry * 0.45}" rx="${f1(rx * 0.3)}" ry="${f1(ry * 0.16)}" fill="#fff" opacity=".3" transform="rotate(-20 ${cx} ${cy})"/>`;
  };
  const body = `${shadow(50, 88, 33, 5.5)}
${fritter(60, 40, 25, 21, 17)}${fritter(40, 61, 27, 23, 29)}`;
  return svgDoc(body, defs);
}

function suyaChunk(cx: number, cy: number, w: number, h: number, rot: number, seed: number): string {
  const d = blobPath(cx, cy, w / 2, h / 2, 6, 0.08, seed);
  const inside = (x: number, y: number) => ((x - cx) / (w / 2 - 2)) ** 2 + ((y - cy) / (h / 2 - 2)) ** 2 < 1;
  const box: [number, number, number, number] = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
  const spice = scatter(12, seed, inside, box, (x, y, _r, rnd) =>
    `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(0.7 + rnd() * 0.9)}" fill="${rnd() < 0.7 ? '#e9a453' : '#ffd890'}"/>`,
  );
  const flakes = scatter(4, seed + 9, inside, box, (x, y, r) =>
    `<rect x="${f1(x)}" y="${f1(y)}" width="2.4" height="1.3" fill="#d4261a" transform="rotate(${r} ${f1(x)} ${f1(y)})"/>`,
  );
  return `<g transform="rotate(${rot} ${cx} ${cy})">
<path d="${d}" fill="url(#meat)" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
<path d="M${cx - w / 2 + 4} ${cy - 1} Q${cx} ${cy - 4} ${cx + w / 2 - 4} ${cy - 1}" stroke="#3a0f04" stroke-width="1.6" fill="none" opacity=".45"/>
${spice}${flakes}
<ellipse cx="${cx - w * 0.18}" cy="${cy - h * 0.25}" rx="${f1(w * 0.18)}" ry="1.6" fill="#fff" opacity=".28"/>
</g>`;
}

const MEAT_GRAD = radial('meat', [
  [0, '#c6643a'],
  [0.5, '#8e3415'],
  [1, '#561906'],
]);

function suya(): string {
  const skewer = (x1: number, y1: number, x2: number, y2: number, seed: number) => {
    const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    const chunks = [0.27, 0.52, 0.77]
      .map((t, i) => suyaChunk(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 24, 19, ang + (i % 2 ? 7 : -6), seed + i * 13))
      .join('');
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${OL}" stroke-width="6.4" stroke-linecap="round"/>
<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f0cf92" stroke-width="3.4" stroke-linecap="round"/>${chunks}`;
  };
  const onion = (cx: number, cy: number, r: number, rot: number) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.66}" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="${OL}" stroke-width="6.4"/>
<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.66}" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="#c45fae" stroke-width="4"/>
<ellipse cx="${cx}" cy="${cy}" rx="${r - 1.5}" ry="${r * 0.66 - 1.5}" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="#f6dcf0" stroke-width="1.3"/>`;
  const body = `${shadow(50, 90, 34, 5)}
${skewer(8, 62, 70, 8, 41)}${skewer(26, 92, 92, 34, 77)}
${onion(20, 80, 11, -25)}`;
  return svgDoc(body, MEAT_GRAD);
}

function moimoi(): string {
  const defs =
    linear('leafB', [
      [0, '#6fd865'],
      [0.55, '#2f9e3d'],
      [1, '#1b6a27'],
    ]) +
    linear('leafF', [
      [0, '#58c957'],
      [1, '#1e7a2c'],
    ]) +
    radial('mm', [
      [0, '#ffc0a0'],
      [0.5, '#f27c55'],
      [1, '#c44d2c'],
    ]);
  const inside = (x: number, y: number) => ((x - 50) / 27) ** 2 + ((y - 64) / 38) ** 2 < 1 && y < 64;
  const texture = scatter(34, 5, inside, [22, 26, 78, 64], (x, y, _r, rnd) =>
    `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(0.6 + rnd() * 0.8)}" fill="${rnd() < 0.6 ? '#b84a2c' : '#ffd2bc'}" opacity=".55"/>`,
  );
  const body = `${shadow(50, 90, 34, 5)}
<path d="M50 10 C64 20 84 40 84 66 L16 66 C16 40 36 20 50 10 Z" fill="url(#leafB)" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
<path d="M50 9 L50 60 M50 24 L36 40 M50 24 L64 40 M50 38 L30 56 M50 38 L70 56" stroke="#a6ee90" stroke-width="1.4" fill="none" opacity=".55" stroke-linecap="round"/>
<path d="M21 66 C21 40 34 25 50 25 C66 25 79 40 79 66 Z" fill="url(#mm)" stroke="${OL}" stroke-width="${SW}"/>
${texture}
<ellipse cx="43" cy="40" rx="11" ry="8" fill="#fffaf0" stroke="${OL}" stroke-width="1.6" transform="rotate(-12 43 40)"/>
<circle cx="44" cy="40.5" r="4.8" fill="#ffc62e" stroke="#d98a10" stroke-width="1"/>
<ellipse cx="40" cy="37" rx="3" ry="1.4" fill="#fff" opacity=".9"/>
<ellipse cx="64" cy="38" rx="6" ry="3" fill="#fff" opacity=".3" transform="rotate(30 64 38)"/>
<path d="M10 64 C22 59 36 61 50 68 C64 61 78 59 90 64 C88 80 72 90 50 90 C28 90 12 80 10 64 Z" fill="url(#leafF)" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
<path d="M50 67 L50 87 M30 63 C34 72 40 80 48 86 M70 63 C66 72 60 80 52 86" stroke="#1a5c22" stroke-width="1.5" fill="none" opacity=".55"/>
<path d="M18 66 Q26 78 40 84" stroke="#c4f7b0" stroke-width="2.2" fill="none" opacity=".6" stroke-linecap="round"/>`;
  return svgDoc(body, defs);
}

function chinchin(): string {
  const defs =
    linear('cup', [
      [0, '#ff6b52'],
      [1, '#b81f17'],
    ]) +
    linear('cupIn', [
      [0, '#8a120c'],
      [1, '#c8261c'],
    ]);
  const cube = (x: number, y: number, s: number) => {
    const h = s * 0.55;
    return `<path d="M${f1(x - s)} ${f1(y - h)} L${x} ${f1(y - h * 1.55)} L${f1(x + s)} ${f1(y - h)} L${x} ${f1(y - h * 0.45)} Z" fill="#ffe8a6" stroke="${OL}" stroke-width="1.3" stroke-linejoin="round"/>
<path d="M${f1(x - s)} ${f1(y - h)} L${x} ${f1(y - h * 0.45)} L${x} ${f1(y + h * 0.75)} L${f1(x - s)} ${f1(y + h * 0.2)} Z" fill="#f0bd5e" stroke="${OL}" stroke-width="1.3" stroke-linejoin="round"/>
<path d="M${f1(x + s)} ${f1(y - h)} L${x} ${f1(y - h * 0.45)} L${x} ${f1(y + h * 0.75)} L${f1(x + s)} ${f1(y + h * 0.2)} Z" fill="#cf8f36" stroke="${OL}" stroke-width="1.3" stroke-linejoin="round"/>
<circle cx="${f1(x - s * 0.3)}" cy="${f1(y - h * 1.05)}" r=".9" fill="#c98a30" opacity=".7"/>`;
  };
  const pile = [
    [26, 52],
    [40, 47],
    [56, 46],
    [72, 51],
    [33, 38],
    [49, 35],
    [64, 39],
    [42, 25],
    [57, 25],
  ]
    .map(([x, y]) => cube(x, y, 8.5))
    .join('');
  const dots = [
    [36, 66],
    [52, 71],
    [66, 64],
    [44, 80],
    [60, 81],
    [30, 77],
    [72, 76],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#fff" opacity=".92"/>`)
    .join('');
  const body = `${shadow(50, 90, 30, 5)}
<ellipse cx="50" cy="54" rx="31" ry="7" fill="url(#cupIn)" stroke="${OL}" stroke-width="${SW}"/>
${pile}
<path d="M19 55 C19 59 32 62 50 62 C68 62 81 59 81 55 L73 86 C72 89 62 91 50 91 C38 91 28 89 27 86 Z" fill="url(#cup)" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
${dots}
<path d="M25 61 L31 84" stroke="#fff" stroke-width="2.6" opacity=".45" stroke-linecap="round"/>
${cube(16, 86, 6.5)}${cube(85, 87, 6)}`;
  return svgDoc(body, defs);
}

const FOOD_BUILDERS: Record<Food, () => string> = {
  0: jollof,
  1: dodo,
  2: puffPuff,
  3: akara,
  4: suya,
  5: moimoi,
  6: chinchin,
};

const foodCache = new Map<Food, string>();
export function foodImage(food: Food): string {
  let url = foodCache.get(food);
  if (!url) {
    url = svgUrl(FOOD_BUILDERS[food]());
    foodCache.set(food, url);
  }
  return url;
}

/** Suya Fire: a flaming orb with crossed suya skewers. It has no food colour of its own. */
function suyaFire(): string {
  const defs =
    radial(
      'orb',
      [
        [0, '#fff7b0'],
        [0.3, '#ffc23a'],
        [0.65, '#f2561a'],
        [1, '#8f160a'],
      ],
      '50%',
      '55%',
      '55%',
    ) +
    radial(
      'flm',
      [
        [0, '#fff3a0'],
        [0.5, '#ff9a1e'],
        [1, '#e2380f'],
      ],
      '50%',
      '80%',
      '80%',
    ) +
    MEAT_GRAD;
  const tongues = [
    'M20 60 C10 44 18 30 24 22 C26 34 32 38 34 40',
    'M32 34 C30 20 38 10 46 4 C44 18 50 24 52 28',
    'M48 28 C52 14 62 8 70 6 C64 18 66 26 68 32',
    'M66 36 C74 26 84 24 90 22 C84 34 84 44 80 56',
  ]
    .map((d) => `<path d="${d} Z" fill="url(#flm)" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`)
    .join('');
  const stick = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f3d39a" stroke-width="2.6" stroke-linecap="round"/>`;
  const body = `${shadow(50, 91, 30, 5, 0.3)}
${tongues}
<circle cx="50" cy="58" r="33" fill="url(#orb)" stroke="${OL}" stroke-width="2.6"/>
<circle cx="50" cy="58" r="26" fill="#fff6c0" opacity=".25"/>
${stick(24, 84, 76, 32)}${stick(24, 32, 76, 84)}
${suyaChunk(38, 46, 15, 12, 45, 3)}${suyaChunk(62, 70, 15, 12, 45, 5)}${suyaChunk(62, 46, 15, 12, -45, 7)}${suyaChunk(38, 70, 15, 12, -45, 9)}
${suyaChunk(50, 58, 16, 13, 0, 11)}
<ellipse cx="38" cy="36" rx="9" ry="4" fill="#fff" opacity=".45" transform="rotate(-30 38 36)"/>`;
  return svgDoc(body, defs);
}

/** Dodo Rocket badge: glowing streak and chevrons along its firing direction (drawn over the food). */
function rocketOverlay(): string {
  const chevron = (x: number, dir: 1 | -1) => {
    const p = (dx: number, dy: number) => `${f1(x + dx * dir)} ${f1(50 + dy)}`;
    return `<path d="M${p(0, -11)} L${p(9, 0)} L${p(0, 11)}" fill="none" stroke="${OL}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M${p(0, -11)} L${p(9, 0)} L${p(0, 11)}" fill="none" stroke="#fff6c2" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  const plantain = `<g transform="translate(70 8) rotate(-20)">
<path d="M0 10 C4 2 18 0 26 6 C20 12 6 14 0 10 Z" fill="#ffd23a" stroke="${OL}" stroke-width="2"/>
<path d="M3 9 C8 5 16 4 22 6" stroke="#fff3a0" stroke-width="1.6" fill="none"/>
<path d="M0 10 L-7 6 L-5 10 L-8 14 Z" fill="#ff7a1a" stroke="${OL}" stroke-width="1.4"/>
</g>`;
  const body = `<rect x="2" y="43" width="96" height="14" rx="7" fill="#fff2a8" opacity=".35"/>
<path d="M14 50 H86" stroke="#fff8d0" stroke-width="2" stroke-dasharray="4 5" opacity=".9"/>
${chevron(10, -1)}${chevron(90, 1)}${plantain}`;
  return svgDoc(body);
}

/** Jollof Blast ring: a hot pot-rim glow with pepper sparks around the food. */
function blastOverlay(): string {
  const spark = (x: number, y: number, s: number) =>
    `<path d="M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.3} L${x + s} ${y} L${x + s * 0.3} ${y + s * 0.3} L${x} ${y + s} L${x - s * 0.3} ${y + s * 0.3} L${x - s} ${y} L${x - s * 0.3} ${y - s * 0.3} Z" fill="#fff6b0" stroke="#e2560f" stroke-width="1.4"/>`;
  const body = `<circle cx="50" cy="50" r="44" fill="none" stroke="#ff7a1a" stroke-width="7" opacity=".5"/>
<circle cx="50" cy="50" r="44" fill="none" stroke="#ffe066" stroke-width="3.2" stroke-dasharray="9 6"/>
${spark(12, 12, 8)}${spark(88, 12, 7)}${spark(88, 88, 8)}${spark(12, 88, 7)}
<g transform="translate(76 70) rotate(25)"><path d="M0 0 C8 -2 14 6 10 14 C6 18 -2 14 -2 6 Z" fill="#e8281a" stroke="${OL}" stroke-width="1.6"/><path d="M-1 1 L-5 -4" stroke="#2f8a2a" stroke-width="2.4" stroke-linecap="round"/></g>`;
  return svgDoc(body);
}

/** The Dodo Rocket projectile: a glowing plantain slice with a flame trail (points right). */
function projectile(): string {
  const defs = radial(
    'pj',
    [
      [0, '#fff6b0'],
      [0.5, '#ffd23a'],
      [1, '#e07a12'],
    ],
    '55%',
    '45%',
    '60%',
  );
  const body = `<path d="M4 50 C20 34 40 40 52 50 C40 60 20 66 4 50 Z" fill="#ff7a1a" opacity=".85"/>
<path d="M14 50 C26 42 40 45 52 50 C40 55 26 58 14 50 Z" fill="#ffe066"/>
<ellipse cx="70" cy="50" rx="24" ry="15" fill="url(#pj)" stroke="${OL}" stroke-width="3"/>
<ellipse cx="70" cy="50" rx="12" ry="6.5" fill="none" stroke="#fff3a0" stroke-width="1.6"/>
<ellipse cx="64" cy="43" rx="8" ry="3" fill="#fff" opacity=".6"/>`;
  return svgDoc(body, defs);
}

export const PROJECTILE_ART = svgUrl(projectile());

export const SPECIAL_ART = {
  fire: svgUrl(suyaFire()),
  rocket: svgUrl(rocketOverlay()),
  blast: svgUrl(blastOverlay()),
};

export const FOOD_COLORS: Record<Food, string> = {
  0: '#f05a24',
  1: '#ffc93a',
  2: '#e7a14c',
  3: '#c45a22',
  4: '#8e3415',
  5: '#3aa84a',
  6: '#e33a2a',
};
