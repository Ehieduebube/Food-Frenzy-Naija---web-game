import { completedCount, totalStars, type SaveData } from './saveSchema';

export type AchievementIcon = 'plate' | 'map' | 'star' | 'combo' | 'rocket' | 'blast' | 'fire' | 'crate' | 'pot' | 'gift' | 'trophy';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  target: number;
  coins: number;
  icon: AchievementIcon;
  value: (save: SaveData) => number;
}

const levelDone = (save: SaveData, id: number) => (save.levels[String(id)]?.completed ? 1 : 0);
const threeStarLevels = (save: SaveData) => Object.values(save.levels).filter((l) => l.stars === 3).length;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-bite', title: 'First Bite', description: 'Complete level 1', target: 1, coins: 25, icon: 'plate', value: (s) => levelDone(s, 1) },
  { id: 'regular', title: 'Buka Regular', description: 'Complete 5 levels', target: 5, coins: 50, icon: 'plate', value: completedCount },
  { id: 'mainland', title: 'Mainland Foodie', description: 'Finish Lagos Mainland (level 10)', target: 1, coins: 100, icon: 'map', value: (s) => levelDone(s, 10) },
  { id: 'balogun', title: 'Market Master', description: 'Finish Balogun Market (level 20)', target: 1, coins: 150, icon: 'map', value: (s) => levelDone(s, 20) },
  { id: 'lekki', title: 'Festival Star', description: 'Finish Lekki Food Festival (level 30)', target: 1, coins: 200, icon: 'map', value: (s) => levelDone(s, 30) },
  { id: 'champion', title: 'Naija Food Champion', description: 'Complete all 40 levels', target: 40, coins: 500, icon: 'trophy', value: completedCount },
  { id: 'three-star', title: 'Three-Star Chef', description: 'Earn 3 stars on any level', target: 1, coins: 40, icon: 'star', value: threeStarLevels },
  { id: 'perfectionist', title: 'Perfectionist', description: 'Earn 3 stars on 15 levels', target: 15, coins: 200, icon: 'star', value: threeStarLevels },
  { id: 'stars-50', title: 'Star Collector', description: 'Earn 50 stars', target: 50, coins: 150, icon: 'star', value: totalStars },
  { id: 'combo-5', title: 'Cascade Craze', description: 'Chain a 5x cascade combo', target: 5, coins: 60, icon: 'combo', value: (s) => s.stats.bestCascade },
  { id: 'rockets', title: 'Rocket Scientist', description: 'Set off 25 Dodo Rockets', target: 25, coins: 80, icon: 'rocket', value: (s) => s.stats.rocketsActivated },
  { id: 'blasts', title: 'Blast Master', description: 'Set off 15 Jollof Blasts', target: 15, coins: 80, icon: 'blast', value: (s) => s.stats.blastsActivated },
  { id: 'fires', title: 'Fire Starter', description: 'Set off 10 Suya Fires', target: 10, coins: 100, icon: 'fire', value: (s) => s.stats.firesActivated },
  { id: 'combos', title: 'Power Couple', description: 'Swap two power-ups together 5 times', target: 5, coins: 100, icon: 'combo', value: (s) => s.stats.specialCombos },
  { id: 'cleaner', title: 'Market Cleaner', description: 'Clear 100 obstacles', target: 100, coins: 120, icon: 'crate', value: (s) => s.stats.obstaclesCleared },
  { id: 'helper', title: "Mama's Helper", description: 'Use 5 boosters', target: 5, coins: 50, icon: 'pot', value: (s) => s.stats.boostersUsed },
  { id: 'loyal', title: 'Loyal Customer', description: 'Claim 7 daily rewards', target: 7, coins: 100, icon: 'gift', value: (s) => s.stats.dailyClaims },
  { id: 'challenger', title: 'Daily Challenger', description: 'Complete 3 daily challenges', target: 3, coins: 120, icon: 'trophy', value: (s) => s.stats.challengesCompleted },
  { id: 'big-score', title: 'Big Chop', description: 'Score 25,000 in a single level', target: 25000, coins: 100, icon: 'trophy', value: (s) => s.stats.bestScore },
];

export function achievementProgress(def: AchievementDef, save: SaveData): { value: number; done: boolean } {
  const value = Math.min(def.value(save), def.target);
  return { value, done: value >= def.target };
}

/** Achievements whose target is met but which are not yet recorded as unlocked. */
export function newlyUnlocked(save: SaveData): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !save.achievements[a.id] && achievementProgress(a, save).done);
}

export function unclaimedCount(save: SaveData): number {
  return Object.values(save.achievements).filter((a) => !a.claimed).length;
}
