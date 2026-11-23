// The CLI and runtime use the same inputs AND calculation, rather than copied constants.
import { cycleSpan } from './Planning';

export function rotationSpan(scale: number) {
  return cycleSpan(scale);
}

export const smoothMarket = (t: number) => t * t * (3 - 2 * t);

function sample(seed: number, key: number, turn: number, channel: number) {
  let value = seed ^ key ^ Math.imul(turn, 0x9e3779b1) ^ Math.imul(channel, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

// Each trough can move within its own window. Neighbours stay ordered, but their spacing and the
// peak's timing and duration vary. Each cycle ends where the next one starts.
export function marketWave(seed: number, key: number, time: number) {
  const period = 82 + sample(seed, key, 0, 1) * 38;
  const age = time + sample(seed, key, 0, 2) * period;
  const valley = (turn: number) => (turn + sample(seed, key, turn, 3) * 0.48) * period;
  const low = (turn: number) => -0.68 - sample(seed, key, turn, 4) * 0.32;
  const slot = Math.floor(age / period);
  const turn = age < valley(slot) ? slot - 1 : slot;
  const from = valley(turn);
  const t = (age - from) / (valley(turn + 1) - from);
  const hold = 0.05 + sample(seed, key, turn, 5) * 0.15;
  const rise = (1 - hold) * (0.2 + sample(seed, key, turn, 6) * 0.6);
  const high = 0.72 + sample(seed, key, turn, 7) * 0.28;
  if (t < rise) {
    const bottom = low(turn);
    return bottom + (high - bottom) * smoothMarket(t / rise);
  }
  if (t < rise + hold) return high;
  return high + (low(turn + 1) - high) * smoothMarket((t - rise - hold) / (1 - rise - hold));
}
