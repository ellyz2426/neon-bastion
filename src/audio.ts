// Neon Bastion - Procedural Audio System

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;

export function initAudio(): AudioContext {
  if (audioCtx) return audioCtx;
  audioCtx = new AudioContext();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.5;
  masterGain.connect(audioCtx.destination);

  sfxGain = audioCtx.createGain();
  sfxGain.gain.value = 0.6;
  sfxGain.connect(masterGain);

  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.3;
  musicGain.connect(masterGain);

  return audioCtx;
}

export function getAudioCtx(): AudioContext | null {
  return audioCtx;
}

export function setMasterVolume(v: number) {
  if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.3,
  detune: number = 0
) {
  if (!audioCtx || !sfxGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration: number, volume: number = 0.1, freq?: number) {
  if (!audioCtx || !sfxGain) return;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1);
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  if (freq) {
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 2;
    source.connect(filter);
    filter.connect(gain);
  } else {
    source.connect(gain);
  }
  gain.connect(sfxGain);
  source.start();
}

// ─── Sound Effects ───

export function playTowerPlace() {
  playTone(440, 0.15, "square", 0.2);
  setTimeout(() => playTone(660, 0.1, "square", 0.15), 50);
  setTimeout(() => playTone(880, 0.15, "square", 0.2), 100);
}

export function playTowerShoot(towerColor: number = 0x00ffff) {
  const baseFreq = 800 + (towerColor & 0xff) * 2;
  playTone(baseFreq, 0.08, "sawtooth", 0.12);
  playTone(baseFreq * 1.5, 0.05, "sine", 0.08);
}

export function playLaserShoot() {
  if (!audioCtx || !sfxGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(2000, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

export function playTeslaZap() {
  playNoise(0.15, 0.2, 3000);
  playTone(1200, 0.08, "square", 0.1);
  setTimeout(() => playNoise(0.1, 0.15, 4000), 30);
}

export function playFrostHit() {
  playTone(1800, 0.2, "sine", 0.1);
  playTone(2200, 0.15, "sine", 0.08, 10);
}

export function playMissileShoot() {
  playNoise(0.3, 0.15, 500);
  playTone(200, 0.2, "sawtooth", 0.1);
}

export function playMissileExplode() {
  playNoise(0.5, 0.3, 200);
  playTone(80, 0.4, "sine", 0.2);
  setTimeout(() => playNoise(0.3, 0.15, 150), 100);
}

export function playEnemyHit() {
  playTone(300, 0.06, "square", 0.08);
}

export function playEnemyDeath() {
  playTone(400, 0.1, "square", 0.15);
  setTimeout(() => playTone(200, 0.15, "sawtooth", 0.12), 50);
  playNoise(0.2, 0.1, 800);
}

export function playBossDeath() {
  playNoise(0.8, 0.3, 100);
  playTone(100, 0.6, "sawtooth", 0.25);
  setTimeout(() => playTone(60, 0.8, "sine", 0.2), 200);
  setTimeout(() => playNoise(0.5, 0.2, 200), 400);
}

export function playCoreHit() {
  playTone(150, 0.3, "sawtooth", 0.3);
  playNoise(0.2, 0.2, 300);
  setTimeout(() => playTone(100, 0.4, "sine", 0.2), 100);
}

export function playWaveStart() {
  const notes = [440, 554, 659, 880];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.2, "square", 0.15), i * 80);
  });
}

export function playWaveComplete() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.3, "sine", 0.2), i * 120);
  });
}

export function playGameOver() {
  const notes = [440, 392, 349, 262];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.5, "sawtooth", 0.2), i * 200);
  });
}

export function playVictory() {
  const notes = [523, 659, 784, 1047, 784, 1047, 1319];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.3, "sine", 0.25), i * 150);
  });
}

export function playUpgrade() {
  playTone(660, 0.15, "sine", 0.15);
  setTimeout(() => playTone(880, 0.15, "sine", 0.15), 100);
  setTimeout(() => playTone(1100, 0.2, "sine", 0.2), 200);
}

export function playSell() {
  playTone(880, 0.1, "square", 0.1);
  setTimeout(() => playTone(440, 0.15, "square", 0.12), 60);
}

export function playSelect() {
  playTone(600, 0.08, "sine", 0.1);
}

export function playBuildPhaseStart() {
  playTone(523, 0.2, "sine", 0.15);
  setTimeout(() => playTone(659, 0.3, "sine", 0.15), 150);
}

export function playButtonHover() {
  playTone(1200, 0.04, "sine", 0.05);
}

// ─── Procedural Music ───

let musicInterval: number | null = null;
let musicPlaying = false;
let musicIntensity = 0.5; // 0-1, scales with wave danger

const SCALE = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25]; // C major
const MINOR_SCALE = [261.63, 293.66, 311.13, 349.23, 392.0, 415.3, 466.16, 523.25]; // C minor

export function setMusicIntensity(v: number) {
  musicIntensity = Math.max(0, Math.min(1, v));
}

export function startMusic() {
  if (musicPlaying || !audioCtx || !musicGain) return;
  musicPlaying = true;

  let beat = 0;
  const bpm = 120;
  const interval = (60 / bpm) * 1000;

  const playBeat = () => {
    if (!audioCtx || !musicGain || !musicPlaying) return;
    const t = audioCtx.currentTime;
    const scale = musicIntensity > 0.6 ? MINOR_SCALE : SCALE;

    // Bass line
    if (beat % 4 === 0) {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = scale[0] / 2;
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(t);
      osc.stop(t + 0.4);
    }

    // Kick on 1 and 3
    if (beat % 4 === 0 || beat % 4 === 2) {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      g.gain.setValueAtTime(0.2 + musicIntensity * 0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(t);
      osc.stop(t + 0.15);
    }

    // Hi-hat on every beat, louder on off-beats with intensity
    {
      const bufSize = audioCtx.sampleRate * 0.05;
      const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const g = audioCtx.createGain();
      const vol = beat % 2 === 1 ? 0.06 + musicIntensity * 0.04 : 0.04;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      const filter = audioCtx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 8000;
      src.connect(filter);
      filter.connect(g);
      g.connect(musicGain);
      src.start(t);
    }

    // Melodic arpeggio at higher intensity
    if (musicIntensity > 0.3 && beat % 2 === 0) {
      const noteIdx = (beat / 2) % scale.length;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.value = scale[noteIdx] * 2;
      g.gain.setValueAtTime(0.06 * musicIntensity, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(t);
      osc.stop(t + 0.2);
    }

    // Synth pad chord at higher intensity
    if (musicIntensity > 0.5 && beat % 8 === 0) {
      [0, 2, 4].forEach((idx) => {
        const osc = audioCtx!.createOscillator();
        const g = audioCtx!.createGain();
        osc.type = "sine";
        osc.frequency.value = scale[idx];
        g.gain.setValueAtTime(0.04, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
        osc.connect(g);
        g.connect(musicGain!);
        osc.start(t);
        osc.stop(t + 1.0);
      });
    }

    beat++;
  };

  musicInterval = window.setInterval(playBeat, interval);
}

export function stopMusic() {
  musicPlaying = false;
  if (musicInterval !== null) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

export function setMusicVolume(v: number) {
  if (musicGain) musicGain.gain.value = Math.max(0, Math.min(1, v));
}
