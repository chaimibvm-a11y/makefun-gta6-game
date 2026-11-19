// Saving: the player's money, mission progress, position and health live in localStorage
// between visits, so a run of missions survives closing the tab. Nothing here leaves the
// browser; a save that cannot be read is treated as no save at all.

import { SAVE_KEY } from './config.js';

/** Write the parts of the state that matter across visits. */
export function saveGame(state) {
  try {
    const data = {
      money: state.money,
      health: state.health,
      ammo: state.ammo,
      missionIndex: state.missions.index,
      missionsDone: state.missions.done,
      playerX: state.player.x,
      playerY: state.player.y,
      clockMinutes: state.clockMinutes,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** Read a save back, or null when there is none or it is broken. */
export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    if (typeof data.money !== 'number' || !Array.isArray(data.missionsDone)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Wipe the save (the pause menu's New Game). */
export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: there is nothing to wipe then.
  }
}
