// The story of Solmar City and its six missions. Dario Venn, a getaway driver fresh out
// of the county jail, comes home to find his old crew gone and one fixer still willing to
// take his calls: Mara Kessler, who runs a garage on Palm Row and owes him a favour. The
// rival crew belongs to Kane Mercer, who wants Mara's garage and everything Dario owns.
// Every mission is a list of objectives the world checks off one by one.

import { MISSIONS } from './config.js';

/** The story beats, told on the title screen and in the mission briefings. */
export const STORY = {
  hero: 'Dario Venn',
  fixer: 'Mara Kessler',
  rival: 'Kane Mercer',
  city: 'Solmar City',
  intro: 'Three years inside. One phone call out. Dario Venn is back in Solmar City, and the only person who still answers is Mara Kessler — a fixer with a garage, a list of jobs, and a rival who wants her lot. Drive. Deliver. Don\u2019t get caught.',
};

/**
 * The six missions. Each one lists its objectives in order; an objective is a place to
 * reach, a car to steal, enemies to beat, or a wanted level to lose. `at` names a
 * landmark or a point in the city, resolved by the world when the mission starts.
 */
export const MISSION_DEFS = [
  {
    id: 1,
    title: 'Back in Solmar',
    reward: MISSIONS[0].reward,
    briefing: 'Mara: "Welcome home, Dario. You need wheels and I need a driver. Take any car on the street — don\u2019t ask whose — and bring it to my garage."',
    objectives: [
      { type: 'steal', text: 'Steal a car (walk up to one and press E)' },
      { type: 'goto', at: "Mara's Garage", text: 'Drive to Mara\u2019s Garage' },
    ],
  },
  {
    id: 2,
    title: 'Package Run',
    reward: MISSIONS[1].reward,
    briefing: 'Mara: "A crate came in at the docks and it isn\u2019t mine to keep. Pick it up, drop it at Coral Plaza. Mercer\u2019s boys tipped the cops — expect heat."',
    objectives: [
      { type: 'goto', at: 'The Docks', text: 'Pick up the package at the Docks' },
      { type: 'goto', at: 'Coral Plaza', text: 'Deliver the package to Coral Plaza' },
    ],
    heatOnPickup: 1,
  },
  {
    id: 3,
    title: 'Lose the Heat',
    reward: MISSIONS[2].reward,
    briefing: 'Mara: "Three stars, Dario. The whole precinct is looking for you. Lay low, stay out of sight, and get to the Hideout without the cops on your tail."',
    objectives: [
      { type: 'lose', text: 'Lose the cops — get your wanted level to zero' },
      { type: 'goto', at: 'The Hideout', text: 'Reach the Hideout' },
    ],
    startWanted: 3,
  },
  {
    id: 4,
    title: 'Repo Job',
    reward: MISSIONS[3].reward,
    briefing: 'Mara: "A Comet GT, sunshine yellow, parked on Sunset Strip. The owner stopped paying. Take it — gently, it\u2019s worth more than both of us — and bring it home."',
    objectives: [
      { type: 'steal', at: 'Sunset Strip', carType: 'sports', text: 'Steal the yellow Comet GT on Sunset Strip' },
      { type: 'goto', at: "Mara's Garage", text: 'Deliver the Comet GT to the garage' },
    ],
  },
  {
    id: 5,
    title: 'Garage Siege',
    reward: MISSIONS[4].reward,
    briefing: 'Mara: "Mercer\u2019s crew is at my gate, Dario. Five of them. You\u2019ve got the pistol — use it. The garage is everything I have."',
    objectives: [
      { type: 'defend', count: 5, text: 'Defend the garage — take down 5 of Mercer\u2019s crew' },
    ],
    spawnEnemies: 5,
  },
  {
    id: 6,
    title: 'The Big Score',
    reward: MISSIONS[5].reward,
    briefing: 'Mara: "The Casino Solmar vault. One night, one crew — you. Grab the cash, and run. Four stars the second you touch it. Make it to the Hideout and we\u2019re done."',
    objectives: [
      { type: 'goto', at: 'Casino Solmar', text: 'Get inside Casino Solmar' },
      { type: 'grab', seconds: 4, text: 'Grab the cash from the vault' },
      { type: 'goto', at: 'The Hideout', text: 'Escape to the Hideout with the cash' },
    ],
    heatOnGrab: 4,
  },
];

/** A fresh mission state: nothing started, nothing done. */
export function createMissionState() {
  return {
    index: 0, // which mission is next (0-based)
    active: null, // { def, step, x, y, radius, grabTimer, killed, package }
    done: [],
    banner: null, // { text, sub, timer }
    bannerTimer: 0,
  };
}

/** Start the next mission: resolve its first objective to a place in the city. */
export function startMission(state, city, random) {
  const def = MISSION_DEFS[state.index];
  if (!def) return null;
  const mission = { def, step: 0, x: 0, y: 0, radius: 90, grabTimer: 0, killed: 0, package: false };
  resolveObjective(mission, city, random);
  state.active = mission;
  return mission;
}

/** Point the current objective at its place in the city. */
export function resolveObjective(mission, city, random) {
  const obj = mission.def.objectives[mission.step];
  if (!obj) return;
  if (obj.type === 'goto' || obj.type === 'steal') {
    if (obj.at === 'Sunset Strip') {
      mission.x = 1500;
      mission.y = 2300;
      mission.radius = 130;
    } else if (obj.at) {
      const lm = city.landmark(obj.at);
      if (lm) {
        mission.x = lm.cx;
        mission.y = lm.cy;
        // Generous: the player completes it from the street outside the building.
        mission.radius = Math.max(130, Math.min(lm.x1 - lm.x0, lm.y1 - lm.y0) / 2 + 70);
      }
    }
  } else if (obj.type === 'defend') {
    const lm = city.landmark("Mara's Garage");
    mission.x = lm ? lm.cx : 600;
    mission.y = lm ? lm.cy : 550;
    mission.radius = 320;
  } else if (obj.type === 'grab') {
    // The vault is inside the casino, so the grab happens at its front door, on the street.
    const lm = city.landmark('Casino Solmar');
    mission.x = lm ? lm.cx : 3000;
    mission.y = lm ? lm.y1 + 40 : 1790;
    mission.radius = 80;
  } else if (obj.type === 'lose') {
    const lm = city.landmark('The Hideout');
    mission.x = lm ? lm.cx : 1200;
    mission.y = lm ? lm.cy : 2550;
    mission.radius = 120;
  }
}

/** The text the HUD shows for the current objective. */
export function currentObjectiveText(state) {
  const mission = state.active;
  if (!mission) {
    return state.index >= MISSION_DEFS.length
      ? 'All missions done — Solmar is yours. Free roam!'
      : 'Press J for missions';
  }
  const obj = mission.def.objectives[mission.step];
  return `${mission.def.title}: ${obj ? obj.text : ''}`;
}

/** Advance to the next objective, or finish the mission. Returns 'done' or 'next'. */
export function advanceMission(state, city, random) {
  const mission = state.active;
  mission.step += 1;
  if (mission.step >= mission.def.objectives.length) {
    state.done.push(mission.def.id);
    state.active = null;
    state.index += 1;
    return 'done';
  }
  resolveObjective(mission, city, random);
  return 'next';
}

/** Show a banner over the game for a few seconds (mission start, mission complete). */
export function showBanner(state, text, sub) {
  state.banner = { text, sub: sub || '' };
  state.bannerTimer = 4;
}
