/**
 * Illustrated Lagos waterfront for the main menu: sky, layered skyline, the link bridge
 * over the lagoon, a promenade, a market stall and a danfo under a palm tree.
 *
 * The backdrop is one SVG that covers the screen (cropped from the centre on narrow
 * screens); the stall and the palm/danfo group are separate pieces pinned to the bottom
 * corners so they stay in view at every aspect ratio. Motion is limited to a few cheap
 * CSS transforms (clouds, water glints, palm sway, bobbing boats).
 */
import { memo } from 'react';
import { foodImage } from './foods';
import { OBSTACLE_ART } from './obstacles';
import { seeded } from './svg';

const OL = '#3d1705';
const STEEL = '#55678f';
const HORIZON = 572;
const WATER_END = 748;

function Cloud({ x, y, s, slow }: { x: number; y: number; s: number; slow?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={`ffn-cloud ${slow ? 'is-slow' : ''}`}>
        <ellipse cx="0" cy="22" rx="92" ry="20" fill="#cfe7fa" />
        {[
          [-56, 10, 30],
          [-16, -10, 42],
          [32, 0, 34],
          [66, 14, 22],
          [-82, 18, 18],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="#fff" />
        ))}
        <ellipse cx="-4" cy="26" rx="82" ry="10" fill="#dcecfa" />
      </g>
    </g>
  );
}

/** A tower with a lit front face, a darker side face and a roof, for a little depth. */
function Tower({ x, w, top, face, side, roof, spire }: { x: number; w: number; top: number; face: string; side: string; roof: string; spire?: boolean }) {
  const sw = Math.max(8, w * 0.24);
  const rows = Math.floor((HORIZON - top - 12) / 15);
  return (
    <g>
      <path d={`M${x + w} ${top} l${sw} ${-sw * 0.45} V${HORIZON} H${x + w} Z`} fill={side} stroke={STEEL} strokeWidth="2" strokeLinejoin="round" />
      <path d={`M${x} ${top} l${sw} ${-sw * 0.45} h${w} l${-sw} ${sw * 0.45} Z`} fill={roof} stroke={STEEL} strokeWidth="2" strokeLinejoin="round" />
      <rect x={x} y={top} width={w} height={HORIZON - top} fill={face} stroke={STEEL} strokeWidth="2" />
      {Array.from({ length: rows }, (_, r) => (
        <rect key={r} x={x + 5} y={top + 10 + r * 15} width={w - 10} height="5" rx="1" fill="#eef6ff" opacity=".55" />
      ))}
      <rect x={x + 4} y={top + 4} width={w * 0.16} height={HORIZON - top - 8} fill="#fff" opacity=".2" />
      {spire && <path d={`M${x + w / 2 - 6} ${top} L${x + w / 2} ${top - 46} L${x + w / 2 + 6} ${top} Z`} fill={face} stroke={STEEL} strokeWidth="2" />}
    </g>
  );
}

const LEFT_TOWERS: [number, number, number][] = [
  [20, 62, 330],
  [92, 46, 262],
  [148, 72, 350],
  [228, 52, 222],
  [290, 66, 300],
  [366, 46, 380],
  [420, 60, 336],
];
const MID_TOWERS: [number, number, number][] = [
  [716, 42, 470],
  [764, 56, 430],
  [828, 38, 482],
  [872, 52, 448],
  [930, 42, 492],
];
const RIGHT_TOWERS: [number, number, number][] = [
  [1030, 58, 340],
  [1094, 72, 262],
  [1176, 52, 214],
  [1236, 78, 290],
  [1322, 58, 186],
  [1388, 70, 250],
  [1466, 52, 310],
  [1524, 70, 232],
];
const TOWER_TONES: [string, string, string][] = [
  ['#8eb0e2', '#6283bd', '#c4d7f2'],
  ['#a2c0ea', '#6d8ec6', '#d3e2f6'],
  ['#7da1d8', '#5878b2', '#b9cff0'],
];

/** Deck of the bridge: nearly straight, from the left foreground into the distance. */
const deckY = (x: number) => 704 + ((x + 40) * (606 - 704)) / 1320;

function Bridge() {
  const px = 500; // pylon centre: between the stall and the logo on wide screens
  const cables: string[] = [];
  for (let k = 0; k < 9; k++) {
    const yTop = 176 + k * 17;
    const xl = px - 70 - k * 62;
    const xr = px + 60 + k * 64;
    cables.push(`M${px} ${yTop} L${xl} ${deckY(xl) - 4}`, `M${px} ${yTop} L${xr} ${deckY(xr) - 4}`);
  }
  return (
    <g>
      {[110, 360, 900, 1120].map((x, i) => (
        <rect key={x} x={x - (9 - i * 2)} y={deckY(x) + 12} width={18 - i * 4} height={WATER_END - 40 - deckY(x) - i * 14} fill="#d7deea" stroke={STEEL} strokeWidth="1.6" />
      ))}
      <path d={cables.join(' ')} stroke="#f7f9fd" strokeWidth="2" opacity=".95" />
      <path d={`M${px - 30} 712 L${px - 20} 150 L${px - 6} 150 L${px - 10} 712 Z`} fill="#f4f7fb" stroke={STEEL} strokeWidth="2.4" strokeLinejoin="round" />
      <path d={`M${px + 30} 712 L${px + 20} 150 L${px + 6} 150 L${px + 10} 712 Z`} fill="#e3e9f2" stroke={STEEL} strokeWidth="2.4" strokeLinejoin="round" />
      {[160, 196, 236, 280, 330].map((y) => (
        <rect key={y} x={px - 18} y={y} width="36" height="9" fill="#e9eef6" stroke={STEEL} strokeWidth="1.8" />
      ))}
      <path d={`M${px - 24} 152 L${px} 116 L${px + 24} 152 Z`} fill="#f4f7fb" stroke={STEEL} strokeWidth="2.2" strokeLinejoin="round" />
      <path d={`M-40 ${deckY(-40)} L1280 ${deckY(1280)} L1280 ${deckY(1280) + 9} L-40 ${deckY(-40) + 30} Z`} fill="#f6f8fc" stroke={STEEL} strokeWidth="2.4" strokeLinejoin="round" />
      <path d={`M-40 ${deckY(-40) + 18} L1280 ${deckY(1280) + 6}`} stroke="#c3cee0" strokeWidth="5" />
      <path d={`M-40 ${deckY(-40) - 8} L1280 ${deckY(1280) - 3}`} stroke="#9fb0cc" strokeWidth="2" strokeDasharray="3 7" />
      <rect x={px - 30} y={WATER_END - 40} width="60" height="30" fill="#fff" opacity=".12" />
    </g>
  );
}

function Boats() {
  return (
    <>
      <g transform="translate(1150 646)">
        <g className="ffn-bob">
          <path d="M0 22 H70 L60 36 H10 Z" fill="#fff" stroke={OL} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M34 20 V-34 L62 18 Z" fill="#fff6e3" stroke={OL} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M30 20 V-24 L8 18 Z" fill="#ffd23a" stroke={OL} strokeWidth="2.2" strokeLinejoin="round" />
        </g>
      </g>
      <g transform="translate(900 700)">
        <g className="ffn-bob is-late">
          <path d="M0 20 H96 L84 38 Q82 42 76 42 H18 Q12 42 10 38 Z" fill="#e8341c" stroke={OL} strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M4 26 H92" stroke="#fff" strokeWidth="4" />
          <rect x="30" y="2" width="36" height="18" rx="3" fill="#fff6e3" stroke={OL} strokeWidth="2.2" />
          {[36, 48].map((x) => (
            <rect key={x} x={x} y="6" width="8" height="7" fill="#9fd8ff" />
          ))}
        </g>
      </g>
    </>
  );
}

/** The full-screen backdrop: sky, clouds, skyline, lagoon, bridge, far shore and promenade. */
const Backdrop = memo(function Backdrop() {
  const rnd = seeded(2026);
  const haze = Array.from({ length: 46 }, (_, i) => {
    const x = i * 36 - 10 + rnd() * 10;
    const h = 40 + rnd() * 120;
    return <rect key={i} x={x} y={HORIZON - h} width={22 + rnd() * 18} height={h} fill="#bcd5f0" />;
  });
  let hills = `M0 ${HORIZON + 6}`;
  for (let x = 0; x < 1600; x += 44) hills += ` q22 ${-(14 + rnd() * 16).toFixed(1)} 44 0`;
  hills += ` V${HORIZON + 22} H0 Z`;
  const glints = (offset: number) =>
    Array.from({ length: 22 }, (_, i) => {
      const x = ((i * 173 + offset * 61) % 1560) + 20;
      const y = HORIZON + 30 + ((i * 47 + offset * 23) % (WATER_END - HORIZON - 50));
      return <path key={i} d={`M${x} ${y} h${18 + (i % 4) * 8}`} stroke="#fff" strokeWidth="3" strokeLinecap="round" />;
    });
  return (
    <svg className="ffn-home-backdrop" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ffnh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b93e6" />
          <stop offset=".45" stopColor="#6cc4f4" />
          <stop offset=".64" stopColor="#c9ecfd" />
        </linearGradient>
        <linearGradient id="ffnh-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fd3f5" />
          <stop offset=".35" stopColor="#3fb1ea" />
          <stop offset="1" stopColor="#1d84c9" />
        </linearGradient>
        <linearGradient id="ffnh-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4d197" />
          <stop offset="1" stopColor="#e0a862" />
        </linearGradient>
        <radialGradient id="ffnh-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fffbe0" stopOpacity=".95" />
          <stop offset=".4" stopColor="#fff2b0" stopOpacity=".45" />
          <stop offset="1" stopColor="#fff2b0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#ffnh-sky)" />
      <circle cx="1270" cy="110" r="190" fill="url(#ffnh-sun)" />
      <Cloud x={190} y={130} s={1.1} />
      <Cloud x={560} y={70} s={0.75} slow />
      <Cloud x={1000} y={170} s={0.9} />
      <Cloud x={1420} y={260} s={0.7} slow />
      <Cloud x={330} y={330} s={0.6} />
      <g opacity=".9">{haze}</g>
      {LEFT_TOWERS.map(([x, w, top], i) => {
        const [face, side, roof] = TOWER_TONES[i % 3];
        return <Tower key={`l${i}`} x={x} w={w} top={top} face={face} side={side} roof={roof} spire={i === 3} />;
      })}
      {MID_TOWERS.map(([x, w, top], i) => {
        const [face, side, roof] = TOWER_TONES[(i + 1) % 3];
        return <Tower key={`m${i}`} x={x} w={w} top={top} face={face} side={side} roof={roof} />;
      })}
      {RIGHT_TOWERS.map(([x, w, top], i) => {
        const [face, side, roof] = TOWER_TONES[(i + 2) % 3];
        return <Tower key={`r${i}`} x={x} w={w} top={top} face={face} side={side} roof={roof} spire={i === 4} />;
      })}
      <path d={hills} fill="#3f9a35" stroke="#2a6e22" strokeWidth="2" />
      {[540, 610, 1000, 1290, 1560].map((x) => (
        <g key={x}>
          <rect x={x} y={HORIZON - 4} width="26" height="16" fill="#fff6e3" stroke="#8a6a3e" strokeWidth="1.4" />
          <path d={`M${x - 3} ${HORIZON - 3} L${x + 13} ${HORIZON - 14} L${x + 29} ${HORIZON - 3} Z`} fill="#d0452a" />
        </g>
      ))}
      <rect x="0" y={HORIZON + 14} width="1600" height={WATER_END - HORIZON - 14} fill="url(#ffnh-water)" />
      <g className="ffn-glint" opacity=".55">
        {glints(1)}
      </g>
      <g className="ffn-glint is-alt" opacity=".45">
        {glints(5)}
      </g>
      <Bridge />
      <Boats />
      {/* promenade wall */}
      <rect x="-4" y={WATER_END - 6} width="1608" height="12" rx="3" fill="#f6eedb" stroke="#8a6a3e" strokeWidth="2" />
      <rect x="-4" y={WATER_END + 6} width="1608" height="26" fill="#d8c49c" stroke="#8a6a3e" strokeWidth="2" />
      <path d={Array.from({ length: 27 }, (_, i) => `M${i * 62 + 20} ${WATER_END + 7} v24`).join(' ')} stroke="#a88a5a" strokeWidth="2" />
      {[150, 470, 790, 1110, 1430].map((x) => (
        <g key={x}>
          <rect x={x} y={WATER_END - 30} width="18" height="32" rx="4" fill="#f6eedb" stroke="#8a6a3e" strokeWidth="2" />
          <circle cx={x + 9} cy={WATER_END - 32} r="9" fill="#f6eedb" stroke="#8a6a3e" strokeWidth="2" />
        </g>
      ))}
      <rect x="0" y={WATER_END + 32} width="1600" height={900 - WATER_END - 32} fill="url(#ffnh-ground)" />
      <path
        d={Array.from({ length: 16 }, (_, i) => `M${i * 110 - 40} 900 L${i * 110 + 60} ${WATER_END + 32}`).join(' ')}
        stroke="#c98f4f"
        strokeWidth="2"
        opacity=".25"
      />
      <path d={`M0 ${WATER_END + 60} H1600`} stroke="#c98f4f" strokeWidth="2" opacity=".25" />
      {[
        [40, 800, 60],
        [1480, 810, 70],
        [700, 870, 40],
        [1050, 850, 34],
      ].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.3} fill="#7cc04a" opacity=".85" />
      ))}
    </svg>
  );
});

/* ───────────── foreground: market stall (bottom-left) ───────────── */

function Tomato({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#e8301c" stroke={OL} strokeWidth="1.8" />
      <ellipse cx={x - r * 0.35} cy={y - r * 0.35} rx={r * 0.28} ry={r * 0.18} fill="#fff" opacity=".6" />
      <path d={`M${x - 3} ${y - r + 1} l3 -3 l3 3`} stroke="#2e8a2a" strokeWidth="2" fill="none" />
    </g>
  );
}

const StallCorner = memo(function StallCorner() {
  const stripes = ['#e8341c', '#ff8a1e', '#ffc93a', '#3fae2a', '#1f6fd8', '#7b3fc4', '#e8341c', '#ff8a1e', '#ffc93a', '#3fae2a', '#1f6fd8', '#7b3fc4'];
  const awning = 'M-10 40 L470 112 L470 168 L-10 122 Z';
  return (
    <svg className="ffn-home-stall" viewBox="0 0 560 520" aria-hidden="true" focusable="false" overflow="visible">
      <defs>
        <clipPath id="ffnh-awning">
          <path d={awning} />
        </clipPath>
        <linearGradient id="ffnh-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c98a4a" />
          <stop offset="1" stopColor="#8a5222" />
        </linearGradient>
      </defs>
      <ellipse cx="260" cy="500" rx="270" ry="22" fill="#5a3a12" opacity=".2" />
      {/* posts and shaded back */}
      <rect x="22" y="110" width="16" height="380" fill="#8a5222" stroke={OL} strokeWidth="3" />
      <rect x="430" y="150" width="16" height="340" fill="#8a5222" stroke={OL} strokeWidth="3" />
      <path d="M38 124 L430 168 V340 H38 Z" fill="#5c3412" opacity=".55" />
      {/* hanging plantains */}
      {[110, 340].map((x) => (
        <g key={x}>
          <path d={`M${x} ${136 + (x - 110) * 0.15} v20`} stroke="#6a3a12" strokeWidth="3" />
          {[-14, -4, 6, 16].map((dx) => (
            <path key={dx} d={`M${x + dx * 0.3} ${158 + (x - 110) * 0.15} q${dx} 22 ${dx * 0.4} 46`} stroke={OL} strokeWidth="10" fill="none" strokeLinecap="round" />
          ))}
          {[-14, -4, 6, 16].map((dx) => (
            <path key={`f${dx}`} d={`M${x + dx * 0.3} ${158 + (x - 110) * 0.15} q${dx} 22 ${dx * 0.4} 46`} stroke="#ffd23a" strokeWidth="6.5" fill="none" strokeLinecap="round" />
          ))}
        </g>
      ))}
      {/* awning */}
      <g clipPath="url(#ffnh-awning)">
        {stripes.map((c, i) => (
          <path key={i} d={`M${-10 + i * 40} 0 h40 l12 200 h-40 Z`} fill={c} />
        ))}
        <path d="M-10 40 L470 112 L470 124 L-10 52 Z" fill="#fff" opacity=".35" />
      </g>
      <path d={awning} fill="none" stroke={OL} strokeWidth="4" strokeLinejoin="round" />
      {Array.from({ length: 12 }, (_, i) => {
        const x = -10 + i * 40;
        const y = 122 + (i * 40 * 46) / 480;
        return <path key={i} d={`M${x} ${y} a20 16 0 0 0 40 ${46 / 12}`} fill={stripes[i]} stroke={OL} strokeWidth="3" />;
      })}
      {/* shelf and produce */}
      <rect x="40" y="252" width="388" height="12" fill="url(#ffnh-wood)" stroke={OL} strokeWidth="2.6" />
      {[
        [70, 238],
        [92, 238],
        [114, 238],
        [81, 220],
        [103, 220],
        [92, 203],
      ].map(([x, y], i) => (
        <Tomato key={i} x={x} y={y} r={12} />
      ))}
      {[
        [170, 240, '#3fae2a'],
        [196, 242, '#ff8a1e'],
        [222, 240, '#3fae2a'],
        [184, 222, '#e8341c'],
        [210, 224, '#3fae2a'],
      ].map(([x, y, c], i) => (
        <g key={i}>
          <path d={`M${x} ${y} c-12 -2 -12 -20 0 -20 c12 0 12 18 0 20 Z`} fill={c as string} stroke={OL} strokeWidth="1.8" />
          <path d={`M${x} ${(y as number) - 20} l2 -6`} stroke="#2e6a1a" strokeWidth="2.4" />
        </g>
      ))}
      {[
        [290, 240],
        [316, 242],
        [303, 222],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="13" fill="#b04a9a" stroke={OL} strokeWidth="1.8" />
          <path d={`M${x - 6} ${y - 6} q6 -6 12 0`} stroke="#f3d7ee" strokeWidth="2" fill="none" />
        </g>
      ))}
      <image href={OBSTACLE_ART.basket} x="350" y="196" width="68" height="68" />
      {/* counter */}
      <rect x="18" y="330" width="430" height="108" rx="6" fill="url(#ffnh-wood)" stroke={OL} strokeWidth="3.4" />
      <path d="M18 366 H448 M18 402 H448" stroke="#7a4a1e" strokeWidth="2.6" />
      <rect x="10" y="318" width="446" height="18" rx="5" fill="#d99a58" stroke={OL} strokeWidth="3" />
      <image href={foodImage(0)} x="30" y="236" width="92" height="92" />
      <image href={foodImage(2)} x="124" y="244" width="84" height="84" />
      <image href={foodImage(5)} x="210" y="240" width="88" height="88" />
      <image href={foodImage(4)} x="296" y="246" width="82" height="82" />
      {/* LAGOS VIBES sign */}
      <rect x="474" y="292" width="14" height="200" fill="#8a5222" stroke={OL} strokeWidth="3" />
      <g transform="rotate(-6 480 260)">
        <rect x="392" y="206" width="172" height="104" rx="8" fill="#c98a4a" stroke={OL} strokeWidth="4" />
        <path d="M392 240 H564 M392 275 H564" stroke="#8a5222" strokeWidth="2.4" />
        <circle cx="404" cy="218" r="3.4" fill="#5a3a1e" />
        <circle cx="552" cy="218" r="3.4" fill="#5a3a1e" />
        <text x="478" y="250" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="34" fill={OL}>
          LAGOS
        </text>
        <text x="478" y="292" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="34" fill={OL}>
          VIBES
        </text>
      </g>
      {/* crate of tomatoes and foreground leaves */}
      <g transform="translate(300 418)">
        {[
          [24, 0],
          [48, -2],
          [72, 0],
          [96, -2],
          [36, -18],
          [60, -20],
          [84, -18],
        ].map(([x, y], i) => (
          <Tomato key={i} x={x} y={y} r={13} />
        ))}
        <rect x="6" y="2" width="112" height="62" rx="4" fill="url(#ffnh-wood)" stroke={OL} strokeWidth="3" />
        <path d="M6 22 H118 M6 42 H118" stroke="#7a4a1e" strokeWidth="2.4" />
      </g>
      <g>
        {[
          [-20, 520, -60, '#2e9a3a'],
          [10, 530, -30, '#3fb24a'],
          [60, 540, -10, '#2e9a3a'],
          [120, 540, 18, '#3fb24a'],
        ].map(([x, y, rot, c], i) => (
          <path
            key={i}
            d={`M${x} ${y} q30 -110 90 -150 q-10 80 -90 150 Z`}
            transform={`rotate(${rot} ${x} ${y})`}
            fill={c as string}
            stroke="#1d6b26"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  );
});

/* ───────────── foreground: palm, umbrella and danfo (bottom-right) ───────────── */

/** A drooping palm frond: a curved midrib with leaflets along both sides. */
function frondPath(cx: number, cy: number, angle: number, len: number): { blade: string; rib: string } {
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const droop = len * 0.35;
  const tip = { x: cx + dx * len, y: cy + dy * len + droop };
  const ctrl = { x: cx + dx * len * 0.55, y: cy + dy * len * 0.55 - len * 0.08 };
  const pt = (t: number) => ({
    x: (1 - t) * (1 - t) * cx + 2 * (1 - t) * t * ctrl.x + t * t * tip.x,
    y: (1 - t) * (1 - t) * cy + 2 * (1 - t) * t * ctrl.y + t * t * tip.y,
  });
  const left: string[] = [];
  const right: string[] = [];
  const n = 12;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const p = pt(t);
    const q = pt(Math.min(1, t + 0.02));
    const tx = q.x - p.x || 0.001;
    const ty = q.y - p.y;
    const tl = Math.hypot(tx, ty);
    const nx = -ty / tl;
    const ny = tx / tl;
    const w = Math.sin(Math.PI * Math.min(0.95, t)) * len * 0.22 + 4;
    const back = len * 0.05;
    left.push(`${(p.x + nx * w - (tx / tl) * back).toFixed(1)},${(p.y + ny * w - (ty / tl) * back + w * 0.3).toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    right.push(`${(p.x - nx * w - (tx / tl) * back).toFixed(1)},${(p.y - ny * w - (ty / tl) * back + w * 0.3).toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  const blade = `M${cx},${cy} L${left.join(' ')} L${tip.x.toFixed(1)},${tip.y.toFixed(1)} L${right.reverse().join(' ')} Z`;
  const rib = `M${cx} ${cy} Q${ctrl.x.toFixed(1)} ${ctrl.y.toFixed(1)} ${tip.x.toFixed(1)} ${tip.y.toFixed(1)}`;
  return { blade, rib };
}

const CROWN = { x: 452, y: 150 };
const FRONDS: [number, number, string][] = [
  [200, 220, '#2e9a3a'],
  [235, 200, '#3fb24a'],
  [262, 170, '#2e9a3a'],
  [300, 160, '#3fb24a'],
  [330, 190, '#2e9a3a'],
  [-20, 200, '#3fb24a'],
  [160, 220, '#3fb24a'],
  [20, 210, '#2e9a3a'],
];

const PalmDanfoCorner = memo(function PalmDanfoCorner() {
  return (
    <svg className="ffn-home-danfo" viewBox="0 0 640 700" aria-hidden="true" focusable="false" overflow="visible">
      <ellipse cx="320" cy="682" rx="320" ry="22" fill="#5a3a12" opacity=".2" />
      {/* umbrella and table */}
      <rect x="546" y="320" width="10" height="330" fill="#6a3a12" stroke={OL} strokeWidth="2.4" />
      {['#ffc93a', '#1f6fd8', '#e8341c', '#ffc93a', '#1f6fd8', '#e8341c'].map((c, i) => {
        const x0 = 420 + i * 44;
        return <path key={i} d={`M551 250 L${x0} 330 Q${x0 + 22} 344 ${x0 + 44} 330 Z`} fill={c} stroke={OL} strokeWidth="3" strokeLinejoin="round" />;
      })}
      <circle cx="551" cy="250" r="7" fill="#ffc93a" stroke={OL} strokeWidth="2.4" />
      <rect x="490" y="560" width="130" height="14" rx="4" fill="#c98a4a" stroke={OL} strokeWidth="3" />
      <path d="M502 574 V650 M608 574 V650" stroke={OL} strokeWidth="9" strokeLinecap="round" />
      <path d="M502 574 V650 M608 574 V650" stroke="#8a5222" strokeWidth="5" strokeLinecap="round" />
      {/* palm trunk */}
      <path d={`M604 700 C 590 520 520 330 ${CROWN.x} ${CROWN.y}`} stroke={OL} strokeWidth="38" fill="none" strokeLinecap="round" />
      <path d={`M604 700 C 590 520 520 330 ${CROWN.x} ${CROWN.y}`} stroke="#b07a3a" strokeWidth="30" fill="none" strokeLinecap="round" />
      <path d={`M604 700 C 590 520 520 330 ${CROWN.x} ${CROWN.y}`} stroke="#7a4a1e" strokeWidth="30" fill="none" strokeDasharray="4 16" />
      <path d={`M596 700 C 584 520 514 330 ${CROWN.x - 6} ${CROWN.y + 4}`} stroke="#d9a35a" strokeWidth="6" fill="none" opacity=".6" />
      <g className="ffn-sway">
        {FRONDS.map(([ang, len, c], i) => {
          const f = frondPath(CROWN.x, CROWN.y, ang, len);
          return (
            <g key={i}>
              <path d={f.blade} fill={c} stroke="#1d6b26" strokeWidth="2.6" strokeLinejoin="round" />
              <path d={f.rib} stroke="#a6ee90" strokeWidth="3" fill="none" opacity=".75" />
            </g>
          );
        })}
        {[
          [-12, 14],
          [8, 18],
          [-2, 2],
        ].map(([dx, dy], i) => (
          <circle key={i} cx={CROWN.x + dx} cy={CROWN.y + dy} r="15" fill="#6a3a12" stroke={OL} strokeWidth="2.4" />
        ))}
      </g>
      {/* danfo */}
      <g transform="translate(70 446)">
        <rect x="120" y="0" width="220" height="12" rx="4" fill="#5a5f68" stroke={OL} strokeWidth="2.6" />
        <rect x="140" y="-22" width="54" height="24" rx="5" fill="#1f6fd8" stroke={OL} strokeWidth="2.4" />
        <rect x="204" y="-16" width="40" height="18" rx="5" fill="#e8341c" stroke={OL} strokeWidth="2.4" />
        <rect x="254" y="-26" width="46" height="28" rx="5" fill="#3fae2a" stroke={OL} strokeWidth="2.4" />
        <path
          d="M60 44 Q66 16 98 16 H404 Q432 16 436 46 L440 196 Q440 214 422 214 H32 Q16 214 16 198 V120 Q18 84 36 66 Z"
          fill="#ffc81e"
          stroke={OL}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M70 26 Q78 22 100 22 H400" stroke="#fff3a0" strokeWidth="5" fill="none" opacity=".75" strokeLinecap="round" />
        <path d="M36 76 L72 30 H128 V112 H30 Z" fill="#9fd8ff" stroke={OL} strokeWidth="3" strokeLinejoin="round" />
        <path d="M44 100 L84 40" stroke="#fff" strokeWidth="6" opacity=".55" strokeLinecap="round" />
        {[140, 214, 288, 362].map((x) => (
          <g key={x}>
            <rect x={x} y="30" width="62" height="82" rx="6" fill="#9fd8ff" stroke={OL} strokeWidth="3" />
            <path d={`M${x + 8} 100 L${x + 36} 38`} stroke="#fff" strokeWidth="6" opacity=".45" strokeLinecap="round" />
          </g>
        ))}
        <rect x="16" y="140" width="424" height="12" fill="#1d1d1d" />
        <rect x="16" y="160" width="424" height="8" fill="#1d1d1d" />
        <path d="M206 120 V206 M210 120 V206" stroke="#c98f00" strokeWidth="2" />
        <rect x="16" y="128" width="30" height="16" rx="4" fill="#fff6c0" stroke={OL} strokeWidth="2.4" />
        <rect x="8" y="182" width="44" height="18" rx="5" fill="#c9ced6" stroke={OL} strokeWidth="2.6" />
        <rect x="26" y="70" width="12" height="20" rx="3" fill="#2a2a2e" stroke={OL} strokeWidth="2" />
        {[104, 360].map((x) => (
          <g key={x}>
            <circle cx={x} cy="212" r="38" fill="#262626" stroke="#111" strokeWidth="3" />
            <circle cx={x} cy="212" r="18" fill="#b9c0c8" stroke="#555" strokeWidth="2" />
            <circle cx={x} cy="212" r="6" fill="#555" />
          </g>
        ))}
      </g>
      {/* foreground bush */}
      {[
        [520, 700, 70],
        [600, 690, 60],
        [440, 706, 46],
      ].map(([x, y, r], i) => (
        <circle key={`o${i}`} cx={x} cy={y} r={r} fill="#1d6b26" />
      ))}
      {[
        [520, 700, 64],
        [600, 690, 54],
        [440, 706, 40],
      ].map(([x, y, r], i) => (
        <circle key={`f${i}`} cx={x} cy={y} r={r} fill={i % 2 ? '#46a63a' : '#3f9a35'} />
      ))}
      <circle cx="506" cy="664" r="18" fill="#8fdc5a" opacity=".7" />
    </svg>
  );
});

export function MenuScene() {
  return (
    <div className="ffn-home-scene" aria-hidden="true">
      <Backdrop />
      <div className="ffn-home-corner is-left">
        <StallCorner />
      </div>
      <div className="ffn-home-corner is-right">
        <PalmDanfoCorner />
      </div>
    </div>
  );
}
