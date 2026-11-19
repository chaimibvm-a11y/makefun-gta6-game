// Keyboard and mouse input. Held keys steer the player and the car; one-shot presses
// (enter a car, punch, pause, mute, missions) are queued as bit flags and taken once by
// the loop, so a press between two frames is never lost and never counted twice. The
// mouse aims the pistol: its screen position is kept so the world can turn it into a
// firing angle through the camera.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_PUNCH = 8;
export const ACTION_MUTE = 16;
export const ACTION_MISSIONS = 32;
export const ACTION_SAVE = 64;
export const ACTION_NEW_GAME = 128;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER_CAR = new Set(['KeyE']);
const PUNCH = new Set(['KeyF']);
const MUTE = new Set(['KeyM']);
const MISSIONS = new Set(['KeyJ', 'Tab']);
const SAVE = new Set(['KeyQ']);
const NEW_GAME = new Set(['KeyN']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;

  function press(code, event) {
    if (UP.has(code) || DOWN.has(code) || LEFT.has(code) || RIGHT.has(code) || RUN.has(code)) {
      keys.add(code);
    } else if (CONFIRM.has(code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (ENTER_CAR.has(code)) {
      if (!event.repeat) actions |= ACTION_ENTER_CAR;
    } else if (PUNCH.has(code)) {
      if (!event.repeat) actions |= ACTION_PUNCH;
    } else if (MUTE.has(code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (MISSIONS.has(code)) {
      if (!event.repeat) actions |= ACTION_MISSIONS;
    } else if (SAVE.has(code)) {
      if (!event.repeat) actions |= ACTION_SAVE;
    } else if (NEW_GAME.has(code)) {
      if (!event.repeat) actions |= ACTION_NEW_GAME;
    } else {
      return;
    }
    event.preventDefault();
  }

  window.addEventListener('keydown', (event) => press(event.code, event));
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
    actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointerup', () => {
    mouseDown = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  function held(set) {
    for (const code of set) if (keys.has(code)) return true;
    return false;
  }

  return {
    /** -1/0/1 for left/right and up/down, from the held movement keys. */
    moveX() {
      return (held(RIGHT) ? 1 : 0) - (held(LEFT) ? 1 : 0);
    },
    moveY() {
      return (held(DOWN) ? 1 : 0) - (held(UP) ? 1 : 0);
    },
    /** True while a run key is held. */
    run() {
      return held(RUN);
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** True while the mouse button is held (aiming and shooting). */
    mouseHeld() {
      return mouseDown;
    },
    /** The mouse position in screen pixels. */
    mouse() {
      return { x: mouseX, y: mouseY };
    },
  };
}
