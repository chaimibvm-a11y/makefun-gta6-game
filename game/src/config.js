// Solmar City — every tuning number, colour and world constant in one place.
// The game is a top-down open-world crime game: the player walks and drives around a
// sun-soaked coastal city, steals cars, dodges the police and runs missions for Mara.

/** The canvas play area the camera shows (the camera scrolls a bigger world). */
export const VIEW = { width: 1280, height: 720 };

/** The whole city, in world pixels. */
export const WORLD = { width: 4800, height: 3600 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Game clock: a day starts at 09:00 and one real second is one game minute. */
export const CLOCK = { startHour: 9, startMinute: 0, minutesPerSecond: 1 };

export const PLAYER = {
  radius: 13,
  walkSpeed: 170,
  runSpeed: 265,
  health: 100,
  punchDamage: 25,
  punchRange: 34,
  punchArc: 1.1,
  pistolDamage: 34,
  pistolRange: 520,
  startAmmo: 30,
  maxAmmo: 90,
  startMoney: 500,
  regenDelay: 10,
  regenRate: 4,
};

/** Car types: how fast they go, how they handle, how much they are worth. */
export const CAR_TYPES = {
  sedan: { name: 'Solmar Sedan', topSpeed: 330, accel: 260, brake: 420, grip: 3.4, reverse: 130, health: 100, value: 400 },
  taxi: { name: 'Sun Cab', topSpeed: 320, accel: 250, brake: 420, grip: 3.4, reverse: 130, health: 100, value: 350 },
  sports: { name: 'Comet GT', topSpeed: 470, accel: 380, brake: 520, grip: 4.6, reverse: 160, health: 80, value: 2400 },
  truck: { name: 'Haul Master', topSpeed: 260, accel: 180, brake: 340, grip: 2.8, reverse: 100, health: 160, value: 900 },
  van: { name: 'Coral Van', topSpeed: 290, accel: 210, brake: 380, grip: 3.0, reverse: 110, health: 120, value: 700 },
  police: { name: 'SCPD Interceptor', topSpeed: 420, accel: 340, brake: 500, grip: 4.2, reverse: 150, health: 140, value: 0 },
};

export const CAR = { length: 46, width: 22, stealRadius: 60, damageSmokeAt: 45, wreckAt: 0 };

export const TRAFFIC = {
  count: 26,
  speedMin: 110,
  speedMax: 175,
  spawnMargin: 500,
  despawnMargin: 900,
  followGap: 70,
};

export const PEDS = {
  count: 34,
  walkMin: 34,
  walkMax: 62,
  fleeSpeed: 130,
  fleeRadius: 260,
};

export const WANTED = {
  maxStars: 5,
  heatPerStar: 100,
  stealCar: 55,
  hitPed: 70,
  shoot: 45,
  killCop: 100,
  punchCop: 80,
  decayPerSecond: 4,
  hiddenDecayPerSecond: 11,
  cleanSeconds: 6,
  policeView: 620,
  maxPoliceCars: 6,
  maxOfficers: 4,
};

export const POLICE = {
  carSpeed: 400,
  ramDamage: 14,
  ramCooldown: 1.2,
  bustSeconds: 1.1,
  officerSpeed: 185,
  spawnDistance: 700,
};

export const ENEMY = { health: 60, speed: 150, shootRange: 380, shootInterval: 1.6, damage: 8, count: 5 };

export const BULLET = { speed: 900, life: 0.7, radius: 3 };

export const MISSIONS = [
  { id: 1, title: 'Back in Solmar', reward: 600 },
  { id: 2, title: 'Package Run', reward: 900 },
  { id: 3, title: 'Lose the Heat', reward: 1200 },
  { id: 4, title: 'Repo Job', reward: 1500 },
  { id: 5, title: 'Garage Siege', reward: 2200 },
  { id: 6, title: 'The Big Score', reward: 5000 },
];

export const PALETTE = {
  backdrop: '#0e1a24',
  grass: '#7fae5a',
  grassDark: '#6d9c4c',
  park: '#86b364',
  sand: '#e8d39a',
  water: '#2e7fa8',
  waterDeep: '#22648a',
  road: '#3a3f47',
  roadEdge: '#2c3038',
  lane: '#d8c95a',
  sidewalk: '#9aa0a8',
  plaza: '#b9b3a4',
  buildingRoof: ['#c96f4a', '#d9a441', '#7d9bb5', '#b5768f', '#8aa06b', '#a8875f', '#6b7f9e', '#c98a5a'],
  buildingWall: '#5d5a52',
  casino: '#7a2e6d',
  hospital: '#e8e4da',
  garage: '#4a6b8a',
  dock: '#8a7a5a',
  player: '#ff5a3c',
  playerShirt: '#2e86ff',
  cop: '#1c3a5e',
  copCar: '#e8e8e8',
  text: '#f4f1e8',
  muted: '#b8b2a2',
  gold: '#f2c94c',
  red: '#e5534b',
  green: '#58b368',
  blue: '#4fc3f7',
  panel: 'rgba(12, 20, 28, 0.82)',
  panelEdge: '#f2c94c',
  marker: '#ffd94d',
  markerEdge: '#ff8c1a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the save lives between visits (this browser only). */
export const SAVE_KEY = 'solmar-city.save.v1';
