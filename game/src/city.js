// Solmar City itself: the road grid, the blocks between the roads, the buildings, parks,
// beach and the named landmarks, plus every query the cars and the people need to move
// around it — what is road, what is solid, where the intersections are, how to slide along
// a wall. The city is generated from a seed, so the same seed gives the same city.

import { WORLD, PALETTE } from './config.js';
import { clamp } from './random.js';

/** Centres of the vertical roads, and of the horizontal ones (the last is the beachfront drive). */
export const V_ROADS = [300, 900, 1500, 2100, 2700, 3300, 3900, 4500];
export const H_ROADS = [300, 800, 1300, 1800, 2300, 2750];
export const BEACH_ROAD_Y = 3050;
const ROAD_HALF = 48;
const BEACH_ROAD_HALF = 40;
const SAND_Y = 3130;
const WATER_Y = 3420;

function blockSpans(roads, half, limit) {
  const edges = [0];
  for (const c of roads) {
    edges.push(c - half, c + half);
  }
  edges.push(limit);
  const spans = [];
  for (let i = 0; i < edges.length - 1; i += 1) {
    const a = edges[i];
    const b = edges[i + 1];
    if (b - a > 100) spans.push([a, b]);
  }
  return spans;
}

export function createCity(random) {
  const colSpans = blockSpans(V_ROADS, ROAD_HALF, WORLD.width);
  const rowSpans = blockSpans([...H_ROADS, BEACH_ROAD_Y], BEACH_ROAD_HALF, WORLD.height);
  // The last row span before the beach is the beachfront row; the beach itself is not a block.
  const blocks = [];
  for (let r = 0; r < rowSpans.length; r += 1) {
    for (let c = 0; c < colSpans.length; c += 1) {
      const [x0, x1] = colSpans[c];
      const [y0, y1] = rowSpans[r];
      if (y0 >= SAND_Y) continue;
      blocks.push({ c, r, x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 });
    }
  }

  // Named places, by block column and row. Each one is a whole block with its own look.
  const landmarkDefs = [
    { c: 1, r: 1, name: "Mara's Garage", kind: 'garage' },
    { c: 7, r: 1, name: 'Solmar General', kind: 'hospital' },
    { c: 4, r: 2, name: 'Precinct 7', kind: 'precinct' },
    { c: 5, r: 3, name: 'Casino Solmar', kind: 'casino' },
    { c: 3, r: 3, name: 'Coral Plaza', kind: 'park' },
    { c: 2, r: 5, name: 'The Hideout', kind: 'hideout' },
    { c: 8, r: 3, name: 'The Docks', kind: 'docks' },
    { c: 8, r: 4, name: 'The Docks', kind: 'docks' },
  ];
  const landmarks = [];
  const landmarkAt = new Map();
  for (const def of landmarkDefs) {
    const block = blocks.find((b) => b.c === def.c && b.r === def.r);
    if (!block) continue;
    const lm = { ...def, x0: block.x0, y0: block.y0, x1: block.x1, y1: block.y1, cx: block.cx, cy: block.cy };
    landmarks.push(lm);
    landmarkAt.set(`${def.c},${def.r}`, lm);
  }
  const landmark = (name) => landmarks.find((l) => l.name === name);

  const buildings = [];
  const parks = [];
  const parkingLots = [];
  for (const block of blocks) {
    const lm = landmarkAt.get(`${block.c},${block.r}`);
    if (lm) {
      if (lm.kind === 'park') {
        parks.push({ x0: block.x0, y0: block.y0, x1: block.x1, y1: block.y1, plaza: true, trees: scatterTrees(random, block, 9) });
      } else if (lm.kind === 'docks') {
        parkingLots.push({ x0: block.x0, y0: block.y0, x1: block.x1, y1: block.y1, docks: true });
      } else {
        const color = lm.kind === 'casino' ? PALETTE.casino : lm.kind === 'hospital' ? PALETTE.hospital : lm.kind === 'garage' ? PALETTE.garage : PALETTE.buildingRoof[3];
        buildings.push({
          x: block.x0 + 14, y: block.y0 + 14, w: block.x1 - block.x0 - 28, h: block.y1 - block.y0 - 28,
          color, height: lm.kind === 'casino' ? 26 : 14, label: lm.name, kind: lm.kind,
        });
      }
      continue;
    }
    const roll = random.next();
    if (roll < 0.14) {
      parks.push({ x0: block.x0, y0: block.y0, x1: block.x1, y1: block.y1, plaza: false, trees: scatterTrees(random, block, random.int(4, 8)) });
    } else if (roll < 0.24) {
      parkingLots.push({ x0: block.x0, y0: block.y0, x1: block.x1, y1: block.y1, docks: false });
    } else {
      fillBlockWithBuildings(random, block, buildings);
    }
  }

  // Intersections of the road grid, for traffic and police routes.
  const intersections = [];
  for (const vx of V_ROADS) {
    for (const hy of [...H_ROADS, BEACH_ROAD_Y]) {
      intersections.push({ x: vx, y: hy });
    }
  }

  const city = {
    buildings, parks, parkingLots, landmarks, intersections,
    landmark, blockSpans: { colSpans, rowSpans },
  };

  // ---- queries -------------------------------------------------------------

  city.isWater = (x, y) => y >= WATER_Y && x >= 0 && x <= WORLD.width;

  city.isRoad = (x, y) => {
    for (const vx of V_ROADS) if (Math.abs(x - vx) <= ROAD_HALF && y >= 0 && y <= BEACH_ROAD_Y + BEACH_ROAD_HALF) return true;
    for (const hy of H_ROADS) if (Math.abs(y - hy) <= ROAD_HALF && x >= 0 && x <= WORLD.width) return true;
    return Math.abs(y - BEACH_ROAD_Y) <= BEACH_ROAD_HALF && x >= 0 && x <= WORLD.width;
  };

  city.isBeach = (x, y) => y >= SAND_Y && y < WATER_Y;

  /** True when a circle of radius r at (x, y) hits a building, the water or the world's edge. */
  city.circleBlocked = (x, y, r) => {
    if (x - r < 0 || x + r > WORLD.width || y - r < 0 || y + r > WORLD.height) return true;
    if (y + r >= WATER_Y) return true;
    for (const b of buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
    }
    return false;
  };

  /** Move a circle by (dx, dy), sliding along walls instead of sticking to them. */
  city.moveCircle = (x, y, dx, dy, r) => {
    let nx = x + dx;
    if (!city.circleBlocked(nx, y, r)) x = nx;
    let ny = y + dy;
    if (!city.circleBlocked(x, ny, r)) y = ny;
    return { x, y };
  };

  /** The intersection nearest to (x, y). */
  city.nearestIntersection = (x, y) => {
    let best = intersections[0];
    let bestD = Infinity;
    for (const p of intersections) {
      const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  };

  /** A random point on a road, at least `minDist` from (fx, fy) when given. */
  city.randomRoadPoint = (fx, fy, minDist) => {
    for (let tries = 0; tries < 40; tries += 1) {
      const vertical = random.chance(0.5);
      let x;
      let y;
      if (vertical) {
        x = random.pick(V_ROADS) + random.range(-24, 24);
        y = random.range(60, BEACH_ROAD_Y);
      } else {
        x = random.range(60, WORLD.width - 60);
        y = random.pick([...H_ROADS, BEACH_ROAD_Y]) + random.range(-24, 24);
      }
      if (fx === undefined || Math.hypot(x - fx, y - fy) >= minDist) return { x, y };
    }
    return { x: 1500, y: 1300 };
  };

  /** A random point on a sidewalk beside a road (where pedestrians walk). */
  city.randomSidewalkPoint = () => {
    const vertical = random.chance(0.5);
    if (vertical) {
      const vx = random.pick(V_ROADS);
      return { x: vx + random.pick([-64, 64]), y: random.range(60, BEACH_ROAD_Y) };
    }
    const hy = random.pick([...H_ROADS, BEACH_ROAD_Y]);
    return { x: random.range(60, WORLD.width - 60), y: hy + random.pick([-64, 64]) };
  };

  /** A random parked-car spot inside a parking lot or on a road's edge. */
  city.randomParkedSpot = () => {
    if (parkingLots.length > 0 && random.chance(0.6)) {
      const lot = random.pick(parkingLots);
      return {
        x: random.range(lot.x0 + 40, lot.x1 - 40),
        y: random.range(lot.y0 + 40, lot.y1 - 40),
        angle: random.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]),
      };
    }
    const p = city.randomRoadPoint();
    return { x: p.x, y: p.y, angle: random.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]) };
  };

  return city;
}

function scatterTrees(random, block, count) {
  const trees = [];
  for (let i = 0; i < count; i += 1) {
    trees.push({
      x: random.range(block.x0 + 30, block.x1 - 30),
      y: random.range(block.y0 + 30, block.y1 - 30),
      r: random.range(10, 18),
    });
  }
  return trees;
}

function fillBlockWithBuildings(random, block, buildings) {
  const bw = block.x1 - block.x0;
  const bh = block.y1 - block.y0;
  const cols = bw > 380 ? 2 : 1;
  const rows = bh > 300 ? 2 : 1;
  const gap = 26;
  const cw = (bw - gap * (cols + 1)) / cols;
  const ch = (bh - gap * (rows + 1)) / rows;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const w = cw * random.range(0.72, 0.98);
      const h = ch * random.range(0.72, 0.98);
      const x = block.x0 + gap + c * (cw + gap) + (cw - w) / 2;
      const y = block.y0 + gap + r * (ch + gap) + (ch - h) / 2;
      buildings.push({
        x, y, w, h,
        color: random.pick(PALETTE.buildingRoof),
        height: random.int(6, 22),
        label: null, kind: 'building',
      });
    }
  }
}

/** Clamp a point into the world (used by the renderer for the beach and water bands). */
export function beachBands() {
  return { sandY: SAND_Y, waterY: WATER_Y };
}
