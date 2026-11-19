// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between six screens: title, play, paused, missions, busted and
// wasted. ?seed=N fixes the city. ?shot=title|cover|chase|mission (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.

import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import {
  ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER_CAR, ACTION_PUNCH,
  ACTION_MUTE, ACTION_MISSIONS, ACTION_SAVE, ACTION_NEW_GAME, createInput,
} from './input.js';
import {
  createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED,
  SCREEN_BUSTED, SCREEN_WASTED, SCREEN_MISSIONS,
} from './render.js';
import { stageShot } from './shots.js';
import { drawHud } from './hud.js';
import { createAudio, ensureAudio, startMusic, setMuted, playShot, playPunch, playCrash, playMissionDone, playBusted } from './audio.js';
import { saveGame, loadGame, clearSave } from './save.js';
import { showBanner } from './missions.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
const saved = loadGame();

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  const scene = stageShot(name, world);
  window.__world = world;
  let painted = 0;
  function paint() {
    renderer.draw(world.state, world.city, scene.screen);
    if (scene.screen === SCREEN_PLAY) {
      // The HUD draws on the same canvas, in screen space: the renderer leaves the
      // screen transform active, so the HUD's 1280x720 coordinates land right.
      drawHud(canvas.getContext('2d'), world.state, world.city);
    }
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  window.__world = world;
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let hasMouse = false;
  let muted = false;
  let prevMoney = world.state.money;
  let prevHealth = world.state.health;

  function startGame(fromSave) {
    world.reset(fromSave ? saved : null);
    world.state.save = fromSave ? saved : null;
    accumulator = 0;
    screen = SCREEN_PLAY;
    ensureAudio(audio);
    startMusic(audio);
    if (world.state.missions.index < 6) {
      world.startNextMission();
    }
    announce(`Playing as Dario Venn in Solmar City. ${world.state.missions.active ? world.state.missions.active.def.title : 'Free roam'}.`);
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      muted = !muted;
      setMuted(audio, muted);
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startGame(!!saved);
      return;
    }
    if (screen === SCREEN_BUSTED || screen === SCREEN_WASTED) {
      if (actions & ACTION_CONFIRM) {
        screen = SCREEN_PLAY;
        announce('Back on the street.');
      }
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED || screen === SCREEN_MISSIONS) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (actions & ACTION_MISSIONS) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_MISSIONS;
        announce('Missions.');
      } else if (screen === SCREEN_MISSIONS) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & ACTION_SAVE) {
        saveGame(world.state);
        announce('Game saved.');
      } else if (actions & ACTION_NEW_GAME) {
        clearSave();
        world.reset(null);
        screen = SCREEN_TITLE;
        announce('New game. Solmar City.');
      }
    }
  }

  function buildInput() {
    const state = world.state;
    const moveX = input.moveX();
    const moveY = input.moveY();
    const mouse = input.mouse();
    if (mouse.x !== 0 || mouse.y !== 0) hasMouse = true;
    let aimAngle = state.player.angle;
    let aiming = false;
    if (hasMouse) {
      const wp = renderer.screenToWorld(mouse.x, mouse.y, state.camera);
      const px = state.player.car ? state.player.car.x : state.player.x;
      const py = state.player.car ? state.player.car.y : state.player.y;
      aimAngle = Math.atan2(wp.y - py, wp.x - px);
      aiming = true;
    }
    state.aimAngle = aimAngle;
    state.aiming = aiming;
    return {
      enterCar: false,
      punch: false,
      shoot: input.mouseHeld(),
      moveX, moveY,
      run: input.run(),
      up: moveY < 0,
      down: moveY > 0,
      steer: moveX,
      handbrake: input.run(),
    };
  }

  function step(actions) {
    const state = world.state;
    const frameInput = buildInput();
    frameInput.enterCar = !!(actions & ACTION_ENTER_CAR);
    frameInput.punch = !!(actions & ACTION_PUNCH);
    const beforeMoney = state.money;
    const beforeBanner = state.missions.bannerTimer;
    const beforeAmmo = state.ammo;
    const result = world.step(STEP, frameInput, audio);
    if (state.ammo < beforeAmmo) playShot(audio);
    if (frameInput.punch) playPunch(audio);
    if (state.money > beforeMoney && state.missions.bannerTimer > beforeBanner) {
      playMissionDone(audio);
      saveGame(state);
    }
    if (result === 'busted') {
      screen = SCREEN_BUSTED;
      playBusted(audio);
      saveGame(state);
      announce('Busted. The SCPD caught you.');
    } else if (result === 'wasted') {
      screen = SCREEN_WASTED;
      playBusted(audio);
      saveGame(state);
      announce('Wasted. Solmar General patched you up.');
    }
    if (state.autosaved) {
      state.autosaved = false;
      saveGame(state);
    }
    if (state.health < prevHealth) playCrash(audio, false);
    prevHealth = state.health;
    prevMoney = state.money;
    void prevMoney;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // One-shot presses are taken once per frame and handed to the menu first, then to
    // the first world step — taking them twice would eat them.
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_PLAY) {
      let firstStep = true;
      while (accumulator >= STEP) {
        step(firstStep ? actions : 0);
        firstStep = false;
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) {
          accumulator = 0;
          break;
        }
      }
    } else if (screen === SCREEN_TITLE) {
      // The city lives behind the title: traffic and pedestrians keep moving.
      while (accumulator >= STEP) {
        world.step(STEP, {
          enterCar: false, punch: false, shoot: false,
          moveX: 0, moveY: 0, run: false, up: false, down: false, steer: 0, handbrake: false,
        }, null);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, world.city, screen);
    if (screen === SCREEN_PLAY) {
      // The HUD draws on the same canvas, in screen space: the renderer leaves the
      // screen transform active, so the HUD's 1280x720 coordinates land right.
      drawHud(canvas.getContext('2d'), world.state, world.city);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  canvas.addEventListener('pointerdown', () => ensureAudio(audio));
  window.addEventListener('keydown', () => ensureAudio(audio), { once: true });

  announce('Solmar City. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
