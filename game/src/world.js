// The world: everything the game simulates, and the one step that advances it — the
// player on foot or in a car, the traffic, the pedestrians, the police, the bullets, the
// missions and the camera. No drawing and no sound in here: step() only moves numbers,
// and the renderer and the audio read what it did.

import { STEP, WORLD, VIEW, PLAYER, CAR, WANTED, CLOCK, MISSIONS } from './config.js';
import { createCity } from './city.js';
import { createCar, createParkedCar, spawnTraffic, updateTraffic, updatePolice, drivePlayer, damageCar, nearestCar } from './cars.js';
import { spawnPedestrians, updatePedestrian, updateOfficer, createPedestrian } from './people.js';
import { createBullets, fireBullet, updateBullets, punch, createEnemy, updateEnemy } from './combat.js';
import { createWanted, addHeat, setWanted, clearWanted, updateWanted } from './wanted.js';
import { createMissionState, MISSION_DEFS, STORY, startMission, advanceMission, showBanner, currentObjectiveText } from './missions.js';
import { createParticles, exhaust, crashSparks, damageSmoke, muzzleFlash, dust, updateParticles } from './particles.js';
import { setEngine, updateSiren } from './audio.js';
import { clamp, dist } from './random.js';

const SAVE_AUTOSAVE_SECONDS = 25;

export function createWorld(random) {
  const city = createCity(random);
  const state = freshState();
  const world = { state, city, random };

  function freshState() {
    return {
      time: 0,
      clockMinutes: 0,
      money: PLAYER.startMoney,
      bestMoney: PLAYER.startMoney,
      health: PLAYER.health,
      ammo: PLAYER.startAmmo,
      player: {
        x: 600, y: 800, angle: -Math.PI / 2, speed: 0,
        car: null, invulnerable: 0, pendingDamage: 0, lastDamageAt: -99,
      },
      cars: [],
      peds: [],
      officers: [],
      enemies: [],
      bullets: createBullets(),
      particles: createParticles(),
      wanted: createWanted(),
      missions: createMissionState(),
      missionDefs: MISSION_DEFS,
      camera: { x: 0, y: 0, shake: 0 },
      nearCar: null,
      aiming: false,
      aimAngle: 0,
      shootCooldown: 0,
      punchCooldown: 0,
      nextMissionTimer: 0,
      autosaveTimer: SAVE_AUTOSAVE_SECONDS,
      save: null,
      bustFine: 0,
      stats: { carsStolen: 0, missionsDone: 0 },
    };
  }

  function reset(saveData) {
    const fresh = freshState();
    Object.assign(state, fresh);
    if (saveData) {
      state.money = saveData.money;
      state.bestMoney = Math.max(saveData.money, PLAYER.startMoney);
      state.health = saveData.health;
      state.ammo = saveData.ammo;
      state.missions.index = Math.min(saveData.missionIndex, MISSION_DEFS.length);
      state.missions.done = saveData.missionsDone.slice();
      state.player.x = saveData.playerX;
      state.player.y = saveData.playerY;
      state.clockMinutes = saveData.clockMinutes || 0;
      state.save = saveData;
    }
    state.cars = spawnTraffic(city, random, state.player.x, state.player.y);
    for (let i = 0; i < 8; i += 1) state.cars.push(createParkedCar(city, random));
    state.peds = spawnPedestrians(city, random, state.player.x, state.player.y);
    state.camera.x = clamp(state.player.x - VIEW.width / 2, 0, WORLD.width - VIEW.width);
    state.camera.y = clamp(state.player.y - VIEW.height / 2, 0, WORLD.height - VIEW.height);
  }

  // ---- the player ----------------------------------------------------------

  function stepPlayer(dt, input) {
    const p = state.player;
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    state.shootCooldown = Math.max(0, state.shootCooldown - dt);
    state.punchCooldown = Math.max(0, state.punchCooldown - dt);

    if (p.car) {
      const car = p.car;
      const driven = drivePlayer(car, dt, input, city);
      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
      if (Math.abs(car.speed) > 60 && random.chance(dt * 22)) {
        exhaust(state.particles, car.x, car.y, car.angle, random);
      }
      if (car.smoking && random.chance(dt * 10)) damageSmoke(state.particles, car.x, car.y, random);
      if (driven > 0 && Math.abs(car.speed) > 200 && random.chance(dt * 2)) {
        // Speeding past a police car is a crime too.
        if (state.cars.some((c) => c.driver === 'police' && dist(c.x, c.y, car.x, car.y) < 200)) {
          addHeat(state.wanted, 2 * dt);
        }
      }
      return;
    }

    const run = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const mx = input.moveX;
    const my = input.moveY;
    const len = Math.hypot(mx, my);
    if (len > 0) {
      const nx = (mx / len) * run * dt;
      const ny = (my / len) * run * dt;
      p.angle = Math.atan2(my, mx);
      const moved = city.moveCircle(p.x, p.y, nx, ny, PLAYER.radius);
      p.x = moved.x;
      p.y = moved.y;
      p.speed = run;
      if (random.chance(dt * 6)) dust(state.particles, p.x, p.y, random);
    } else {
      p.speed = 0;
    }
  }

  function enterExitCar() {
    const p = state.player;
    if (p.car) {
      const car = p.car;
      const side = car.angle + Math.PI / 2;
      const px = car.x + Math.cos(side) * 40;
      const py = car.y + Math.sin(side) * 40;
      if (!city.circleBlocked(px, py, PLAYER.radius)) {
        p.x = px;
        p.y = py;
      } else {
        p.x = car.x - Math.cos(side) * 40;
        p.y = car.y - Math.sin(side) * 40;
      }
      car.driver = 'parked';
      car.speed = 0;
      p.car = null;
      return;
    }
    const car = nearestCar(state.cars, p.x, p.y, CAR.stealRadius);
    if (!car) return;
    if (car.driver === 'traffic' || car.driver === 'parked') {
      addHeat(state.wanted, WANTED.stealCar);
      state.stats.carsStolen += 1;
    }
    car.driver = 'player';
    p.car = car;
    p.x = car.x;
    p.y = car.y;
  }

  function doPunch() {
    const p = state.player;
    if (p.car || state.punchCooldown > 0) return;
    state.punchCooldown = 0.45;
    const hits = punch(p, state.peds, state.officers, state.enemies);
    for (const hit of hits) {
      if (hit.kind === 'ped') {
        hit.target.state = 'down';
        hit.target.downTimer = 5;
        addHeat(state.wanted, 40);
      } else if (hit.kind === 'officer') {
        addHeat(state.wanted, WANTED.punchCop);
      } else if (hit.kind === 'enemy') {
        hit.target.health -= PLAYER.punchDamage;
        if (hit.target.health <= 0) missionKill();
      }
    }
    return hits.length > 0;
  }

  function doShoot() {
    const p = state.player;
    if (state.ammo <= 0 || state.shootCooldown > 0) return false;
    state.shootCooldown = 0.22;
    state.ammo -= 1;
    const ox = p.car ? p.car.x : p.x;
    const oy = p.car ? p.car.y : p.y;
    const angle = state.aiming ? state.aimAngle : p.angle;
    fireBullet(state.bullets, ox, oy, angle, 'player', PLAYER.pistolDamage);
    muzzleFlash(state.particles, ox, oy, angle);
    state.camera.shake = Math.max(state.camera.shake, 0.25);
    addHeat(state.wanted, WANTED.shoot);
    return true;
  }

  // ---- missions ------------------------------------------------------------

  function missionKill() {
    const m = state.missions.active;
    if (!m) return;
    m.killed += 1;
    if (m.def.objectives[m.step] && m.def.objectives[m.step].type === 'defend' && m.killed >= m.def.objectives[m.step].count) {
      completeObjective();
    }
  }

  function startNextMission() {
    if (state.missions.index >= MISSION_DEFS.length) return;
    const mission = startMission(state.missions, city, random);
    if (!mission) return;
    const def = mission.def;
    showBanner(state.missions, `MISSION: ${def.title}`, def.briefing);
    if (def.startWanted) setWanted(state.wanted, def.startWanted);
    if (def.id === 4) {
      // The yellow Comet GT waits on Sunset Strip.
      const car = createCar('sports', 1500, 2300, 0, 'parked');
      car.color = '#f2c94c';
      car.missionCar = true;
      state.cars.push(car);
      mission.x = 1500;
      mission.y = 2300;
    }
    if (def.id === 5) {
      const lm = city.landmark("Mara's Garage");
      for (let i = 0; i < def.spawnEnemies; i += 1) {
        const angle = (i / def.spawnEnemies) * Math.PI * 2;
        state.enemies.push(createEnemy(lm.cx + Math.cos(angle) * 260, lm.cy + Math.sin(angle) * 260, random));
      }
    }
  }

  function completeObjective() {
    const m = state.missions.active;
    const obj = m.def.objectives[m.step];
    if (obj && obj.type === 'goto' && m.def.heatOnPickup && m.step === 0) {
      addHeat(state.wanted, WANTED.heatPerStar * m.def.heatOnPickup);
    }
    if (obj && obj.type === 'grab') {
      addHeat(state.wanted, WANTED.heatPerStar * (m.def.heatOnGrab || 0));
    }
    const result = advanceMission(state.missions, city, random);
    if (result === 'done') {
      const def = m.def;
      state.money += def.reward;
      state.bestMoney = Math.max(state.bestMoney, state.money);
      state.stats.missionsDone += 1;
      showBanner(state.missions, 'MISSION COMPLETE', `${def.title} — $${def.reward.toLocaleString('en-US')}`);
      state.nextMissionTimer = 3.5;
      state.enemies.length = 0;
    }
  }

  function checkObjectives(dt) {
    const m = state.missions.active;
    if (!m) return;
    const obj = m.def.objectives[m.step];
    if (!obj) return;
    const p = state.player;
    const px = p.car ? p.car.x : p.x;
    const py = p.car ? p.car.y : p.y;
    if (obj.type === 'steal') {
      if (obj.carType) {
        if (p.car && p.car.missionCar) completeObjective();
      } else if (p.car) {
        completeObjective();
      }
    } else if (obj.type === 'goto') {
      if (dist(px, py, m.x, m.y) < m.radius) completeObjective();
    } else if (obj.type === 'lose') {
      if (state.wanted.stars === 0) completeObjective();
    } else if (obj.type === 'grab') {
      if (!p.car && dist(px, py, m.x, m.y) < m.radius) {
        m.grabTimer += dt;
        if (m.grabTimer >= obj.seconds) completeObjective();
      } else {
        m.grabTimer = Math.max(0, m.grabTimer - dt);
      }
    }
  }

  // ---- collisions ----------------------------------------------------------

  function collideCars(dt) {
    const cars = state.cars;
    const p = state.player;
    for (let i = 0; i < cars.length; i += 1) {
      const a = cars[i];
      if (a.wrecked) continue;
      for (let j = i + 1; j < cars.length; j += 1) {
        const b = cars[j];
        if (b.wrecked) continue;
        const d = dist(a.x, a.y, b.x, b.y);
        if (d < 40 && d > 0.01) {
          const push = (40 - d) / 2;
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          a.x -= nx * push * 0.5;
          a.y -= ny * push * 0.5;
          b.x += nx * push * 0.5;
          b.y += ny * push * 0.5;
          const rel = Math.abs(a.speed - b.speed);
          if (rel > 120) {
            damageCar(a, rel * 0.05);
            damageCar(b, rel * 0.05);
            crashSparks(state.particles, (a.x + b.x) / 2, (a.y + b.y) / 2, random);
            if (a === p.car || b === p.car) {
              state.camera.shake = Math.max(state.camera.shake, 0.5);
              p.pendingDamage = (p.pendingDamage || 0) + 4;
            }
            a.speed *= 0.6;
            b.speed *= 0.6;
          }
        }
      }
    }
    // The player's car running over pedestrians.
    if (p.car && Math.abs(p.car.speed) > 60) {
      for (const ped of state.peds) {
        if (ped.state === 'down') continue;
        if (dist(ped.x, ped.y, p.car.x, p.car.y) < 26) {
          ped.state = 'down';
          ped.downTimer = 8;
          addHeat(state.wanted, WANTED.hitPed);
          state.camera.shake = Math.max(state.camera.shake, 0.4);
        }
      }
    }
    // Traffic hitting the player on foot.
    if (!p.car && p.invulnerable <= 0) {
      for (const car of cars) {
        if (car.wrecked || car === p.car) continue;
        if (Math.abs(car.speed) > 50 && dist(car.x, car.y, p.x, p.y) < 26) {
          p.pendingDamage = (p.pendingDamage || 0) + 18;
          p.invulnerable = 1;
          const ang = Math.atan2(p.y - car.y, p.x - car.x);
          const moved = city.moveCircle(p.x, p.y, Math.cos(ang) * 40, Math.sin(ang) * 40, PLAYER.radius);
          p.x = moved.x;
          p.y = moved.y;
          state.camera.shake = Math.max(state.camera.shake, 0.5);
        }
      }
    }
  }

  function applyDamage() {
    const p = state.player;
    if (!p.pendingDamage) return;
    const dmg = p.pendingDamage;
    p.pendingDamage = 0;
    if (p.car) {
      damageCar(p.car, dmg);
      if (p.car.wrecked) {
        p.car.driver = 'parked';
        p.car = null;
      }
    } else {
      p.health -= dmg;
      p.lastDamageAt = state.time;
    }
  }

  function respawn(kind) {
    const p = state.player;
    const lm = city.landmark(kind === 'busted' ? 'Precinct 7' : 'Solmar General');
    // Outside the landmark's door, on the street — never inside the building.
    p.x = lm.cx;
    p.y = lm.y1 + 70;
    p.angle = -Math.PI / 2;
    p.health = PLAYER.health;
    p.car = null;
    p.invulnerable = 2;
    clearWanted(state.wanted);
    for (let i = state.cars.length - 1; i >= 0; i -= 1) {
      if (state.cars[i].driver === 'police') state.cars.splice(i, 1);
    }
    state.officers.length = 0;
    state.enemies.length = 0;
    state.camera.x = clamp(p.x - VIEW.width / 2, 0, WORLD.width - VIEW.width);
    state.camera.y = clamp(p.y - VIEW.height / 2, 0, WORLD.height - VIEW.height);
  }

  // ---- the one step ----------------------------------------------------------

  function step(dt, input, audio) {
    state.time += dt;
    state.clockMinutes += dt * CLOCK.minutesPerSecond;
    city.time = state.time;
    if (state.missions.bannerTimer > 0) state.missions.bannerTimer -= dt;
    if (state.nextMissionTimer > 0) {
      state.nextMissionTimer -= dt;
      if (state.nextMissionTimer <= 0) startNextMission();
    }

    // One-shot actions.
    if (input.enterCar) enterExitCar();
    if (input.punch) doPunch();
    if (input.shoot) doShoot();

    stepPlayer(dt, input);
    state.nearCar = state.player.car ? null : nearestCar(state.cars, state.player.x, state.player.y, CAR.stealRadius);

    // Traffic: keep the roads full near the player.
    const px = state.player.car ? state.player.car.x : state.player.x;
    const py = state.player.car ? state.player.car.y : state.player.y;
    for (const car of state.cars) {
      if (car.driver === 'traffic') updateTraffic(car, dt, city, state.cars, random);
      else if (car.driver === 'police') updatePolice(car, dt, city, px, py, random);
    }
    for (let i = state.cars.length - 1; i >= 0; i -= 1) {
      const car = state.cars[i];
      if (car.driver === 'traffic' && dist(car.x, car.y, px, py) > 1100) {
        const p = city.randomRoadPoint(px, py, 500);
        car.x = p.x;
        car.y = p.y;
        car.target = null;
      }
    }

    const threat = state.bullets.some((b) => b.active) ? { x: px, y: py } : null;
    // A fast car bearing down is a scare too: pedestrians run from it.
    const fastCar = state.player.car && Math.abs(state.player.car.speed) > 200 ? state.player.car : null;
    for (const ped of state.peds) {
      const carThreat = fastCar && dist(ped.x, ped.y, fastCar.x, fastCar.y) < 260 ? fastCar : null;
      updatePedestrian(ped, dt, city, random, threat || carThreat);
    }
    for (let i = state.peds.length - 1; i >= 0; i -= 1) {
      if (dist(state.peds[i].x, state.peds[i].y, px, py) > 1200) {
        state.peds.splice(i, 1);
        state.peds.push(createPedestrian(city, random));
      }
    }
    for (const officer of state.officers) updateOfficer(officer, dt, city, px, py);
    for (const enemy of state.enemies) updateEnemy(enemy, dt, city, px, py, state.bullets, random);

    updateBullets(state.bullets, dt, city, state.cars, state.peds, state.officers, state.enemies, state.player);
    updateParticles(state.particles, dt);
    collideCars(dt);
    applyDamage();

    // Health comes back slowly after a quiet spell.
    if (state.time - state.player.lastDamageAt > PLAYER.regenDelay && state.health < PLAYER.health && !state.player.car) {
      state.health = Math.min(PLAYER.health, state.health + PLAYER.regenRate * dt);
    }

    const busted = updateWanted(state.wanted, dt, city, state.cars, state.officers, state.player, random);
    if (busted === 'busted') {
      state.bustFine = Math.min(state.money, 200 + Math.floor(state.money * 0.1));
      state.money -= state.bustFine;
      respawn('busted');
      return 'busted';
    }
    if (state.health <= 0) {
      state.bustFine = Math.min(state.money, 250 + Math.floor(state.money * 0.1));
      state.money -= state.bustFine;
      respawn('wasted');
      return 'wasted';
    }

    checkObjectives(dt);

    // The camera follows the player, a little ahead of a fast car.
    const lookX = state.player.car ? Math.cos(state.player.angle) * 70 : 0;
    const lookY = state.player.car ? Math.sin(state.player.angle) * 70 : 0;
    const tx = clamp(px + lookX - VIEW.width / 2, 0, WORLD.width - VIEW.width);
    const ty = clamp(py + lookY - VIEW.height / 2, 0, WORLD.height - VIEW.height);
    state.camera.x += (tx - state.camera.x) * Math.min(1, 5 * dt);
    state.camera.y += (ty - state.camera.y) * Math.min(1, 5 * dt);
    state.camera.shake = Math.max(0, state.camera.shake - dt * 1.8);

    // Sound follows the world.
    if (audio) {
      const driving = !!state.player.car;
      const ratio = driving ? Math.abs(state.player.car.speed) / state.player.car.topSpeed : 0;
      setEngine(audio, ratio, driving);
      updateSiren(audio, dt, state.wanted.stars);
    }

    // Autosave now and then.
    state.autosaveTimer -= dt;
    if (state.autosaveTimer <= 0) {
      state.autosaveTimer = SAVE_AUTOSAVE_SECONDS;
      state.autosaved = true;
    }
    return null;
  }

  reset(null);
  return { state, city, reset, step, startNextMission, currentObjectiveText: () => currentObjectiveText(state.missions) };
}
