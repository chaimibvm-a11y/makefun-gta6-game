// Drawing only: the city, the cars, the people and the effects, plus the title screen,
// the pause menu, the mission list and the busted/wasted panels. The camera follows the
// player across the world; the HUD is drawn by hud.js on top of this.

import { VIEW, WORLD, PALETTE, FONT } from './config.js';
import { STORY } from './missions.js';
import { beachBands, V_ROADS, H_ROADS } from './city.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_MISSIONS = 'missions';

const BEACH_ROAD_Y = 3050;

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / VIEW.width, height / VIEW.height);
    view.x = (width - VIEW.width * view.scale) / 2;
    view.y = (height - VIEW.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = baseline || 'alphabetic';
    context.fillText(value, x, y);
  }

  function inView(cam, x, y, margin) {
    return x > cam.x - margin && x < cam.x + VIEW.width + margin && y > cam.y - margin && y < cam.y + VIEW.height + margin;
  }

  function drawGround(ctx, city, cam) {
    const bands = beachBands();
    // Grass base.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(cam.x - 20, cam.y - 20, VIEW.width + 40, VIEW.height + 40);
    // Beach sand, then the sea with animated wave lines.
    const sandTop = bands.sandY;
    const waterTop = bands.waterY;
    if (waterTop < cam.y + VIEW.height && sandTop > cam.y - 400) {
      ctx.fillStyle = PALETTE.sand;
      ctx.fillRect(cam.x - 20, Math.max(sandTop, cam.y - 20), VIEW.width + 40, waterTop - Math.max(sandTop, cam.y - 20));
      ctx.fillStyle = PALETTE.water;
      ctx.fillRect(cam.x - 20, waterTop, VIEW.width + 40, WORLD.height - waterTop + 40);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i += 1) {
        const wy = waterTop + 18 + i * 34 + Math.sin(city.time * 1.4 + i * 2.1) * 4;
        ctx.beginPath();
        ctx.moveTo(cam.x - 20, wy);
        ctx.lineTo(cam.x + VIEW.width + 20, wy);
        ctx.stroke();
      }
    }
    // Sidewalks: pale bands along every road.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const vx of V_ROADS) {
      ctx.fillRect(vx - 72, Math.max(0, cam.y - 20), 144, Math.min(BEACH_ROAD_Y + 40, cam.y + VIEW.height + 20) - Math.max(0, cam.y - 20));
    }
    for (const hy of H_ROADS) {
      ctx.fillRect(Math.max(0, cam.x - 20), hy - 72, Math.min(WORLD.width, cam.x + VIEW.width + 20) - Math.max(0, cam.x - 20), 144);
    }
    ctx.fillRect(Math.max(0, cam.x - 20), BEACH_ROAD_Y - 64, Math.min(WORLD.width, cam.x + VIEW.width + 20) - Math.max(0, cam.x - 20), 128);
    // Roads: dark asphalt with a dashed centre line.
    ctx.fillStyle = PALETTE.road;
    for (const vx of V_ROADS) {
      ctx.fillRect(vx - 48, Math.max(0, cam.y - 20), 96, Math.min(BEACH_ROAD_Y + 40, cam.y + VIEW.height + 20) - Math.max(0, cam.y - 20));
    }
    for (const hy of H_ROADS) {
      ctx.fillRect(Math.max(0, cam.x - 20), hy - 48, Math.min(WORLD.width, cam.x + VIEW.width + 20) - Math.max(0, cam.x - 20), 96);
    }
    ctx.fillRect(Math.max(0, cam.x - 20), BEACH_ROAD_Y - 40, Math.min(WORLD.width, cam.x + VIEW.width + 20) - Math.max(0, cam.x - 20), 80);
    ctx.strokeStyle = PALETTE.lane;
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 30]);
    for (const vx of V_ROADS) {
      ctx.beginPath();
      ctx.moveTo(vx, Math.max(0, cam.y - 20));
      ctx.lineTo(vx, Math.min(BEACH_ROAD_Y + 40, cam.y + VIEW.height + 20));
      ctx.stroke();
    }
    for (const hy of H_ROADS) {
      ctx.beginPath();
      ctx.moveTo(Math.max(0, cam.x - 20), hy);
      ctx.lineTo(Math.min(WORLD.width, cam.x + VIEW.width + 20), hy);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawParks(ctx, city, cam) {
    for (const park of city.parks) {
      if (!inView(cam, park.x0, park.y0, 400)) continue;
      ctx.fillStyle = park.plaza ? PALETTE.plaza : PALETTE.park;
      ctx.fillRect(park.x0, park.y0, park.x1 - park.x0, park.y1 - park.y0);
      if (park.plaza) {
        ctx.fillStyle = PALETTE.water;
        ctx.beginPath();
        ctx.arc((park.x0 + park.x1) / 2, (park.y0 + park.y1) / 2, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      for (const tree of park.trees) {
        ctx.fillStyle = '#3e7a34';
        ctx.beginPath();
        ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#57a047';
        ctx.beginPath();
        ctx.arc(tree.x - 3, tree.y - 3, tree.r * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const lot of city.parkingLots) {
      if (!inView(cam, lot.x0, lot.y0, 400)) continue;
      ctx.fillStyle = lot.docks ? PALETTE.dock : '#7d7d7d';
      ctx.fillRect(lot.x0, lot.y0, lot.x1 - lot.x0, lot.y1 - lot.y0);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([14, 14]);
      for (let x = lot.x0 + 40; x < lot.x1 - 20; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, lot.y0 + 12);
        ctx.lineTo(x, lot.y1 - 12);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      if (lot.docks) {
        ctx.fillStyle = '#b5763f';
        for (let i = 0; i < 4; i += 1) {
          ctx.fillRect(lot.x0 + 30 + i * 90, lot.y0 + 40, 64, 40);
        }
      }
    }
  }

  function drawBuildings(ctx, city, cam) {
    for (const b of city.buildings) {
      if (!inView(cam, b.x, b.y, 300)) continue;
      // A soft shadow to the south-east, so the blocks read as tall.
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + b.height * 0.5, b.y + b.height * 0.5, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(b.x, b.y, b.w, 10);
      // Windows.
      ctx.fillStyle = 'rgba(20,30,45,0.55)';
      const cols = Math.max(1, Math.floor(b.w / 46));
      const rows = Math.max(1, Math.floor(b.h / 40));
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          ctx.fillRect(b.x + 14 + c * ((b.w - 28) / cols), b.y + 16 + r * ((b.h - 28) / rows), 18, 14);
        }
      }
      if (b.label) {
        ctx.fillStyle = 'rgba(12,20,28,0.8)';
        ctx.fillRect(b.x + 8, b.y + b.h / 2 - 16, ctx.measureText(b.label).width + 220, 32);
        text(b.label, b.x + b.w / 2, b.y + b.h / 2 + 7, 22, '#f4f1e8', 'center', 'middle');
      }
    }
  }

  function drawCarShape(ctx, car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-21, -9, 46, 24);
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-23, -11, 46, 22, 7);
    ctx.fill();
    ctx.fillStyle = '#20262e';
    ctx.fillRect(-6, -9, 14, 18);
    ctx.fillStyle = car.type === 'police' ? '#1c3a5e' : 'rgba(255,255,255,0.75)';
    ctx.fillRect(12, -9, 8, 18);
    if (car.type === 'police') {
      ctx.fillStyle = '#d94f3d';
      ctx.fillRect(-2, -11, 6, 5);
      ctx.fillStyle = '#3d7dd9';
      ctx.fillRect(-2, 6, 6, 5);
      text('SCPD', -12, 4, 9, '#1c3a5e', 'center', 'middle');
    }
    if (car.type === 'taxi') text('TAXI', -2, 4, 8, '#20262e', 'center', 'middle');
    if (car.wrecked) {
      ctx.fillStyle = 'rgba(20,20,20,0.6)';
      ctx.fillRect(-23, -11, 46, 22);
    }
    ctx.restore();
  }

  function drawPeople(ctx, state, cam) {
    for (const ped of state.peds) {
      if (!inView(cam, ped.x, ped.y, 60) || ped.state === 'down') continue;
      ctx.fillStyle = ped.skin;
      ctx.beginPath();
      ctx.arc(ped.x, ped.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ped.color;
      ctx.beginPath();
      ctx.arc(ped.x, ped.y + 4, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const ped of state.peds) {
      if (ped.state !== 'down' || !inView(cam, ped.x, ped.y, 60)) continue;
      ctx.fillStyle = ped.color;
      ctx.beginPath();
      ctx.arc(ped.x, ped.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e5534b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ped.x - 7, ped.y - 7);
      ctx.lineTo(ped.x + 7, ped.y + 7);
      ctx.stroke();
    }
    for (const officer of state.officers) {
      if (!inView(cam, officer.x, officer.y, 60)) continue;
      ctx.fillStyle = '#e8b98a';
      ctx.beginPath();
      ctx.arc(officer.x, officer.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.cop;
      ctx.beginPath();
      ctx.arc(officer.x, officer.y + 4, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2c94c';
      ctx.fillRect(officer.x - 2, officer.y - 4, 4, 3);
    }
    for (const enemy of state.enemies) {
      if (enemy.health <= 0 || !inView(cam, enemy.x, enemy.y, 60)) continue;
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y + 4, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a1512';
      ctx.fillRect(enemy.x - 12, enemy.y - 20, 24, 4);
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(enemy.x - 12, enemy.y - 20, Math.max(0, (24 * enemy.health) / 60), 4);
    }
  }

  function drawPlayer(ctx, state, cam) {
    const player = state.player;
    if (player.car) return;
    if (!inView(cam, player.x, player.y, 60)) return;
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 10) % 2 === 0) return;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(2, 3, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.playerShirt;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    // The gun, when the player is aiming.
    if (state.aiming) {
      ctx.fillStyle = '#222222';
      ctx.fillRect(8, -2, 14, 4);
    }
    ctx.restore();
  }

  function drawBullets(ctx, state, cam) {
    ctx.fillStyle = '#ffe27a';
    for (const b of state.bullets) {
      if (!b.active || !inView(cam, b.x, b.y, 20)) continue;
      ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
    }
  }

  function drawParticles(ctx, state, cam) {
    for (const p of state.particles) {
      if (!p.active || !inView(cam, p.x, p.y, 20)) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMissionMarker(ctx, state, cam) {
    const mission = state.missions.active;
    if (!mission) return;
    const pulse = 26 + Math.sin(state.time * 4) * 6;
    ctx.strokeStyle = PALETTE.marker;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(mission.x, mission.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,217,77,0.25)';
    ctx.beginPath();
    ctx.arc(mission.x, mission.y, pulse, 0, Math.PI * 2);
    ctx.fill();
    // A guiding arrow at the screen edge when the marker is off-screen.
    const px = state.player.car ? state.player.car.x : state.player.x;
    const py = state.player.car ? state.player.car.y : state.player.y;
    if (!inView(cam, mission.x, mission.y, 40)) {
      const ang = Math.atan2(mission.y - py, mission.x - px);
      const ex = cam.x + VIEW.width / 2 + Math.cos(ang) * 300;
      const ey = cam.y + VIEW.height / 2 + Math.sin(ang) * 210;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(ang);
      ctx.fillStyle = PALETTE.marker;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-10, -12);
      ctx.lineTo(-10, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const d = Math.round(Math.hypot(mission.x - px, mission.y - py));
      text(`${d}m`, ex, ey + 28, 15, PALETTE.marker, 'center', 'top');
    }
  }

  function drawWorld(ctx, state, city, cam) {
    drawGround(ctx, city, cam);
    drawParks(ctx, city, cam);
    drawBuildings(ctx, city, cam);
    drawMissionMarker(ctx, state, cam);
    for (const car of state.cars) {
      if (inView(cam, car.x, car.y, 80)) drawCarShape(ctx, car);
    }
    drawPeople(ctx, state, cam);
    drawBullets(ctx, state, cam);
    drawPlayer(ctx, state, cam);
    drawParticles(ctx, state, cam);
  }

  function drawPanel(ctx, title, lines, prompt, width) {
    const w = width || 640;
    const height = 150 + lines.length * 34 + 60;
    const x = (VIEW.width - w) / 2;
    const y = (VIEW.height - height) / 2;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(x, y, w, height);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, height - 2);
    text(title, VIEW.width / 2, y + 66, 44, PALETTE.gold, 'center');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], VIEW.width / 2, y + 118 + i * 34, 20, PALETTE.text, 'center');
    }
    if (prompt) text(prompt, VIEW.width / 2, y + height - 26, 20, PALETTE.gold, 'center');
  }

  function wrapLines(value, maxChars) {
    const words = value.split(' ');
    const lines = [''];
    for (const word of words) {
      const last = lines[lines.length - 1];
      if (last.length + word.length + 1 > maxChars && last.length > 0) lines.push(word);
      else lines[lines.length - 1] = last ? `${last} ${word}` : word;
    }
    return lines;
  }

  function drawTitle(ctx, state) {
    const introLines = wrapLines(STORY.intro, 72);
    drawPanel(ctx, 'SOLMAR CITY', [
      ...introLines,
      '',
      'WASD / arrows — walk & drive   •   Shift — run   •   E — steal / enter a car',
      'F — punch   •   Mouse — aim, click — shoot   •   P — pause   •   J — missions   •   M — mute',
      '',
      `Missions done: ${state.missions.done.length} of 6   •   Best getaway: $${state.bestMoney.toLocaleString('en-US')}`,
    ], state.save ? 'Press Space or click — Continue' : 'Press Space or click — New game', 780);
  }

  function drawPaused(ctx) {
    drawPanel(ctx, 'Paused', [
      'The city waits for you.',
      '',
      'Space — resume   •   J — missions   •   M — mute',
      'Q — save now   •   N — new game (wipes the save)',
    ], 'Press P to resume', 640);
  }

  function drawBusted(ctx, state) {
    drawPanel(ctx, 'BUSTED', [
      'The SCPD caught up with you.',
      `They took $${state.bustFine.toLocaleString('en-US')} in fines. Mara bailed you out.`,
      '',
      'You wake up outside Precinct 7, clean — for now.',
    ], 'Press Space to get back on the street', 640);
  }

  function drawWasted(ctx, state) {
    drawPanel(ctx, 'WASTED', [
      'Solmar General patched you up.',
      `The hospital bill was $${state.bustFine.toLocaleString('en-US')}.`,
      '',
      'Dario walks out with a limp and a grudge.',
    ], 'Press Space to get back on the street', 640);
  }

  function drawMissions(ctx, state) {
    const defs = state.missionDefs;
    const rows = defs.map((def, i) => {
      const done = state.missions.done.includes(def.id);
      const current = state.missions.index === i && state.missions.active;
      const mark = done ? '\u2713' : current ? '\u25B6' : `${i + 1}.`;
      return `${mark}  ${def.title}  —  $${def.reward.toLocaleString('en-US')}${done ? '  (done)' : ''}`;
    });
    if (state.missions.done.length >= 6) {
      rows.push('', 'All six missions done. Solmar City is yours, Dario.');
    }
    drawPanel(ctx, 'Missions', rows, 'Press J or P to go back', 640);
  }

  /** Paint one frame: the world, then the screen the game is on. */
  function draw(state, city, screen) {
    const ctx = context;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cam = state.camera;
    const shakeX = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake * 14 : 0;
    const shakeY = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake * 14 : 0;
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x - (cam.x + shakeX) * view.scale, view.y - (cam.y + shakeY) * view.scale);
    drawWorld(ctx, state, city, { x: cam.x + shakeX, y: cam.y + shakeY });
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (screen === SCREEN_TITLE) drawTitle(ctx, state);
    else if (screen === SCREEN_PAUSED) drawPaused(ctx);
    else if (screen === SCREEN_BUSTED) drawBusted(ctx, state);
    else if (screen === SCREEN_WASTED) drawWasted(ctx, state);
    else if (screen === SCREEN_MISSIONS) drawMissions(ctx, state);
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    /** Turn a mouse position in screen pixels into a point in the world. */
    screenToWorld(clientX, clientY, cam) {
      return {
        x: cam.x + (clientX - view.x) / view.scale,
        y: cam.y + (clientY - view.y) / view.scale,
      };
    },
  };
}
