import { foodImage, SPECIAL_ART } from '../../art/foods';
import { BOOSTER_ART, OBSTACLE_ART, crateArt, oilArt, wrapArt } from '../../art/obstacles';
import type { TutorialId } from '../../levels/types';

export interface TutorialPage {
  title: string;
  text: string;
  art: string[];
}

/** Short, skippable lessons shown the first time a level uses a new mechanic. */
export const TUTORIALS: Record<TutorialId, TutorialPage> = {
  swap: {
    title: 'Swipe to match',
    text: 'Swipe a food into its neighbour (or tap one, then the other) to line up 3 or more of the same kind. Watch the hand for a hint!',
    art: [foodImage(0), foodImage(0), foodImage(0)],
  },
  goals: {
    title: 'Meet your goals',
    text: 'Each level has goals at the top. Finish them all before your moves run out. Leftover moves turn into a bonus Owambe Finale!',
    art: [foodImage(1), foodImage(2)],
  },
  cascade: {
    title: 'Cascades',
    text: 'When food falls into new matches, they clear by themselves. Every cascade in a row raises your score multiplier.',
    art: [foodImage(3), foodImage(4), foodImage(3)],
  },
  ladle: {
    title: "Chef's Ladle",
    text: 'Stuck on one piece? Tap the ladle below the board, then tap any food to scoop it out. It also knocks a layer off obstacles. Boosters never cost a move.',
    art: [BOOSTER_ART.ladle],
  },
  shuffle: {
    title: 'Food Shuffle',
    text: 'If you cannot find a good move, Food Shuffle mixes the board up. When there are no moves at all, the board reshuffles for free.',
    art: [BOOSTER_ART.shuffle],
  },
  rocket: {
    title: 'Dodo Rocket',
    text: 'Match 4 in a line to make a Dodo Rocket. Match it (or swap it with another power-up) and it blasts a whole row or column. The arrows show which way it flies.',
    art: [foodImage(1), SPECIAL_ART.rocket],
  },
  blast: {
    title: 'Jollof Blast',
    text: 'Match in an L or T shape to make a Jollof Blast. When it goes off it clears a big area around it.',
    art: [foodImage(0), SPECIAL_ART.blast],
  },
  fire: {
    title: 'Suya Fire',
    text: 'Match 5 in a straight line to make Suya Fire. Swap it with any food to burn every piece of that food on the board!',
    art: [SPECIAL_ART.fire],
  },
  combo: {
    title: 'Power combos',
    text: 'Swap two power-ups together for a huge combo: Rocket + Rocket makes a cross, Rocket + Blast clears three rows and three columns, and Suya Fire + anything is spectacular.',
    art: [SPECIAL_ART.rocket, SPECIAL_ART.blast, SPECIAL_ART.fire],
  },
  moves: {
    title: 'Extra Moves',
    text: 'So close? Use Extra Moves for 5 more moves. You can also keep playing for coins when you run out.',
    art: [BOOSTER_ART.moves],
  },
  score: {
    title: 'Score goals',
    text: 'Some levels ask for points. Power-ups, cascades and combos score much more than plain matches.',
    art: [SPECIAL_ART.blast],
  },
  basket: {
    title: 'Food baskets',
    text: 'Baskets block their space. Make a match right next to a basket to clear it. Power-ups clear them too.',
    art: [OBSTACLE_ART.basket],
  },
  pot: {
    title: "Mama's Pot",
    text: "Mama's Pot clears a big 5×5 area and wipes out every obstacle layer in it. Save it for the toughest spots!",
    art: [BOOSTER_ART.pot],
  },
  wrap: {
    title: 'Leaf wraps',
    text: 'Wrapped food cannot be moved. Match it, or make a match next to it, to untie the leaves.',
    art: [foodImage(5), wrapArt(1)],
  },
  oil: {
    title: 'Palm-oil spills',
    text: 'Clean spills by making matches on top of them. Thick spills need two matches.',
    art: [oilArt(1), oilArt(2)],
  },
  crate: {
    title: 'Pepper crates',
    text: 'Crates take several hits. Each match next to a crate, or each power-up that reaches it, breaks one layer.',
    art: [crateArt(3), crateArt(2), crateArt(1)],
  },
  restricted: {
    title: 'Narrow spaces',
    text: 'Some boards have gaps. Food falls straight past them, so plan your matches around the shape.',
    art: [foodImage(4), foodImage(6)],
  },
};

