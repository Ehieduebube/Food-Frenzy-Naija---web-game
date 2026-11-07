/** UI icons (inline SVG). Monochrome icons use currentColor; coin and star are full colour. */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number | string };

const base = ({ size = '1em', ...rest }: P) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  focusable: false,
  ...rest,
});

export function CoinIcon(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12.6" r="10" fill="#b8740e" />
      <circle cx="12" cy="11.4" r="10" fill="#ffc93a" stroke="#8a5208" strokeWidth="1.2" />
      <circle cx="12" cy="11.4" r="7.2" fill="#ffdd6e" stroke="#e0a020" strokeWidth="1" />
      <path d="M8.8 15.4V7.4l6.4 8V7.4M7.4 10.3h9.2M7.4 12.5h9.2" stroke="#b8740e" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="8.6" cy="6.6" rx="2.6" ry="1.2" fill="#fff" opacity=".7" transform="rotate(-30 8.6 6.6)" />
    </svg>
  );
}

export function StarIcon({ filled = true, ...p }: P & { filled?: boolean }) {
  return (
    <svg {...base(p)}>
      <path
        d="M12 2.2l2.95 6.1 6.7.9-4.9 4.6 1.2 6.6L12 17.3l-5.95 3.1 1.2-6.6-4.9-4.6 6.7-.9z"
        fill={filled ? '#ffcf2e' : '#6b4a2e'}
        stroke={filled ? '#b06a06' : '#3d2614'}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {filled && <path d="M9.2 8.6l1.6-3.2" stroke="#fff6c0" strokeWidth="1.4" strokeLinecap="round" />}
    </svg>
  );
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const GearIcon = (p: P) => (
  <svg {...base(p)}>
    <path
      fill="currentColor"
      d="M10.3 2h3.4l.5 2.6a7.8 7.8 0 0 1 1.9 1.1l2.5-.9 1.7 2.9-2 1.7a7.8 7.8 0 0 1 0 2.2l2 1.7-1.7 2.9-2.5-.9a7.8 7.8 0 0 1-1.9 1.1l-.5 2.6h-3.4l-.5-2.6a7.8 7.8 0 0 1-1.9-1.1l-2.5.9-1.7-2.9 2-1.7a7.8 7.8 0 0 1 0-2.2l-2-1.7 1.7-2.9 2.5.9a7.8 7.8 0 0 1 1.9-1.1zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z"
    />
  </svg>
);
export const PauseIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="6" y="4.5" width="4.2" height="15" rx="1.4" fill="currentColor" />
    <rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4" fill="currentColor" />
  </svg>
);
export const PlayIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 4.6v14.8c0 .8.9 1.3 1.6.9l11.6-7.4c.6-.4.6-1.3 0-1.7L8.6 3.7C7.9 3.3 7 3.8 7 4.6z" fill="currentColor" />
  </svg>
);
export const SoundIcon = ({ muted, ...p }: P & { muted?: boolean }) => (
  <svg {...base(p)}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
    {muted ? <path d="M16 9.5l5 5m0-5l-5 5" {...stroke} /> : <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11" {...stroke} />}
  </svg>
);
export const MusicIcon = ({ muted, ...p }: P & { muted?: boolean }) => (
  <svg {...base(p)}>
    <path d="M9 17.5V5.5l10-2v12" {...stroke} />
    <circle cx="6.6" cy="17.6" r="2.6" fill="currentColor" />
    <circle cx="16.6" cy="15.6" r="2.6" fill="currentColor" />
    {muted && <path d="M3 3l18 18" {...stroke} />}
  </svg>
);
export const BackIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M14.5 5l-7 7 7 7" {...stroke} strokeWidth={3} />
  </svg>
);
export const CloseIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" {...stroke} strokeWidth={3} />
  </svg>
);
export const LockIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.4" fill="currentColor" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...stroke} />
  </svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" {...stroke} strokeWidth={3.2} />
  </svg>
);
export const TrophyIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 3.5h10v5a5 5 0 0 1-10 0z" fill="currentColor" />
    <path d="M7 5.5H4.2a3 3 0 0 0 3.3 4.4M17 5.5h2.8a3 3 0 0 1-3.3 4.4" {...stroke} strokeWidth={1.8} />
    <path d="M12 13.5v3.5M8.5 20.5h7l-.8-3.5H9.3z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);
export const PodiumIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M8.5 9.5h7V21h-7zM2 13.5h6.5V21H2zM15.5 15.5H22V21h-6.5z" fill="currentColor" />
    <path d="M12 2.4l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" fill="currentColor" />
  </svg>
);
export const GiftIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="9" width="17" height="4" rx="1" fill="currentColor" />
    <rect x="5" y="13" width="14" height="8" rx="1" fill="currentColor" opacity=".85" />
    <path d="M12 9v12" stroke="#fff" strokeWidth="2" opacity=".5" />
    <path d="M12 9c-2-4-6-4.5-6-2s4 2 6 2c2 0 6 .5 6-2s-4-2-6 2z" {...stroke} strokeWidth={1.8} />
  </svg>
);
export const CalendarIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="currentColor" opacity=".9" />
    <rect x="3.5" y="5" width="17" height="4.5" rx="2" fill="currentColor" />
    <path d="M8 3v4M16 3v4" {...stroke} />
    <path d="M10.2 12.5l1.8-1v6.5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const ShopIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" fill="currentColor" />
    <path d="M8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5" {...stroke} strokeWidth={2} />
  </svg>
);
export const RetryIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M19 12a7 7 0 1 1-2.1-5" {...stroke} strokeWidth={2.8} />
    <path d="M18.5 3.5v4.4h-4.4" {...stroke} strokeWidth={2.8} />
  </svg>
);
export const MapIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 6.5l5-2 7 2.5 5-2v13l-5 2-7-2.5-5 2z" fill="currentColor" opacity=".9" />
    <path d="M8.5 4.5v13M15.5 7v13" stroke="#fff" strokeWidth="1.4" opacity=".5" />
  </svg>
);
export const HomeIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 11.5L12 4l8.5 7.5" {...stroke} strokeWidth={2.6} />
    <path d="M6 10.5V20h4.5v-5h3v5H18v-9.5" fill="currentColor" />
  </svg>
);
export const ExitIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" {...stroke} />
    <path d="M14 8l4 4-4 4M18 12H9" {...stroke} />
  </svg>
);
export const BoltIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M13.5 2.5L5 13.5h6l-1 8 8.5-11h-6z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
  </svg>
);
export const PlusIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" {...stroke} strokeWidth={3.4} />
  </svg>
);
export const HandIcon = (p: P) => (
  <svg {...base(p)} viewBox="0 0 32 32">
    <path
      d="M11 15V6.5a2.2 2.2 0 0 1 4.4 0V13l.1-1.4a2.1 2.1 0 0 1 4.2.2v1.6a2.1 2.1 0 0 1 4.2 0v2.2a2 2 0 0 1 3.9.4v5.6c0 4.6-3.4 7.9-8 7.9h-1.4c-3 0-4.9-1.3-6.6-3.6l-4.2-6c-.9-1.3-.4-2.9.9-3.4 1-.4 2.1 0 2.7.8z"
      fill="#fff"
      stroke="#3d1705"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);
