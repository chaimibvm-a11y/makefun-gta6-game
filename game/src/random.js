// A small seeded random number generator (mulberry32) plus the helpers the city and the
// traffic use: pick one item, pick a number in a range, shuffle a list. The same seed gives
// the same city and the same traffic, which is what makes the screenshot scenes repeatable.

export function createRandom(seed) {
  let a = seed >>> 0;
  function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next: random,
    /** A number in [min, max). */
    range(min, max) {
      return min + random() * (max - min);
    },
    /** A whole number in [min, max]. */
    int(min, max) {
      return min + Math.floor(random() * (max - min + 1));
    },
    /** One item of a list. */
    pick(list) {
      return list[Math.floor(random() * list.length)];
    },
    /** True with the given probability. */
    chance(p) {
      return random() < p;
    },
    /** The list shuffled in place. */
    shuffle(list) {
      for (let i = list.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        const tmp = list[i];
        list[i] = list[j];
        list[j] = tmp;
      }
      return list;
    },
  };
}

/** Clamp a number into [min, max]. */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** The shortest signed turn from angle `from` to angle `to`, in (-PI, PI]. */
export function angleDiff(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Distance between two points. */
export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}
