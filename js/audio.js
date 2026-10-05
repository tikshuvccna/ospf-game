/* OSPF City – tiny WebAudio synth: sfx + procedural synthwave music */
(function (OG) {
  let ctx = null, master = null, musicGain = null, sfxGain = null, musicOn = false, musicTimer = null, step = 0;
  const PM = [1, 1.19, .89, .75], TM = [200, 150, 245, 300];
  const S = OG.snd = { station: 0,
    enabled: true, music: true,
    init() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
        musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
        sfxGain = ctx.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
      } catch (e) { ctx = null; }
      if (S.music && S.enabled) S.startMusic();
    },
    tone(freq, dur = 0.12, type = 'square', vol = 0.3, when = 0, slide = 0, dest) {
      if (!ctx || !S.enabled) return;
      const t = ctx.currentTime + when;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest || sfxGain); o.start(t); o.stop(t + dur + 0.02);
    },
    noise(dur = 0.1, vol = 0.2, when = 0, hp = 800) {
      if (!ctx || !S.enabled) return;
      const t = ctx.currentTime + when, n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = ctx.createBufferSource(); s.buffer = b; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
      const g = ctx.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t);
    },
    play(name) {
      if (!ctx || !S.enabled) return;
      switch (name) {
        case 'coin': S.tone(988, .08, 'square', .22); S.tone(1319, .18, 'square', .22, .07); break;
        case 'ok': S.tone(523, .1, 'triangle', .35); S.tone(659, .1, 'triangle', .35, .09); S.tone(784, .2, 'triangle', .35, .18); break;
        case 'bad': S.tone(200, .25, 'sawtooth', .3, 0, -90); S.tone(150, .3, 'sawtooth', .3, .12, -60); break;
        case 'click': S.tone(660, .05, 'square', .15); break;
        case 'step': S.noise(.04, .05, 0, 2500); break;
        case 'whoosh': S.noise(.25, .12, 0, 500); break;
        case 'pop': S.tone(440, .08, 'sine', .3, 0, 400); break;
        case 'horn': S.tone(311, .25, 'sawtooth', .18); S.tone(392, .25, 'sawtooth', .18); break;
        case 'power': for (let i = 0; i < 5; i++) S.tone(400 + i * 120, .09, 'square', .2, i * .06); break;
        case 'win': [523, 659, 784, 1047].forEach((f, i) => S.tone(f, .22, 'triangle', .4, i * .12)); S.tone(1319, .5, 'triangle', .4, .5); break;
        case 'lose': [392, 349, 311, 262].forEach((f, i) => S.tone(f, .25, 'sawtooth', .25, i * .16)); break;
        case 'stamp': S.noise(.1, .4, 0, 100); S.tone(110, .15, 'square', .3); break;
        case 'tick': S.tone(1200, .03, 'square', .1); break;
        case 'shot': S.noise(.09, .35, 0, 1200); S.tone(180, .08, 'square', .22, 0, -120); break;
        case 'shotgun': S.noise(.22, .5, 0, 300); S.tone(110, .18, 'sawtooth', .3, 0, -70); break;
        case 'rocket': S.noise(.3, .4, 0, 200); S.tone(90, .35, 'sawtooth', .3, 0, 200); break;
        case 'laser': S.tone(1400, .18, 'sawtooth', .22, 0, -1100); S.tone(900, .14, 'square', .12, 0, -600); break;
        case 'hit': S.tone(150, .09, 'square', .25, 0, -60); S.noise(.06, .2, 0, 600); break;
        case 'boom': S.noise(.7, .7, 0, 60); S.tone(60, .5, 'sawtooth', .5, 0, -30); break;
        case 'siren': S.tone(700, .22, 'sine', .25); S.tone(900, .22, 'sine', .25, .22); S.tone(700, .22, 'sine', .25, .44); break;
        case 'slot': S.tone(300 + Math.random() * 500, .05, 'square', .12); break;
        case 'jackpot': for (let i = 0; i < 10; i++) S.tone(523 * (1 + (i % 4) * .25), .12, 'square', .25, i * .07); break;
        case 'level': [392, 523, 659, 784, 1047].forEach((f, i) => S.tone(f, .15, 'square', .25, i * .08)); break;
      }
    },
    startMusic() {
      if (!ctx || musicOn || !S.enabled || !S.music) return;
      musicOn = true; step = 0;
      const bass = [55, 55, 82.4, 55, 65.4, 65.4, 98, 65.4, 73.4, 73.4, 110, 73.4, 61.7, 61.7, 92.5, 82.4];
      const arp = [[220, 262, 330], [262, 330, 392], [294, 349, 440], [247, 311, 370]];
      const tick = () => {
        if (!musicOn) return;
        const i = step % 16, bar = Math.floor(step / 16) % 4;
        S.tone(bass[(i + bar * 4) % 16] * PM[S.station || 0], .22, 'sawtooth', .5, 0, 0, musicGain);
        const a = arp[bar]; S.tone(a[i % 3] * 2 * PM[S.station || 0], .12, 'square', .13, 0, 0, musicGain);
        if (i % 8 === 4) S.noise(.06, .08, 0, 4000);
        if (i % 4 === 2 && bar % 2 === 1) S.tone(a[(i >> 2) % 3] * 4, .3, 'triangle', .1, 0, 0, musicGain);
        step++;
        musicTimer = setTimeout(tick, TM[S.station || 0]);
      };
      tick();
    },
    stopMusic() { musicOn = false; clearTimeout(musicTimer); },
    setEnabled(v) { S.enabled = v; if (!v) S.stopMusic(); else if (S.music) S.startMusic(); },
    setMusic(v) { S.music = v; if (!v) S.stopMusic(); else S.startMusic(); },
    duck(on) { if (musicGain) musicGain.gain.value = on ? 0.06 : 0.16; }
  };
})(window.OG);
