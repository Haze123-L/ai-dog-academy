// ================= 声音 =================
const Snd = (() => {
  let ac = null, beatTimer = null;
  function A() {
    if (window.__MUTE) return null;
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f, t0, dur, type = 'sine', vol = 0.2) {
    const a = A(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t0, dur, vol, freq) {
    const a = A(); if (!a) return;
    const len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + t0;
    f.type = 'bandpass'; f.frequency.value = freq || 2000; g.gain.value = vol;
    s.buffer = buf; s.connect(f).connect(g).connect(a.destination); s.start(t);
  }
  function bark(t0 = 0) {
    const a = A(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
    o.type = 'sawtooth'; o.frequency.setValueAtTime(720, t); o.frequency.exponentialRampToValueAtTime(260, t + 0.17);
    g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.22);
  }
  return {
    ding() { tone(880, 0, .25, 'triangle', .25); tone(1320, .08, .3, 'triangle', .2); },
    pop() { tone(520, 0, .12, 'square', .07); },
    tick() { tone(1250, 0, .05, 'square', .05); },
    bark() { bark(0); },
    bark2() { bark(0); bark(.26); },
    tada() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .11, .4, 'triangle', .22)); },
    magic() { [660, 880, 990, 1320, 1760].forEach((f, i) => tone(f, i * .07, .28, 'sine', .14)); },
    end() { [784, 659, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * .16, .3, 'square', .1)); },
    buzz() { tone(160, 0, .35, 'sawtooth', .12); },
    applause() { for (let i = 0; i < 30; i++) noise(i * 0.05 + Math.random() * 0.05, 0.08, 0.35, 1500 + Math.random() * 2500); },
    beatOn(bpm = 116) {
      this.beatOff(); const step = 60 / bpm / 2 * 1000; let n = 0;
      beatTimer = setInterval(() => {
        if (n % 4 === 0) tone(110, 0, .22, 'sine', .45);
        if (n % 4 === 2) noise(0, .1, .25, 1800);
        tone(n % 2 ? 2600 : 3200, 0, .03, 'square', .025);
        if (n % 8 === 0) tone([392, 440, 523, 440][(n / 8) % 4], 0, .3, 'triangle', .08);
        n++;
      }, step);
    },
    beatOff() { if (beatTimer) clearInterval(beatTimer); beatTimer = null; }
  };
})();
