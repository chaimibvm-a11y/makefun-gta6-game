// The HUD: health, money, ammo and the wanted stars, the mission objective, the clock,
// and the minimap — a small live map of the city with the player, the cars, the police and
// the mission marker. Everything is drawn on the same canvas as the world, in screen space.

import { PALETTE, VIEW, WORLD, FONT, CLOCK } from './config.js';
import { currentObjectiveText } from './missions.js';

const MAP = { x: VIEW.width - 232, y: 16, w: 216, h: 162 };

function text(ctx, value, x, y, size, color, align, baseline) {
  ctx.font = `${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = baseline || 'top';
  ctx.fillText(value, x, y);
}

function clockText(minutes) {
  const total = CLOCK.startHour * 60 + CLOCK.startMinute + minutes;
  const h = Math.floor(total / 60) % 24;
  const m = Math.floor(total % 60);
  const hh = h < 10 ? `0${h}` : `${h}`;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${hh}:${mm}`;
}

function drawHealth(ctx, health) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(16, 16, 220, 54);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1;
  ctx.strokeRect(16.5, 16.5, 220, 54);
  text(ctx, 'DARIO VENN', 26, 24, 15, PALETTE.text, 'left');
  const bw = 200;
  ctx.fillStyle = '#3a1512';
  ctx.fillRect(26, 46, bw, 12);
  ctx.fillStyle = health > 50 ? PALETTE.green : health > 25 ? PALETTE.gold : PALETTE.red;
  ctx.fillRect(26, 46, Math.max(0, (bw * health) / 100), 12);
}

function drawMoney(ctx, money, ammo) {
  text(ctx, `$${money.toLocaleString('en-US')}`, 26, 78, 24, PALETTE.gold, 'left');
  text(ctx, `Ammo ${ammo}`, 26, 106, 15, PALETTE.muted, 'left');
}

function drawStars(ctx, stars) {
  const cx = VIEW.width / 2;
  const y = 22;
  ctx.font = `30px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < stars ? PALETTE.gold : 'rgba(244,241,232,0.25)';
    ctx.fillText('\u2605', cx + (i - 2) * 34, y);
  }
  if (stars > 0) {
    text(ctx, stars >= 3 ? 'THE HEAT IS ON' : 'WANTED', cx, 56, 13, PALETTE.red, 'center');
  }
}

function drawMinimap(ctx, state, city) {
  const { x, y, w, h } = MAP;
  const sx = w / WORLD.width;
  const sy = h / WORLD.height;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.strokeRect(x - 5.5, y - 5.5, w + 11, h + 11);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  // Land and water.
  ctx.fillStyle = '#5d7d4a';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#2e7fa8';
  ctx.fillRect(x, y + (3130 / WORLD.height) * h, w, h - (3130 / WORLD.height) * h);
  // Roads.
  ctx.strokeStyle = '#3a3f47';
  ctx.lineWidth = 3;
  for (const vx of [300, 900, 1500, 2100, 2700, 3300, 3900, 4500]) {
    ctx.beginPath();
    ctx.moveTo(x + vx * sx, y);
    ctx.lineTo(x + vx * sx, y + h);
    ctx.stroke();
  }
  for (const hy of [300, 800, 1300, 1800, 2300, 2750, 3050]) {
    ctx.beginPath();
    ctx.moveTo(x, y + hy * sy);
    ctx.lineTo(x + w, y + hy * sy);
    ctx.stroke();
  }
  // Landmarks.
  ctx.fillStyle = PALETTE.gold;
  for (const lm of city.landmarks) {
    if (lm.kind === 'docks' || lm.kind === 'park') continue;
    ctx.fillRect(x + lm.cx * sx - 2, y + lm.cy * sy - 2, 4, 4);
  }
  // Mission marker, pulsing.
  const mission = state.missions.active;
  if (mission) {
    const pulse = 5 + Math.sin(state.time * 5) * 2;
    ctx.fillStyle = PALETTE.marker;
    ctx.beginPath();
    ctx.arc(x + mission.x * sx, y + mission.y * sy, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff8c1a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Police cars, then traffic, then the player.
  ctx.fillStyle = '#4fc3f7';
  for (const car of state.cars) {
    if (car.driver === 'police') {
      ctx.fillRect(x + car.x * sx - 2, y + car.y * sy - 2, 4, 4);
    }
  }
  ctx.fillStyle = 'rgba(244,241,232,0.7)';
  for (const car of state.cars) {
    if (car.driver === 'traffic') {
      ctx.fillRect(x + car.x * sx - 1.5, y + car.y * sy - 1.5, 3, 3);
    }
  }
  const px = state.player.car ? state.player.car.x : state.player.x;
  const py = state.player.car ? state.player.car.y : state.player.y;
  ctx.fillStyle = '#ff5a3c';
  ctx.beginPath();
  ctx.arc(x + px * sx, y + py * sy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  text(ctx, clockText(state.clockMinutes), x + w, y + h + 10, 14, PALETTE.text, 'right');
  text(ctx, 'SOLMAR CITY', x, y + h + 10, 14, PALETTE.muted, 'left');
}

function drawObjective(ctx, state) {
  const textValue = currentObjectiveText(state.missions);
  ctx.font = `16px ${FONT}`;
  const w = Math.max(320, ctx.measureText(textValue).width + 32);
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect((VIEW.width - w) / 2, VIEW.height - 52, w, 34);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.strokeRect((VIEW.width - w) / 2 + 0.5, VIEW.height - 51.5, w, 34);
  text(ctx, textValue, VIEW.width / 2, VIEW.height - 44, 16, PALETTE.text, 'center');
}

function drawBanner(ctx, state) {
  const banner = state.missions.banner;
  if (!banner || state.missions.bannerTimer <= 0) return;
  const alpha = Math.min(1, state.missions.bannerTimer);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(VIEW.width / 2 - 320, 120, 640, 92);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(VIEW.width / 2 - 319, 121, 638, 90);
  text(ctx, banner.text, VIEW.width / 2, 138, 30, PALETTE.gold, 'center');
  if (banner.sub) text(ctx, banner.sub, VIEW.width / 2, 176, 17, PALETTE.text, 'center');
  ctx.restore();
}

function drawHint(ctx, state) {
  let hint = '';
  if (state.player.car) hint = 'W/S drive  •  A/D steer  •  Space handbrake  •  E get out  •  P pause  •  M mute';
  else if (state.nearCar) hint = 'E steal car  •  F punch  •  Click to shoot  •  Shift run  •  P pause  •  M mute';
  else hint = 'WASD walk  •  Shift run  •  F punch  •  Click to shoot  •  E enter car  •  J missions';
  text(ctx, hint, 16, VIEW.height - 24, 14, 'rgba(244,241,232,0.75)', 'left');
}

/** Paint the whole HUD over the world. */
export function drawHud(ctx, state, city) {
  drawHealth(ctx, state.health);
  drawMoney(ctx, state.money, state.ammo);
  drawStars(ctx, state.wanted.stars);
  drawMinimap(ctx, state, city);
  drawObjective(ctx, state);
  drawBanner(ctx, state);
  drawHint(ctx, state);
}
