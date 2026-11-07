/** Animation timings in ms. Reduced motion shortens everything but keeps the same order of events. */
export interface Timing {
  swap: number;
  phase: number;
  chainGap: number;
  shuffle: number;
  banner: number;
  fall: (rows: number) => number;
  hintDelay: number;
}

export const NORMAL_TIMING: Timing = {
  swap: 170,
  phase: 250,
  chainGap: 190,
  shuffle: 460,
  banner: 700,
  fall: (rows) => Math.round(120 + 72 * Math.sqrt(Math.max(1, rows))),
  hintDelay: 7000,
};

export const REDUCED_TIMING: Timing = {
  swap: 90,
  phase: 140,
  chainGap: 110,
  shuffle: 220,
  banner: 450,
  fall: (rows) => Math.round(80 + 30 * Math.sqrt(Math.max(1, rows))),
  hintDelay: 7000,
};
