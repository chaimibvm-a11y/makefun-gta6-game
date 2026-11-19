// Particles: exhaust puffs, crash sparks, muzzle flashes and the dust a getaway kicks
// up. A fixed pool — nothing allocates while the game runs — each particle a dot with a
// velocity, a size, a colour and a short life.

const POOL = 220;

export function createParticles() {
  const parts = [];
  for (let i = 0; i < POOL; i += 1) {
    parts.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff' });
  }
  return parts;
}

function freeParticle(parts) {
  for (const p of parts) if (!p.active) return p;
  return null;
}

function spawn(parts, x, y, vx, vy, life, size, color) {
  const p = freeParticle(parts);
  if (!p) return;
  p.active = true;
  p.x = x;
  p.y = y;
  p.vx = vx;
  p.vy = vy;
  p.life = life;
  p.maxLife = life;
  p.size = size;
  p.color = color;
}

/** A puff of exhaust behind a car. */
export function exhaust(parts, x, y, angle, random) {
  const back = angle + Math.PI;
  spawn(parts, x + Math.cos(back) * 24, y + Math.sin(back) * 24,
    Math.cos(back) * 40 + random.range(-14, 14), Math.sin(back) * 40 + random.range(-14, 14),
    random.range(0.3, 0.6), random.range(3, 6), 'rgba(180,180,180,0.5)');
}

/** Orange sparks from a crash. */
export function crashSparks(parts, x, y, random) {
  for (let i = 0; i < 10; i += 1) {
    const a = random.range(0, Math.PI * 2);
    const s = random.range(60, 240);
    spawn(parts, x, y, Math.cos(a) * s, Math.sin(a) * s, random.range(0.2, 0.5), random.range(2, 4), '#ffb347');
  }
}

/** Grey smoke from a damaged car. */
export function damageSmoke(parts, x, y, random) {
  spawn(parts, x + random.range(-8, 8), y + random.range(-8, 8),
    random.range(-12, 12), random.range(-46, -20),
    random.range(0.6, 1.1), random.range(5, 9), 'rgba(90,90,90,0.55)');
}

/** A bright muzzle flash at the end of a barrel. */
export function muzzleFlash(parts, x, y, angle) {
  spawn(parts, x + Math.cos(angle) * 26, y + Math.sin(angle) * 26, 0, 0, 0.09, 9, '#ffe27a');
  spawn(parts, x + Math.cos(angle) * 30, y + Math.sin(angle) * 30, 0, 0, 0.06, 5, '#ffffff');
}

/** Dust kicked up by running feet. */
export function dust(parts, x, y, random) {
  spawn(parts, x + random.range(-6, 6), y + random.range(-6, 6),
    random.range(-20, 20), random.range(-20, 20),
    random.range(0.25, 0.5), random.range(2, 4), 'rgba(200,190,160,0.5)');
}

export function updateParticles(parts, dt) {
  for (const p of parts) {
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2.2 * dt;
    p.vy *= 1 - 2.2 * dt;
  }
}
