/** Original Lagos-inspired scenery: skyline, link bridge, market stalls, danfo bus and palms. */

function Palm({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M0 0 C4 -40 2 -80 14 -120" stroke="#7a4a1e" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M0 0 C4 -40 2 -80 14 -120" stroke="#a8672f" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="6 7" />
      {[-60, -20, 15, 50, 95, 140].map((a) => (
        <path
          key={a}
          d="M14 -120 q30 -18 62 6 q-34 -4 -62 -6z"
          fill={a % 40 === 0 ? '#2e9a3a' : '#3fb24a'}
          stroke="#1d6b26"
          strokeWidth="2"
          transform={`rotate(${a} 14 -120)`}
        />
      ))}
      <circle cx="12" cy="-116" r="5" fill="#6a3a12" />
      <circle cx="19" cy="-113" r="4.5" fill="#7a4a1e" />
    </g>
  );
}

function Umbrella({ x, y, a, b, s = 1 }: { x: number; y: number; a: string; b: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 V70" stroke="#5a3a1e" strokeWidth="4" />
      <path d="M-56 0 Q0 -50 56 0 Z" fill={a} stroke="#3d1705" strokeWidth="2.5" />
      <path d="M-56 0 Q-30 -40 -20 -19 Q-12 -46 0 -25 L0 0 Z M20 -19 Q30 -40 56 0 L20 0Z" fill={b} />
      <path d="M-56 0 Q0 -50 56 0" fill="none" stroke="#3d1705" strokeWidth="2.5" />
      {[-56, -28, 0, 28, 56].map((sx) => (
        <path key={sx} d={`M${sx - 14} 0 q7 8 14 0`} fill={a} stroke="#3d1705" strokeWidth="1.6" />
      ))}
    </g>
  );
}

function Danfo({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="85" cy="74" rx="92" ry="7" fill="#3d1705" opacity=".25" />
      <path d="M8 18 Q10 4 26 4 H150 Q166 4 170 22 L176 50 V64 H2 V30 Z" fill="#ffc81e" stroke="#3d1705" strokeWidth="3" strokeLinejoin="round" />
      <rect x="2" y="44" width="174" height="5" fill="#2a1a0a" />
      <rect x="2" y="54" width="174" height="4" fill="#2a1a0a" />
      {[20, 52, 84, 116].map((wx) => (
        <rect key={wx} x={wx} y="12" width="26" height="22" rx="3" fill="#bfe6ff" stroke="#3d1705" strokeWidth="2" />
      ))}
      <path d="M148 12 H160 Q166 14 168 32 H148 Z" fill="#bfe6ff" stroke="#3d1705" strokeWidth="2" />
      <rect x="168" y="40" width="9" height="6" rx="2" fill="#fff3a0" stroke="#3d1705" strokeWidth="1.5" />
      {[38, 140].map((wx) => (
        <g key={wx}>
          <circle cx={wx} cy="64" r="13" fill="#2a2a2a" stroke="#111" strokeWidth="2" />
          <circle cx={wx} cy="64" r="5.5" fill="#9aa3ad" />
        </g>
      ))}
    </g>
  );
}

/** Wide skyline strip for menus and the game background. */
export function LagosSkyline({ className }: { className?: string }) {
  const towers = [
    [560, 140, 46],
    [612, 100, 40],
    [658, 160, 34],
    [700, 120, 52],
    [760, 170, 30],
    [880, 130, 44],
    [930, 90, 38],
    [975, 150, 50],
    [1035, 115, 36],
    [1080, 165, 42],
  ];
  return (
    <svg className={className} viewBox="0 0 1200 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ffn-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2c98a" />
          <stop offset="1" stopColor="#d79a58" />
        </linearGradient>
        <linearGradient id="ffn-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7cc4ea" />
          <stop offset="1" stopColor="#3f8fc4" />
        </linearGradient>
      </defs>
      <circle cx="1000" cy="80" r="60" fill="#fff1b0" opacity=".45" />
      <circle cx="1000" cy="80" r="38" fill="#ffd96a" />
      {towers.map(([x, h, w], i) => (
        <g key={i}>
          <rect x={x} y={270 - h - 40} width={w} height={h + 40} fill={i % 2 ? '#8fa6d6' : '#9db3e0'} opacity=".85" />
          {Array.from({ length: Math.floor(h / 18) }, (_, r) => (
            <rect key={r} x={x + 6} y={270 - h - 30 + r * 18} width={w - 12} height="5" fill="#e8f0ff" opacity=".55" />
          ))}
        </g>
      ))}
      {/* cable-stayed link bridge */}
      <rect x="540" y="262" width="560" height="10" fill="#e9eef7" stroke="#6a7aa0" strokeWidth="2" />
      <path d="M816 272 V70 l8 -10 l8 10 V272" fill="#f4f6fb" stroke="#6a7aa0" strokeWidth="2.4" />
      {[-260, -210, -160, -110, -60, 60, 110, 160, 210, 260].map((dx) => (
        <path key={dx} d={`M824 ${80 + Math.abs(dx) / 8} L${824 + dx} 264`} stroke="#c9d3e8" strokeWidth="1.6" />
      ))}
      <rect x="0" y="270" width="1200" height="34" fill="url(#ffn-water)" />
      <path d="M0 286 q30 -5 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0" stroke="#bfe6ff" strokeWidth="2" fill="none" opacity=".6" />
      {/* left houses */}
      {[
        [10, 210, 70, '#f28a5a'],
        [78, 190, 60, '#7ac46a'],
        [136, 222, 76, '#f2c94a'],
        [210, 200, 58, '#5aa8d8'],
        [266, 230, 70, '#e86a8a'],
      ].map(([x, y, w, c], i) => (
        <g key={i}>
          <rect x={x as number} y={y as number} width={w as number} height={304 - (y as number)} fill={c as string} stroke="#3d1705" strokeWidth="2" />
          <path d={`M${(x as number) - 6} ${y} L${(x as number) + (w as number) / 2} ${(y as number) - 24} L${(x as number) + (w as number) + 6} ${y} Z`} fill="#b5482a" stroke="#3d1705" strokeWidth="2" />
          <rect x={(x as number) + 12} y={(y as number) + 18} width="16" height="16" fill="#fff6d8" stroke="#3d1705" strokeWidth="1.5" />
          <rect x={(x as number) + (w as number) - 28} y={(y as number) + 18} width="16" height="16" fill="#fff6d8" stroke="#3d1705" strokeWidth="1.5" />
        </g>
      ))}
      <rect x="0" y="300" width="1200" height="120" fill="url(#ffn-ground)" />
      <path d="M0 340 H1200" stroke="#c4864a" strokeWidth="3" strokeDasharray="30 22" opacity=".5" />
      <Umbrella x={110} y={312} a="#e8341c" b="#fff4e0" />
      <Umbrella x={250} y={318} a="#2e9a3a" b="#ffd23a" s={0.9} />
      <rect x="64" y="350" width="240" height="30" rx="4" fill="#a8672f" stroke="#3d1705" strokeWidth="2.5" />
      {[90, 128, 166, 204, 242, 278].map((cx, i) => (
        <circle key={cx} cx={cx} cy="346" r="10" fill={['#f26a2b', '#ffc93a', '#c45a22', '#e7a14c', '#8e3415', '#3aa84a'][i]} stroke="#3d1705" strokeWidth="2" />
      ))}
      <Danfo x={470} y={300} s={0.95} />
      <Umbrella x={980} y={316} a="#1f4fb8" b="#ffc93a" s={0.9} />
      <Palm x={1130} y={400} s={1.15} flip />
      <Palm x={1060} y={410} s={0.8} />
      <Palm x={30} y={410} s={1.05} />
    </svg>
  );
}
