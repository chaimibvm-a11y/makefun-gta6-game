// The screenshot scenes behind ?shot=title|cover|chase|mission. Each one sets the world
// to a moment a real game looks like — the title over a living city, the player on foot
// in Coral Plaza, a three-star chase down Palm Row, a package run in progress — by playing
// the real rules forward with a simple autopilot, so the frame is what a short game
// really looks like and the same seed always gives the same frame.

import { STEP, VIEW, WORLD } from './config.js';
import { createCar } from './cars.js';
import { setWanted } from './wanted.js';
import { startMission, advanceMission, showBanner } from './missions.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';
import { clamp, angleDiff } from './random.js';

const TITLE_SECONDS = 6;
const COVER_SECONDS = 7;
const CHASE_SECONDS = 6;
const MISSION_SECONDS = 7;

/** An input that does nothing. */
function idleInput() {
  return { enterCar: false, punch: false, shoot: false, moveX: 0, moveY: 0, run: false, up: false, down: false, steer: 0, handbrake: false };
}

/** Drive toward (tx, ty): full throttle, steering at the target. */
function driveInput(world, tx, ty) {
  const car = world.state.player.car;
  if (!car) return idleInput();
  const desired = Math.atan2(ty - car.y, tx - car.x);
  const steer = clamp(angleDiff(car.angle, desired) * 2.2, -1, 1);
  return { enterCar: false, punch: false, shoot: false, moveX: 0, moveY: 0, run: false, up: true, down: false, steer, handbrake: false };
}

/** Run the world forward for `seconds`, one input per step from `inputFn`. */
function runFor(world, seconds, inputFn) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    world.step(STEP, inputFn(i), null);
  }
}

function centreCamera(world, x, y) {
  const cam = world.state.camera;
  cam.x = clamp(x - VIEW.width / 2, 0, WORLD.width - VIEW.width);
  cam.y = clamp(y - VIEW.height / 2, 0, WORLD.height - VIEW.height);
}

/** Set `world` to the named scene and return the screen to draw over it. */
export function stageShot(name, world) {
  const state = world.state;
  const city = world.city;
  world.reset(null);

  if (name === 'title') {
    centreCamera(world, 1800, 1550);
    runFor(world, TITLE_SECONDS, () => idleInput());
    centreCamera(world, 1800, 1550);
    return { screen: SCREEN_TITLE };
  }

  if (name === 'chase') {
    // Dario in a Comet GT, three stars, the SCPD on his tail down Palm Row.
    const car = createCar('sports', 900, 1300, 0, 'player');
    car.color = '#d94f3d';
    state.cars.push(car);
    state.player.car = car;
    state.player.x = car.x;
    state.player.y = car.y;
    setWanted(state.wanted, 3);
    // Three interceptors already on his tail, on the same road behind him.
    // (These three are tuned just under the Comet's top speed, so they stay on his
    // tail for the shot without ramming the car to a wreck.)
    for (let i = 0; i < 3; i += 1) {
      const cop = createCar('police', 700 - i * 90, 1300 + (i % 2 === 0 ? 14 : -14), 0, 'police');
      cop.speed = 420;
      cop.topSpeed = 460;
      cop.target = { x: 4200, y: 1300 };
      state.cars.push(cop);
    }
    runFor(world, CHASE_SECONDS, () => driveInput(world, 4200, 1300));
    return { screen: SCREEN_PLAY };
  }

  if (name === 'mission') {
    // Mission 2, the delivery leg: the package is in the car, Coral Plaza ahead.
    state.missions.index = 1;
    const mission = startMission(state.missions, city, world.random);
    if (mission) {
      advanceMission(state.missions, city, world.random);
      showBanner(state.missions, 'MISSION: Package Run', 'Deliver the package to Coral Plaza.');
    }
    const car = createCar('sedan', 4300, 1300, Math.PI, 'player');
    car.color = '#d94f3d';
    state.cars.push(car);
    state.player.car = car;
    state.player.x = car.x;
    state.player.y = car.y;
    runFor(world, MISSION_SECONDS, () => driveInput(world, 1800, 1550));
    return { screen: SCREEN_PLAY };
  }

  // The cover: Dario on foot in Coral Plaza, traffic and pedestrians all around,
  // with the first mission already on: steal a car and bring it to Mara's Garage.
  const plaza = city.landmark('Coral Plaza');
  state.missions.index = 0;
  const mission = startMission(state.missions, city, world.random);
  if (mission) showBanner(state.missions, 'MISSION: Back in Solmar', 'Steal a car and bring it to Mara\u2019s Garage.');
  state.player.x = plaza.cx;
  state.player.y = plaza.cy + 60;
  state.player.angle = -Math.PI / 2;
  const orbit = { x: plaza.cx, y: plaza.cy };
  runFor(world, COVER_SECONDS, (i) => {
    const t = (i * STEP) / COVER_SECONDS;
    const ang = t * Math.PI * 1.2;
    const tx = orbit.x + Math.cos(ang) * 130;
    const ty = orbit.y + Math.sin(ang) * 90;
    const p = state.player;
    const dx = tx - p.x;
    const dy = ty - p.y;
    const len = Math.hypot(dx, dy) || 1;
    return {
      enterCar: false, punch: false, shoot: false,
      moveX: dx / len, moveY: dy / len, run: false,
      up: false, down: false, steer: 0, handbrake: false,
    };
  });
  centreCamera(world, plaza.cx, plaza.cy);
  return { screen: SCREEN_PLAY };
}
