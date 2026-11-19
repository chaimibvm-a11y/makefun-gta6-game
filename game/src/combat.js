// Combat: fists and a pistol for the player, and the rival crew's guns during the
// missions. Bullets are a fixed pool (nothing allocates in a fight), and every hit is
// resolved here so the world only has to ask what happened.

import { BULLET, PLAYER, ENEMY } from './config.js';
import { dist } from './random.js';

const POOL = 48;

/** A fresh bullet pool. */
export function createBullets() {
  const bullets = [];
  for (let i = 0; i < POOL; i += 1) {
    bullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, from: 'player', damage: 0 });
  }
  return bullets;
}

function freeBullet(bullets) {
  for (const b of bullets) if (!b.active) return b;
  return null;
}

/** Fire one bullet from (x, y) toward `angle`. Returns true when a bullet left the barrel. */
export function fireBullet(bullets, x, y, angle, from, damage) {
  const b = freeBullet(bullets);
  if (!b) return false;
  b.active = true;
  b.x = x + Math.cos(angle) * 20;
  b.y = y + Math.sin(angle) * 20;
  b.vx = Math.cos(angle) * BULLET.speed;
  b.vy = Math.sin(angle) * BULLET.speed;
  b.life = BULLET.life;
  b.from = from;
  b.damage = damage;
  return true;
}

/**
 * Move every bullet one step. `hit` is called as hit(bullet, kind, target) for whatever a
 * bullet strikes: 'wall', 'car', 'ped', 'officer', 'enemy' or 'player'. Returns nothing.
 */
export function updateBullets(bullets, dt, city, cars, peds, officers, enemies, player) {
  for (const b of bullets) {
    if (!b.active) continue;
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0 || city.circleBlocked(b.x, b.y, 2)) {
      b.active = false;
      continue;
    }
    // Cars stop bullets.
    let stopped = false;
    for (const car of cars) {
      if (car.wrecked) continue;
      if (dist(b.x, b.y, car.x, car.y) < 24) {
        b.active = false;
        stopped = true;
        break;
      }
    }
    if (stopped) continue;
    if (b.from === 'player') {
      for (const e of enemies) {
        if (e.health > 0 && dist(b.x, b.y, e.x, e.y) < 15) {
          e.health -= b.damage;
          b.active = false;
          stopped = true;
          break;
        }
      }
      if (stopped) continue;
      for (const o of officers) {
        if (dist(b.x, b.y, o.x, o.y) < 14) {
          b.active = false;
          stopped = true;
          break;
        }
      }
      if (stopped) continue;
      for (const p of peds) {
        if (p.state !== 'down' && dist(b.x, b.y, p.x, p.y) < 13) {
          p.state = 'down';
          p.downTimer = 6;
          b.active = false;
          stopped = true;
          break;
        }
      }
    } else if (b.from === 'enemy') {
      const px = player.car ? player.car.x : player.x;
      const py = player.car ? player.car.y : player.y;
      if (dist(b.x, b.y, px, py) < 16) {
        b.active = false;
        player.pendingDamage = (player.pendingDamage || 0) + b.damage;
      }
    }
  }
}

/**
 * The player's punch: everything in front of the player inside range and the arc takes
 * the damage. Returns the list of things hit, so the world can react (wanted level, noise).
 */
export function punch(player, peds, officers, enemies) {
  const hits = [];
  const px = player.x;
  const py = player.y;
  const reach = PLAYER.punchRange;
  const arc = PLAYER.punchArc;
  const check = (target, kind) => {
    const d = dist(px, py, target.x, target.y);
    if (d > reach + 12) return;
    const ang = Math.atan2(target.y - py, target.x - px);
    let diff = ang - player.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) <= arc) hits.push({ kind, target });
  };
  for (const p of peds) if (p.state !== 'down') check(p, 'ped');
  for (const o of officers) check(o, 'officer');
  for (const e of enemies) if (e.health > 0) check(e, 'enemy');
  return hits;
}

/** A rival crew member: spawns during the siege and the finale, shoots at the player. */
export function createEnemy(x, y, random) {
  return {
    x, y,
    angle: random.range(0, Math.PI * 2),
    health: ENEMY.health,
    speed: ENEMY.speed,
    shootTimer: random.range(0.5, 1.5),
    wanderTimer: 0,
    target: null,
  };
}

/** One enemy step: close in on the player and shoot when in range. */
export function updateEnemy(enemy, dt, city, playerX, playerY, bullets, random) {
  if (enemy.health <= 0) return;
  const d = dist(enemy.x, enemy.y, playerX, playerY);
  enemy.shootTimer -= dt;
  if (d > 90) {
    const angle = Math.atan2(playerY - enemy.y, playerX - enemy.x);
    const moved = city.moveCircle(enemy.x, enemy.y, Math.cos(angle) * enemy.speed * dt, Math.sin(angle) * enemy.speed * dt, 12);
    enemy.x = moved.x;
    enemy.y = moved.y;
    enemy.angle = angle;
  }
  if (d < ENEMY.shootRange && enemy.shootTimer <= 0) {
    enemy.shootTimer = ENEMY.shootInterval + random.range(-0.3, 0.4);
    const aim = Math.atan2(playerY - enemy.y, playerX - enemy.x) + random.range(-0.09, 0.09);
    fireBullet(bullets, enemy.x, enemy.y, aim, 'enemy', ENEMY.damage);
  }
}
