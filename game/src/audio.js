// Sound, all of it made in the browser with the Web Audio API — no audio files, no
// network. A low engine hum that follows the car's speed, a two-tone police siren, gunshots
// and crashes from filtered noise, pickup blips, and a quiet bass-and-hats loop that keeps
// the city humming. Nothing starts until the player presses a key or clicks (browsers
// demand a gesture), and M mutes everything.

const MUSIC_BPM = 104;
const BASS_LINE = [45, 0, 45, 48, 45, 0, 52, 50, 45, 0, 45, 48, 57, 55, 52, 50];
const LEAD_LINE = [69, 0, 72, 0, 76, 0, 72, 69, 67, 0, 69, 0, 72, 76, 79, 0];

export function createAudio() {
  return {
    ctx: null,
    master: null,
    muted: false,
    engineOsc: null,
    engineGain: null,
    engineFilter: null,
    sirenOsc: null,
    sirenGain: null,
    sirenTimer: 0,
    sirenHigh: false,
    musicTimer: null,
    musicStep: 0,
    nextNoteTime: 0,
  };
}

/** Build the audio graph on the first gesture. Safe to call more than once. */
export function ensureAudio(audio) {
  if (audio.ctx) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return;
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = audio.muted ? 0 : 0.5;
    master.connect(ctx.destination);
    audio.ctx = ctx;
    audio.master = master;

    const engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 50;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    const engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
    audio.engineOsc = engineOsc;
    audio.engineGain = engineGain;

    const sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'square';
    sirenOsc.frequency.value = 720;
    const sirenGain = ctx.createGain();
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(master);
    sirenOsc.start();
    audio.sirenOsc = sirenOsc;
    audio.sirenGain = sirenGain;
  } catch {
    audio.ctx = null;
  }
}

/** The engine hum follows the car's speed; silent on foot. */
export function setEngine(audio, speedRatio, driving) {
  if (!audio.ctx || !audio.engineOsc) return;
  const target = driving ? 0.05 + speedRatio * 0.075 : 0;
  audio.engineGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.08);
  audio.engineOsc.frequency.setTargetAtTime(52 + speedRatio * 105, audio.ctx.currentTime, 0.08);
}

/** The siren wails while the wanted level is above zero. */
export function updateSiren(audio, dt, wanted) {
  if (!audio.ctx || !audio.sirenOsc) return;
  if (wanted <= 0) {
    audio.sirenGain.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.1);
    return;
  }
  audio.sirenGain.gain.setTargetAtTime(0.028, audio.ctx.currentTime, 0.2);
  audio.sirenTimer -= dt;
  if (audio.sirenTimer <= 0) {
    audio.sirenTimer = 0.42;
    audio.sirenHigh = !audio.sirenHigh;
    audio.sirenOsc.frequency.setTargetAtTime(audio.sirenHigh ? 950 : 700, audio.ctx.currentTime, 0.05);
  }
}

function noiseBuffer(ctx, seconds) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function playNoise(audio, seconds, filterFreq, gainValue) {
  if (!audio.ctx) return;
  const ctx = audio.ctx;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, seconds);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audio.master);
  source.start();
}

function playTone(audio, freq, seconds, type, gainValue, when) {
  if (!audio.ctx) return;
  const ctx = audio.ctx;
  const osc = ctx.createOscillator();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  const gain = ctx.createGain();
  const start = ctx.currentTime + (when || 0);
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(start);
  osc.stop(start + seconds + 0.02);
}

export function playShot(audio) {
  playNoise(audio, 0.14, 2400, 0.5);
  playTone(audio, 140, 0.1, 'square', 0.25);
}

export function playPunch(audio) {
  playNoise(audio, 0.09, 700, 0.35);
}

export function playCrash(audio, hard) {
  playNoise(audio, hard ? 0.35 : 0.18, 500, hard ? 0.6 : 0.35);
}

export function playPickup(audio) {
  playTone(audio, 660, 0.09, 'sine', 0.3);
  playTone(audio, 990, 0.14, 'sine', 0.3, 0.08);
}

export function playMissionDone(audio) {
  playTone(audio, 523, 0.14, 'triangle', 0.35);
  playTone(audio, 659, 0.14, 'triangle', 0.35, 0.13);
  playTone(audio, 784, 0.24, 'triangle', 0.35, 0.26);
}

export function playBusted(audio) {
  playTone(audio, 392, 0.3, 'triangle', 0.3);
  playTone(audio, 311, 0.5, 'triangle', 0.3, 0.28);
}

/** The music loop: a bass line and a sparse lead, scheduled a bar ahead. */
export function startMusic(audio) {
  if (!audio.ctx || audio.musicTimer) return;
  audio.nextNoteTime = audio.ctx.currentTime + 0.1;
  audio.musicTimer = window.setInterval(() => {
    if (!audio.ctx || audio.muted) return;
    const stepDur = 60 / MUSIC_BPM / 2;
    while (audio.nextNoteTime < audio.ctx.currentTime + 0.25) {
      const step = audio.musicStep % 16;
      const bass = BASS_LINE[step];
      if (bass) {
        const freq = 440 * Math.pow(2, (bass - 69) / 12);
        const when = audio.nextNoteTime - audio.ctx.currentTime;
        playTone(audio, freq, stepDur * 0.9, 'sine', 0.16, Math.max(0, when));
      }
      const lead = LEAD_LINE[step];
      if (lead && step % 2 === 0) {
        const freq = 440 * Math.pow(2, (lead - 69) / 12);
        const when = audio.nextNoteTime - audio.ctx.currentTime;
        playTone(audio, freq, stepDur * 1.4, 'triangle', 0.05, Math.max(0, when));
      }
      audio.nextNoteTime += stepDur;
      audio.musicStep += 1;
    }
  }, 90);
}

export function setMuted(audio, muted) {
  audio.muted = muted;
  if (audio.ctx && audio.master) audio.master.gain.value = muted ? 0 : 0.5;
}
