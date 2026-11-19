// The people of Solmar City: pedestrians who walk the sidewalks and run from trouble,
// and the police officers who chase the player on foot when the wanted level is high.
// Nobody here is a copy of anyone: every pedestrian is a random stranger in a bright shirt.

import { PEDS, POLICE } from './config.js';
import { dist } from './random.js';

const SHIRTS = ['#e8e05a', '#5ad9a0', '#d95a8a', '#5a9ad9', '#e07b39', '#9a5ad9', '#c9c9c9', '#4da96b', '#d94f3d', '#3d7dd9'];
const SKINS = ['#e8b98a', '#c98d5f', '#8a5a3b', '#f0c8a0', '#a06a42'];

/** A pedestrian walking the sidewalks. */
export function createPedestrian(city, random, x, y) {
  const p = x === undefined ? city.randomSidewalkPoint() : { x, y };
  return {
    x: p.x, y: p.y,
    angle: random.range(0, Math.PI * 2),
    speed: random.range(PEDS.walkMin, PEDS.walkMax),
    color: random.pick(SHIRTS),
    skin: random.pick(SKINS),
    target: null,
    state: 'walk', // 'walk' | 'flee' | 'down'
    fleeTimer: 0,
    downTimer: 0,
    walkTimer: random.range(2, 6),
  };
}

export function spawnPedestrians(city, random, playerX, playerY) {
  const peds = [];
  for (let i = 0; i < PEDS.count; i += 1) {
    const p = city.randomSidewalkPoint();
    if (dist(p.x, p.y, playerX, playerY) < 200) continue;
    peds.push(createPedestrian(city, random, p.x, p.y));
  }
  return peds;
}

/** One pedestrian step: stroll the sidewalks, or run from a scare. */
export function updatePedestrian(ped, dt, city, random, threat) {
  if (ped.state === 'down') {
    ped.downTimer -= dt;
    if (ped.downTimer <= 0) ped.state = 'walk';
    return;
  }
  if (threat && dist(ped.x, ped.y, threat.x, threat.y) < PEDS.fleeRadius) {
    ped.state = 'flee';
    ped.fleeTimer = 2.2;
  }
  if (ped.state === 'flee') {
    ped.fleeTimer -= dt;
    if (ped.fleeTimer <= 0) ped.state = 'walk';
    // Run from the threat while it is there; keep running the same way once it is gone.
    const away = threat ? Math.atan2(ped.y - threat.y, ped.x - threat.x) : ped.angle;
    stepPerson(ped, away, PEDS.fleeSpeed, dt, city);
    return;
  }
  ped.walkTimer -= dt;
  if (ped.walkTimer <= 0 || !ped.target) {
    ped.target = city.randomSidewalkPoint();
    ped.walkTimer = random.range(4, 9);
  }
  const d = dist(ped.x, ped.y, ped.target.x, ped.target.y);
  if (d < 24) {
    ped.target = null;
    return;
  }
  const angle = Math.atan2(ped.target.y - ped.y, ped.target.x - ped.x);
  stepPerson(ped, angle, ped.speed, dt, city);
}

/** Move a person toward `angle` at `speed`, sliding along buildings. */
export function stepPerson(person, angle, speed, dt, city) {
  person.angle = angle;
  const dx = Math.cos(angle) * speed * dt;
  const dy = Math.sin(angle) * speed * dt;
  const moved = city.moveCircle(person.x, person.y, dx, dy, 11);
  person.x = moved.x;
  person.y = moved.y;
}

/** A police officer on foot, spawned to chase the player. */
export function createOfficer(x, y) {
  return {
    x, y, angle: 0, speed: POLICE.officerSpeed,
    state: 'chase', catchTimer: 0,
  };
}

/** One officer step: run straight at the player, sliding along walls. */
export function updateOfficer(officer, dt, city, playerX, playerY) {
  const d = dist(officer.x, officer.y, playerX, playerY);
  if (d < 34) {
    officer.catchTimer += dt;
    return;
  }
  officer.catchTimer = 0;
  const angle = Math.atan2(playerY - officer.y, playerX - officer.x);
  stepPerson(officer, angle, officer.speed, dt, city);
}
