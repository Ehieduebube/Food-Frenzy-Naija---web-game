/** Full-colour artwork for the main menu: the wooden-board logo and the navigation icons. */

const OL = '#3d1705';

/** Wooden sign board with tropical leaves and a chef's hat (text is laid over it in HTML). */
export function LogoBoard() {
  const leaf = (x: number, y: number, rot: number, c: string, len = 120) => (
    <path
      key={`${x}-${rot}`}
      d={`M${x} ${y} q${len * 0.25} ${-len * 0.55} ${len * 0.05} ${-len} q${-len * 0.3} ${len * 0.45} ${-len * 0.05} ${len} Z`}
      transform={`rotate(${rot} ${x} ${y})`}
      fill={c}
      stroke="#1d6b26"
      strokeWidth="4"
      strokeLinejoin="round"
    />
  );
  return (
    <svg className="ffn-brand-board" viewBox="0 0 640 340" aria-hidden="true" focusable="false" overflow="visible">
      <defs>
        <linearGradient id="ffnb-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d08a44" />
          <stop offset=".55" stopColor="#a8622a" />
          <stop offset="1" stopColor="#7e4318" />
        </linearGradient>
        <linearGradient id="ffnb-plank" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a3c14" />
          <stop offset="1" stopColor="#4e220a" />
        </linearGradient>
      </defs>
      {/* leaves behind the board */}
      {leaf(70, 120, -70, '#2e9a3a', 150)}
      {leaf(80, 110, -40, '#3fb24a', 140)}
      {leaf(100, 100, -10, '#2e9a3a', 120)}
      {leaf(570, 120, 70, '#2e9a3a', 150)}
      {leaf(560, 110, 40, '#3fb24a', 140)}
      {leaf(540, 100, 10, '#2e9a3a', 120)}
      <circle cx="140" cy="78" r="13" fill="#e8301c" stroke={OL} strokeWidth="3" />
      <path d="M134 66 l6 -6 l6 6" stroke="#2e8a2a" strokeWidth="3" fill="none" />
      <path d="M498 74 c14 -4 22 10 14 20 c-6 8 -18 4 -18 -6 Z" fill="#ff9a1a" stroke={OL} strokeWidth="3" />
      {/* main board */}
      <path
        d="M36 112 Q28 84 62 80 L578 72 Q614 72 610 106 L616 248 Q618 284 584 288 L58 296 Q24 298 26 262 Z"
        fill="#3d1705"
        transform="translate(0 10)"
        opacity=".45"
      />
      <path
        d="M36 112 Q28 84 62 80 L578 72 Q614 72 610 106 L616 248 Q618 284 584 288 L58 296 Q24 298 26 262 Z"
        fill="url(#ffnb-wood)"
        stroke={OL}
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path d="M44 106 Q40 90 64 88 L576 80 Q600 80 600 100" stroke="#f2be7e" strokeWidth="6" fill="none" opacity=".7" strokeLinecap="round" />
      <path d="M34 168 Q320 160 612 162 M32 226 Q320 220 614 222" stroke="#6a3410" strokeWidth="4" fill="none" opacity=".55" />
      <path d="M70 140 q60 -8 120 0 M380 196 q70 -10 150 0 M110 260 q60 -8 110 0" stroke="#e8a862" strokeWidth="3" fill="none" opacity=".5" strokeLinecap="round" />
      {[
        [52, 104],
        [592, 98],
        [50, 274],
        [596, 268],
      ].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <circle cx={x} cy={y} r="7" fill="#5a3a1e" stroke={OL} strokeWidth="2" />
          <circle cx={x - 2} cy={y - 2} r="2" fill="#c9a06a" />
        </g>
      ))}
      {/* tagline plank */}
      <path d="M118 262 L526 254 Q540 254 540 268 L542 300 Q542 314 528 314 L114 322 Q100 322 100 308 L102 276 Q102 262 118 262 Z" fill="url(#ffnb-plank)" stroke={OL} strokeWidth="6" strokeLinejoin="round" />
      <path d="M116 270 L524 262" stroke="#9a5a2a" strokeWidth="3" opacity=".7" />
      {/* chef hat */}
      <g transform="translate(320 52)">
        <path d="M-52 12 C-74 8 -76 -26 -50 -30 C-46 -58 -10 -66 0 -44 C12 -66 48 -58 50 -30 C76 -26 74 8 52 12 Z" fill="#fff" stroke={OL} strokeWidth="6" strokeLinejoin="round" />
        <path d="M-30 -36 C-24 -46 -10 -46 -6 -38" stroke="#e3dccb" strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="-48" y="6" width="96" height="30" rx="6" fill="#fff" stroke={OL} strokeWidth="6" />
        <path d="M-24 10 V34 M0 10 V34 M24 10 V34" stroke="#ddd5c4" strokeWidth="4" />
      </g>
    </svg>
  );
}

/** Small gold burst beside the food row. */
export function Sparkle({ flip }: { flip?: boolean }) {
  return (
    <svg className="ffn-home-sparkle" viewBox="0 0 40 40" aria-hidden="true" focusable="false" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M8 20 H22 M10 8 L22 15 M10 32 L22 25" stroke="#ffc93a" strokeWidth="5" strokeLinecap="round" />
      <path d="M8 20 H22 M10 8 L22 15 M10 32 L22 25" stroke="#fff3a0" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function GiftArt() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M22 18 C10 4 2 20 30 22 M42 18 C54 4 62 20 34 22" stroke={OL} strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M22 18 C10 4 2 20 30 22 M42 18 C54 4 62 20 34 22" stroke="#ffc93a" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="10" y="30" width="44" height="28" rx="4" fill="#e8341c" stroke={OL} strokeWidth="3" />
      <rect x="6" y="20" width="52" height="14" rx="4" fill="#ff5a3c" stroke={OL} strokeWidth="3" />
      <rect x="28" y="20" width="8" height="38" fill="#ffc93a" stroke={OL} strokeWidth="2.4" />
      <path d="M12 24 H24" stroke="#fff" strokeWidth="3" opacity=".6" strokeLinecap="round" />
    </svg>
  );
}

export function CalendarArt({ day }: { day: number }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect x="8" y="12" width="48" height="46" rx="7" fill="#fff" stroke={OL} strokeWidth="3" />
      <path d="M8 26 V19 Q8 12 15 12 H49 Q56 12 56 19 V26 Z" fill="#e8341c" stroke={OL} strokeWidth="3" strokeLinejoin="round" />
      {[22, 42].map((x) => (
        <rect key={x} x={x - 3} y="5" width="6" height="14" rx="3" fill="#c9ced6" stroke={OL} strokeWidth="2.4" />
      ))}
      <text x="32" y="51" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="22" fill={OL}>
        {day}
      </text>
    </svg>
  );
}

export function BagArt() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M22 24 V18 Q22 8 32 8 Q42 8 42 18 V24" stroke={OL} strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M22 24 V18 Q22 8 32 8 Q42 8 42 18 V24" stroke="#ffc93a" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M10 22 H54 L50 56 Q50 60 46 60 H18 Q14 60 14 56 Z" fill="#ff5ab0" stroke={OL} strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 34 l3.5 7 7.5 1 -5.5 5 1.5 7.5 -7 -3.8 -7 3.8 1.5 -7.5 -5.5 -5 7.5 -1 Z" fill="#ffe066" stroke={OL} strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 28 L18 52" stroke="#fff" strokeWidth="3" opacity=".5" strokeLinecap="round" />
    </svg>
  );
}

export function TrophyArt() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M16 14 H6 Q4 30 22 34 M48 14 H58 Q60 30 42 34" stroke={OL} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M16 14 H6 Q4 30 22 34 M48 14 H58 Q60 30 42 34" stroke="#ffc93a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M16 8 H48 V24 Q48 42 32 42 Q16 42 16 24 Z" fill="#ffc93a" stroke={OL} strokeWidth="3" strokeLinejoin="round" />
      <path d="M22 12 V26 Q22 34 28 37" stroke="#fff3a0" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <rect x="28" y="42" width="8" height="8" fill="#e0a020" stroke={OL} strokeWidth="2.4" />
      <rect x="18" y="50" width="28" height="9" rx="2" fill="#a8622a" stroke={OL} strokeWidth="3" />
      <path d="M32 15 l2.4 5 5.4 0.8 -3.9 3.8 0.9 5.4 -4.8 -2.6 -4.8 2.6 0.9 -5.4 -3.9 -3.8 5.4 -0.8 Z" fill="#fff6c0" />
    </svg>
  );
}
