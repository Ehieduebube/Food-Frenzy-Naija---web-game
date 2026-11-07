/**
 * Original illustrated scenery for the level map: Lagos streets, Balogun stalls,
 * Lekki beachfront and the carnival. Every sprite is inline SVG, drawn at a fixed
 * pixel width so it never stretches with the screen.
 */
import type { ReactNode } from 'react';
import type { Food } from '../engine/types';
import { foodImage } from './foods';
import { OBSTACLE_ART } from './obstacles';

const OL = '#3d1705';

function Sprite({ w, vb, flip, children }: { w: number; vb: [number, number]; flip?: boolean; children: ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${vb[0]} ${vb[1]}`}
      width={w}
      height={(w * vb[1]) / vb[0]}
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden="true"
      focusable="false"
      overflow="visible"
    >
      {children}
    </svg>
  );
}

const Shadow = ({ cx, cy, rx, ry = rx * 0.18 }: { cx: number; cy: number; rx: number; ry?: number }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#1d3a0c" opacity=".22" />
);

/** Circles drawn twice (thick outline, then fill) so their union gets one clean outline. */
function Blob({ circles, fill, outline = OL, sw = 5 }: { circles: [number, number, number][]; fill: string; outline?: string; sw?: number }) {
  return (
    <>
      {circles.map(([x, y, r], i) => (
        <circle key={`o${i}`} cx={x} cy={y} r={r} fill={outline} stroke={outline} strokeWidth={sw} />
      ))}
      {circles.map(([x, y, r], i) => (
        <circle key={`f${i}`} cx={x} cy={y} r={r} fill={fill} />
      ))}
    </>
  );
}

export function TreeSprite({ w, flip, tone = 0 }: { w: number; flip?: boolean; tone?: number }) {
  const greens = [
    ['#3f9a35', '#7fd04f', '#2c7a26'],
    ['#4aa83a', '#9be064', '#317f29'],
  ][tone % 2];
  return (
    <Sprite w={w} vb={[100, 124]} flip={flip}>
      <Shadow cx={50} cy={118} rx={34} />
      <path d="M44 117 L46 72 L54 72 L56 117 Z" fill="#8a5222" stroke={OL} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M50 88 L38 76 M50 96 L62 84" stroke="#6a3a12" strokeWidth="3" strokeLinecap="round" />
      <Blob
        fill={greens[0]}
        circles={[
          [28, 62, 20],
          [72, 62, 20],
          [50, 40, 27],
          [50, 68, 22],
          [32, 42, 16],
          [68, 42, 16],
        ]}
      />
      <circle cx="40" cy="36" r="12" fill={greens[1]} opacity=".85" />
      <circle cx="26" cy="58" r="8" fill={greens[1]} opacity=".7" />
      <circle cx="62" cy="70" r="12" fill={greens[2]} opacity=".55" />
      <circle cx="76" cy="58" r="7" fill={greens[2]} opacity=".5" />
    </Sprite>
  );
}

export function PalmSprite({ w, flip }: { w: number; flip?: boolean }) {
  const leaf = (rot: number, color: string) => (
    <g transform={`rotate(${rot} 62 38)`} key={rot}>
      <path d="M62 38 Q86 18 120 30 Q90 32 62 38 Z" fill={color} stroke="#1d6b26" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M64 37 Q90 26 116 30" stroke="#a6ee90" strokeWidth="1.4" fill="none" opacity=".8" />
    </g>
  );
  return (
    <Sprite w={w} vb={[124, 170]} flip={flip}>
      <Shadow cx={52} cy={164} rx={30} />
      <path d="M46 164 C48 120 50 80 62 38" stroke={OL} strokeWidth="13" fill="none" strokeLinecap="round" />
      <path d="M46 164 C48 120 50 80 62 38" stroke="#b07a3a" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M46 164 C48 120 50 80 62 38" stroke="#7a4a1e" strokeWidth="8" fill="none" strokeDasharray="3 9" />
      {[-170, -130, -95, -55, -20, 20].map((r, i) => leaf(r, i % 2 ? '#3fb24a' : '#2e9a3a'))}
      <circle cx="58" cy="44" r="6" fill="#6a3a12" stroke={OL} strokeWidth="1.6" />
      <circle cx="67" cy="45" r="5.5" fill="#7a4a1e" stroke={OL} strokeWidth="1.6" />
    </Sprite>
  );
}

export function BushSprite({ w, flip }: { w: number; flip?: boolean }) {
  return (
    <Sprite w={w} vb={[100, 62]} flip={flip}>
      <Shadow cx={50} cy={56} rx={42} />
      <Blob
        fill="#46a63a"
        circles={[
          [22, 40, 16],
          [44, 30, 20],
          [68, 34, 18],
          [84, 44, 12],
          [50, 46, 16],
        ]}
      />
      <circle cx="40" cy="24" r="8" fill="#8fdc5a" opacity=".8" />
      <circle cx="64" cy="28" r="6" fill="#8fdc5a" opacity=".7" />
      {[
        [30, 38],
        [58, 44],
        [76, 38],
      ].map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r="3.4" fill="#fff" stroke={OL} strokeWidth="1" />
          <circle cx={x} cy={y} r="1.4" fill="#ffc93a" />
        </g>
      ))}
    </Sprite>
  );
}

/** A Lagos house: colourful walls, red corrugated roof, burglar-proof windows and a black water tank. */
export function HouseSprite({ w, flip, wall = '#f28a5a', roof = '#c43c22' }: { w: number; flip?: boolean; wall?: string; roof?: string }) {
  const windowAt = (x: number) => (
    <g key={x}>
      <rect x={x} y="66" width="22" height="22" fill="#9fd8ff" stroke={OL} strokeWidth="2.4" />
      <path d={`M${x + 5.5} 66 V88 M${x + 11} 66 V88 M${x + 16.5} 66 V88`} stroke="#3a3f48" strokeWidth="1.6" />
      <path d={`M${x} 77 H${x + 22}`} stroke="#3a3f48" strokeWidth="1.4" />
      <rect x={x - 2} y="88" width="26" height="4" fill="#fff6d8" stroke={OL} strokeWidth="1.6" />
    </g>
  );
  return (
    <Sprite w={w} vb={[130, 130]} flip={flip}>
      <Shadow cx={66} cy={124} rx={56} />
      <rect x="86" y="10" width="20" height="22" rx="4" fill="#2a2a2e" stroke={OL} strokeWidth="2.2" />
      <path d="M88 16 H104" stroke="#55565c" strokeWidth="2" />
      <rect x="16" y="52" width="98" height="70" fill={wall} stroke={OL} strokeWidth="2.6" />
      <path d="M16 52 H114 V60 H16 Z" fill="#000" opacity=".12" />
      <path d="M6 56 L28 26 L102 26 L124 56 Z" fill={roof} stroke={OL} strokeWidth="2.6" strokeLinejoin="round" />
      {[34, 46, 58, 70, 82, 94].map((x) => (
        <path key={x} d={`M${x} 27 L${x + (x - 65) * 0.35} 55`} stroke="#000" strokeWidth="1.4" opacity=".22" />
      ))}
      <path d="M28 26 H102" stroke="#ff8a6a" strokeWidth="2" opacity=".6" />
      {windowAt(24)}
      {windowAt(84)}
      <rect x="54" y="80" width="22" height="42" fill="#7a4a1e" stroke={OL} strokeWidth="2.4" />
      <path d="M58 86 H72 M58 100 H72" stroke="#5c3412" strokeWidth="1.6" />
      <circle cx="71" cy="102" r="2" fill="#ffc93a" />
    </Sprite>
  );
}

/** Street food stall with a striped awning and real dishes on the counter. */
export function StallSprite({ w, flip, foods = [0, 4, 2] as Food[] }: { w: number; flip?: boolean; foods?: Food[] }) {
  const stripes = ['#e8341c', '#ffc93a', '#1f6fd8', '#3fae2a', '#fff4e0', '#e8341c', '#ffc93a', '#1f6fd8'];
  return (
    <Sprite w={w} vb={[170, 150]} flip={flip}>
      <Shadow cx={86} cy={144} rx={74} />
      <rect x="18" y="40" width="8" height="100" fill="#8a5222" stroke={OL} strokeWidth="2.2" />
      <rect x="144" y="40" width="8" height="100" fill="#8a5222" stroke={OL} strokeWidth="2.2" />
      <rect x="22" y="60" width="126" height="44" fill="#5c3412" opacity=".35" />
      {/* awning */}
      <path d="M6 22 L20 6 L150 6 L164 22 Z" fill="#c43c22" stroke={OL} strokeWidth="2.6" strokeLinejoin="round" />
      {stripes.map((c, i) => (
        <path key={i} d={`M${6 + i * 19.75} 22 h19.75 v18 a9.875 9.875 0 0 1 -19.75 0 Z`} fill={c} stroke={OL} strokeWidth="2.2" />
      ))}
      {/* counter */}
      <rect x="12" y="98" width="146" height="40" rx="3" fill="#b8763a" stroke={OL} strokeWidth="2.6" />
      <path d="M12 111 H158 M12 124 H158" stroke="#8a5222" strokeWidth="2" />
      <rect x="8" y="92" width="154" height="10" rx="3" fill="#d99a58" stroke={OL} strokeWidth="2.4" />
      {foods.map((f, i) => (
        <image key={i} href={foodImage(f)} x={22 + i * 44} y={56} width="42" height="42" />
      ))}
    </Sprite>
  );
}

/** Yellow danfo minibus with black stripes. */
export function DanfoSprite({ w, flip }: { w: number; flip?: boolean }) {
  return (
    <Sprite w={w} vb={[200, 110]} flip={flip}>
      <Shadow cx={100} cy={100} rx={92} ry={8} />
      <rect x="40" y="2" width="96" height="8" rx="3" fill="#5a5f68" stroke={OL} strokeWidth="2" />
      <path d="M10 26 Q12 10 30 10 H158 Q176 10 184 30 L192 62 V84 Q192 90 186 90 H12 Q6 90 6 84 V40 Z" fill="#ffc81e" stroke={OL} strokeWidth="3" strokeLinejoin="round" />
      <path d="M10 22 Q14 14 30 14 H158" stroke="#fff3a0" strokeWidth="3" fill="none" opacity=".7" />
      <rect x="6" y="60" width="186" height="7" fill="#1d1d1d" />
      <rect x="6" y="72" width="186" height="5" fill="#1d1d1d" />
      {[22, 58, 94, 130].map((x) => (
        <rect key={x} x={x} y="20" width="30" height="28" rx="4" fill="#9fd8ff" stroke={OL} strokeWidth="2.2" />
      ))}
      <path d="M166 20 H176 Q182 24 186 46 H166 Z" fill="#9fd8ff" stroke={OL} strokeWidth="2.2" />
      <rect x="182" y="52" width="10" height="7" rx="2" fill="#fff6c0" stroke={OL} strokeWidth="1.6" />
      <rect x="4" y="52" width="6" height="7" fill="#e8341c" stroke={OL} strokeWidth="1.4" />
      {[44, 156].map((x) => (
        <g key={x}>
          <circle cx={x} cy="90" r="15" fill="#2a2a2a" stroke="#111" strokeWidth="2.4" />
          <circle cx={x} cy="90" r="6" fill="#b9c0c8" />
        </g>
      ))}
    </Sprite>
  );
}

export function LagosSignSprite({ w, flip }: { w: number; flip?: boolean }) {
  return (
    <Sprite w={w} vb={[110, 140]} flip={flip}>
      <Shadow cx={56} cy={134} rx={20} />
      <rect x="51" y="50" width="10" height="84" fill="#8e97a6" stroke={OL} strokeWidth="2.4" />
      <rect x="6" y="10" width="98" height="52" rx="8" fill="#1f4fb8" stroke={OL} strokeWidth="3" />
      <rect x="12" y="16" width="86" height="40" rx="5" fill="none" stroke="#fff" strokeWidth="2.6" />
      <text x="55" y="45" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="24" fill="#fff">
        LAGOS
      </text>
    </Sprite>
  );
}

export function VibesSignSprite({ w, flip }: { w: number; flip?: boolean }) {
  return (
    <Sprite w={w} vb={[120, 150]} flip={flip}>
      <Shadow cx={58} cy={144} rx={24} />
      <rect x="52" y="60" width="11" height="84" fill="#8a5222" stroke={OL} strokeWidth="2.4" />
      <g transform="rotate(-7 60 44)">
        <rect x="6" y="10" width="108" height="70" rx="6" fill="#c98a4a" stroke={OL} strokeWidth="3" />
        <path d="M6 33 H114 M6 56 H114" stroke="#8a5222" strokeWidth="2" />
        <circle cx="14" cy="18" r="2.4" fill="#5a3a1e" />
        <circle cx="106" cy="18" r="2.4" fill="#5a3a1e" />
        <text x="60" y="38" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="22" fill={OL}>
          LAGOS
        </text>
        <text x="60" y="66" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="22" fill={OL}>
          VIBES
        </text>
      </g>
    </Sprite>
  );
}

/** Striped umbrella over a wooden table with stools. */
export function UmbrellaTableSprite({ w, flip, a = '#7b3fc4', b = '#fff4e0' }: { w: number; flip?: boolean; a?: string; b?: string }) {
  const n = 6;
  return (
    <Sprite w={w} vb={[160, 150]} flip={flip}>
      <Shadow cx={80} cy={144} rx={66} />
      <rect x="77" y="40" width="6" height="94" fill="#6a3a12" stroke={OL} strokeWidth="1.6" />
      {Array.from({ length: n }, (_, i) => {
        const x0 = 10 + (i * 140) / n;
        const x1 = 10 + ((i + 1) * 140) / n;
        return <path key={i} d={`M80 6 L${x0} 52 Q${(x0 + x1) / 2} 60 ${x1} 52 Z`} fill={i % 2 ? b : a} stroke={OL} strokeWidth="2.4" strokeLinejoin="round" />;
      })}
      <circle cx="80" cy="6" r="4" fill={a} stroke={OL} strokeWidth="2" />
      <rect x="40" y="100" width="80" height="10" rx="3" fill="#b8763a" stroke={OL} strokeWidth="2.4" />
      <path d="M48 110 V138 M112 110 V138" stroke={OL} strokeWidth="6" strokeLinecap="round" />
      <path d="M48 110 V138 M112 110 V138" stroke="#8a5222" strokeWidth="3" strokeLinecap="round" />
      {[20, 140].map((x) => (
        <g key={x}>
          <rect x={x - 12} y="116" width="24" height="7" rx="2" fill="#d99a58" stroke={OL} strokeWidth="2" />
          <path d={`M${x - 8} 123 V138 M${x + 8} 123 V138`} stroke="#8a5222" strokeWidth="3.4" strokeLinecap="round" />
        </g>
      ))}
    </Sprite>
  );
}

/** Market umbrella on a pole (Balogun). */
export function MarketUmbrellaSprite({ w, flip, a = '#e8341c', b = '#fff4e0' }: { w: number; flip?: boolean; a?: string; b?: string }) {
  return (
    <Sprite w={w} vb={[130, 120]} flip={flip}>
      <Shadow cx={65} cy={114} rx={44} />
      <rect x="62" y="30" width="6" height="84" fill="#5a3a1e" stroke={OL} strokeWidth="1.4" />
      <path d="M6 44 Q65 -10 124 44 Z" fill={a} stroke={OL} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M6 44 Q30 4 44 26 Q50 2 65 20 Q80 2 86 26 Q100 4 124 44" fill="none" stroke={OL} strokeWidth="2" />
      <path d="M28 44 Q34 14 44 26 L52 44 Z M78 44 L86 26 Q96 14 102 44 Z" fill={b} />
      <rect x="40" y="88" width="50" height="22" rx="3" fill="#c98a4a" stroke={OL} strokeWidth="2.2" />
      {[50, 65, 80].map((x, i) => (
        <circle key={x} cx={x} cy="86" r="7" fill={['#e8301c', '#ff9a1a', '#3fae2a'][i]} stroke={OL} strokeWidth="1.8" />
      ))}
    </Sprite>
  );
}

export function SkylineSprite({ w, flip }: { w: number; flip?: boolean }) {
  const towers: [number, number, number, string][] = [
    [6, 110, 40, '#8fa6d6'],
    [44, 40, 44, '#a7bce6'],
    [86, 80, 36, '#7f97cc'],
    [120, 20, 48, '#9db3e0'],
    [166, 70, 38, '#8aa2d4'],
    [202, 100, 46, '#a7bce6'],
    [246, 60, 34, '#8fa6d6'],
  ];
  return (
    <Sprite w={w} vb={[290, 240]} flip={flip}>
      {towers.map(([x, top, tw, c], i) => (
        <g key={i}>
          <rect x={x} y={top} width={tw} height={236 - top} fill={c} stroke="#4a5a8a" strokeWidth="2.4" />
          {Array.from({ length: Math.floor((226 - top) / 16) }, (_, r) => (
            <rect key={r} x={x + 6} y={top + 10 + r * 16} width={tw - 12} height="6" fill="#eef4ff" opacity=".6" />
          ))}
        </g>
      ))}
      <path d="M144 20 V2" stroke="#4a5a8a" strokeWidth="3" />
      <circle cx="144" cy="2" r="3" fill="#e8341c" />
    </Sprite>
  );
}

/** Cable-stayed link bridge over the lagoon. */
export function BridgeSprite({ w, flip }: { w: number; flip?: boolean }) {
  const cables = [-140, -110, -80, -50, -24, 24, 50, 80, 110, 140];
  return (
    <Sprite w={w} vb={[340, 190]} flip={flip}>
      {[60, 280].map((x) => (
        <rect key={x} x={x - 6} y="150" width="12" height="36" fill="#d5dbe6" stroke="#5a6788" strokeWidth="2" />
      ))}
      {cables.map((dx) => (
        <path key={dx} d={`M170 ${26 + Math.abs(dx) / 10} L${170 + dx} 142`} stroke="#eef2f8" strokeWidth="2.2" />
      ))}
      <path d="M156 186 L164 14 L176 14 L184 186 Z" fill="#f4f6fb" stroke="#5a6788" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M162 6 L170 0 L178 6 L176 16 L164 16 Z" fill="#f4f6fb" stroke="#5a6788" strokeWidth="2.2" />
      <rect x="0" y="140" width="340" height="12" fill="#f4f6fb" stroke="#5a6788" strokeWidth="2.4" />
      <path d="M0 146 H340" stroke="#c9d3e8" strokeWidth="2" strokeDasharray="10 8" />
    </Sprite>
  );
}

export function BoatSprite({ w, flip }: { w: number; flip?: boolean }) {
  return (
    <Sprite w={w} vb={[120, 70]} flip={flip}>
      <path d="M8 38 H112 L100 58 Q98 62 92 62 H24 Q18 62 16 58 Z" fill="#e8341c" stroke={OL} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M12 44 H108" stroke="#fff" strokeWidth="4" />
      <rect x="40" y="18" width="40" height="20" rx="3" fill="#fff6e3" stroke={OL} strokeWidth="2.4" />
      {[46, 58, 70].map((x) => (
        <rect key={x} x={x} y="23" width="7" height="7" fill="#9fd8ff" stroke={OL} strokeWidth="1.2" />
      ))}
      <path d="M60 18 V4 L74 9 L60 13" fill="#3fae2a" stroke={OL} strokeWidth="1.8" />
      <path d="M2 66 Q14 60 26 66 T50 66 T74 66 T98 66 T120 66" stroke="#fff" strokeWidth="2.4" fill="none" opacity=".8" />
    </Sprite>
  );
}

/** Beachside suya grill with skewers and smoke. */
export function GrillSprite({ w, flip }: { w: number; flip?: boolean }) {
  return (
    <Sprite w={w} vb={[130, 130]} flip={flip}>
      <Shadow cx={64} cy={124} rx={46} />
      <path d="M40 22 C34 14 44 8 38 0 M64 20 C58 12 68 6 62 -2 M88 22 C82 14 92 8 86 0" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".75" />
      <path d="M36 82 L26 122 M92 82 L102 122 M64 86 V122" stroke={OL} strokeWidth="7" strokeLinecap="round" />
      <path d="M36 82 L26 122 M92 82 L102 122 M64 86 V122" stroke="#55565c" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M12 52 H116 L106 84 Q104 88 98 88 H30 Q24 88 22 84 Z" fill="#3a3f48" stroke={OL} strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M16 52 H112" stroke="#ff7a1a" strokeWidth="6" />
      <path d="M20 50 H108" stroke="#ffd23a" strokeWidth="2" />
      <image href={foodImage(4)} x="18" y="14" width="50" height="50" />
      <image href={foodImage(4)} x="62" y="14" width="50" height="50" />
    </Sprite>
  );
}

export function DrumSprite({ w, flip }: { w: number; flip?: boolean }) {
  return (
    <Sprite w={w} vb={[80, 100]} flip={flip}>
      <Shadow cx={40} cy={94} rx={26} />
      <path d="M14 18 H66 L56 62 L64 92 H16 L24 62 Z" fill="#a8672f" stroke={OL} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M18 24 L40 58 L62 24 M22 34 L40 58 L58 34" stroke="#f2e0b8" strokeWidth="1.8" fill="none" />
      <path d="M24 62 H56" stroke={OL} strokeWidth="2.4" />
      <path d="M20 80 H60" stroke="#e8341c" strokeWidth="5" />
      <ellipse cx="40" cy="18" rx="27" ry="8" fill="#f2e0b8" stroke={OL} strokeWidth="2.6" />
    </Sprite>
  );
}

export function BuntingSprite({ w }: { w: number }) {
  const colors = ['#e8341c', '#ffc93a', '#3fae2a', '#1f6fd8', '#ff8a1e', '#c45fae'];
  const flags = 13;
  return (
    <Sprite w={w} vb={[400, 60]}>
      <path d="M0 6 Q200 46 400 6" stroke={OL} strokeWidth="2.4" fill="none" />
      {Array.from({ length: flags }, (_, i) => {
        const t = (i + 0.5) / flags;
        const x = 400 * t;
        const y = 6 + 80 * t * (1 - t);
        return <path key={i} d={`M${x - 10} ${y} L${x} ${y + 22} L${x + 10} ${y} Z`} fill={colors[i % colors.length]} stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />;
      })}
    </Sprite>
  );
}

/** Grand carnival gate at the end of the road. */
export function GateSprite({ w }: { w: number }) {
  const flag = (x: number, c: string) => (
    <g key={x}>
      <path d={`M${x} 34 V6`} stroke={OL} strokeWidth="2.4" />
      <path d={`M${x} 6 L${x + 18} 12 L${x} 18 Z`} fill={c} stroke={OL} strokeWidth="1.6" />
    </g>
  );
  return (
    <Sprite w={w} vb={[300, 210]}>
      <Shadow cx={150} cy={204} rx={140} ry={10} />
      {[20, 252].map((x) => (
        <g key={x}>
          <rect x={x} y="60" width="28" height="142" fill="#e8b84a" stroke={OL} strokeWidth="2.8" />
          {[80, 110, 140, 170].map((y) => (
            <path key={y} d={`M${x} ${y} L${x + 14} ${y + 12} L${x + 28} ${y}`} stroke="#c43c22" strokeWidth="3" fill="none" />
          ))}
          <rect x={x - 6} y="52" width="40" height="12" rx="3" fill="#c98a4a" stroke={OL} strokeWidth="2.4" />
        </g>
      ))}
      <path d="M10 70 Q150 -10 290 70 L290 92 Q150 16 10 92 Z" fill="#7b3fc4" stroke={OL} strokeWidth="3" strokeLinejoin="round" />
      <rect x="62" y="40" width="176" height="40" rx="10" fill="#c43c22" stroke={OL} strokeWidth="3" />
      <text x="150" y="68" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="22" fill="#fff3a0" stroke={OL} strokeWidth="1" paintOrder="stroke">
        FOOD CARNIVAL
      </text>
      {flag(34, '#3fae2a')}
      {flag(266, '#ffc93a')}
      {[30, 70, 110, 150, 190, 230, 270].map((x, i) => (
        <circle key={x} cx={x} cy={84 - Math.sin((x / 300) * Math.PI) * 44} r="5" fill={['#ffe066', '#ff7a5c', '#8be65a', '#5fb6ff'][i % 4]} stroke={OL} strokeWidth="1.4" />
      ))}
    </Sprite>
  );
}

export function BasketSprite({ w }: { w: number }) {
  return <img src={OBSTACLE_ART.basket} width={w} height={w} alt="" draggable={false} />;
}

export function CratesSprite({ w }: { w: number }) {
  const s = w * 0.62;
  return (
    <span style={{ position: 'relative', display: 'block', width: w, height: w * 0.9 }}>
      <img src={OBSTACLE_ART.crate[2]} width={s} height={s} alt="" style={{ position: 'absolute', left: 0, bottom: 0 }} draggable={false} />
      <img src={OBSTACLE_ART.crate[3]} width={s} height={s} alt="" style={{ position: 'absolute', right: 0, bottom: 0 }} draggable={false} />
      <img src={OBSTACLE_ART.basket} width={s * 0.9} height={s * 0.9} alt="" style={{ position: 'absolute', left: w * 0.2, top: 0 }} draggable={false} />
    </span>
  );
}
