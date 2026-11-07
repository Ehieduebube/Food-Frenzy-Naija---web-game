import { useId } from 'react';

/** "Mama Put", the friendly food-stall owner who guides the player. Original character art. */
export function Mama({ size = 96, mood = 'happy' }: { size?: number; mood?: 'happy' | 'wink' | 'cheer' }) {
  const id = useId().replace(/:/g, '');
  const skin = '#8a4f27';
  const skinLight = '#a5643a';
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`${id}c`}>
          <circle cx="60" cy="60" r="57" />
        </clipPath>
        <pattern id={`${id}a`} width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#1f4fb8" />
          <circle cx="7" cy="7" r="4.6" fill="#ffc93a" />
          <circle cx="7" cy="7" r="1.8" fill="#e2361a" />
          <path d="M0 0l3 3M14 0l-3 3M0 14l3-3M14 14l-3-3" stroke="#ff8a1e" strokeWidth="1.6" />
        </pattern>
        <pattern id={`${id}g`} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
          <rect width="16" height="16" fill="#f2a218" />
          <path d="M0 8h16" stroke="#1f4fb8" strokeWidth="3" />
          <circle cx="8" cy="3" r="2" fill="#e2361a" />
          <circle cx="0" cy="13" r="2" fill="#fff3c0" />
          <circle cx="16" cy="13" r="2" fill="#fff3c0" />
        </pattern>
        <radialGradient id={`${id}bg`} cx="50%" cy="40%" r="65%">
          <stop offset="0" stopColor="#fff2c8" />
          <stop offset="1" stopColor="#ffbf6a" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect width="120" height="120" fill={`url(#${id}bg)`} />
        {/* shoulders and blouse */}
        <path d="M8 124C12 96 32 86 60 86s48 10 52 38z" fill={`url(#${id}a)`} stroke="#3d1705" strokeWidth="2.4" />
        <path d="M44 87c4 9 28 9 32 0" fill={skin} stroke="#3d1705" strokeWidth="2" />
        <path d="M49 74h22v14c-6 5-16 5-22 0z" fill={skin} />
        {/* coral bead necklace */}
        {[44, 50, 56, 62, 68, 74].map((x, i) => (
          <circle key={x} cx={x + 1} cy={90 + Math.sin((i / 5) * Math.PI) * 5} r="2.8" fill="#e8401c" stroke="#7a1a06" strokeWidth=".8" />
        ))}
        {/* ears + gold earrings */}
        <ellipse cx="36.5" cy="62" rx="4.5" ry="6" fill={skin} stroke="#3d1705" strokeWidth="1.6" />
        <ellipse cx="83.5" cy="62" rx="4.5" ry="6" fill={skin} stroke="#3d1705" strokeWidth="1.6" />
        <circle cx="36" cy="72" r="4.6" fill="none" stroke="#ffc93a" strokeWidth="2.4" />
        <circle cx="84" cy="72" r="4.6" fill="none" stroke="#ffc93a" strokeWidth="2.4" />
        {/* face */}
        <ellipse cx="60" cy="61" rx="23" ry="25" fill={skin} stroke="#3d1705" strokeWidth="2.2" />
        <ellipse cx="54" cy="52" rx="10" ry="6" fill={skinLight} opacity=".55" />
        {/* eyes */}
        {mood === 'happy' || mood === 'cheer' ? (
          <>
            <path d="M46 60q5-6 10 0" fill="none" stroke="#2a1005" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M64 60q5-6 10 0" fill="none" stroke="#2a1005" strokeWidth="2.6" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="51" cy="58.5" rx="4.2" ry="4.8" fill="#fff" stroke="#2a1005" strokeWidth="1.2" />
            <circle cx="51.5" cy="59" r="2.6" fill="#2a1005" />
            <circle cx="52.5" cy="57.8" r=".9" fill="#fff" />
            <path d="M64 60q5-6 10 0" fill="none" stroke="#2a1005" strokeWidth="2.6" strokeLinecap="round" />
          </>
        )}
        <path d="M45 51q5-3 10-1M65 50q5-2 10 1" fill="none" stroke="#2a1005" strokeWidth="2" strokeLinecap="round" />
        {/* nose, cheeks, smile */}
        <path d="M57 66q3 3 6 0" fill="none" stroke="#4a2008" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="45" cy="68" r="4.5" fill="#e8504a" opacity=".3" />
        <circle cx="75" cy="68" r="4.5" fill="#e8504a" opacity=".3" />
        <path d={mood === 'cheer' ? 'M49 72q11 13 22 0z' : 'M50 73q10 9 20 0z'} fill="#7a1408" stroke="#2a1005" strokeWidth="1.8" strokeLinejoin="round" />
        <path d={mood === 'cheer' ? 'M51 73.5h18l-1 2.5H52z' : 'M52 74h16l-1 2H53z'} fill="#fff" />
        {/* gele (head wrap) */}
        <path d="M34 50c0-16 12-26 26-26s26 10 26 26c-8-6-17-8-26-8s-18 2-26 8z" fill={`url(#${id}g)`} stroke="#3d1705" strokeWidth="2.2" />
        <path d="M30 40c-8-14 6-30 22-28 6-12 30-12 34 2 16-2 22 16 12 26-6-4-14-8-20-8-4-8-16-10-22-4-8-2-18 4-26 12z" fill={`url(#${id}g)`} stroke="#3d1705" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M44 22c6 4 10 10 12 16M70 16c-2 8-2 14 0 20M88 26c-6 2-10 8-12 12" fill="none" stroke="#3d1705" strokeWidth="1.6" opacity=".6" />
        <path d="M38 22c4-6 10-8 14-8" fill="none" stroke="#fff6d0" strokeWidth="2.4" strokeLinecap="round" opacity=".7" />
      </g>
      <circle cx="60" cy="60" r="57" fill="none" stroke="#3d1705" strokeWidth="3" />
    </svg>
  );
}
