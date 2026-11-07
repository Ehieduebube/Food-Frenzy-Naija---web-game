import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sanitizeSave, totalBestScore } from '../src/games/food-frenzy-naija/progress/saveSchema';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/** The exact origins the Vatar docs say must be allowed to frame the game. */
const LAGOSLIFE_FRAME_ANCESTORS = [
  'https://lagoslife.app',
  'https://www.lagoslife.app',
  'https://naijalife.app',
  'https://www.naijalife.app',
  'https://lagoslife.eliysites.com',
];

describe('LagosLife embedding and deployment config', () => {
  const vercel = JSON.parse(read('vercel.json')) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
  const all = vercel.headers.find((h) => h.source === '/(.*)');
  const header = (key: string) => all?.headers.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;

  it('sends CSP frame-ancestors for exactly the documented LagosLife origins on every path', () => {
    expect(header('Content-Security-Policy')).toBe(`frame-ancestors ${LAGOSLIFE_FRAME_ANCESTORS.join(' ')}`);
  });

  it('sends no X-Frame-Options header (it would block the LagosLife player)', () => {
    for (const rule of vercel.headers) for (const h of rule.headers) expect(h.key.toLowerCase()).not.toBe('x-frame-options');
    expect(read('index.html').toLowerCase()).not.toContain('x-frame-options');
  });

  it('loads the Vatar SDK from lagoslife.app with the documented tag, before the game script', () => {
    const html = read('index.html');
    const tag = '<script src="https://lagoslife.app/sdk/vatar-games-v1.js"></script>';
    expect(html.split(tag).length - 1).toBe(1);
    expect(html.indexOf(tag)).toBeLessThan(html.indexOf('<script type="module"'));
  });

  it('keeps no Vatar secret keys in the browser code', () => {
    for (const path of ['index.html', 'src/main.tsx', 'src/vatar/vatarPlatform.ts']) {
      expect(read(path)).not.toMatch(/vtr_(test|live|whsec)_[A-Za-z0-9]/);
    }
  });
});

describe('leaderboard score', () => {
  it('is the sum of best scores on completed levels', () => {
    const save = sanitizeSave({
      levels: {
        '1': { completed: true, stars: 3, bestScore: 5200, plays: 2 },
        '2': { completed: true, stars: 1, bestScore: 3100, plays: 1 },
        '3': { completed: false, stars: 0, bestScore: 0, plays: 4 },
      },
    });
    expect(totalBestScore(save)).toBe(8300);
    expect(totalBestScore(sanitizeSave(null))).toBe(0);
  });
});
