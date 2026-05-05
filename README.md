# improv-freestyle-beats

Free-style beat generator, made for rap or musical improv practice.

A single-page browser tool that synthesizes drums and chord progressions in real time so you can practice freestyling over arbitrary keys, scales, and tempos. Runs as a static site on GitHub Pages — no install, no build step.

## Features

- **Transport**: play/stop, master volume, tap tempo, BPM (60–240), swing (0–66%)
- **5 beat styles** with their own default pattern, BPM, and swing settings
- **Drum sequencer**: 16-step grid for kick, snare, closed hat, open hat — plus one-click randomize
- **Chords**:
  - Choose key, scale (major, natural minor, dorian, phrygian, mixolydian, pentatonic minor), and bars per chord (1 or 2)
  - Three modes: random progression, built-in presets, manual builder
  - Save the current progression as a custom preset (persisted in `localStorage`)

## Run it

Open `index.html` in any modern browser, or visit the GitHub Pages deployment. Audio starts on first Play (browser autoplay policy).

## Files

- `index.html` — markup
- `styles.css` — light theme, blue accent, responsive
- `app.js` — state, Web Audio synth voices, scheduler, UI

All audio is synthesized via the Web Audio API; no samples or external assets.
