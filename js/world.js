/* OSPF City – the open world: entities, physics, input, rendering */
(function (OG) {
  const G = OG.Gen, { rr, shade } = G;
  const TWO = Math.PI * 2;
  const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

  const Wd = OG.World = {
    paused: true, attract: false, time: 0, onInteract: null, target: null, cam: { x: 0, y: 0 },
    init(canvas) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.gen = G.build(); const g = this.gen;
      // spatial hash for solids
      this.cell = 128; this.grid = new Map();
      for (const s of g.solids) {
        const x0 = Math.floor(s.x / this.cell), x1 = Math.floor((s.x + s.w) / this.cell), y0 = Math.floor(s.y / this.cell), y1 = Math.floor((s.y + s.h) / this.cell);
        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const k = x + ',' + y; (this.grid.get(k) || this.grid.set(k, []).get(k)).push(s); }
      }
      // tile lists
      const TS = G.TS; this.tiles = new Map(); this.tileLists = new Map();
      const sorted = g.statics.map((s, i) => [s, i]).sort((a, b) => a[0].z - b[0].z || a[1] - b[1]).map(a => a[0]);
      for (const s of sorted) {
        const tx0 = Math.max(0, Math.floor(s.x0 / TS)), tx1 = Math.floor(s.x1 / TS), ty0 = Math.max(0, Math.floor(s.y0 / TS)), ty1 = Math.floor(s.y1 / TS);
        for (let x = tx0; x <= tx1; x++) for (let y = ty0; y <= ty1; y++) { const k = x + ',' + y; (this.tileLists.get(k) || this.tileLists.set(k, []).get(k)).push(s); }
      }
      this.keys = {}; this.joy = { x: 0, y: 0 }; this.clickTarget = null;
      this.P = { x: g.spawn.x, y: g.spawn.y, vx: 0, vy: 0, face: Math.PI / 2, phase: 0, car: null, boost: 0, step: 0 };
      this.cam = { x: this.P.x, y: this.P.y, z: 1 };
      this.cars = []; this.peds = []; this.parts = []; this.coins = g.coins; this.powerups = g.powerups;
      this.coinOn = new Set(); // collected this session handled by state
      this.npcs = g.npcs; this.doors = g.doors;
      this.nodes = g.nodes; this.buildGraph();
      for (let k = 0; k < 6; k++) this.spawnCar(true);
      this.playerCar = this.makeCar(g.spawn.x + 130, g.spawn.y + 60, 0, '#ef4444', 'car'); this.playerCar.ai = false; this.playerCar.parked = true; this.cars.push(this.playerCar);
      this.resize(); addEventListener('resize', () => this.resize());
      this.bindInput();
      this.last = performance.now(); requestAnimationFrame(t => this.frame(t));
      this.buildMinimap();
    },
    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1); this.dpr = dpr;
      this.cv.width = innerWidth * dpr; this.cv.height = innerHeight * dpr;
      this.zoomBase = OG.clamp(Math.min(innerWidth / 1150, innerHeight / 680), .62, 1.25);
    },

    /* ---------------- input ---------------- */
    bindInput() {
      const down = e => {
        if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        const k = e.key.toLowerCase(); this.keys[k] = true; this.clickTarget = null;
        if (this.paused) return;
        if (k === 'e' || k === 'enter') this.interact();
        else if (k === 'm') OG.ui.openMap();
        else if (k === 'h') { OG.snd.play('horn'); }
        else if (k === 'escape') OG.ui.openMenu();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      };
      addEventListener('keydown', down); addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
      addEventListener('blur', () => { this.keys = {}; });
      this.cv.addEventListener('pointerdown', e => {
        if (this.paused || this.attract) return; OG.snd.init();
        const w = this.screenToWorld(e.clientX, e.clientY); this.clickTarget = { x: w.x, y: w.y };
        // clicking on an interactable triggers it when close
        const it = this.nearest(); if (it && OG.dist(w.x, w.y, it.x, it.y) < 70 && OG.dist(this.P.x, this.P.y, it.x, it.y) < 130) this.interact();
      });
      // touch joystick
      const joy = document.getElementById('joy'), knob = document.getElementById('joy-knob');
      let jid = null;
      const mv = e => { const r = joy.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const m = Math.hypot(dx, dy), max = 45; if (m > max) { dx = dx / m * max; dy = dy / m * max; } knob.style.transform = `translate(${dx}px,${dy}px)`; this.joy.x = dx / max; this.joy.y = dy / max; };
      joy.addEventListener('pointerdown', e => { jid = e.pointerId; joy.setPointerCapture(jid); mv(e); OG.snd.init(); });
      joy.addEventListener('pointermove', e => { if (e.pointerId === jid) mv(e); });
      const up = e => { if (e.pointerId === jid) { jid = null; knob.style.transform = ''; this.joy.x = this.joy.y = 0; } };
      joy.addEventListener('pointerup', up); joy.addEventListener('pointercancel', up);
      document.getElementById('t-act').addEventListener('pointerdown', () => { if (!this.paused) this.interact(); });
      const tr = document.getElementById('t-run'); tr.addEventListener('pointerdown', () => { this.keys.shift = true; this.keys[' '] = true; }); tr.addEventListener('pointerup', () => { this.keys.shift = false; this.keys[' '] = false; });
      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.getElementById('touch').classList.remove('hidden');
    },
    screenToWorld(sx, sy) { const z = this.cam.z; return { x: this.cam.x + (sx - innerWidth / 2) / z, y: this.cam.y + (sy - innerHeight / 2) / z }; },
    worldToScreen(x, y) { const z = this.cam.z; return { x: (x - this.cam.x) * z + innerWidth / 2, y: (y - this.cam.y) * z + innerHeight / 2 }; },

    /* ---------------- collision ---------------- */
    solidsNear(x, y, r) {
      const c = this.cell, out = [], x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c), y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
      for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) { const a = this.grid.get(i + ',' + j); if (a) for (const s of a) if (!out.includes(s)) out.push(s); }
      return out;
    },
    resolveCircle(o, r) {
      let hit = 0;
      for (const s of this.solidsNear(o.x, o.y, r + 4)) {
        if (s.kind === 'gate' && this.gen.gate.open) continue;
        const cx = OG.clamp(o.x, s.x, s.x + s.w), cy = OG.clamp(o.y, s.y, s.y + s.h);
        let dx = o.x - cx, dy = o.y - cy; const d = Math.hypot(dx, dy);
        if (d < r) {
          if (d < .001) { // inside: push out via smallest axis
            const l = o.x - s.x, rt = s.x + s.w - o.x, t = o.y - s.y, b = s.y + s.h - o.y, m = Math.min(l, rt, t, b);
            if (m === l) o.x = s.x - r; else if (m === rt) o.x = s.x + s.w + r; else if (m === t) o.y = s.y - r; else o.y = s.y + s.h + r;
          } else { o.x = cx + dx / d * r; o.y = cy + dy / d * r; }
          hit = Math.max(hit, 1);
        }
      }
      return hit;
    },
    gateSolid() { const g = this.gen.gate; return g; },

    /* ---------------- traffic graph ---------------- */
    buildGraph() {
      const N = this.nodes, key = (i, j) => i + ',' + j; this.nmap = {}; N.forEach(n => this.nmap[key(n.i, n.j)] = n);
      N.forEach(n => { n.nb = []; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const m = this.nmap[key(n.i + di, n.j + dj)]; if (m && m.side === n.side) n.nb.push(m); } });
    },
    lanePt(a, b, off) { const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy); return { dx: dx / l, dy: dy / l, nx: -dy / l * off, ny: dx / l * off }; },
    makeCar(x, y, a, color, kind) {
      const k = { car: [40, 20], van: [46, 22], truck: [62, 24], taxi: [40, 20], sports: [42, 19] }[kind] || [40, 20];
      return { x, y, a, v: 0, vx: 0, vy: 0, len: k[0], wid: k[1], color, kind, ai: true, route: [], max: OG.rand(120, 190), brake: 0, stuck: 0, parked: false, id: Math.random() };
    },
    spawnCar(anywhere) {
      const P = this.P, nodes = this.nodes; let n, m, tries = 0;
      while (tries++ < 20) {
        n = OG.pick(nodes); if (!n.nb.length) continue; m = OG.pick(n.nb);
        const t = Math.random(), x = n.x + (m.x - n.x) * t, y = n.y + (m.y - n.y) * t, d = OG.dist(x, y, this.cam.x, this.cam.y);
        if (!anywhere && (d < 700 || d > 1500)) continue;
        if (anywhere && d < 200) continue;
        const L = this.lanePt(n, m, 32); const c = this.makeCar(x + L.nx, y + L.ny, Math.atan2(L.dy, L.dx), OG.pick(['#f59e0b', '#3b82f6', '#10b981', '#e11d48', '#8b5cf6', '#e5e7eb', '#14b8a6', '#f97316', '#64748b']), OG.pick(['car', 'car', 'car', 'van', 'truck', 'taxi']));
        if (c.kind === 'taxi') c.color = '#fbbf24';
        c.from = n; c.to = m; c.route = []; this.extendRoute(c); this.cars.push(c); return c;
      }
    },
    extendRoute(c) {
      let a = c.from, b = c.to;
      while (c.route.length < 3) {
        const L = this.lanePt(a, b, 32);
        c.route.push({ x: b.x - L.dx * 70 + L.nx, y: b.y - L.dy * 70 + L.ny });
        const opts = b.nb.filter(n => n !== a); const nxt = opts.length ? OG.pick(opts) : a;
        const L2 = this.lanePt(b, nxt, 32);
        c.route.push({ x: b.x + L2.dx * 70 + L2.nx, y: b.y + L2.dy * 70 + L2.ny });
        a = b; b = nxt;
      }
      c.from = a; c.to = b;
    },
    spawnPed() {
      const blocks = this.gen.blocks.filter(b => OG.dist(b.x + b.w / 2, b.y + b.h / 2, this.cam.x, this.cam.y) < 900 && (!b.spec.theme || b.spec.theme !== 'industrial'));
      if (!blocks.length) return; const b = OG.pick(blocks);
      for (let t = 0; t < 8; t++) {
        const x = b.x + 30 + Math.random() * (b.w - 60), y = b.y + 30 + Math.random() * (b.h - 60);
        if (this.solidsNear(x, y, 14).some(s => x > s.x - 12 && x < s.x + s.w + 12 && y > s.y - 12 && y < s.y + s.h + 12)) continue;
        if (OG.dist(x, y, this.cam.x, this.cam.y) < 420 * 1 / this.cam.z * .6) continue;
        const p = { x, y, tx: x, ty: y, b, spd: OG.rand(40, 70), col: OG.pick(['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#c084fc', '#f472b6', '#e5e7eb', '#fb923c']), skin: OG.pick(['#f1c9a5', '#d9a577', '#a9744f', '#7a4e32']), ph: Math.random() * 6, wait: Math.random() * 3 };
        this.peds.push(p); return;
      }
    },

    /* ---------------- interaction ---------------- */
    nearest() {
      const P = this.P; const x = P.car ? P.car.x : P.x, y = P.car ? P.car.y : P.y; let best = null, bd = 1e9;
      const consider = (o, kind, r) => { const d = OG.dist(x, y, o.x, o.y); if (d < r && d < bd) { bd = d; best = Object.assign({ kind, x: o.x, y: o.y, ref: o }, {}); } };
      for (const d of this.doors) consider(d, d.shop ? 'shop' : 'door', d.r + 14);
      if (!P.car) { for (const n of this.npcs) consider(n, 'npc', 78); for (const c of this.cars) if (!c.dead) consider(c, 'car', 62); }
      else consider(P.car, 'exit', 999);
      if (!P.car && this.gen.gate && !this.gen.gate.open) { const g = this.gen.gate; consider({ x: g.x + 7, y: g.y + g.h / 2 }, 'gate', 90); }
      return best;
    },
    interact() {
      OG.snd.init(); const it = this.nearest(); if (!it) return;
      if (it.kind === 'car') {
        const c = it.ref; c.ai = false; c.parked = false; c.route = []; this.P.car = c; c.v = 0; c.vx = c.vy = 0; OG.snd.play('click'); OG.toast('נוהגים! ⬆️⬇️ מאיצים · ⬅️➡️ מסובבים · רווח = בלם יד · H = צופר', 'good');
        this.player_in = true;
      } else if (it.kind === 'exit') { const c = this.P.car; this.P.car = null; this.P.x = c.x - Math.sin(c.a) * 30; this.P.y = c.y + Math.cos(c.a) * 30; c.parked = true; c.v = 0; c.vx = c.vy = 0; this.resolveCircle(this.P, 11); }
      else this.onInteract && this.onInteract(it.kind, it.ref);
    },
    teleport(x, y) { const P = this.P; if (P.car) { P.car.x = x; P.car.y = y; } else { P.x = x; P.y = y; } this.cam.x = x; this.cam.y = y; this.cars = this.cars.filter(c => c === P.car || c === this.playerCar || OG.dist(c.x, c.y, x, y) > 500); },

    /* ---------------- update ---------------- */
    frame(t) {
      requestAnimationFrame(tt => this.frame(tt));
      const dt = Math.min(.05, (t - this.last) / 1000); this.last = t;
      if (!this.paused || this.attract) { this.time += dt; this.update(dt); this.draw(); if (!this.attract) this.drawMinimap(); }
    },
    update(dt) {
      const P = this.P, k = this.keys, S = OG.state.data;
      OG.state.data.playtime += dt;
      if (!this.attract && !this.paused) {
        if (P.car) this.driveCar(P.car, dt); else this.walk(dt);
      } else if (this.attract) {
        const t = this.time * .05, g = this.gen; this.cam.x = G.gx(1) + Math.cos(t) * 1000 * 1.0 + 200; this.cam.y = G.gy(1) + Math.sin(t * 1.3) * 700 + 300; this.cam.z = .9;
      }
      // camera
      if (!this.attract) {
        const f = P.car || P; const lead = P.car ? .35 : 0;
        const tx = f.x + (P.car ? P.car.vx * lead : 0), ty = f.y + (P.car ? P.car.vy * lead : 0);
        this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 6); this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 6);
        const tz = this.zoomBase * (P.car ? OG.clamp(1 - Math.hypot(P.car.vx, P.car.vy) / 1600, .75, 1) : 1);
        this.cam.z += (tz - this.cam.z) * Math.min(1, dt * 3);
      }
      this.updateCars(dt); this.updatePeds(dt); this.updatePickups(dt);
      for (let i = this.parts.length - 1; i >= 0; i--) { const p = this.parts[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; if (p.t > p.life) this.parts.splice(i, 1); }
      // population control
      const wantCars = this.attract ? 16 : 12, wantPeds = 26;
      if (this.cars.length < wantCars + 1 && Math.random() < dt * 3) this.spawnCar(false);
      if (this.peds.length < wantPeds && Math.random() < dt * 6) this.spawnPed();
      // door prompt
      if (!this.attract && !this.paused) this.updatePrompt();
    },
    walk(dt) {
      const P = this.P, k = this.keys; let ix = 0, iy = 0;
      if (k.a || k.arrowleft) ix -= 1; if (k.d || k.arrowright) ix += 1; if (k.w || k.arrowup) iy -= 1; if (k.s || k.arrowdown) iy += 1;
      if (this.joy.x || this.joy.y) { ix = this.joy.x; iy = this.joy.y; }
      if (!ix && !iy && this.clickTarget) { const dx = this.clickTarget.x - P.x, dy = this.clickTarget.y - P.y, d = Math.hypot(dx, dy); if (d > 12) { ix = dx / d; iy = dy / d; } else this.clickTarget = null; }
      const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
      const D = OG.state.data.items; const sprint = k.shift ? 1.7 : 1; const sp = 185 * sprint * (D.boots ? 1.2 : 1) * (P.boost > 0 ? 1.55 : 1);
      P.vx += (ix * sp - P.vx) * Math.min(1, dt * 11); P.vy += (iy * sp - P.vy) * Math.min(1, dt * 11);
      const ox = P.x, oy = P.y; P.x += P.vx * dt; P.y += P.vy * dt;
      const hit = this.resolveCircle(P, 11);
      if (hit && this.clickTarget && OG.dist(P.x, P.y, ox, oy) < 1 * dt) this.clickTarget = null;
      const spd = Math.hypot(P.vx, P.vy);
      if (spd > 12) { P.face = Math.atan2(P.vy, P.vx); P.phase += dt * spd * .055; P.step -= dt * spd; if (P.step <= 0) { OG.snd.play('step'); P.step = 52; } if (P.boost > 0 || k.shift) this.puff(P.x, P.y, 1); }
      if (P.boost > 0) P.boost -= dt;
      // cars bump the player
      for (const c of this.cars) { if (c.dead) continue; const d = OG.dist(P.x, P.y, c.x, c.y); if (d < 26 && Math.hypot(c.vx, c.vy) > 40) { const nx = (P.x - c.x) / (d || 1), ny = (P.y - c.y) / (d || 1); P.vx += nx * 240; P.vy += ny * 240; if (!c.honk) { OG.snd.play('horn'); c.honk = 1; setTimeout(() => c.honk = 0, 1500); } } }
    },
    driveCar(c, dt) {
      const k = this.keys; let th = 0, st = 0;
      if (k.w || k.arrowup) th += 1; if (k.s || k.arrowdown) th -= 1; if (k.a || k.arrowleft) st -= 1; if (k.d || k.arrowright) st += 1;
      if (this.joy.x || this.joy.y) { const ang = Math.atan2(this.joy.y, this.joy.x), m = Math.hypot(this.joy.x, this.joy.y); let da = ang - c.a; while (da > Math.PI) da -= TWO; while (da < -Math.PI) da += TWO; st = OG.clamp(da * 1.6, -1, 1); th = m > .2 ? (Math.abs(da) > 2.4 ? -1 : 1) : 0; }
      const hb = k[' '] ? 1 : 0; const sports = OG.state.data.items.sports;
      const fx = Math.cos(c.a), fy = Math.sin(c.a), rx = -fy, ry = fx;
      let vf = c.vx * fx + c.vy * fy, vl = c.vx * rx + c.vy * ry;
      const maxF = (sports ? 560 : 430) * (this.P.boost > 0 ? 1.3 : 1);
      if (th > 0) vf += (vf < 0 ? 900 : 380 * (sports ? 1.3 : 1)) * dt; else if (th < 0) vf -= (vf > 0 ? 800 : 220) * dt; else vf -= Math.sign(vf) * Math.min(Math.abs(vf), 160 * dt);
      vf = OG.clamp(vf, -150, maxF);
      vl *= Math.exp(-(hb ? 1.2 : 7.5) * dt); if (hb) vf *= Math.exp(-.7 * dt);
      const steerPow = OG.clamp(Math.abs(vf) / 110, 0, 1) * (hb ? 1.5 : 1);
      c.a += st * 2.5 * steerPow * Math.sign(vf || 1) * dt;
      const fx2 = Math.cos(c.a), fy2 = Math.sin(c.a), rx2 = -fy2, ry2 = fx2;
      c.vx = fx2 * vf + rx2 * vl; c.vy = fy2 * vf + ry2 * vl;
      c.x += c.vx * dt; c.y += c.vy * dt;
      // collisions: two circles
      let crash = 0;
      for (const off of [-12, 0, 12]) {
        const o = { x: c.x + fx2 * off, y: c.y + fy2 * off }; const bx = o.x, by = o.y;
        if (this.resolveCircle(o, 11)) { c.x += o.x - bx; c.y += o.y - by; crash = 1; }
      }
      if (crash) { const sp = Math.hypot(c.vx, c.vy); if (sp > 60) { OG.snd.noise(.12, .3, 0, 150); this.shake = .25; for (let i = 0; i < 4; i++) this.puff(c.x, c.y, 2); } c.vx *= .45; c.vy *= .45; }
      // push ambient cars / peds
      for (const o of this.cars) { if (o === c || o.dead) continue; const d = OG.dist(c.x, c.y, o.x, o.y); if (d < 30) { const nx = (o.x - c.x) / (d || 1), ny = (o.y - c.y) / (d || 1); o.x += nx * (30 - d) * .6; o.y += ny * (30 - d) * .6; c.vx *= .9; c.vy *= .9; if (o.ai) o.stuck = 1.2; } }
      if (Math.abs(vl) > 90 || (hb && Math.abs(vf) > 100)) { this.skid = this.skid || []; this.skid.push({ x: c.x - fx2 * 10 + rx2 * 7, y: c.y - fy2 * 10 + ry2 * 7, t: 0 }, { x: c.x - fx2 * 10 - rx2 * 7, y: c.y - fy2 * 10 - ry2 * 7, t: 0 }); if (this.skid.length > 140) this.skid.splice(0, 2); }
      if (this.P.boost > 0) { this.P.boost -= dt; this.puff(c.x - fx2 * 20, c.y - fy2 * 20, 1); }
      this.P.x = c.x; this.P.y = c.y;
    },
    puff(x, y, n) { for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: OG.rand(-20, 20), vy: OG.rand(-20, 20), t: 0, life: .5, c: 'rgba(200,210,255,.35)', r: OG.rand(3, 6), g: 0 }); },
    updateCars(dt) {
      const P = this.P;
      for (let i = this.cars.length - 1; i >= 0; i--) {
        const c = this.cars[i]; if (c === P.car || c === this.playerCar && c.parked) { if (c.parked) { c.vx = c.vy = 0; } continue; }
        if (!c.ai) { if (c.parked) continue; }
        if (c.ai) {
          const d = OG.dist(c.x, c.y, this.cam.x, this.cam.y);
          if (d > 1700) { this.cars.splice(i, 1); continue; }
          if (!c.route.length) this.extendRoute(c);
          const w = c.route[0]; const dx = w.x - c.x, dy = w.y - c.y, dist = Math.hypot(dx, dy);
          if (dist < 36) { c.route.shift(); if (c.route.length < 3) this.extendRoute(c); }
          let da = Math.atan2(dy, dx) - c.a; while (da > Math.PI) da -= TWO; while (da < -Math.PI) da += TWO;
          c.a += OG.clamp(da, -3.2 * dt, 3.2 * dt);
          // obstacle check
          let blocked = false; const fx = Math.cos(c.a), fy = Math.sin(c.a);
          const chk = (ox, oy, r) => { const rx = ox - c.x, ry = oy - c.y, f = rx * fx + ry * fy, l = Math.abs(-rx * fy + ry * fx); return f > 0 && f < 78 && l < 26 + r; };
          for (const o of this.cars) { if (o !== c && !o.dead && chk(o.x, o.y, 8)) { blocked = true; break; } }
          if (!blocked && !P.car && chk(P.x, P.y, 6)) blocked = true;
          for (const p of this.peds) if (!blocked && chk(p.x, p.y, 2)) { blocked = true; }
          if (blocked) { c.stuck += dt; c.brake = 1; } else { c.stuck = Math.max(0, c.stuck - dt * 2); c.brake = 0; }
          const want = (blocked && c.stuck < 2.5) ? 0 : c.max * (Math.abs(da) > .5 ? .55 : 1);
          const sp = Math.hypot(c.vx, c.vy); const ns = sp + OG.clamp(want - sp, -300 * dt, 90 * dt);
          c.vx = Math.cos(c.a) * ns; c.vy = Math.sin(c.a) * ns; c.x += c.vx * dt; c.y += c.vy * dt;
        } else { c.vx *= Math.exp(-3 * dt); c.vy *= Math.exp(-3 * dt); c.x += c.vx * dt; c.y += c.vy * dt; }
      }
      // cull far non-AI parked cars never
    },
    updatePeds(dt) {
      const P = this.P;
      for (let i = this.peds.length - 1; i >= 0; i--) {
        const p = this.peds[i];
        if (OG.dist(p.x, p.y, this.cam.x, this.cam.y) > 1300) { this.peds.splice(i, 1); continue; }
        if (p.wait > 0) { p.wait -= dt; continue; }
        // flee from fast cars
        let fx = 0, fy = 0;
        for (const c of this.cars) { const d = OG.dist(p.x, p.y, c.x, c.y); if (d < 70 && Math.hypot(c.vx, c.vy) > 30) { fx += (p.x - c.x) / d; fy += (p.y - c.y) / d; } }
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
        if (d < 8) { p.wait = OG.rand(.5, 3); const b = p.b; p.tx = b.x + 30 + Math.random() * (b.w - 60); p.ty = b.y + 30 + Math.random() * (b.h - 60); continue; }
        let vx = dx / d * p.spd + fx * 120, vy = dy / d * p.spd + fy * 120;
        p.x += vx * dt; p.y += vy * dt; p.ph += dt * 9;
        if (this.resolveCircle(p, 8)) { p.tx = p.x + OG.rand(-120, 120); p.ty = p.y + OG.rand(-120, 120); p.tx = OG.clamp(p.tx, p.b.x + 20, p.b.x + p.b.w - 20); p.ty = OG.clamp(p.ty, p.b.y + 20, p.b.y + p.b.h - 20); }
        p.face = Math.atan2(vy, vx);
      }
    },
    updatePickups(dt) {
      if (this.attract) return; const P = this.P, S = OG.state.data; const f = P.car || P;
      for (const c of this.coins) {
        if (S.collected[c.id]) continue; if (Math.abs(c.x - f.x) > 30 || Math.abs(c.y - f.y) > 30) continue;
        if (OG.dist(c.x, c.y, f.x, f.y) < 26) { S.collected[c.id] = 1; OG.state.addCoins(c.v); OG.snd.play('coin'); for (let i = 0; i < 8; i++) this.parts.push({ x: c.x, y: c.y, vx: OG.rand(-90, 90), vy: OG.rand(-120, -20), g: 300, t: 0, life: .7, c: '#fbbf24', r: 3 }); this.floatText(c.x, c.y - 12, '+' + c.v, '#fbbf24'); }
      }
      for (const u of this.powerups) { if (u.t > 0) { u.t -= dt; continue; } if (OG.dist(u.x, u.y, f.x, f.y) < 28) { u.t = 120; P.boost = 10; OG.snd.play('power'); OG.toast('⚡ טורבו! מהירות מוגברת ל-10 שניות', 'good'); for (let i = 0; i < 14; i++) this.parts.push({ x: u.x, y: u.y, vx: OG.rand(-140, 140), vy: OG.rand(-140, 140), t: 0, life: .8, c: '#22d3ee', r: 3.5 }); } }
    },
    floatText(x, y, text, color) { this.parts.push({ x, y, vx: 0, vy: -38, t: 0, life: 1, text, c: color }); },
    updatePrompt() {
      const it = this.nearest(), el = document.getElementById('prompt'); this.near = it;
      if (!it) { el.classList.add('hidden'); return; }
      let txt = '';
      if (it.kind === 'door') { const ch = OG.chById(it.ref.ch); const ok = OG.isUnlocked(ch.id); txt = ok ? `<kbd>E</kbd> כניסה: <b>${ch.icon} ${ch.title}</b>` : `🔒 ${ch.title} – נעול. סיימו קודם את הפרק הקודם`; }
      else if (it.kind === 'shop') txt = '<kbd>E</kbd> כניסה לחנות 🛒';
      else if (it.kind === 'npc') txt = `<kbd>E</kbd> לדבר עם <b>${it.ref.name}</b>`;
      else if (it.kind === 'car') txt = '<kbd>E</kbd> לעלות על הרכב 🚗';
      else if (it.kind === 'exit') { const d = this.doors.find(dd => OG.dist(dd.x, dd.y, it.x, it.y) < 0); txt = '<kbd>E</kbd> לרדת מהרכב'; const dd = this.doors.find(d2 => OG.dist(d2.x, d2.y, this.P.x, this.P.y) < d2.r + 14); if (dd) { const ch = dd.ch && OG.chById(dd.ch); txt = '<kbd>E</kbd> לרדת מהרכב · ' + (ch ? 'ואז E לכניסה' : ''); } }
      else if (it.kind === 'gate') txt = '🔒 הגשר לאי ההרחבה סגור';
      if (it.kind === 'exit' && !this.doors.some(d2 => OG.dist(d2.x, d2.y, this.P.x, this.P.y) < d2.r + 14)) { el.classList.remove('hidden'); el.innerHTML = '<kbd>E</kbd> לרדת מהרכב'; return; }
      el.innerHTML = txt; el.classList.remove('hidden');
    },

    /* ---------------- rendering ---------------- */
    getTile(tx, ty) {
      const k = tx + ',' + ty; let t = this.tiles.get(k);
      if (t) { t.used = this.time; return t.cv; }
      const TS = G.TS, res = 1.25; const cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(TS * res); const c = cv.getContext('2d');
      c.scale(res, res); c.translate(-tx * TS, -ty * TS); c.beginPath(); c.rect(tx * TS, ty * TS, TS, TS); c.clip();
      const list = this.tileLists.get(k) || [];
      for (const s of list) { if (s.x1 < tx * TS || s.x0 > (tx + 1) * TS || s.y1 < ty * TS || s.y0 > (ty + 1) * TS) continue; c.save(); try { s.draw(c); } catch (e) { console.error(e); } c.restore(); }
      this.tiles.set(k, { cv, used: this.time });
      if (this.tiles.size > 40) { let old = null, ok; for (const [kk, v] of this.tiles) if (kk !== k && (!old || v.used < old.used)) { old = v; ok = kk; } if (ok) this.tiles.delete(ok); }
      return cv;
    },
    draw() {
      const c = this.ctx, cam = this.cam, z = cam.z * this.dpr, TS = G.TS;
      c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#0b1020'; c.fillRect(0, 0, this.cv.width, this.cv.height);
      let sx = 0, sy = 0; if (this.shake > 0) { this.shake -= .016; sx = OG.rand(-3, 3); sy = OG.rand(-3, 3); }
      c.setTransform(z, 0, 0, z, (this.cv.width / 2) - cam.x * z + sx, (this.cv.height / 2) - cam.y * z + sy);
      const hw = innerWidth / 2 / cam.z + 40, hh = innerHeight / 2 / cam.z + 40;
      const vx0 = cam.x - hw, vx1 = cam.x + hw, vy0 = cam.y - hh, vy1 = cam.y + hh;
      for (let tx = Math.max(0, Math.floor(vx0 / TS)); tx <= Math.floor(vx1 / TS); tx++) for (let ty = Math.max(0, Math.floor(vy0 / TS)); ty <= Math.floor(vy1 / TS); ty++) { if (tx * TS > this.gen.W || ty * TS > this.gen.H) continue; c.drawImage(this.getTile(tx, ty), tx * TS, ty * TS, TS, TS); }
      const vis = (x, y, m = 80) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
      this.drawWater(c, vx0, vx1, vy0, vy1);
      // skid marks
      if (this.skid) { c.fillStyle = 'rgba(0,0,0,.35)'; for (const s of this.skid) if (vis(s.x, s.y)) c.fillRect(s.x - 1.5, s.y - 1.5, 3, 3); }
      // door rings & beams
      for (const d of this.doors) if (vis(d.x, d.y, 400)) this.drawDoor(c, d);
      // pickups
      const S = OG.state.data;
      for (const co of this.coins) if (!S.collected[co.id] && vis(co.x, co.y)) this.drawCoin(c, co);
      for (const u of this.powerups) if (u.t <= 0 && vis(u.x, u.y)) this.drawPowerup(c, u);
      if (OG.state.data.items.radar) { /* radar handled in minimap */ }
      // gate
      this.drawGate(c);
      // entities
      for (const p of this.peds) if (vis(p.x, p.y)) this.drawPed(c, p.x, p.y, p.face, p.ph, p.col, p.skin, '#2a2a2a');
      for (const n of this.npcs) if (vis(n.x, n.y)) this.drawNpc(c, n);
      for (const car of this.cars) if (vis(car.x, car.y)) this.drawCar(c, car);
      if (!this.P.car && !this.attract) this.drawPlayer(c);
      // particles
      for (const p of this.parts) { const a = 1 - p.t / p.life; c.globalAlpha = Math.max(0, a); if (p.text) { c.fillStyle = p.c; c.font = '900 16px Heebo, Arial'; c.textAlign = 'center'; c.fillText(p.text, p.x, p.y); } else { c.fillStyle = p.c; c.beginPath(); c.arc(p.x, p.y, p.r * (p.c.startsWith('rgba') ? 1 + p.t * 2 : 1), 0, TWO); c.fill(); } c.globalAlpha = 1; }
      // lamp glows at night are baked. add moving headlights
      c.globalCompositeOperation = 'lighter';
      for (const car of this.cars) if (vis(car.x, car.y)) this.drawHeadlights(c, car);
      c.globalCompositeOperation = 'source-over';
      // quest arrow
      this.updateArrow();
    },
    drawWater(c, x0, x1, y0, y1) {
      const w = this.gen.water; if (x1 < w.x || x0 > w.x + w.w) return;
      const t = this.time; c.save(); c.beginPath(); c.rect(w.x, Math.max(w.y, y0), w.w, Math.min(w.h, y1 - y0 + 10)); c.clip();
      c.strokeStyle = 'rgba(160,220,255,.22)'; c.lineWidth = 2;
      for (let y = Math.floor(y0 / 36) * 36; y < y1; y += 36) { c.beginPath(); for (let x = w.x; x <= w.x + w.w; x += 12) { const yy = y + Math.sin(x * .05 + t * 1.4 + y * .1) * 4; if (x === w.x) c.moveTo(x, yy); else c.lineTo(x, yy); } c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.07)'; for (let k = 0; k < 30; k++) { const yy = ((k * 197 + t * 30) % (w.h)) + w.y; c.fillRect(w.x + (k * 53 % w.w), yy, 14, 2); }
      c.restore();
      // fountain jets
      const f = this.gen.hub; if (f && Math.abs(f.x - this.cam.x) < 800 && Math.abs(f.y - this.cam.y) < 600) { c.strokeStyle = 'rgba(190,235,255,.7)'; c.lineWidth = 2.5; for (let k = 0; k < 10; k++) { const a = k / 10 * TWO + t; c.beginPath(); c.arc(f.x + Math.cos(a) * 16, f.y + Math.sin(a) * 16, 8 + Math.sin(t * 3 + k) * 3, 0, TWO); c.stroke(); } c.fillStyle = 'rgba(200,240,255,.8)'; c.beginPath(); c.arc(f.x, f.y, 6 + Math.sin(t * 4) * 1.5, 0, TWO); c.fill(); }
    },
    drawDoor(c, d) {
      const t = this.time, pul = (Math.sin(t * 3) + 1) / 2;
      const ch = d.ch ? OG.chById(d.ch) : null; const col = ch ? ch.color : '#c4b5fd';
      const unlocked = ch ? OG.isUnlocked(ch.id) : true; const done = ch && OG.state.isComplete(ch.id);
      const cc = unlocked ? col : '#64748b';
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(d.x, d.y, 4, d.x, d.y, 56 + pul * 8); g.addColorStop(0, cc + 'aa'); g.addColorStop(1, cc + '00'); c.fillStyle = g; c.beginPath(); c.arc(d.x, d.y, 66, 0, TWO); c.fill();
      c.globalCompositeOperation = 'source-over';
      c.strokeStyle = cc; c.lineWidth = 3.5; c.setLineDash([10, 8]); c.lineDashOffset = -t * 24; c.beginPath(); c.arc(d.x, d.y, 38 + pul * 3, 0, TWO); c.stroke(); c.setLineDash([]);
      // floating label
      const ly = d.y - 250 - Math.sin(t * 2 + d.x) * 4 + 150;
      c.font = `${unlocked ? 800 : 700} 16px Heebo, Arial`; c.textAlign = 'center';
      const label = ch ? `${ch.boss ? '★' : ch.num} · ${ch.title}` : 'חנות';
      const w = c.measureText(label).width + 56; const ly2 = d.y + 40 + 26;
      c.fillStyle = 'rgba(8,12,28,.9)'; rr(c, d.x - w / 2, ly2 - 17, w, 28, 14); c.fill(); c.strokeStyle = cc; c.lineWidth = 2; c.stroke();
      c.fillStyle = unlocked ? '#fff' : '#94a3b8'; c.fillText(label, d.x + 8, ly2 + 3);
      c.font = `18px ${EMOJI}`; c.fillText(!unlocked ? '🔒' : done ? '✅' : (ch ? ch.icon : '🛒'), d.x - w / 2 + 16, ly2 + 5);
      if (ch && unlocked && !done && this.target && this.target.ch === ch.id) { c.fillStyle = '#fbbf24'; c.font = `900 28px ${EMOJI}`; c.fillText('⬇️', d.x, d.y - 52 + Math.sin(t * 4) * 6); }
      c.restore();
    },
    drawCoin(c, co) {
      const t = this.time, bob = Math.sin(t * 3 + co.x) * 2.5; const r = co.v >= 5 ? 9 : 7;
      c.save(); c.translate(co.x, co.y + bob);
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, 11 - bob, 6, 2.5, 0, 0, TWO); c.fill();
      c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, 0, 1, 0, 0, r * 2.4); g.addColorStop(0, co.gold ? 'rgba(255,200,50,.6)' : 'rgba(255,210,80,.4)'); g.addColorStop(1, 'rgba(255,200,50,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 2.4, 0, TWO); c.fill(); c.globalCompositeOperation = 'source-over';
      const sx = Math.abs(Math.cos(t * 2.4 + co.y)); c.scale(.35 + .65 * sx, 1);
      c.fillStyle = co.gold ? '#f59e0b' : '#fbbf24'; c.beginPath(); c.arc(0, 0, r, 0, TWO); c.fill(); c.strokeStyle = '#b45309'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#92400e'; c.font = `900 ${r + 2}px Heebo, Arial`; c.textAlign = 'center'; c.fillText('P', 0, r * .45); c.restore();
    },
    drawPowerup(c, u) {
      const t = this.time; c.save(); c.translate(u.x, u.y + Math.sin(t * 4) * 3);
      c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, 0, 2, 0, 0, 30); g.addColorStop(0, 'rgba(34,211,238,.7)'); g.addColorStop(1, 'rgba(34,211,238,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 30, 0, TWO); c.fill(); c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#0b3b4a'; c.strokeStyle = '#22d3ee'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 13, 0, TWO); c.fill(); c.stroke(); c.font = `16px ${EMOJI}`; c.textAlign = 'center'; c.fillText('⚡', 0, 6); c.restore();
    },
    drawGate(c) {
      const g = this.gen.gate; if (!g) return; const t = this.time;
      if (g.open) { g.t = Math.min(1, (g.t || 0) + .02); }
      const open = g.t || 0; c.save();
      c.fillStyle = '#334155'; c.fillRect(g.x - 4, g.y - 10, 22, 14); c.fillRect(g.x - 4, g.y + g.h - 4, 22, 14);
      const len = (g.h - 8) * (1 - open);
      if (len > 2) { c.fillStyle = '#ef4444'; c.fillRect(g.x + 1, g.y + 6, 12, len); c.fillStyle = '#fff'; for (let k = 0; k < len; k += 16) c.fillRect(g.x + 1, g.y + 6 + k, 12, 8); }
      if (!g.open) { c.font = `800 14px Heebo, Arial`; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillStyle = 'rgba(8,12,28,.9)'; rr(c, g.x - 70, g.y - 50, 140, 26, 13); c.fill(); c.strokeStyle = '#e879f9'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#fff'; c.fillText('🔒 אי ההרחבה – EXTRA', g.x, g.y - 32); }
      c.restore();
    },
    drawCar(c, car) {
      const L = car.len, Wd = car.wid;
      c.save(); c.translate(car.x, car.y); c.rotate(car.a);
      c.fillStyle = 'rgba(0,0,10,.4)'; rr(c, -L / 2 + 3, -Wd / 2 + 5, L, Wd, 6); c.fill();
      const col = car.color;
      if (car.kind === 'truck') { c.fillStyle = shade(col, -.2); rr(c, -L / 2, -Wd / 2, L * .66, Wd, 3); c.fill(); c.fillStyle = col; rr(c, L * .16, -Wd / 2 + 1, L * .34, Wd - 2, 4); c.fill(); c.fillStyle = '#9fd6ff'; c.fillRect(L * .38, -Wd / 2 + 3, 4, Wd - 6); c.strokeStyle = 'rgba(0,0,0,.4)'; c.strokeRect(-L / 2, -Wd / 2, L * .66, Wd); }
      else {
        c.fillStyle = col; rr(c, -L / 2, -Wd / 2, L, Wd, 6); c.fill();
        c.fillStyle = 'rgba(255,255,255,.18)'; rr(c, -L / 2 + 2, -Wd / 2 + 1.5, L - 4, Wd / 3, 4); c.fill();
        c.fillStyle = shade(col, -.35); rr(c, -L * .18, -Wd / 2 + 2.5, L * .38, Wd - 5, 4); c.fill();
        c.fillStyle = '#9fd6ff'; c.fillRect(L * .2, -Wd / 2 + 3, L * .1, Wd - 6); c.fillStyle = '#6a8fb8'; c.fillRect(-L * .32, -Wd / 2 + 3.5, L * .07, Wd - 7);
        c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 1.2; rr(c, -L / 2, -Wd / 2, L, Wd, 6); c.stroke();
        if (car.kind === 'taxi') { c.fillStyle = '#111827'; c.fillRect(-3, -4, 9, 8); c.fillStyle = '#fde047'; c.fillRect(-2, -3, 7, 6); }
        if (car.kind === 'sports' || (car === this.playerCar && OG.state.data.items.sports)) { c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-L / 2 + 3, -1.5, L - 6, 3); }
      }
      // brake lights
      const braking = car.brake || (car === this.P.car && (this.keys.s || this.keys.arrowdown || this.keys[' ']));
      c.fillStyle = braking ? '#ff2a2a' : '#7f1d1d'; c.fillRect(-L / 2 - 1, -Wd / 2 + 1.5, 3, 4); c.fillRect(-L / 2 - 1, Wd / 2 - 5.5, 3, 4);
      c.fillStyle = '#fff7c2'; c.fillRect(L / 2 - 2, -Wd / 2 + 1.5, 3, 4); c.fillRect(L / 2 - 2, Wd / 2 - 5.5, 3, 4);
      c.restore();
    },
    drawHeadlights(c, car) {
      if (car.parked && car !== this.P.car) return;
      c.save(); c.translate(car.x, car.y); c.rotate(car.a);
      const g = c.createLinearGradient(car.len / 2, 0, car.len / 2 + 90, 0); g.addColorStop(0, 'rgba(255,240,180,.28)'); g.addColorStop(1, 'rgba(255,240,180,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(car.len / 2, -car.wid / 2); c.lineTo(car.len / 2 + 95, -34); c.lineTo(car.len / 2 + 95, 34); c.lineTo(car.len / 2, car.wid / 2); c.closePath(); c.fill(); c.restore();
    },
    drawPed(c, x, y, face, ph, col, skin, hair, scale = 1) {
      c.save(); c.translate(x, y); c.scale(scale, scale);
      c.fillStyle = 'rgba(0,0,10,.35)'; c.beginPath(); c.ellipse(2, 4, 9, 6, 0, 0, TWO); c.fill();
      c.rotate(face);
      const sw = Math.sin(ph) * 4;
      c.fillStyle = skin; c.beginPath(); c.ellipse(sw, -8, 3.2, 2.6, 0, 0, TWO); c.fill(); c.beginPath(); c.ellipse(-sw, 8, 3.2, 2.6, 0, 0, TWO); c.fill();
      c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, 5.2, 9.5, 0, 0, TWO); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; c.stroke();
      c.fillStyle = skin; c.beginPath(); c.arc(1.5, 0, 5.2, 0, TWO); c.fill();
      c.fillStyle = hair; c.beginPath(); c.arc(-.5, 0, 5.2, Math.PI * .5, Math.PI * 1.5); c.fill();
      c.restore();
    },
    drawPlayer(c) {
      const P = this.P, S = OG.state.data;
      this.drawPed(c, P.x, P.y, P.face, P.phase, S.look.jacket, '#f1c9a5', '#3b2a1a', 1.18);
      if (P.boost > 0) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(P.x, P.y, 2, P.x, P.y, 30); g.addColorStop(0, 'rgba(34,211,238,.5)'); g.addColorStop(1, 'rgba(34,211,238,0)'); c.fillStyle = g; c.beginPath(); c.arc(P.x, P.y, 30, 0, TWO); c.fill(); c.restore(); }
      // little arrow marker above
      c.fillStyle = '#22d3ee'; c.beginPath(); c.moveTo(P.x, P.y - 24); c.lineTo(P.x - 5, P.y - 31); c.lineTo(P.x + 5, P.y - 31); c.fill();
    },
    drawNpc(c, n) {
      const near = OG.dist(n.x, n.y, this.P.x, this.P.y) < 90;
      this.drawPed(c, n.x, n.y, Math.PI / 2 + Math.sin(this.time + n.x) * .3, 0, n.color, '#e8c7a0', '#222', 1.2);
      c.save(); c.font = `22px ${EMOJI}`; c.textAlign = 'center'; c.fillText(n.face, n.x, n.y - 24 - Math.sin(this.time * 3 + n.x) * 2);
      if (!OG.state.data.npcSeen[n.id]) { c.fillStyle = '#fbbf24'; c.font = '900 20px Heebo'; c.fillText('!', n.x + 16, n.y - 34); }
      if (near) { c.font = '800 13px Heebo, Arial'; const w = c.measureText(n.name).width + 16; c.fillStyle = 'rgba(8,12,28,.9)'; rr(c, n.x - w / 2, n.y + 16, w, 20, 10); c.fill(); c.fillStyle = '#fff'; c.fillText(n.name, n.x, n.y + 30); }
      c.restore();
    },
    updateArrow() {
      const el = document.getElementById('arrow'); const t = this.target;
      if (!t || this.paused || this.attract) { el.classList.add('hidden'); return; }
      const f = this.P.car || this.P; const s = this.worldToScreen(t.x, t.y);
      const onscreen = s.x > 60 && s.x < innerWidth - 60 && s.y > 80 && s.y < innerHeight - 60;
      if (onscreen) { el.classList.add('hidden'); return; }
      const a = Math.atan2(t.y - f.y, t.x - f.x); const r = Math.min(innerWidth, innerHeight) / 2 - 90;
      el.classList.remove('hidden'); el.style.transform = `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px) rotate(${a}rad)`;
    },

    /* ---------------- minimap ---------------- */
    buildMinimap() {
      const g = this.gen, W = g.W, H = g.H, s = 220 / W * 1.0; this.mmScale = Math.min(220 / (g.bounds.x1 - g.bounds.x0), 170 / (g.bounds.y1 - g.bounds.y0));
      const cv = document.createElement('canvas'); cv.width = 440; cv.height = 340; const c = cv.getContext('2d'); const k = this.mmScale * 2; this.mmK = k;
      c.fillStyle = '#07101f'; c.fillRect(0, 0, 440, 340); c.translate(-g.bounds.x0 * k, -g.bounds.y0 * k); c.scale(k, k);
      c.fillStyle = '#1d2c4d'; c.fillRect(g.bounds.x0, g.bounds.y0, g.bounds.x1 - g.bounds.x0, g.bounds.y1 - g.bounds.y0);
      c.fillStyle = '#2a3658'; for (let j = 0; j < 5; j++) c.fillRect(G.gx(0) - G.RW / 2, G.gy(j) - G.RW / 2, G.gx(5) - G.gx(0) + G.RW, G.RW);
      for (const i of [0, 1, 2, 4, 5]) c.fillRect(G.gx(i) - G.RW / 2, G.gy(0) - G.RW / 2, G.RW, G.gy(4) - G.gy(0) + G.RW);
      for (const b of g.blocks) { const ch = b.spec.ch && OG.chById(b.spec.ch); c.fillStyle = ch ? ch.color + '66' : b.spec.theme === 'park' ? '#1f5a3f' : b.spec.theme === 'stadium' ? '#7a3f24' : '#3a4561'; c.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12); }
      c.fillStyle = '#0e5f93'; c.fillRect(g.water.x, g.water.y, g.water.w, g.water.h);
      c.fillStyle = '#7a8cb8'; c.fillRect(g.bridge.x, g.bridge.y + 20, g.bridge.w, G.RW - 40);
      this.mm = cv;
    },
    drawMinimap() {
      const cv = document.getElementById('minimap'); if (!cv) return; const c = cv.getContext('2d'); const g = this.gen, k = this.mmK;
      const f = this.P.car || this.P;
      c.clearRect(0, 0, cv.width, cv.height);
      // follow window
      const vw = cv.width / k * .55, vh = cv.height / k * .55;
      const sc = 1.0; const cx = f.x, cy = f.y; // draw part of the minimap centered on player
      const sx = (cx - g.bounds.x0) * k - cv.width / 2, sy = (cy - g.bounds.y0) * k - cv.height / 2;
      c.drawImage(this.mm, -sx, -sy);
      const toM = (x, y) => [(x - g.bounds.x0) * k - sx, (y - g.bounds.y0) * k - sy];
      for (const d of this.doors) { const [x, y] = toM(d.x, d.y); const ch = d.ch && OG.chById(d.ch); const un = !ch || OG.isUnlocked(ch.id); c.fillStyle = un ? (ch ? ch.color : '#c4b5fd') : '#64748b'; c.beginPath(); c.arc(x, y, 7, 0, TWO); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#001018'; c.font = '900 9px Heebo'; c.textAlign = 'center'; c.fillText(ch ? (ch.boss ? '★' : ch.num) : '🛒', x, y + 3); if (this.target && ch && this.target.ch === ch.id) { c.strokeStyle = '#fbbf24'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 10 + Math.sin(this.time * 5) * 2, 0, TWO); c.stroke(); } }
      if (OG.state.data.items.radar) { c.fillStyle = '#fbbf24'; for (const co of this.coins) if (!OG.state.data.collected[co.id]) { const [x, y] = toM(co.x, co.y); if (x > 0 && y > 0 && x < cv.width && y < cv.height) c.fillRect(x - 1, y - 1, 2.5, 2.5); } c.fillStyle = '#f472b6'; for (const n of this.npcs) { const [x, y] = toM(n.x, n.y); c.fillRect(x - 2, y - 2, 4, 4); } }
      const [px, py] = toM(f.x, f.y); c.save(); c.translate(px, py); c.rotate(f.car ? 0 : (this.P.car ? this.P.car.a : this.P.face)); c.fillStyle = '#22d3ee'; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(8, 0); c.lineTo(-6, -5); c.lineTo(-3, 0); c.lineTo(-6, 5); c.closePath(); c.fill(); c.stroke(); c.restore();
    },
    bigMap(canvas, scale) {
      const g = this.gen; const w = canvas.width, h = canvas.height; const c = canvas.getContext('2d'); const k = Math.min(w / (g.bounds.x1 - g.bounds.x0), h / (g.bounds.y1 - g.bounds.y0));
      c.fillStyle = '#07101f'; c.fillRect(0, 0, w, h); c.drawImage(this.mm, 0, 0, this.mm.width, this.mm.height, 0, 0, (g.bounds.x1 - g.bounds.x0) * k, (g.bounds.y1 - g.bounds.y0) * k);
      const pos = (x, y) => [(x - g.bounds.x0) * k, (y - g.bounds.y0) * k];
      const spots = [];
      for (const d of this.doors) { const [x, y] = pos(d.x, d.y); const ch = d.ch && OG.chById(d.ch); const un = !ch || OG.isUnlocked(ch.id); c.fillStyle = un ? (ch ? ch.color : '#c4b5fd') : '#64748b'; c.beginPath(); c.arc(x, y, 15, 0, TWO); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#001018'; c.font = '900 15px Heebo'; c.textAlign = 'center'; c.fillText(ch ? (ch.boss ? '★' : ch.num) : '🛒', x, y + 5); c.fillStyle = '#fff'; c.font = '700 12px Heebo'; c.fillText(ch ? ch.title : 'חנות', x, y + 30); spots.push({ x, y, r: 18, d: d, un }); }
      const f = this.P.car || this.P; const [px, py] = pos(f.x, f.y); c.fillStyle = '#22d3ee'; c.beginPath(); c.arc(px, py, 8, 0, TWO); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke(); c.fillStyle = '#fff'; c.font = '800 12px Heebo'; c.fillText('אתם', px, py - 14);
      return spots;
    }
  };
})(window.OG);
