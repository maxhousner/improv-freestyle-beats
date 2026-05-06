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

// ---------- Chord progression presets (rap / freestyle staples) ----------
const CHORD_PRESETS = [
  { name: 'i–VII–VI–VII (Lose Yourself)', scale: 'minor', degrees: [0, 6, 5, 6] },
  { name: 'i–VI–III–VII (Mockingbird)',   scale: 'minor', degrees: [0, 5, 2, 6] },
  { name: 'i–VI–VII–i (Drill)',           scale: 'minor', degrees: [0, 5, 6, 0] },
  { name: 'i–iv–VII–III (Boom Bap)',      scale: 'minor', degrees: [0, 3, 6, 2] },
  { name: 'i–VII–VI–i (Started)',         scale: 'minor', degrees: [0, 6, 5, 0] }
];

// ---------- App state ----------
const state = {
  style: 'boombap',
  bpm: 92,
  swing: 24,
  master: 0.75,
  key: 0,
  scale: 'minor',
  chordsPerBar: 1,
  pattern: emptyPattern(),
  volumes: { kick: 1.0, snare: 0.85, hh: 0.45, oh: 0.45 },
  muted:   { kick: false, snare: false, hh: false, oh: false },
  sectionVolumes: { drums: 0.9, chords: 0.4 },
  sectionMuted:   { drums: false, chords: false },
  chordSlots: [
    { degree: 0, on: true },
    { degree: 5, on: true },
    { degree: 6, on: true },
    { degree: 4, on: true }
  ],
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
  drumsGain.gain.value = state.sectionMuted.drums ? 0 : state.sectionVolumes.drums;
  drumsGain.connect(masterGain);

  chordsGain = ctx.createGain();
  chordsGain.gain.value = state.sectionMuted.chords ? 0 : state.sectionVolumes.chords;
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
    if (v <= 0) return;
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

  const period = Math.max(1, Math.floor(16 / state.chordsPerBar));
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
let openTrackPopover = null;
function closeOpenTrackPopover() {
  if (openTrackPopover) {
    openTrackPopover.classList.remove('open');
    openTrackPopover = null;
  }
}

const MIXER_ICON_SVG = '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><rect x="2" y="4" width="2" height="8"/><rect x="7" y="2" width="2" height="12"/><rect x="12" y="6" width="2" height="6"/></svg>';

function renderGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  TRACKS.forEach(t => {
    const track = document.createElement('div');
    track.className = 'track';

    const head = document.createElement('div');
    head.className = 'track-head';

    const label = document.createElement('div');
    label.className = 'track-label';
    label.textContent = t.label;
    head.appendChild(label);

    const toggleWrap = document.createElement('div');
    toggleWrap.className = 'track-toggle-wrap';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'track-toggle';
    toggleBtn.type = 'button';
    toggleBtn.title = `${t.label} mixer`;
    toggleBtn.innerHTML = MIXER_ICON_SVG;
    toggleBtn.addEventListener('click', e => {
      e.stopPropagation();
      const wasOpen = toggleWrap.classList.contains('open');
      closeOpenTrackPopover();
      if (!wasOpen) {
        toggleWrap.classList.add('open');
        openTrackPopover = toggleWrap;
      }
    });
    toggleWrap.appendChild(toggleBtn);

    const controls = document.createElement('div');
    controls.className = 'track-controls';
    controls.addEventListener('click', e => e.stopPropagation());

    const vol = document.createElement('input');
    vol.type = 'range';
    vol.className = 'track-vol';
    vol.min = 0; vol.max = 100;
    vol.value = Math.round(state.volumes[t.id] * 100);
    vol.title = `${t.label} volume`;
    vol.addEventListener('input', () => { state.volumes[t.id] = vol.value / 100; });
    controls.appendChild(vol);

    const mute = document.createElement('button');
    mute.className = 'track-mute' + (state.muted[t.id] ? ' muted' : '');
    mute.textContent = 'M';
    mute.type = 'button';
    mute.title = `Mute ${t.label}`;
    mute.addEventListener('click', () => {
      state.muted[t.id] = !state.muted[t.id];
      mute.classList.toggle('muted', state.muted[t.id]);
    });
    controls.appendChild(mute);

    toggleWrap.appendChild(controls);
    head.appendChild(toggleWrap);

    track.appendChild(head);

    const steps = document.createElement('div');
    steps.className = 'track-steps';
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
      steps.appendChild(step);
    }
    track.appendChild(steps);

    grid.appendChild(track);
  });
}

function highlightStep(step) {
  document.querySelectorAll('.step.playing').forEach(el => el.classList.remove('playing'));
  document.querySelectorAll(`.step[data-step="${step}"]`).forEach(el => el.classList.add('playing'));
}

function applySectionGain(section) {
  if (!ctx) return;
  const g = section === 'drums' ? drumsGain : chordsGain;
  const v = state.sectionMuted[section] ? 0 : state.sectionVolumes[section];
  g.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
}

function renderChordSlots() {
  const wrap = document.getElementById('chordSlots');
  wrap.innerHTML = '';
  const sc = getChordScale();
  state.chordSlots.forEach((slot, i) => {
    const el = document.createElement('div');
    el.className = 'chord-slot' + (slot.on ? ' on' : ' off');
    el.dataset.idx = i;

    const sel = document.createElement('select');
    sel.title = 'Change chord';
    for (let d = 0; d < sc.length; d++) {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = `${chordRoman(d)} — ${chordName(d)}`;
      sel.appendChild(opt);
    }
    sel.value = Math.min(slot.degree, sc.length - 1);
    el.appendChild(sel);

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = chordName(slot.degree);
    el.appendChild(name);

    const deg = document.createElement('div');
    deg.className = 'deg';
    deg.textContent = chordRoman(slot.degree);
    el.appendChild(deg);

    sel.addEventListener('change', () => {
      slot.degree = parseInt(sel.value, 10);
      name.textContent = chordName(slot.degree);
      deg.textContent = chordRoman(slot.degree);
    });

    const mute = document.createElement('button');
    mute.className = 'mute';
    mute.textContent = 'M';
    mute.title = slot.on ? 'Mute chord' : 'Unmute chord';
    mute.addEventListener('mousedown', e => e.stopPropagation());
    mute.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      slot.on = !slot.on;
      el.classList.toggle('on', slot.on);
      el.classList.toggle('off', !slot.on);
      mute.title = slot.on ? 'Mute chord' : 'Unmute chord';
    });
    el.appendChild(mute);

    wrap.appendChild(el);
  });
}

function highlightChord(idx) {
  document.querySelectorAll('.chord-slot.playing').forEach(el => el.classList.remove('playing'));
  const el = document.querySelector(`.chord-slot[data-idx="${idx}"]`);
  if (el) el.classList.add('playing');
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

  const drumSel = document.getElementById('drumPreset');
  if (drumSel) drumSel.value = styleKey;
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

// ---------- Chord preset application ----------
function applyChordPreset(preset) {
  state.scale = preset.scale;
  document.getElementById('scale').value = preset.scale;
  const max = getChordScale().length;
  state.chordSlots.forEach((slot, i) => {
    slot.degree = (preset.degrees[i] || 0) % max;
    slot.on = true;
  });
  renderChordSlots();
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
  // Key dropdown
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
  });

  document.getElementById('scale').value = state.scale;
  document.getElementById('scale').addEventListener('change', e => {
    state.scale = e.target.value;
    const max = getChordScale().length;
    state.chordSlots.forEach(s => { if (s.degree >= max) s.degree = s.degree % max; });
    renderChordSlots();
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
    if (masterGain) masterGain.gain.setTargetAtTime(state.master, ctx.currentTime, 0.02);
  });

  document.getElementById('chordsPerBar').addEventListener('change', e => {
    state.chordsPerBar = parseInt(e.target.value, 10);
  });

  // Drum preset dropdown
  const drumSel = document.getElementById('drumPreset');
  Object.keys(STYLES).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = STYLES[key].name;
    drumSel.appendChild(opt);
  });
  drumSel.addEventListener('change', () => applyStyle(drumSel.value));
  applyStyle('boombap');

  // Chord preset dropdown
  const chordSel = document.getElementById('chordPreset');
  CHORD_PRESETS.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = p.name;
    chordSel.appendChild(opt);
  });
  chordSel.addEventListener('change', () => {
    const idx = parseInt(chordSel.value, 10);
    if (!isNaN(idx)) applyChordPreset(CHORD_PRESETS[idx]);
  });
  applyChordPreset(CHORD_PRESETS[0]);

  // Transport
  document.getElementById('playBtn').addEventListener('click', () => {
    if (isPlaying) stop(); else start();
  });
  document.getElementById('tapBtn').addEventListener('click', tap);
  document.getElementById('randBeatBtn').addEventListener('click', randomizeBeat);
  document.getElementById('randChordBtn').addEventListener('click', randomProgression);

  // Section mixers (drums + chords) — icon button toggles popover with vol slider + mute
  ['drums', 'chords'].forEach(section => {
    const wrap = document.getElementById(section + 'Mixer');
    const toggle = wrap.querySelector('.section-mixer-toggle');
    const vol = wrap.querySelector('.section-vol');
    const mute = wrap.querySelector('.section-mute');

    vol.value = Math.round(state.sectionVolumes[section] * 100);
    mute.classList.toggle('muted', state.sectionMuted[section]);

    toggle.addEventListener('click', e => {
      e.stopPropagation();
      const wasOpen = wrap.classList.contains('open');
      closeOpenTrackPopover();
      if (!wasOpen) {
        wrap.classList.add('open');
        openTrackPopover = wrap;
      }
    });
    wrap.querySelector('.section-mixer-controls').addEventListener('click', e => e.stopPropagation());

    vol.addEventListener('input', () => {
      state.sectionVolumes[section] = vol.value / 100;
      applySectionGain(section);
    });
    mute.addEventListener('click', () => {
      state.sectionMuted[section] = !state.sectionMuted[section];
      mute.classList.toggle('muted', state.sectionMuted[section]);
      applySectionGain(section);
    });
  });

  document.addEventListener('click', e => {
    if (openTrackPopover && !openTrackPopover.contains(e.target)) {
      closeOpenTrackPopover();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
