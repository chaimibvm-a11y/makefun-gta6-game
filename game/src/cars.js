// Cars: the player's ride, the traffic that fills the roads, and the police cars that
// chase the player. A car has a type (speed, grip, health), a heading and a driver —
// 'traffic' follows the road grid, 'police' hunts the player, 'player' answers the keys,
// 'parked' waits to be stolen. Driving is simple arcade physics: accelerate, steer, drift.

import { CAR, CAR_TYPES, TRAFFIC } from './config.js';
import { angleDiff, clamp, dist } from './random.js';

const TRAFFIC_COLORS = ['#d94f3d', '#3d7dd9', '#e8c33d', '#7a7a7a', '#4da96b', '#c9c9c9', '#8a5fb5', '#e07b39'];
const POLICE_COLOR = '#e8e8e8';

let nextId = 1;

/** Make a car of a type at (x, y) facing `angle`, driven by `driver`. */
export function createCar(type, x, y, angle, driver) {
  const spec = CAR_TYPES[type];
  return {
    id: nextId,
    type, name: spec.name,
    x, y, angle, speed: 0,
    topSpeed: spec.topSpeed, accel: spec.accel, brake: spec.brake, grip: spec.grip,
    reverse: spec.reverse, maxHealth: spec.health, health: spec.health,
    color: type === 'police' ? POLICE_COLOR : type === 'taxi' ? '#f2c94c' : TRAFFIC_COLORS[(nextId * 7 + 3) % TRAFFIC_COLORS.length],
    driver, // 'traffic' | 'police' | 'player' | 'parked'
    target: null, lastJunction: null, repickAt: 0,
    smoking: false, wrecked: false, ramCooldown: 0, honkAt: 0,
  };
}

/** A car the player can steal: a random type parked somewhere sensible. */
export function createParkedCar(city, random) {
  const spot = city.randomParkedSpot();
  const type = random.pick(['sedan', 'sedan', 'taxi', 'sports', 'truck', 'van']);
  return createCar(type, spot.x, spot.y, spot.angle, 'parked');
}

/** The traffic that starts on the roads around the player. */
export function spawnTraffic(city, random, playerX, playerY) {
  const cars = [];
  for (let i = 0; i < TRAFFIC.count; i += 1) {
    const p = city.randomRoadPoint(playerX, playerY, 350);
    const type = random.pick(['sedan', 'sedan', 'taxi', 'sports', 'truck', 'van', 'sedan']);
    const car = createCar(type, p.x, p.y, random.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), 'traffic');
    car.speed = random.range(TRAFFIC.speedMin, TRAFFIC.speedMax);
    car.target = pickNextJunction(city, car, random);
    cars.push(car);
  }
  return cars;
}

function pickNextJunction(city, car, random) {
  const near = city.nearestIntersection(car.x, car.y);
  const options = city.intersections.filter((p) => {
    if (p === near) return false;
    const sameX = Math.abs(p.x - near.x) < 1;
    const sameY = Math.abs(p.y - near.y) < 1;
    if (!sameX && !sameY) return false;
    if (car.lastJunction && p.x === car.lastJunction.x && p.y === car.lastJunction.y) return random.chance(0.15);
    return true;
  });
  if (options.length === 0) return near;
  // Prefer going straight: a junction ahead in the car's current heading.
  const ahead = options.filter((p) => {
    const dx = p.x - near.x;
    const dy = p.y - near.y;
    return Math.abs(Math.cos(car.angle) * dx + Math.sin(car.angle) * dy) > 0.5 * Math.hypot(dx, dy);
  });
  const pool = ahead.length > 0 && random.chance(0.65) ? ahead : options;
  return random.pick(pool);
}

/** One traffic step: steer toward the target junction, slow for the car ahead, turn at junctions. */
export function updateTraffic(car, dt, city, cars, random) {
  if (!car.target) car.target = pickNextJunction(city, car, random);
  const tx = car.target.x;
  const ty = car.target.y;
  const d = dist(car.x, car.y, tx, ty);
  if (d < 42) {
    car.lastJunction = car.target;
    car.target = pickNextJunction(city, car, random);
    return;
  }
  // Slow down for the car directly ahead.
  let want = car.topSpeed * 0.45;
  const aheadX = car.x + Math.cos(car.angle) * TRAFFIC.followGap;
  const aheadY = car.y + Math.sin(car.angle) * TRAFFIC.followGap;
  for (const other of cars) {
    if (other === car || other.wrecked) continue;
    if (dist(aheadX, aheadY, other.x, other.y) < 34) {
      want = Math.min(want, other.speed * 0.8);
      break;
    }
  }
  const desired = Math.atan2(ty - car.y, tx - car.x);
  const turn = clamp(angleDiff(car.angle, desired), -2.6 * dt, 2.6 * dt);
  car.angle += turn;
  car.speed += clamp(want - car.speed, -car.brake * dt, car.accel * dt);
  moveCar(car, dt, city);
}

/** One police step: hunt the player through the road grid, then ram. */
export function updatePolice(car, dt, city, playerX, playerY, random) {
  car.repickAt -= dt;
  if (!car.target || car.repickAt <= 0) {
    car.target = city.nearestIntersection(playerX, playerY);
    car.repickAt = 1.4;
  }
  const d = dist(car.x, car.y, playerX, playerY);
  // Close enough to see the player: drive straight at them.
  const tx = d < 320 ? playerX : car.target.x;
  const ty = d < 320 ? playerY : car.target.y;
  const desired = Math.atan2(ty - car.y, tx - car.x);
  const turn = clamp(angleDiff(car.angle, desired), -3.4 * dt, 3.4 * dt);
  car.angle += turn;
  const want = d < 320 ? car.topSpeed * 0.95 : car.topSpeed * 0.8;
  car.speed += clamp(want - car.speed, -car.brake * dt, car.accel * dt);
  moveCar(car, dt, city);
  car.ramCooldown = Math.max(0, car.ramCooldown - dt);
}

/**
 * The player's driving: W/S accelerate and brake, A/D steer (steering bites harder the
 * slower the car goes), Space is the handbrake. Returns the distance driven, for the engine sound.
 */
export function drivePlayer(car, dt, input, city) {
  if (input.up) car.speed += car.accel * dt;
  else if (input.down) {
    car.speed -= (car.speed > 20 ? car.brake : car.accel * 0.6) * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 90 * dt);
  }
  if (input.handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 500 * dt);
  car.speed = clamp(car.speed, -car.reverse, car.topSpeed);
  const steer = input.steer * clamp(Math.abs(car.speed) / 120, 0.25, 1);
  car.angle += steer * car.grip * 0.55 * dt * (car.speed >= 0 ? 1 : -1) * (input.handbrake ? 1.5 : 1);
  moveCar(car, dt, city);
  return Math.abs(car.speed) * dt;
}

/** Move a car forward, sliding along buildings; returns true when it hit something hard. */
export function moveCar(car, dt, city) {
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const r = CAR.length / 2 - 2;
  if (!city.circleBlocked(nx, car.y, r)) car.x = nx;
  else {
    car.speed *= 0.55;
    return true;
  }
  if (!city.circleBlocked(car.x, ny, r)) car.y = ny;
  else {
    car.speed *= 0.55;
    return true;
  }
  return false;
}

/** Damage a car; at zero health it is a smoking wreck that no longer drives. */
export function damageCar(car, amount) {
  if (car.wrecked) return;
  car.health -= amount;
  car.smoking = car.health <= CAR.damageSmokeAt;
  if (car.health <= CAR.wreckAt) {
    car.health = 0;
    car.wrecked = true;
    car.speed = 0;
    if (car.driver === 'traffic') car.driver = 'parked';
  }
}

/** The nearest drivable car to (x, y) within `radius`, or null. */
export function nearestCar(cars, x, y, radius) {
  let best = null;
  let bestD = radius;
  for (const car of cars) {
    if (car.wrecked) continue;
    const d = dist(x, y, car.x, car.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}
