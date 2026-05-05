// =============================================================
// Musical Improv Freestyle Practice Tool
// Pure Web Audio, no dependencies
// =============================================================

// ---------- Music theory ----------
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SCALES = {
  major:      [0, 2, 4, 5, 7, 9, 11],
  minor:      [0, 2, 3, 5, 7, 8, 10],
  dorian:     [0, 2, 3, 5, 7, 9, 10],
  phrygian:   [0, 1, 3, 5, 7, 8, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  pentMinor:  [0, 3, 5, 7, 10]
};

const PRESETS = {
  'i–VI–III–VII (minor anthem)': [0, 5, 2, 6],
  'I–IV–V–I (classic)':          [0, 3, 4, 0],
  'ii–V–I (jazz)':               [1, 4, 0, 0],
  'i–VII–VI–VII (epic minor)':   [0, 6, 5, 6],
  'I–V–vi–IV (pop)':             [0, 4, 5, 3]
};

// ---------- Beat styles ----------
const STYLES = {
  boombap: {
    name: 'Boom Bap', bpm: 92, swing: 24, seventh: false,
    pattern: {
      kick:  [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hh:    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      oh:    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0]
    }
  },
  trap: {
    name: 'Trap', bpm: 142, swing: 0, seventh: false,
    pattern: {
      kick:  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hh:    [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
      oh:    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1]
    }
  },
  lofi: {
    name: 'Lo-fi', bpm: 78, swing: 50, seventh: true,
    pattern: {
      kick:  [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hh:    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      oh:    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0]
    }
  },
  drill: {
    name: 'Drill', bpm: 144, swing: 0, seventh: false,
    pattern: {
      kick:  [1,0,0,0, 0,0,1,0, 0,0,1,1, 0,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hh:    [1,0,1,1, 1,0,1,0, 1,1,1,0, 1,0,1,1],
      oh:    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0]
    }
  },
  jazzhop: {
    name: 'Jazz-hop', bpm: 88, swing: 40, seventh: true,
    pattern: {
      kick:  [1,0,0,0, 0,0,0,1, 0,0,0,0, 0,1,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hh:    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      oh:    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]
    }
  }
};

const TRACKS = [
  { id: 'kick',  label: 'Kick' },
  { id: 'snare', label: 'Snare' },
  { id: 'hh',    label: 'Hi-hat' },
  { id: 'oh',    label: 'Open Hat' }
];

// ---------- App state ----------
const state = {
  style: 'boombap',
  bpm: 92,
  swing: 24,
  master: 0.75,
  key: 0,
  scale: 'minor',
  barsPerChord: 1,
  pattern: emptyPattern(),
  volumes: { kick: 1.0, snare: 0.85, hh: 0.45, oh: 0.45 },
  muted:   { kick: false, snare: false, hh: false, oh: false },
  chordSlots: [
    { degree: 0, on: true },
    { degree: 5, on: true },
    { degree: 2, on: true },
    { degree: 6, on: true }
  ],
  chordMode: 'random',
  currentStep: 0,
  globalStep: 0,
  currentChord: 0
};

function emptyPattern() {
  return {
    kick: Array(16).fill(0),
    snare: Array(16).fill(0),
    hh: Array(16).fill(0),
    oh: Array(16).fill(0)
  };
}

// ---------- Audio engine ----------
let ctx = null;
let masterGain, drumsGain, chordsGain;
let noiseBuffer;

function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();

  masterGain = ctx.createGain();
  masterGain.gain.value = state.master;
  masterGain.connect(ctx.destination);

  drumsGain = ctx.createGain();
  drumsGain.gain.value = 0.9;
  drumsGain.connect(masterGain);

  chordsGain = ctx.createGain();
  chordsGain.gain.value = 0.55;
  chordsGain.connect(masterGain);

  const len = ctx.sampleRate * 2;
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ---------- Synth voices ----------
function playKick(time, gain = 1) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.14);
  env.gain.setValueAtTime(0.0001, time);
  env.gain.exponentialRampToValueAtTime(gain, time + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, time + 0.42);
  osc.connect(env).connect(drumsGain);
  osc.start(time);
  osc.stop(time + 0.5);

  const click = ctx.createOscillator();
  const cenv = ctx.createGain();
  click.type = 'triangle';
  click.frequency.setValueAtTime(2000, time);
  click.frequency.exponentialRampToValueAtTime(200, time + 0.02);
  cenv.gain.setValueAtTime(gain * 0.4, time);
  cenv.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);
  click.connect(cenv).connect(drumsGain);
  click.start(time);
  click.stop(time + 0.05);
}

function playSnare(time, gain = 0.7, brushy = false) {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.playbackRate.value = 0.9 + Math.random() * 0.2;
  const filt = ctx.createBiquadFilter();
  filt.type = brushy ? 'bandpass' : 'highpass';
  filt.frequency.value = brushy ? 3500 : 1200;
  filt.Q.value = brushy ? 0.7 : 0.9;
  const env = ctx.createGain();
  const decay = brushy ? 0.22 : 0.16;
  env.gain.setValueAtTime(0.0001, time);
  env.gain.exponentialRampToValueAtTime(gain, time + 0.002);
  env.gain.exponentialRampToValueAtTime(0.0001, time + decay);
  noise.connect(filt).connect(env).connect(drumsGain);
  noise.start(time);
  noise.stop(time + decay + 0.05);

  if (!brushy) {
    const tone = ctx.createOscillator();
    const tenv = ctx.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(190, time);
    tone.frequency.exponentialRampToValueAtTime(110, time + 0.08);
    tenv.gain.setValueAtTime(0.0001, time);
    tenv.gain.exponentialRampToValueAtTime(gain * 0.5, time + 0.002);
    tenv.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
    tone.connect(tenv).connect(drumsGain);
    tone.start(time);
    tone.stop(time + 0.12);
  }
}

function playHat(time, open = false, gain = 0.4) {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.playbackRate.value = 1.5;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7000;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 10000;
  bp.Q.value = 0.8;
  const env = ctx.createGain();
  const decay = open ? 0.28 : 0.045;
  env.gain.setValueAtTime(0.0001, time);
  env.gain.exponentialRampToValueAtTime(gain, time + 0.001);
  env.gain.exponentialRampToValueAtTime(0.0001, time + decay);
  noise.connect(hp).connect(bp).connect(env).connect(drumsGain);
  noise.start(time);
  noise.stop(time + decay + 0.05);
}

function playChord(time, semitones, duration, gain = 0.18) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.6;
  filter.frequency.setValueAtTime(700, time);
  filter.frequency.linearRampToValueAtTime(1700, time + 0.08);
  filter.frequency.linearRampToValueAtTime(900, time + duration);

  const env = ctx.createGain();
  const attack = 0.06;
  const release = Math.min(0.35, duration * 0.4);
  env.gain.setValueAtTime(0.0001, time);
  env.gain.linearRampToValueAtTime(gain, time + attack);
  env.gain.setValueAtTime(gain, time + duration - release);
  env.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  filter.connect(env).connect(chordsGain);

  const chordRootMidi = 60 + state.key;
  semitones.forEach((s) => {
    const freq = midiToFreq(chordRootMidi + s);
    [-9, 0, 9].forEach(detune => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + duration + 0.1);
    });
  });

  const bassMidi = 36 + state.key + semitones[0];
  const bass = ctx.createOscillator();
  const bassEnv = ctx.createGain();
  bass.type = 'sine';
  bass.frequency.value = midiToFreq(bassMidi);
  bassEnv.gain.setValueAtTime(0.0001, time);
  bassEnv.gain.linearRampToValueAtTime(gain * 1.6, time + 0.02);
  bassEnv.gain.setValueAtTime(gain * 1.4, time + duration - release);
  bassEnv.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  bass.connect(bassEnv).connect(chordsGain);
  bass.start(time);
  bass.stop(time + duration + 0.1);
}

// ---------- Music helpers ----------
function getChordScale() {
  return SCALES[state.scale === 'pentMinor' ? 'minor' : state.scale];
}

function chordSemis(degree, withSeventh = false) {
  const sc = getChordScale();
  const len = sc.length;
  const get = (i) => {
    const oct = Math.floor(i / len);
    return sc[((i % len) + len) % len] + oct * 12;
  };
  const notes = [get(degree), get(degree + 2), get(degree + 4)];
  if (withSeventh && len >= 7) notes.push(get(degree + 6));
  return notes;
}

function chordName(degree) {
  const semis = chordSemis(degree, false);
  const root = NOTE_NAMES[((state.key + semis[0]) % 12 + 12) % 12];
  const third = semis[1] - semis[0];
  const fifth = semis[2] - semis[0];
  let q = '';
  if (third === 3 && fifth === 7) q = 'm';
  else if (third === 4 && fifth === 7) q = '';
  else if (third === 3 && fifth === 6) q = 'dim';
  else if (third === 4 && fifth === 8) q = 'aug';
  return root + q;
}

function chordRoman(degree) {
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const semis = chordSemis(degree, false);
  const third = semis[1] - semis[0];
  const fifth = semis[2] - semis[0];
  let n = numerals[degree % 7];
  if (third === 3) n = n.toLowerCase();
  if (fifth === 6) n += '°';
  if (fifth === 8) n += '+';
  return n;
}

// ---------- Scheduler ----------
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.1;

let isPlaying = false;
let nextStepTime = 0;
let timerID = null;
const stepQueue = [];

function stepDuration() {
  return 60.0 / state.bpm / 4;
}

function advanceStepTime() {
  const sixteenth = stepDuration();
  const swingDelay = (state.swing / 100) * 0.5 * sixteenth;
  let advance;
  if (state.currentStep % 2 === 0) {
    advance = sixteenth + swingDelay;
  } else {
    advance = sixteenth - swingDelay;
  }
  nextStepTime += advance;
  state.currentStep = (state.currentStep + 1) % 16;
  state.globalStep++;
}

function scheduleEvents(step, time) {
  TRACKS.forEach(t => {
    if (state.muted[t.id]) return;
    if (!state.pattern[t.id][step]) return;
    const v = state.volumes[t.id];
    switch (t.id) {
      case 'kick':  playKick(time, 1.0 * v); break;
      case 'snare': {
        const brushy = state.style === 'jazzhop' || state.style === 'lofi';
        playSnare(time, 0.85 * v, brushy);
        break;
      }
      case 'hh': playHat(time, false, 0.45 * v); break;
      case 'oh': playHat(time, true, 0.40 * v); break;
    }
  });

  const period = 16 * state.barsPerChord;
  if (state.globalStep % period === 0) {
    const chordIdx = Math.floor(state.globalStep / period) % 4;
    state.currentChord = chordIdx;
    const slot = state.chordSlots[chordIdx];
    if (slot && slot.on) {
      const dur = period * stepDuration();
      const withSeventh = STYLES[state.style].seventh;
      const semis = chordSemis(slot.degree, withSeventh);
      playChord(time, semis, dur * 0.97);
    }
    stepQueue.push({ kind: 'chord', idx: chordIdx, time });
  }

  stepQueue.push({ kind: 'step', step, time });
}

function scheduler() {
  if (!isPlaying) return;
  while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) {
    scheduleEvents(state.currentStep, nextStepTime);
    advanceStepTime();
  }
  timerID = setTimeout(scheduler, LOOKAHEAD_MS);
}

function uiLoop() {
  if (!isPlaying) return;
  const now = ctx.currentTime;
  while (stepQueue.length && stepQueue[0].time <= now + 0.005) {
    const ev = stepQueue.shift();
    if (ev.kind === 'step') highlightStep(ev.step);
    else if (ev.kind === 'chord') highlightChord(ev.idx);
  }
  requestAnimationFrame(uiLoop);
}

function setPlayLabel(playing) {
  const btn = document.getElementById('playBtn');
  btn.textContent = playing ? 'Stop' : 'Play';
  btn.classList.toggle('primary', !playing);
}

async function start() {
  initAudio();
  if (ctx.state === 'suspended') await ctx.resume();
  state.currentStep = 0;
  state.globalStep = 0;
  nextStepTime = ctx.currentTime + 0.05;
  isPlaying = true;
  setPlayLabel(true);
  scheduler();
  requestAnimationFrame(uiLoop);
}

function stop() {
  isPlaying = false;
  if (timerID) clearTimeout(timerID);
  stepQueue.length = 0;
  setPlayLabel(false);
  document.querySelectorAll('.step.playing').forEach(el => el.classList.remove('playing'));
  document.querySelectorAll('.chord-slot.playing').forEach(el => el.classList.remove('playing'));
}

// ---------- UI rendering ----------
function renderGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  TRACKS.forEach(t => {
    const label = document.createElement('div');
    label.className = 'track-label';
    label.textContent = t.label;
    grid.appendChild(label);

    const vol = document.createElement('input');
    vol.type = 'range';
    vol.className = 'track-vol';
    vol.min = 0; vol.max = 100;
    vol.value = Math.round(state.volumes[t.id] * 100);
    vol.title = `${t.label} volume`;
    vol.addEventListener('input', () => { state.volumes[t.id] = vol.value / 100; });
    grid.appendChild(vol);

    const mute = document.createElement('button');
    mute.className = 'track-mute' + (state.muted[t.id] ? ' muted' : '');
    mute.textContent = 'M';
    mute.title = `Mute ${t.label}`;
    mute.addEventListener('click', () => {
      state.muted[t.id] = !state.muted[t.id];
      mute.classList.toggle('muted', state.muted[t.id]);
    });
    grid.appendChild(mute);

    for (let i = 0; i < 16; i++) {
      const step = document.createElement('div');
      step.className = 'step' + (i % 4 === 0 ? ' beat-marker' : '');
      if (state.pattern[t.id][i]) step.classList.add('on');
      step.dataset.track = t.id;
      step.dataset.step = i;
      step.addEventListener('click', () => {
        state.pattern[t.id][i] = state.pattern[t.id][i] ? 0 : 1;
        step.classList.toggle('on');
      });
      grid.appendChild(step);
    }
  });
}

function highlightStep(step) {
  document.querySelectorAll('.step.playing').forEach(el => el.classList.remove('playing'));
  document.querySelectorAll(`.step[data-step="${step}"]`).forEach(el => el.classList.add('playing'));
}

function renderChordSlots() {
  const wrap = document.getElementById('chordSlots');
  wrap.innerHTML = '';
  state.chordSlots.forEach((slot, i) => {
    const el = document.createElement('div');
    el.className = 'chord-slot' + (slot.on ? ' on' : ' off');
    el.dataset.idx = i;
    el.innerHTML = `
      <div class="name">${chordName(slot.degree)}</div>
      <div class="deg">${chordRoman(slot.degree)}</div>
      <div class="toggle">${slot.on ? 'On — click to mute' : 'Off — click to enable'}</div>
    `;
    el.addEventListener('click', () => {
      slot.on = !slot.on;
      renderChordSlots();
    });
    wrap.appendChild(el);
  });
}

function highlightChord(idx) {
  document.querySelectorAll('.chord-slot.playing').forEach(el => el.classList.remove('playing'));
  const el = document.querySelector(`.chord-slot[data-idx="${idx}"]`);
  if (el) el.classList.add('playing');
}

function populateBuilder() {
  const row = document.getElementById('builderRow');
  row.innerHTML = '';
  const sc = getChordScale();
  for (let slot = 0; slot < 4; slot++) {
    const sel = document.createElement('select');
    for (let d = 0; d < sc.length; d++) {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = `${chordRoman(d)} — ${chordName(d)}`;
      sel.appendChild(opt);
    }
    sel.value = Math.min(state.chordSlots[slot].degree, sc.length - 1);
    sel.addEventListener('change', () => {
      state.chordSlots[slot].degree = parseInt(sel.value, 10);
      renderChordSlots();
    });
    row.appendChild(sel);
  }
}

function getCustomPresets() {
  try { return JSON.parse(localStorage.getItem('customChordPresets') || '[]'); }
  catch { return []; }
}
function saveCustomPresetsList(arr) {
  localStorage.setItem('customChordPresets', JSON.stringify(arr));
}

function populatePresets() {
  const sel = document.getElementById('presetSelect');
  sel.innerHTML = '';
  const og = document.createElement('optgroup');
  og.label = 'Built-in';
  Object.keys(PRESETS).forEach(name => {
    const o = document.createElement('option');
    o.value = `built:${name}`;
    o.textContent = name;
    og.appendChild(o);
  });
  sel.appendChild(og);

  const customs = getCustomPresets();
  if (customs.length) {
    const cg = document.createElement('optgroup');
    cg.label = 'Custom';
    customs.forEach((c, i) => {
      const o = document.createElement('option');
      o.value = `custom:${i}`;
      o.textContent = c.name;
      cg.appendChild(o);
    });
    sel.appendChild(cg);
  }
}

// ---------- Style application ----------
function applyStyle(styleKey) {
  const s = STYLES[styleKey];
  state.style = styleKey;
  setBPM(s.bpm);
  state.swing = s.swing;
  state.pattern = JSON.parse(JSON.stringify(s.pattern));
  document.getElementById('swing').value = state.swing;
  document.getElementById('swingVal').textContent = state.swing + '%';
  document.querySelectorAll('#styleTabs .pill').forEach(b => {
    b.classList.toggle('active', b.dataset.style === styleKey);
  });
  renderGrid();
}

function setBPM(bpm) {
  bpm = Math.max(60, Math.min(240, Math.round(bpm)));
  state.bpm = bpm;
  document.getElementById('bpm').value = bpm;
  document.getElementById('bpmNum').value = bpm;
}

// ---------- Random beat ----------
function randomizeBeat() {
  const p = emptyPattern();
  p.snare[4] = 1;
  p.snare[12] = 1;
  p.kick[0] = 1;

  if (state.style === 'trap' || state.style === 'drill') {
    [3, 6, 7, 10, 11, 14].forEach(pos => { if (Math.random() < 0.45) p.kick[pos] = 1; });
  } else if (state.style === 'jazzhop') {
    [3, 6, 7, 10, 13, 14].forEach(pos => { if (Math.random() < 0.4) p.kick[pos] = 1; });
  } else {
    [6, 8, 10, 11].forEach(pos => { if (Math.random() < 0.5) p.kick[pos] = 1; });
  }

  if (state.style === 'trap') {
    for (let i = 0; i < 16; i++) p.hh[i] = 1;
    if (Math.random() < 0.7) p.hh[14] = 1;
  } else if (state.style === 'drill') {
    for (let i = 0; i < 16; i += 2) p.hh[i] = 1;
    [1, 3, 7, 11, 13, 15].forEach(i => { if (Math.random() < 0.55) p.hh[i] = 1; });
  } else {
    for (let i = 0; i < 16; i += 2) p.hh[i] = 1;
    [1, 5, 9, 13].forEach(i => { if (Math.random() < 0.18) p.hh[i] = 1; });
  }

  const ohPool = [2, 6, 10, 14];
  if (Math.random() < 0.7) {
    p.oh[ohPool[Math.floor(Math.random() * ohPool.length)]] = 1;
  }

  state.pattern = p;
  renderGrid();
}

// ---------- Random progression ----------
function randomProgression() {
  const sc = getChordScale();
  const max = sc.length;
  const pool = [0, 0, 1, 2, 3, 3, 4, 4, 5, 5, 6].filter(d => d < max);
  const prog = [0];
  while (prog.length < 4) {
    const d = pool[Math.floor(Math.random() * pool.length)];
    if (d !== prog[prog.length - 1]) prog.push(d);
  }
  state.chordSlots.forEach((slot, i) => { slot.degree = prog[i]; slot.on = true; });
  renderChordSlots();
  populateBuilder();
}

// ---------- Tap tempo ----------
let tapTimes = [];
function tap() {
  const now = performance.now();
  tapTimes = tapTimes.filter(t => now - t < 2500);
  tapTimes.push(now);
  if (tapTimes.length >= 2) {
    const intervals = [];
    for (let i = 1; i < tapTimes.length; i++) intervals.push(tapTimes[i] - tapTimes[i - 1]);
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    setBPM(Math.round(60000 / avg));
  }
}

// ---------- Init / wiring ----------
function init() {
  // key dropdown
  const keySel = document.getElementById('key');
  NOTE_NAMES.forEach((n, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = n;
    keySel.appendChild(o);
  });
  keySel.value = state.key;
  keySel.addEventListener('change', () => {
    state.key = parseInt(keySel.value, 10);
    renderChordSlots();
    populateBuilder();
  });

  document.getElementById('scale').value = state.scale;
  document.getElementById('scale').addEventListener('change', e => {
    state.scale = e.target.value;
    const max = getChordScale().length;
    state.chordSlots.forEach(s => { if (s.degree >= max) s.degree = s.degree % max; });
    renderChordSlots();
    populateBuilder();
  });

  // BPM slider + number input (mirrored)
  const bpmSlider = document.getElementById('bpm');
  const bpmNum = document.getElementById('bpmNum');
  bpmSlider.addEventListener('input', () => setBPM(parseInt(bpmSlider.value, 10)));
  bpmNum.addEventListener('input', () => {
    const v = parseInt(bpmNum.value, 10);
    if (!isNaN(v)) state.bpm = Math.max(60, Math.min(240, v));
    document.getElementById('bpm').value = state.bpm;
  });
  bpmNum.addEventListener('change', () => setBPM(parseInt(bpmNum.value, 10) || state.bpm));

  // Swing
  const swingSlider = document.getElementById('swing');
  swingSlider.addEventListener('input', () => {
    state.swing = parseInt(swingSlider.value, 10);
    document.getElementById('swingVal').textContent = state.swing + '%';
  });

  // Master
  const masterSlider = document.getElementById('master');
  masterSlider.addEventListener('input', () => {
    state.master = masterSlider.value / 100;
    document.getElementById('masterVal').textContent = masterSlider.value + '%';
    if (masterGain) masterGain.gain.setTargetAtTime(state.master, ctx.currentTime, 0.02);
  });

  document.getElementById('barsPerChord').addEventListener('change', e => {
    state.barsPerChord = parseInt(e.target.value, 10);
  });

  // Style pills
  const tabs = document.getElementById('styleTabs');
  Object.keys(STYLES).forEach(key => {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.textContent = STYLES[key].name;
    btn.dataset.style = key;
    btn.addEventListener('click', () => applyStyle(key));
    tabs.appendChild(btn);
  });
  applyStyle('boombap');

  // Transport
  document.getElementById('playBtn').addEventListener('click', () => {
    if (isPlaying) stop(); else start();
  });
  document.getElementById('tapBtn').addEventListener('click', tap);
  document.getElementById('randBeatBtn').addEventListener('click', randomizeBeat);

  // Chord tabs
  document.querySelectorAll('#chordTabs .pill').forEach(p => {
    p.addEventListener('click', () => {
      document.querySelectorAll('#chordTabs .pill').forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      state.chordMode = p.dataset.mode;
      ['Random', 'Presets', 'Builder'].forEach(m => {
        document.getElementById('chord' + m).classList.toggle('hidden', m.toLowerCase() !== state.chordMode);
      });
    });
  });

  document.getElementById('randChordBtn').addEventListener('click', randomProgression);

  populatePresets();
  document.getElementById('loadPresetBtn').addEventListener('click', () => {
    const v = document.getElementById('presetSelect').value;
    let degrees;
    if (v.startsWith('built:')) {
      degrees = PRESETS[v.slice(6)];
    } else if (v.startsWith('custom:')) {
      const c = getCustomPresets()[parseInt(v.slice(7), 10)];
      degrees = c && c.degrees;
    }
    if (!degrees) return;
    const max = getChordScale().length;
    state.chordSlots.forEach((s, i) => {
      s.degree = (degrees[i] || 0) % max;
      s.on = true;
    });
    renderChordSlots();
    populateBuilder();
  });
  document.getElementById('saveCustomBtn').addEventListener('click', () => {
    const name = prompt('Name for this progression?');
    if (!name) return;
    const customs = getCustomPresets();
    customs.push({ name, degrees: state.chordSlots.map(s => s.degree) });
    saveCustomPresetsList(customs);
    populatePresets();
  });

  populateBuilder();
  renderChordSlots();
}

document.addEventListener('DOMContentLoaded', init);
