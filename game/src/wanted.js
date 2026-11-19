// The wanted level: stars that rise when the player commits a crime and fall when they
// stay clean and out of sight, and the police response that comes with them — patrol cars
// that chase, officers on foot at three stars and up, and getting busted or wasted.

import { WANTED, POLICE } from './config.js';
import { clamp, dist } from './random.js';
import { createCar } from './cars.js';
import { createOfficer } from './people.js';

/** A fresh wanted state: no stars, no heat, no police anywhere. */
export function createWanted() {
  return {
    stars: 0,
    heat: 0,
    cleanTimer: 0,
    bustTimer: 0,
    spawnTimer: 0,
    officerTimer: 0,
  };
}

/** Commit a crime: add heat, and a new star when a star's worth of heat piles up. */
export function addHeat(wanted, amount) {
  wanted.heat = Math.min(WANTED.maxStars * WANTED.heatPerStar, wanted.heat + amount);
  wanted.stars = wanted.heat <= 0 ? 0 : Math.min(WANTED.maxStars, Math.ceil(wanted.heat / WANTED.heatPerStar));
  wanted.cleanTimer = 0;
}

/** Set the wanted level directly (missions script it: the heat is already on). */
export function setWanted(wanted, stars) {
  wanted.stars = clamp(stars, 0, WANTED.maxStars);
  wanted.heat = wanted.stars * WANTED.heatPerStar;
  wanted.cleanTimer = 0;
}

/** Clear the wanted level entirely (busted, wasted, or a clean getaway). */
export function clearWanted(wanted) {
  wanted.stars = 0;
  wanted.heat = 0;
  wanted.cleanTimer = 0;
  wanted.bustTimer = 0;
}

/**
 * One wanted step: heat cools when the player stays clean, faster when no police can see
 * them, and the police cars and officers the stars call for arrive and leave.
 * Returns 'busted' when the police finally catch the player on foot, else null.
 */
export function updateWanted(wanted, dt, city, cars, officers, player, random) {
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;

  // Heat cools off when the player commits no crime for a while.
  wanted.cleanTimer += dt;
  if (wanted.cleanTimer > WANTED.cleanSeconds && wanted.stars > 0) {
    const policeNear = cars.some((c) => c.driver === 'police' && dist(c.x, c.y, px, py) < WANTED.policeView)
      || officers.length > 0;
    const rate = policeNear ? WANTED.decayPerSecond : WANTED.hiddenDecayPerSecond;
    wanted.heat = Math.max(0, wanted.heat - rate * dt);
    wanted.stars = wanted.heat <= 0 ? 0 : Math.ceil(wanted.heat / WANTED.heatPerStar);
  }

  // Police cars: one per star, up to the cap, arriving from off-screen roads.
  const policeCars = cars.filter((c) => c.driver === 'police' && !c.wrecked);
  const wantCars = Math.min(wanted.stars, WANTED.maxPoliceCars);
  wanted.spawnTimer -= dt;
  if (policeCars.length < wantCars && wanted.spawnTimer <= 0) {
    wanted.spawnTimer = 2.2;
    const p = city.randomRoadPoint(px, py, POLICE.spawnDistance);
    const car = createCar('police', p.x, p.y, Math.atan2(py - p.y, px - p.x), 'police');
    cars.push(car);
  }
  // Wrecked or far-away police cars leave the scene once the heat is off.
  if (wanted.stars === 0) {
    for (let i = cars.length - 1; i >= 0; i -= 1) {
      if (cars[i].driver === 'police') cars.splice(i, 1);
    }
    officers.length = 0;
  }

  // Officers on foot at three stars and up.
  const wantOfficers = wanted.stars >= 3 ? Math.min(wanted.stars - 1, WANTED.maxOfficers) : 0;
  wanted.officerTimer -= dt;
  if (officers.length < wantOfficers && wanted.officerTimer <= 0) {
    wanted.officerTimer = 3;
    const angle = random.range(0, Math.PI * 2);
    const ox = px + Math.cos(angle) * 420;
    const oy = py + Math.sin(angle) * 420;
    if (!city.circleBlocked(ox, oy, 14)) officers.push(createOfficer(ox, oy));
  }

  // Busted: on foot, a police car or an officer stays on the player.
  if (!player.car) {
    let touching = false;
    for (const c of policeCars) {
      if (dist(c.x, c.y, px, py) < 52) touching = true;
    }
    for (const o of officers) {
      if (o.catchTimer > 0.4) touching = true;
    }
    if (touching) {
      wanted.bustTimer += dt;
      if (wanted.bustTimer >= POLICE.bustSeconds) return 'busted';
    } else {
      wanted.bustTimer = Math.max(0, wanted.bustTimer - dt * 2);
    }
  } else {
    wanted.bustTimer = 0;
  }
  return null;
}
