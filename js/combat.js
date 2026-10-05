/* OSPF City – combat: weapons, bullets, health, gangs, police & wanted level, power-ups, abilities, explosions */
(function (OG) {
  const TWO = Math.PI * 2;
  const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  const rnd = OG.rand, pick = OG.pick;

  const WEAPONS = {
    pistol: { name: 'אקדח', icon: '🔫', dmg: 16, rate: .26, speed: 950, spread: .025, range: 640, auto: false, price: 0, pack: [30, 20], col: '#ffd166', snd: 'shot' },
    smg: { name: 'תת־מקלע Burst', icon: '🔫', dmg: 9, rate: .075, speed: 1050, spread: .08, range: 580, auto: true, price: 280, pack: [90, 45], col: '#ffe08a', snd: 'shot' },
    shotgun: { name: 'שוטגאן Flood', icon: '🧨', dmg: 11, pellets: 7, rate: .75, speed: 900, spread: .3, range: 340, auto: false, price: 380, pack: [16, 40], col: '#ff9f6b', snd: 'shotgun' },
    rocket: { name: 'משגר LSA', icon: '🚀', dmg: 100, rate: 1.1, speed: 560, spread: .01, range: 900, auto: false, price: 950, pack: [6, 90], col: '#ff6b6b', snd: 'rocket', explosive: 150 },
    laser: { name: 'קרן Dijkstra', icon: '⚡', dmg: 26, rate: .42, spread: 0, range: 950, auto: false, price: 750, pack: [30, 70], col: '#67e8f9', snd: 'laser', hitscan: true },
    freeze: { name: 'קרן Dead-Timer', icon: '❄️', dmg: 5, rate: .5, spread: 0, range: 620, auto: false, price: 520, pack: [30, 55], col: '#bae6fd', snd: 'laser', hitscan: true, freeze: true }
  };
  const ORDER = ['pistol', 'smg', 'shotgun', 'rocket', 'laser', 'freeze'];
  const STAR_AT = [15, 45, 85, 140, 210];
  OG.WEAPONS = WEAPONS; OG.WEAPON_ORDER = ORDER;
  const SOLID_BLOCK = new Set(['building', 'wall', 'crate', 'tree', 'fountain']);

  const C = OG.Combat = {
    foes: [], bullets: [], fx: [], heat: 0, stars: 0, cd: { dash: 0, pulse: 0, ping: 0, shield: 0 }, fireCd: 0, latch: false, spawnT: 0, blockFoes: {}, bust: 0, copSeen: false, respawnT: 0, lastHurt: 0, reviveUsed: false, pingT: 0, deadT: 0,
    init(world) { this.W = world; this.P = world.P; this.buildHud(); this.recalc(); this.P.hp = this.P.maxHp; OG.Missions && OG.Missions.init(world); OG.MP && OG.MP.init(world); },
    has(ch) { return OG.state.data.settings.free || OG.state.isComplete(ch); },
    perk(n) {
      const s = this;
      switch (n) {
        case 'dmg': return OG.state.power() * .04 + (s.has('ch5') ? .15 : 0);
        case 'speed': return s.has('e5') ? .1 : 0;
        case 'veh': return s.has('e5') ? .05 : 0;
        case 'cash': return s.has('ch4') ? .25 : 0;
        case 'ammo': return s.has('e1') ? 1.5 : 1;
        case 'regen': return s.has('e4') ? 1 : 0;
        case 'crit': return s.has('ch7') ? .12 : 0;
        case 'aim': return s.has('e3');
        case 'revive': return s.has('ch6');
        case 'maxhp': return 100 + OG.state.power() * 6 + (s.has('ch8') ? 20 : 0);
      }
      return 0;
    },
    recalc() { const P = this.P, mx = this.perk('maxhp'); if (P.maxHp !== mx) { P.hp += mx - P.maxHp; P.maxHp = mx; } P.hp = OG.clamp(P.hp, 0, P.maxHp); },
    magnetR() { const P = this.P; return 26 + (P.magnet > 0 ? 150 : 0) + (this.has('e2') ? 55 : 0); },
    safe() { const P = this.P; const o = P.car || P; return this.W.inSafe(o.x, o.y); },
    weapon() { const d = OG.state.data; if (!d.weapons[d.wsel]) d.wsel = 'pistol'; return WEAPONS[d.wsel]; },
    owned() { return ORDER.filter(w => OG.state.data.weapons[w] !== undefined); },
    cycleWeapon(dir) { const o = this.owned(); if (!o.length) return; const d = OG.state.data; const i = (o.indexOf(d.wsel) + dir + o.length) % o.length; d.wsel = o[i]; OG.snd.play('click'); this.hudWeapon(); },
    select(i) { const w = ORDER[i]; if (w && OG.state.data.weapons[w] !== undefined) { OG.state.data.wsel = w; OG.snd.play('click'); this.hudWeapon(); } },
    onKey(k) {
      if (this.P.dead) return;
      if (k >= '1' && k <= '6') this.select(+k - 1);
      else if (k === 'q') this.dash(); else if (k === 'r') this.pulse(); else if (k === 'c') this.ping(); else if (k === 'x') this.shield();
      else if (k === 'tab' && OG.MP) OG.MP.board(true);
      else if (k === 'enter' && OG.MP && OG.MP.active) OG.MP.openChat();
      else if (k === 'v' && OG.MP && OG.MP.active) OG.MP.emote();
      else if (k === 'n') this.radio();
      else if (k === 'p') OG.Svc.profile();
      else if (k === 'g') OG.MP.openLobby();
    },

    radio() { const S = OG.state.data.settings; S.radio = ((S.radio || 0) + 1) % 4; OG.snd.station = S.radio; const N = ['📻 רדיו כבוי (מוזיקת עיר)', '📻 Synth FM', '📻 Packet Beat', '📻 Dijkstra Chill']; OG.toast(N[S.radio], 'good'); OG.snd.play('click'); OG.snd.stopMusic(); if (S.music && S.sound) OG.snd.startMusic(); OG.state.save(); },
    /* ---------------- player health ---------------- */
    hurtPlayer(dmg, src, from) {
      const P = this.P; if (P.dead || P.inv > 0 || P.shield > 0 || dmg <= 0) return;
      if (src !== 'env' && src !== 'crash' && this.safe()) return;
      dmg *= (OG.state.data.settings.free ? .6 : 1);
      if (P.car && src !== 'crash') { P.car.hp -= dmg * .5; if (P.car.hp <= 0) this.damageVehicle(P.car, 0, src); dmg *= .5; }
      let d = dmg; if (P.armor > 0) { const ab = Math.min(P.armor, d * .65); P.armor -= ab; d -= ab; }
      P.hp -= d; this.lastHurt = this.W.time; this.W.floatText(P.x, P.y - 22, '-' + Math.ceil(dmg), '#fb7185'); this.W.shake = Math.max(this.W.shake || 0, .15); OG.snd.play('hit');
      this.hudHurt();
      if (P.hp <= 0) this.die(src, from);
    },
    die(src, from) {
      const P = this.P; if (P.dead) return;
      if (this.perk('revive') && !this.reviveUsed) { this.reviveUsed = true; P.hp = P.maxHp * .5; P.inv = 3; OG.toast('🛟 ה-BDR נכנס לפעולה: חזרת לחיים עם 50%!', 'good'); OG.snd.play('power'); setTimeout(() => this.reviveUsed = false, 120000); return; }
      P.dead = true; this.deadT = 3.2; OG.state.data.stats.deaths++;
      const lose = Math.floor(OG.state.data.cash * .2); OG.state.addCash(-lose);
      OG.toast(`💀 נפלת! איבדת 💵 ${lose}`, 'bad'); OG.snd.play('lose');
      const car = P.car; if (car) { car.driver = null; car.parked = true; P.car = null; }
      this.W.explosionFx && 0; this.bigFx(P.x, P.y, 60, '#ff4d6d');
      if (OG.MP && OG.MP.active) OG.MP.sendDeath(from);
      this.setStars(0); this.heat = 0; document.getElementById('deadOv').classList.remove('hidden');
    },
    respawn() {
      const P = this.P, W = this.W; const h = W.doors.find(d => d.svc === 'hospital') || { x: W.gen.spawn.x, y: W.gen.spawn.y };
      P.dead = false; P.hp = P.maxHp; P.armor = 0; P.inv = 3; P.vx = P.vy = 0; P.x = h.x; P.y = h.y + 70; W.cam.x = P.x; W.cam.y = P.y; this.foes = this.foes.filter(f => f.type === 'gang' && OG.dist(f.x, f.y, P.x, P.y) > 600);
      document.getElementById('deadOv').classList.add('hidden'); this.hudHurt(); OG.toast('🏥 התעוררת בבית החולים', 'good');
    },
    heal(n) { const P = this.P; P.hp = Math.min(P.maxHp, P.hp + n); this.W.floatText(P.x, P.y - 20, '+' + Math.round(n) + ' ❤️', '#34d399'); },

    /* ---------------- heat / wanted ---------------- */
    addHeat(n) { if (this.safe() || this.P.ghost > 0) return; this.heat = Math.min(260, this.heat + n); const s = STAR_AT.filter(t => this.heat >= t).length; if (s > this.stars) this.setStars(s); },
    setStars(s) {
      if (s > this.stars) { OG.toast(`🚨 רמת מבוקש ${'★'.repeat(s)}`, 'bad'); OG.snd.play('siren'); OG.state.data.stats.wanted = Math.max(OG.state.data.stats.wanted, s); OG.Ach && OG.Ach.check(); }
      this.stars = s; if (s === 0) { this.heat = 0; for (const f of this.foes) if (f.cop) f.leave = true; } this.hudStars();
    },

    /* ---------------- firing ---------------- */
    tryFire(dt) {
      const P = this.P, W = this.W, d = OG.state.data, w = this.weapon();
      this.fireCd -= dt; const want = W.firing && !P.car && !P.dead;
      if (!want) { this.latch = false; return; }
      if (this.fireCd > 0 || (!w.auto && this.latch)) return;
      if (this.safe()) { if (!this.latch) { OG.toast('🕊️ אזור בטוח – אי אפשר לירות ליד הבניינים', 'warn'); this.latch = true; } return; }
      if ((d.weapons[d.wsel] || 0) <= 0) { if (!this.latch) { OG.toast('😬 נגמרה התחמושת! קנו בחנות הנשק', 'warn'); OG.snd.play('click'); } this.latch = true; return; }
      d.weapons[d.wsel]--; this.latch = true; this.fireCd = w.rate * (P.dbl > 0 ? .9 : 1);
      this.shoot(w, P.x, P.y, P.aim, 'p'); this.hudWeapon();
    },
    dmgOf(w) { return w.dmg * (1 + this.perk('dmg')) * (this.P.dbl > 0 ? 2 : 1) * (Math.random() < this.perk('crit') ? 2 : 1); },
    shoot(w, x, y, ang, owner, remote) {
      const W = this.W; let a = ang;
      if (owner === 'p' && this.perk('aim')) { let best = null, bd = 1e9; for (const f of this.foes) { const dd = OG.dist(x, y, f.x, f.y); if (dd > 560) continue; let da = Math.atan2(f.y - y, f.x - x) - ang; while (da > Math.PI) da -= TWO; while (da < -Math.PI) da += TWO; if (Math.abs(da) < .25 && dd < bd) { bd = dd; best = da; } } if (best !== null) a += best * .6; }
      const mx = x + Math.cos(a) * 18, my = y + Math.sin(a) * 18;
      this.fx.push({ t: 0, life: .08, k: 'flash', x: mx, y: my, a, col: w.col });
      OG.snd.play(w.snd); if (owner === 'p') { W.shake = Math.max(W.shake || 0, w.explosive ? .25 : .06); }
      if (w.hitscan) { this.beam(w, x, y, a, owner); }
      else {
        const n = w.pellets || 1;
        for (let i = 0; i < n; i++) { const aa = a + (Math.random() - .5) * 2 * w.spread; this.bullets.push({ x: mx, y: my, vx: Math.cos(aa) * w.speed, vy: Math.sin(aa) * w.speed, left: w.range, dmg: owner === 'p' ? this.dmgOf(w) : w.dmg, owner, col: w.col, ex: w.explosive || 0, a: aa, rock: !!w.explosive }); }
      }
      if (owner === 'p' && OG.MP && OG.MP.active) OG.MP.sendShot(OG.state.data.wsel, mx, my, a);
    },
    beam(w, x, y, a, owner) {
      const W = this.W; const dx = Math.cos(a), dy = Math.sin(a); let len = w.range;
      for (let t = 20; t < w.range; t += 12) { const px = x + dx * t, py = y + dy * t; let hit = false; for (const s of W.solidsNear(px, py, 2)) if (SOLID_BLOCK.has(s.kind) && px > s.x && px < s.x + s.w && py > s.y && py < s.y + s.h) { hit = true; break; } if (hit) { len = t; break; } }
      this.fx.push({ t: 0, life: .18, k: 'beam', x, y, a, len, col: w.col });
      if (owner !== 'p') { const P = this.P, o = P.car || P; const rx = o.x - x, ry = o.y - y, f = rx * dx + ry * dy, l = Math.abs(-rx * dy + ry * dx); if (f > 0 && f < len && l < 16) this.hurtPlayer(w.dmg, owner); return; }
      const hitCirc = (ex, ey, r) => { const rx = ex - x, ry = ey - y, f = rx * dx + ry * dy, l = Math.abs(-rx * dy + ry * dx); return f > 0 && f < len && l < r; };
      for (const f of this.foes.slice()) if (hitCirc(f.x, f.y, 16)) { this.damageFoe(f, this.dmgOf(w), 'p'); if (w.freeze) f.freeze = 4; }
      for (const p of W.peds) if (!p.ko && hitCirc(p.x, p.y, 14)) this.damagePed(p, w.freeze ? 40 : this.dmgOf(w), 'p');
      for (const v of W.cars.slice()) if (!v.dead && v !== W.P.car && hitCirc(v.x, v.y, v.wid)) this.damageVehicle(v, this.dmgOf(w) * 1.4, 'p');
      if (OG.MP && OG.MP.active) OG.MP.beamHit && OG.MP.beamHit(x, y, a, len, w);
    },
    spawnRemoteBullet(m) {
      const w = WEAPONS[m.w] || WEAPONS.pistol; const a = m.a, owner = 'r:' + m.id;
      this.fx.push({ t: 0, life: .08, k: 'flash', x: m.x, y: m.y, a, col: w.col });
      if (w.hitscan) { this.beam(w, m.x - Math.cos(a) * 18, m.y - Math.sin(a) * 18, a, owner); return; }
      const n = w.pellets || 1; for (let i = 0; i < n; i++) { const aa = a + (Math.random() - .5) * 2 * w.spread; this.bullets.push({ x: m.x, y: m.y, vx: Math.cos(aa) * w.speed, vy: Math.sin(aa) * w.speed, left: w.range, dmg: w.dmg * (1 + (m.pw || 0) * .04), owner, col: w.col, ex: w.explosive || 0, a: aa, rock: !!w.explosive }); }
    },

    /* ---------------- bullets ---------------- */
    updateBullets(dt) {
      const W = this.W, P = this.P;
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i]; const step = Math.hypot(b.vx, b.vy) * dt; const n = Math.max(1, Math.ceil(step / 14)); let dead = false;
        for (let s = 0; s < n && !dead; s++) {
          b.x += b.vx * dt / n; b.y += b.vy * dt / n; b.left -= step / n;
          if (b.left <= 0) { dead = true; if (b.ex) this.explode(b.x, b.y, b.ex, b.dmg, b.owner); break; }
          for (const sd of W.solidsNear(b.x, b.y, 3)) { if (SOLID_BLOCK.has(sd.kind) && b.x > sd.x && b.x < sd.x + sd.w && b.y > sd.y && b.y < sd.y + sd.h) { dead = true; this.spark(b.x, b.y, b.col); if (b.ex) this.explode(b.x, b.y, b.ex, b.dmg, b.owner); break; } }
          if (dead) break;
          if (b.owner === 'p') {
            for (const f of this.foes) if (OG.dist(b.x, b.y, f.x, f.y) < 14) { if (b.ex) this.explode(b.x, b.y, b.ex, b.dmg, 'p'); else this.damageFoe(f, b.dmg, 'p'); dead = true; this.spark(b.x, b.y, '#fff'); break; }
            if (dead) break;
            for (const p of W.peds) if (!p.ko && OG.dist(b.x, b.y, p.x, p.y) < 11) { if (b.ex) this.explode(b.x, b.y, b.ex, b.dmg, 'p'); else this.damagePed(p, b.dmg, 'p'); dead = true; this.spark(b.x, b.y, '#fff'); break; }
            if (dead) break;
            for (const v of W.cars) if (!v.dead && v !== P.car && OG.dist(b.x, b.y, v.x, v.y) < v.wid * .8 + 6) { if (b.ex) this.explode(b.x, b.y, b.ex, b.dmg, 'p'); else this.damageVehicle(v, b.dmg * .8, 'p'); if (v.ai) { v.panic = 4; } dead = true; this.spark(b.x, b.y, '#ffd166'); break; }
          } else {
            const o = P.car || P; if (!P.dead && OG.dist(b.x, b.y, o.x, o.y) < (P.car ? P.car.wid * .8 + 4 : 12)) { if (b.ex) this.explode(b.x, b.y, b.ex, b.dmg, b.owner); else this.hurtPlayer(b.dmg * (b.owner === 'f' || b.owner === 'c' ? this.foeScale() : 1), b.owner, b.owner); dead = true; this.spark(b.x, b.y, '#ff4d6d'); }
          }
        }
        if (dead) this.bullets.splice(i, 1);
        else if (b.rock && Math.random() < .5) this.fx.push({ t: 0, life: .35, k: 'smoke', x: b.x, y: b.y, vx: rnd(-10, 10), vy: rnd(-10, 10) });
      }
    },
    foeScale() { return 1 + OG.state.power() * .015; },
    spark(x, y, col) { for (let i = 0; i < 4; i++) this.W.parts.push({ x, y, vx: rnd(-120, 120), vy: rnd(-120, 120), t: 0, life: .25, c: col, r: 2 }); },
    explode(x, y, r, dmg, owner) {
      const W = this.W, P = this.P; OG.snd.play('boom'); this.bigFx(x, y, r, '#ffb703'); W.shake = Math.max(W.shake || 0, .55);
      const isP = owner === 'p';
      if (isP || owner === 'f' || owner === 'c' || owner === 'v') {
        for (const f of this.foes.slice()) { const d = OG.dist(x, y, f.x, f.y); if (d < r && (isP || owner === 'v')) this.damageFoe(f, dmg * (1 - d / r * .6), isP ? 'p' : 'v'); }
        for (const p of W.peds) { const d = OG.dist(x, y, p.x, p.y); if (d < r && !p.ko) this.damagePed(p, dmg * (1 - d / r * .6), isP ? 'p' : 'v'); }
        for (const v of W.cars.slice()) { const d = OG.dist(x, y, v.x, v.y); if (d < r + 20 && !v.dead && v.exploding !== true) this.damageVehicle(v, dmg * .9 * (1 - d / (r + 20) * .5), isP ? 'p' : 'v'); }
      }
      const o = P.car || P, d = OG.dist(x, y, o.x, o.y); if (d < r && !P.dead) { const mult = isP ? .35 : 1; this.hurtPlayer(dmg * (1 - d / r * .6) * mult, owner); if (!P.car) { P.vx += (P.x - x) / (d + 1) * 600; P.vy += (P.y - y) / (d + 1) * 600; } }
    },
    bigFx(x, y, r, col) { this.fx.push({ t: 0, life: .55, k: 'boom', x, y, r, col }); for (let i = 0; i < 16; i++) this.W.parts.push({ x, y, vx: rnd(-r * 2, r * 2), vy: rnd(-r * 2, r * 2), t: 0, life: rnd(.4, .9), c: pick(['#ffb703', '#fb8500', '#ff4d6d', '#ffd166']), r: rnd(3, 7), g: 0 }); },

    /* ---------------- targets taking damage ---------------- */
    damagePed(p, dmg, src) {
      if (p.ko > 0) return; p.hp -= dmg; p.panic = 6; this.W.floatText(p.x, p.y - 14, Math.ceil(dmg), '#fff');
      if (src === 'p') this.addHeat(p.hp <= 0 ? 14 : 4);
      if (p.hp <= 0) { p.ko = 9; OG.state.data.stats.ko++; this.dropAt(p.x, p.y, 'cash', Math.round(rnd(6, 22))); if (Math.random() < .3) this.dropAt(p.x + 10, p.y, 'health', 15); if (src === 'p') { this.addHeat(10); OG.Ach && OG.Ach.check(); } for (let i = 0; i < 6; i++) this.W.parts.push({ x: p.x, y: p.y, vx: rnd(-80, 80), vy: rnd(-90, -10), t: 0, life: .7, c: '#fde047', r: 3, g: 120 }); }
    },
    damageFoe(f, dmg, src) {
      if (f.dead) return; f.hp -= dmg; f.hit = .15; this.W.floatText(f.x, f.y - 18, Math.ceil(dmg), f.cop ? '#93c5fd' : '#fbbf24');
      if (f.cop && src === 'p') this.addHeat(f.hp <= 0 ? 40 : 14);
      if (f.hp <= 0) this.killFoe(f, src); else if (!f.aggro) f.aggro = 8;
    },
    killFoe(f, src) {
      f.dead = true; const i = this.foes.indexOf(f); if (i >= 0) this.foes.splice(i, 1); if (f.blk) f.blk.n--;
      const d = OG.state.data; if (src === 'p') { d.stats.kills++; OG.Ach && OG.Ach.check(); OG.Missions && OG.Missions.onKill(f); }
      const m = 1 + this.perk('cash'); this.dropAt(f.x, f.y, 'cash', Math.round((f.cop ? 25 : 18) * rnd(.8, 1.6) * (1 + OG.state.power() * .05) * m)); if (Math.random() < .35) this.dropAt(f.x + 12, f.y, 'ammo', 1); if (Math.random() < .25) this.dropAt(f.x - 12, f.y, 'health', 20);
      this.bigFx(f.x, f.y, 26, '#fde047'); OG.snd.play('pop');
    },
    damageVehicle(v, dmg, src) {
      if (v.dead || v.exploding) return; if (dmg > 0) { v.hp -= dmg; if (v.ai && v.hp < v.maxhp * .8) { v.panic = 4; } if (src === 'p' && (v.ai && !v.cop)) this.addHeat(3); if (src === 'p' && v.cop) this.addHeat(20); }
      if (v.hp > 0) return; v.exploding = true; v.dead = true; const P = this.P; v.burn = 2;
      this.explode(v.x, v.y, 110, 70, v === P.car ? 'v' : (src === 'p' ? 'p' : 'v'));
      if (v === P.car) { P.car = null; v.driver = null; P.x = v.x; P.y = v.y - 30; this.W.resolveCircle(P, 11); P.inv = 1.5; P.vy = -300; OG.toast('💥 הרכב התפוצץ!', 'bad'); }
      if (v.owned) { const o = v.owned; setTimeout(() => { this.W.spawnOwned(); }, 60000); }
      if (v.cop) { OG.state.data.stats.kills++; this.dropAt(v.x, v.y, 'cash', 40); this.copCars = Math.max(0, (this.copCars || 1) - 1); }
      this.dropAt(v.x + 14, v.y, 'cash', Math.round(rnd(8, 20)));
    },
    runOver(v) {
      const W = this.W, sp = Math.hypot(v.vx, v.vy); if (sp < 130) return;
      for (const p of W.peds) { if (p.ko > 0) continue; if (OG.dist(v.x, v.y, p.x, p.y) < v.wid * .5 + 10) { this.damagePed(p, sp / 7, 'p'); p.x += v.vx * .02; p.y += v.vy * .02; } }
      for (const f of this.foes.slice()) if (OG.dist(v.x, v.y, f.x, f.y) < v.wid * .5 + 12) this.damageFoe(f, sp / 6, 'p');
    },

    /* ---------------- drops ---------------- */
    dropAt(x, y, type, v) { this.W.drops.push({ x: x + rnd(-8, 8), y: y + rnd(-8, 8), type, v, ttl: 25 }); },
    pickDrop(d) {
      const P = this.P, W = this.W, S = OG.state.data;
      if (d.type === 'cash') { const amt = Math.round(d.v * (1 + this.perk('cash'))); OG.state.addCash(amt); W.floatText(d.x, d.y - 10, '+' + amt + ' 💵', '#4ade80'); OG.snd.play('coin'); }
      else if (d.type === 'health') { this.heal(d.v || 20); OG.snd.play('power'); }
      else { const o = this.owned(); const w = (S.weapons[S.wsel] !== undefined ? S.wsel : o[0]); const add = Math.round(WEAPONS[w].pack[0] * .5 * this.perk('ammo')); S.weapons[w] = (S.weapons[w] || 0) + add; W.floatText(d.x, d.y - 10, '+' + add + ' ' + WEAPONS[w].icon, '#fbbf24'); OG.snd.play('click'); this.hudWeapon(); }
    },
    applyPowerup(t) {
      const P = this.P, S = OG.state.data; OG.snd.play('power');
      const say = m => OG.toast(m, 'good');
      if (t === 'turbo') { P.boost = 10; say('⚡ טורבו! מהירות מוגברת ל-10 שניות'); }
      else if (t === 'health') { this.heal(45); say('❤️ נאסף חבילת בריאות'); }
      else if (t === 'armor') { P.armor = Math.min(100, P.armor + 50); say('🛡️ שריון +50'); }
      else if (t === 'ammo') { for (const w of this.owned()) S.weapons[w] += Math.round(WEAPONS[w].pack[0] * .6 * this.perk('ammo')); say('🔫 תחמושת לכל הנשקים'); this.hudWeapon(); }
      else if (t === 'magnet') { P.magnet = 25; say('🧲 מגנט: מושך מטבעות ושלל ל-25 שניות'); }
      else if (t === 'star') { P.inv = 9; say('⭐ בלתי פגיע ל-9 שניות!'); }
      else if (t === 'ghost') { P.ghost = 18; this.heat = 0; this.setStars(0); say('👻 רוח רפאים: המשטרה מאבדת אתכם (18 שנ׳)'); }
      else if (t === 'double') { P.dbl = 18; say('💥 נזק כפול ל-18 שניות'); }
    },

    /* ---------------- abilities ---------------- */
    ready(n, need) { if (!this.has(need)) { OG.toast('🔒 היכולת הזאת נפתחת אחרי השלמת פרק ' + OG.chById(need).num + ' (' + OG.chById(need).title + ')', 'warn'); return false; } if (this.cd[n] > 0) return false; return !this.P.dead; },
    dash() { if (!this.ready('dash', 'ch1') || this.P.car) return; const P = this.P; this.cd.dash = 5; P.dashT = .18; P.dashA = Math.hypot(P.vx, P.vy) > 20 ? Math.atan2(P.vy, P.vx) : P.aim; P.inv = Math.max(P.inv || 0, .25); OG.snd.play('whoosh'); },
    pulse() {
      if (!this.ready('pulse', 'ch2')) return; const P = this.P, W = this.W; this.cd.pulse = 11; OG.snd.play('boom'); this.fx.push({ t: 0, life: .7, k: 'pulse', x: P.x, y: P.y, r: 230, col: '#22d3ee' });
      const dm = 28 * (1 + this.perk('dmg'));
      for (const f of this.foes.slice()) { const d = OG.dist(P.x, P.y, f.x, f.y); if (d < 230) { this.damageFoe(f, dm, 'p'); f.vx = (f.x - P.x) / (d + 1) * 500; f.vy = (f.y - P.y) / (d + 1) * 500; f.stun = 1.2; } }
      for (const p of W.peds) if (OG.dist(P.x, P.y, p.x, p.y) < 230 && !p.ko) { p.panic = 5; }
      if (OG.MP && OG.MP.active) OG.MP.sendFx('pulse', P.x, P.y);
    },
    ping() { if (!this.ready('ping', 'ch3')) return; this.cd.ping = 18; this.pingT = 8; OG.snd.play('power'); OG.toast('📡 Hello Ping: אויבים ושחקנים מסומנים ל-8 שניות', 'good'); },
    shield() { if (!this.ready('shield', 'ch8')) return; this.cd.shield = 36; this.P.shield = 4.5; OG.snd.play('power'); OG.toast('🧱 חומת אש: בלתי פגיע ל-4.5 שניות', 'good'); },

    /* ---------------- update ---------------- */
    update(dt) {
      const P = this.P, W = this.W;
      this.recalc();
      for (const k in this.cd) if (this.cd[k] > 0) this.cd[k] -= dt;
      for (const k of ['inv', 'shield', 'ghost', 'magnet', 'dbl', 'slow']) if (P[k] > 0) P[k] -= dt;
      if (this.pingT > 0) this.pingT -= dt;
      if (P.dead) { this.deadT -= dt; if (this.deadT <= 0) this.respawn(); }
      else {
        if (this.perk('regen') && P.armor < 50 && this.W.time - this.lastHurt > 3) P.armor = Math.min(50, P.armor + dt * 4);
        if (P.hp < P.maxHp && this.W.time - this.lastHurt > 8) P.hp = Math.min(P.maxHp, P.hp + dt * 1.2);
        this.tryFire(dt);
      }
      OG.Missions && !P.dead && OG.Missions.update(dt); this.updateBullets(dt); this.updateFx(dt); this.updateGangs(dt); this.updatePolice(dt); this.updateFoes(dt);
      // heat decay
      if (this.stars > 0 || this.heat > 0) { const rate = this.copSeen ? .5 : 5; this.heat = Math.max(0, this.heat - rate * dt); const s = STAR_AT.filter(t => this.heat >= t).length; if (s < this.stars) { this.setStars(s); if (s === 0) OG.toast('😮‍💨 הצלחת לברוח מהמשטרה!', 'good'); } }
      this.updateHud();
    },
    updateFx(dt) { for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t += dt; if (f.vx) { f.x += f.vx * dt; f.y += f.vy * dt; } if (f.t > f.life) this.fx.splice(i, 1); } },

    /* ---------------- foes (gangs + police) ---------------- */
    mkFoe(type, x, y, blk) {
      const cop = type !== 'gang'; const hp = (type === 'gang' ? 55 : type === 'cop' ? 50 : 120) * (1 + OG.state.power() * .05);
      return { id: Math.random(), type, cop, x, y, vx: 0, vy: 0, hp, maxhp: hp, face: rnd(0, TWO), cool: rnd(.5, 1.5), blk, home: blk ? { x: blk.x + blk.w / 2, y: blk.y + blk.h / 2 } : null, aggro: 0, ph: 0, wander: { x, y }, stun: 0, freeze: 0, hit: 0, w: type === 'swat' ? WEAPONS.smg : WEAPONS.pistol };
    },
    freeSpot(blk, tries = 10) { for (let t = 0; t < tries; t++) { const x = blk.x + 40 + Math.random() * (blk.w - 80), y = blk.y + 40 + Math.random() * (blk.h - 80); if (!this.W.solidsNear(x, y, 16).some(s => s.kind !== 'water' && x > s.x - 14 && x < s.x + s.w + 14 && y > s.y - 14 && y < s.y + s.h + 14)) return [x, y]; } return null; },
    updateGangs(dt) {
      const W = this.W, P = this.P; this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnT = 1.1;
        for (const b of W.gen.gangBlocks) { const cx = b.x + b.w / 2, cy = b.y + b.h / 2; if (OG.dist(cx, cy, P.x, P.y) > 1500) continue; b.n = b.n || 0; if (b.n < 5 + Math.min(3, Math.floor(OG.state.power() / 4))) { const sp = this.freeSpot(b); if (sp && OG.dist(sp[0], sp[1], P.x, P.y) > 260) { const f = this.mkFoe('gang', sp[0], sp[1], b); this.foes.push(f); b.n++; } } }
      }
      for (let i = this.foes.length - 1; i >= 0; i--) { const f = this.foes[i]; if (f.type === 'gang' && OG.dist(f.x, f.y, P.x, P.y) > 2200) { if (f.blk) f.blk.n--; this.foes.splice(i, 1); } }
    },
    updatePolice(dt) {
      const W = this.W, P = this.P; const o = P.car || P;
      // copSeen
      this.copSeen = false;
      for (const f of this.foes) if (f.cop && OG.dist(f.x, f.y, o.x, o.y) < 520 && !W.rayBlocked(f.x, f.y, o.x, o.y)) { this.copSeen = true; break; }
      for (const v of W.cars) if (v.cop && OG.dist(v.x, v.y, o.x, o.y) < 560) this.copSeen = true;
      const s = this.stars; this.polT = (this.polT || 0) - dt;
      if (s > 0 && this.polT <= 0 && !P.dead) {
        this.polT = 2.2;
        const feet = this.foes.filter(f => f.type === 'cop').length, swats = this.foes.filter(f => f.type === 'swat').length, cars = W.cars.filter(c => c.cop && !c.dead).length;
        const wantFeet = Math.min(7, 1 + s * 1.3 | 0), wantCars = s >= 2 ? Math.min(4, s) : 0, wantSwat = s >= 4 ? s - 2 : 0;
        const ang = () => rnd(0, TWO), spot = (r0, r1) => { for (let t = 0; t < 8; t++) { const a = ang(), r = rnd(r0, r1), x = o.x + Math.cos(a) * r, y = o.y + Math.sin(a) * r; if (x < W.gen.bounds.x0 + 100 || x > W.gen.bounds.x1 - 100 || y < W.gen.bounds.y0 + 100 || y > W.gen.bounds.y1 - 600 || W.isWater(x, y)) continue; if (!W.solidsNear(x, y, 16).some(q => q.kind !== 'water' && x > q.x - 14 && x < q.x + q.w + 14 && y > q.y - 14 && y < q.y + q.h + 14)) return [x, y]; } return null; };
        if (feet < wantFeet) { const sp = spot(650, 950); if (sp) this.foes.push(this.mkFoe('cop', sp[0], sp[1])); }
        if (swats < wantSwat) { const sp = spot(750, 1000); if (sp) this.foes.push(this.mkFoe('swat', sp[0], sp[1])); }
        if (cars < wantCars) { const sp = spot(800, 1100); if (sp) { const v = OG.makeVehicle('police', sp[0], sp[1], rnd(0, TWO), '#1d4ed8'); v.cop = true; v.ai = true; v.parked = false; v.siren = true; v.max = 380 + s * 25; this.W.cars.push(v); OG.snd.play('siren'); } }
      }
      // police cars chase
      for (const v of W.cars) {
        if (!v.cop || v.dead) continue;
        if (this.stars === 0) { v.leave = true; }
        const tx = v.leave ? v.x + 1000 : o.x, ty = v.leave ? v.y : o.y; const dx = tx - v.x, dy = ty - v.y, d = Math.hypot(dx, dy);
        if (OG.dist(v.x, v.y, W.cam.x, W.cam.y) > 2000 || (v.leave && d > 0 && OG.dist(v.x, v.y, o.x, o.y) > 900)) { v.dead = true; continue; }
        let da = Math.atan2(dy, dx) - v.a; while (da > Math.PI) da -= TWO; while (da < -Math.PI) da += TWO; v.a += OG.clamp(da, -2.6 * dt, 2.6 * dt);
        const want = d < 80 ? 80 : v.max; const sp = Math.hypot(v.vx, v.vy); const ns = sp + OG.clamp(want - sp, -400 * dt, 320 * dt);
        const ox = v.x, oy = v.y; v.vx = Math.cos(v.a) * ns; v.vy = Math.sin(v.a) * ns; v.x += v.vx * dt; v.y += v.vy * dt;
        const ob = { x: v.x, y: v.y }; if (W.resolveCircle(ob, 12)) { v.x = ob.x; v.y = ob.y; v.stuck += dt; v.a += dt * 3; } else v.stuck = Math.max(0, v.stuck - dt);
        if (v.stuck > 2.4) { v.stuck = 0; const a = rnd(0, TWO); v.x = o.x + Math.cos(a) * 700; v.y = o.y + Math.sin(a) * 700; }
        // ram the player's vehicle / shoot occasionally
        if (P.car && OG.dist(v.x, v.y, P.car.x, P.car.y) < 34) { this.damageVehicle(P.car, 6 * dt * 10, 'c'); P.car.vx *= .96; P.car.vy *= .96; }
        v.shootT = (v.shootT || 1) - dt; if (v.shootT <= 0 && d < 420 && !W.rayBlocked(v.x, v.y, o.x, o.y)) { v.shootT = 1.4; this.shoot(WEAPONS.pistol, v.x, v.y, Math.atan2(dy, dx) + rnd(-.1, .1), 'c'); }
        if (!v.siren) v.siren = true;
      }
      // busted
      if (!P.dead && this.stars > 0) {
        const slow = Math.hypot(o.vx || 0, o.vy || 0) < 70; const near = this.foes.filter(f => f.cop && OG.dist(f.x, f.y, o.x, o.y) < 46).length;
        if (slow && near >= 2) { this.bust += dt; if (this.bust > 2.2) this.busted(); } else this.bust = Math.max(0, this.bust - dt);
      } else this.bust = 0;
    },
    busted() {
      const P = this.P, W = this.W; this.bust = 0; const lose = Math.floor(OG.state.data.cash * .15); OG.state.addCash(-lose);
      const pd = W.doors.find(d => d.svc === 'police') || { x: W.gen.spawn.x, y: W.gen.spawn.y };
      if (P.car) { P.car.driver = null; P.car.parked = true; P.car = null; }
      P.x = pd.x; P.y = pd.y + 70; P.vx = P.vy = 0; W.cam.x = P.x; W.cam.y = P.y; P.inv = 2; this.foes = this.foes.filter(f => !f.cop); this.setStars(0); this.heat = 0;
      OG.toast(`🚔 נעצרת! שילמת קנס 💵 ${lose}`, 'bad'); OG.snd.play('lose'); OG.state.data.stats.busted = (OG.state.data.stats.busted || 0) + 1;
    },
    updateFoes(dt) {
      const W = this.W, P = this.P, o = P.car || P;
      for (const f of this.foes) {
        f.ph += dt * 8; if (f.hit > 0) f.hit -= dt; f.cool -= dt;
        if (f.freeze > 0) { f.freeze -= dt; continue; } if (f.stun > 0) { f.stun -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= .9; f.vy *= .9; W.resolveCircle(f, 10); continue; }
        const d = OG.dist(f.x, f.y, o.x, o.y); const ghost = P.ghost > 0 && f.cop; const safe = this.safe();
        const sees = !ghost && !P.dead && !safe && d < (f.cop ? 640 : 520) && !W.rayBlocked(f.x, f.y, o.x, o.y);
        if (f.cop && this.stars === 0) { f.leave = true; }
        if (f.aggro > 0) f.aggro -= dt;
        let tx = f.wander.x, ty = f.wander.y, spd = 60, shoot = false;
        if (f.leave) { tx = f.x + (f.x - o.x); ty = f.y + (f.y - o.y); spd = 90; if (d > 1000) f.dead = true; }
        else if (f.cop && !ghost && !P.dead) { tx = o.x; ty = o.y; spd = f.type === 'swat' ? 125 : 140; if (sees && d < 280) { spd = 60; shoot = true; } if (d < 40) spd = 0; }
        else if (!f.cop && (sees || f.aggro > 0) && !P.dead) { tx = o.x; ty = o.y; spd = 95; if (sees && d < 330) { spd = 40; shoot = true; } if (d > 480 && f.aggro <= 0) { tx = f.wander.x; ty = f.wander.y; } }
        else { if (OG.dist(f.x, f.y, f.wander.x, f.wander.y) < 14 || Math.random() < dt * .1) { const b = f.blk; if (b) { const sp = this.freeSpot(b, 3); if (sp) f.wander = { x: sp[0], y: sp[1] }; } else f.wander = { x: f.x + rnd(-200, 200), y: f.y + rnd(-200, 200) }; } }
        const dx = tx - f.x, dy = ty - f.y, dd = Math.hypot(dx, dy) || 1; f.vx = dx / dd * spd; f.vy = dy / dd * spd; f.x += f.vx * dt; f.y += f.vy * dt;
        if (W.resolveCircle(f, 10)) { f.wander = { x: f.x + rnd(-160, 160), y: f.y + rnd(-160, 160) }; f.x += rnd(-1, 1); }
        f.face = shoot ? Math.atan2(o.y - f.y, o.x - f.x) : Math.atan2(f.vy, f.vx);
        if (shoot && f.cool <= 0) { f.cool = (f.type === 'swat' ? .22 : 1.1) * rnd(.8, 1.5); this.shoot({ ...f.w, dmg: (f.cop ? 4.5 : 6) }, f.x, f.y, f.face + rnd(-.16, .16), f.cop ? 'c' : 'f'); }
        // melee push away from player
        if (f.cop && d < 22 && !P.car) { /* handled by bust timer */ }
      }
      this.foes = this.foes.filter(f => !f.dead);
    },

    /* ---------------- drawing ---------------- */
    drawFoes(c, vis) {
      const W = this.W, t = W.time, pinged = this.pingT > 0;
      for (const f of this.foes) {
        if (!vis(f.x, f.y)) continue;
        const col = f.type === 'gang' ? '#7f1d1d' : f.type === 'cop' ? '#1e40af' : '#111827';
        c.save(); if (f.freeze > 0) c.globalAlpha = .8;
        W.drawPed(c, f.x, f.y, f.face, f.ph, f.hit > 0 ? '#fff' : col, '#e8c7a0', f.cop ? '#0b1230' : '#450a0a', 1.15);
        c.translate(f.x, f.y); c.rotate(f.face); c.fillStyle = '#222'; c.fillRect(8, -2, 13, 4); c.fillStyle = f.cop ? '#93c5fd' : '#ef4444'; c.fillRect(19, -1.5, 3, 3); c.restore();
        if (f.freeze > 0) { c.font = `14px ${EMOJI}`; c.textAlign = 'center'; c.fillText('❄️', f.x, f.y - 20); }
        if (f.cop) { c.font = `13px ${EMOJI}`; c.textAlign = 'center'; c.fillText('👮', f.x, f.y - 20); }
        if (f.hp < f.maxhp || pinged || this.has('ch7')) { const w = 26; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(f.x - w / 2, f.y - 26, w, 4); c.fillStyle = f.cop ? '#60a5fa' : '#f87171'; c.fillRect(f.x - w / 2, f.y - 26, w * Math.max(0, f.hp / f.maxhp), 4); }
        if (pinged) { c.strokeStyle = '#fbbf24'; c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, 18 + Math.sin(t * 6) * 2, 0, TWO); c.stroke(); }
      }
      // police helicopter at 5 stars
      if (this.stars >= 5 && !this.P.dead) { const o = this.P.car || this.P; const hx = o.x + Math.cos(t * .6) * 160, hy = o.y + Math.sin(t * .6) * 120 - 60; this.heli = { x: hx, y: hy }; c.save(); c.translate(hx, hy); c.fillStyle = 'rgba(0,0,12,.25)'; c.beginPath(); c.ellipse(14, 24, 30, 12, 0, 0, TWO); c.fill(); c.fillStyle = '#1e3a8a'; c.beginPath(); c.ellipse(0, 0, 26, 12, 0, 0, TWO); c.fill(); c.fillStyle = '#93c5fd'; c.beginPath(); c.ellipse(10, 0, 9, 7, 0, 0, TWO); c.fill(); c.strokeStyle = 'rgba(220,230,255,.85)'; c.lineWidth = 4; c.save(); c.rotate(t * 28); c.beginPath(); c.moveTo(-42, 0); c.lineTo(42, 0); c.moveTo(0, -42); c.lineTo(0, 42); c.stroke(); c.restore(); c.restore(); c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(o.x, o.y, 4, o.x, o.y, 90); g.addColorStop(0, 'rgba(255,255,220,.4)'); g.addColorStop(1, 'rgba(255,255,220,0)'); c.fillStyle = g; c.beginPath(); c.arc(o.x, o.y, 90, 0, TWO); c.fill(); c.restore(); this.heliT = (this.heliT || 1) - 1 / 60; if (this.heliT <= 0 && !this.safe()) { this.heliT = 1.2; this.shoot({ ...WEAPONS.smg, dmg: 5 }, hx, hy, Math.atan2(o.y - hy, o.x - hx) + rnd(-.2, .2), 'c'); } } else this.heli = null;
    },
    drawFx(c, vis) {
      OG.Missions && OG.Missions.draw(c, vis);
      for (const b of this.bullets) { if (!vis(b.x, b.y)) continue; const L = b.rock ? 18 : 14; c.save(); c.translate(b.x, b.y); c.rotate(b.a); c.globalCompositeOperation = 'lighter'; c.strokeStyle = b.col; c.lineWidth = b.rock ? 5 : 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(-L, 0); c.lineTo(0, 0); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-L * .4, 0); c.lineTo(0, 0); c.stroke(); c.restore(); }
      for (const f of this.fx) {
        const p = f.t / f.life; if (!vis(f.x, f.y, 300)) continue; c.save(); c.globalCompositeOperation = 'lighter';
        if (f.k === 'flash') { c.translate(f.x, f.y); c.rotate(f.a); const g = c.createRadialGradient(0, 0, 1, 0, 0, 24); g.addColorStop(0, '#fff'); g.addColorStop(.4, f.col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = 1 - p; c.fillStyle = g; c.beginPath(); c.arc(6, 0, 24, 0, TWO); c.fill(); }
        else if (f.k === 'beam') { c.translate(f.x, f.y); c.rotate(f.a); c.globalAlpha = 1 - p; c.strokeStyle = f.col; c.lineWidth = 7 * (1 - p) + 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(18, 0); c.lineTo(f.len, 0); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); }
        else if (f.k === 'boom') { c.globalAlpha = 1 - p; const r = f.r * (.3 + p * .9); const g = c.createRadialGradient(f.x, f.y, 2, f.x, f.y, r); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.3, 'rgba(255,190,60,.8)'); g.addColorStop(.7, 'rgba(255,70,20,.35)'); g.addColorStop(1, 'rgba(255,70,20,0)'); c.fillStyle = g; c.beginPath(); c.arc(f.x, f.y, r, 0, TWO); c.fill(); c.strokeStyle = 'rgba(255,220,140,' + (1 - p) + ')'; c.lineWidth = 4; c.beginPath(); c.arc(f.x, f.y, f.r * p * 1.1, 0, TWO); c.stroke(); }
        else if (f.k === 'pulse') { c.globalAlpha = 1 - p; c.strokeStyle = f.col; c.lineWidth = 8 * (1 - p) + 2; c.beginPath(); c.arc(f.x, f.y, f.r * p, 0, TWO); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, f.r * p * .96, 0, TWO); c.stroke(); }
        else if (f.k === 'smoke') { c.globalCompositeOperation = 'source-over'; c.globalAlpha = (1 - p) * .5; c.fillStyle = '#aab'; c.beginPath(); c.arc(f.x + (f.vx || 0) * f.t, f.y + (f.vy || 0) * f.t, 3 + p * 6, 0, TWO); c.fill(); }
        c.restore();
      }
    },
    drawHeldWeapon(c) {
      const P = this.P, w = this.weapon(); if (P.car) return; c.save(); c.translate(P.x, P.y); c.rotate(P.face);
      c.fillStyle = '#2b2f3a'; if (w === WEAPONS.rocket) { c.fillStyle = '#4b5563'; c.fillRect(-4, -3, 24, 6); c.fillStyle = '#ef4444'; c.fillRect(18, -3, 4, 6); } else if (w === WEAPONS.shotgun) { c.fillRect(2, -2, 20, 4); c.fillStyle = '#8b5a2b'; c.fillRect(2, -2, 8, 4); } else if (w === WEAPONS.smg) { c.fillRect(4, -2.5, 16, 5); c.fillRect(8, 2, 4, 6); } else if (w === WEAPONS.laser || w === WEAPONS.freeze) { c.fillStyle = '#0ea5e9'; c.fillRect(4, -3, 16, 6); c.fillStyle = w.col; c.fillRect(18, -1.5, 5, 3); } else { c.fillRect(6, -2, 12, 4); }
      c.restore();
    },
    drawOverlay(c) {
      const W = this.W, P = this.P;
      if (OG.state.data.settings.rain) { const t = W.time, cx = W.cam.x, cy = W.cam.y, hw = innerWidth / 2 / W.cam.z + 40, hh = innerHeight / 2 / W.cam.z + 40; c.save(); c.strokeStyle = 'rgba(170,200,255,.45)'; c.lineWidth = 1.5; c.beginPath(); for (let i = 0; i < 160; i++) { const sx = ((i * 97.3 + t * 90) % (hw * 2)) - hw, sy = ((i * 61.7 + t * 900) % (hh * 2)) - hh; c.moveTo(cx + sx, cy + sy); c.lineTo(cx + sx - 4, cy + sy + 16); } c.stroke(); c.fillStyle = 'rgba(8,16,40,.18)'; c.fillRect(cx - hw, cy - hh, hw * 2, hh * 2); c.restore(); } if (P.dead || P.car || W.touch || !P.aiming) return; const m = W.mouse; const w = W.screenToWorld(m.sx, m.sy); const wp = this.weapon();
      c.save(); c.strokeStyle = this.safe() ? 'rgba(52,211,153,.5)' : 'rgba(255,255,255,.28)'; c.setLineDash([4, 8]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(P.x + Math.cos(P.aim) * 20, P.y + Math.sin(P.aim) * 20); c.lineTo(w.x, w.y); c.stroke(); c.setLineDash([]);
      c.strokeStyle = this.safe() ? '#34d399' : wp.col; c.lineWidth = 2; c.beginPath(); c.arc(w.x, w.y, 9, 0, TWO); c.moveTo(w.x - 14, w.y); c.lineTo(w.x - 5, w.y); c.moveTo(w.x + 14, w.y); c.lineTo(w.x + 5, w.y); c.moveTo(w.x, w.y - 14); c.lineTo(w.x, w.y - 5); c.moveTo(w.x, w.y + 14); c.lineTo(w.x, w.y + 5); c.stroke(); c.restore();
    },
    minimapDots() {
      const out = []; for (const f of this.foes) { if (f.cop) out.push({ x: f.x, y: f.y, c: '#60a5fa', r: 3 }); else if (this.pingT > 0 || OG.dist(f.x, f.y, this.P.x, this.P.y) < 700) out.push({ x: f.x, y: f.y, c: '#f87171', r: 3 }); }
      for (const v of this.W.cars) if (v.cop) out.push({ x: v.x, y: v.y, c: '#3b82f6', r: 4 });
      return out;
    },

    /* ---------------- HUD ---------------- */
    buildHud() {
      const hud = document.getElementById('hud'), el = OG.el;
      const ov = el('div#deadOv.hidden', { style: { position: 'fixed', inset: 0, background: 'radial-gradient(circle,rgba(127,29,29,.45),rgba(20,0,0,.85))', zIndex: 25, display: 'grid', placeItems: 'center', pointerEvents: 'none', fontSize: '54px', fontWeight: 900, textShadow: '0 0 30px #ef4444' } }, el('div', { html: '💀 נפלת!<div style="font-size:20px;font-weight:600;text-align:center;margin-top:8px">מתעוררים בבית החולים…</div>' }));
      document.body.append(ov);
      const box = el('div#chud', { style: { position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', pointerEvents: 'none' } });
      this.dom = {};
      const bar = (col) => { const o = el('div', { style: { width: '220px', height: '14px', borderRadius: '8px', background: 'rgba(0,0,0,.6)', border: '1px solid #2b3a6e', overflow: 'hidden', position: 'relative' } }); const i = el('i', { style: { display: 'block', height: '100%', width: '100%', background: col, transition: 'width .15s' } }); const t = el('span', { style: { position: 'absolute', inset: 0, textAlign: 'center', fontSize: '11px', fontWeight: 800, lineHeight: '14px' } }); o.append(i, t); return { o, i, t }; };
      this.dom.hp = bar('linear-gradient(90deg,#ef4444,#f87171)'); this.dom.ar = bar('linear-gradient(90deg,#3b82f6,#93c5fd)'); this.dom.ar.o.style.height = '9px'; this.dom.ar.t.style.lineHeight = '9px'; this.dom.ar.t.style.fontSize = '8px';
      this.dom.wp = el('div.chip', { style: { fontFamily: 'var(--mono)' } }); this.dom.sl = el('div', { style: { display: 'flex', gap: '4px' } });
      this.dom.ab = el('div', { style: { display: 'flex', gap: '6px' } });
      const defs = [['dash', 'Q', '💨', 'ch1'], ['pulse', 'R', '🌊', 'ch2'], ['ping', 'C', '📡', 'ch3'], ['shield', 'X', '🧱', 'ch8']]; this.dom.abs = {};
      defs.forEach(([k, key, ic, ch]) => { const b = el('div', { style: { width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(10,16,36,.85)', border: '1px solid #2b3a6e', display: 'grid', placeItems: 'center', fontSize: '20px', position: 'relative', overflow: 'hidden' } }, ic, el('b', { style: { position: 'absolute', top: '1px', right: '4px', fontSize: '10px', color: '#22d3ee' }, text: key })); const cdo = el('i', { style: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '0%', background: 'rgba(0,0,0,.7)' } }); b.append(cdo); this.dom.abs[k] = { b, cdo, ch }; this.dom.ab.append(b); });
      box.append(this.dom.ab, this.dom.sl, this.dom.wp, this.dom.ar.o, this.dom.hp.o); hud.append(box);
      this.dom.stars = el('div', { style: { position: 'absolute', top: '128px', left: '50%', transform: 'translateX(-50%)', fontSize: '26px', letterSpacing: '3px', textShadow: '0 0 12px #ef4444', pointerEvents: 'none' } });
      this.dom.safe = el('div.chip.hidden', { style: { position: 'absolute', top: '160px', left: '50%', transform: 'translateX(-50%)', borderColor: '#34d399' }, html: '🕊️ אזור בטוח' });
      this.dom.spd = el('div.chip.hidden', { style: { position: 'absolute', bottom: '12px', right: '12px', fontFamily: 'var(--mono)', fontSize: '20px' } });
      this.dom.cash = null; hud.append(this.dom.stars, this.dom.safe, this.dom.spd);
      this.hudWeapon(); this.hudStars();
    },
    hudWeapon() {
      if (!this.dom) return; const d = OG.state.data; this.dom.sl.innerHTML = '';
      ORDER.forEach((w, i) => { const has = d.weapons[w] !== undefined; this.dom.sl.append(OG.el('div', { style: { width: '34px', height: '34px', borderRadius: '8px', background: d.wsel === w ? 'rgba(34,211,238,.3)' : 'rgba(10,16,36,.8)', border: `2px solid ${d.wsel === w ? '#22d3ee' : '#2b3a6e'}`, display: 'grid', placeItems: 'center', fontSize: '16px', opacity: has ? 1 : .3, position: 'relative' } }, WEAPONS[w].icon, OG.el('b', { style: { position: 'absolute', top: '0', right: '3px', fontSize: '9px', color: '#9aa7d6' }, text: String(i + 1) }))); });
      const w = this.weapon(); this.dom.wp.innerHTML = `${w.icon} <b>${w.name}</b> · ${d.weapons[d.wsel] || 0}`;
    },
    hudStars() { if (!this.dom) return; let s = ''; for (let i = 0; i < 5; i++) s += `<span style="color:${i < this.stars ? '#fbbf24' : '#334155'}">★</span>`; this.dom.stars.innerHTML = this.stars ? s : ''; this.dom.stars.style.display = this.stars ? '' : 'none'; },
    hudHurt() { const b = document.getElementById('world'); b.style.filter = 'saturate(1.6) brightness(1.15)'; setTimeout(() => b.style.filter = '', 90); },
    updateHud() {
      const P = this.P, d = this.dom; if (!d) return; d.hp.i.style.width = Math.max(0, P.hp / P.maxHp * 100) + '%'; d.hp.t.textContent = `❤️ ${Math.ceil(P.hp)}/${P.maxHp}`; d.ar.i.style.width = P.armor + '%'; d.ar.t.textContent = P.armor > 0 ? '🛡️ ' + Math.ceil(P.armor) : '';
      for (const k in d.abs) { const a = d.abs[k], un = this.has(a.ch); a.b.style.opacity = un ? 1 : .3; a.cdo.style.height = (un && this.cd[k] > 0 ? Math.min(100, this.cd[k] / ({ dash: 5, pulse: 11, ping: 18, shield: 36 }[k]) * 100) : 0) + '%'; }
      d.safe.classList.toggle('hidden', !this.safe());
      if (P.car) { d.spd.classList.remove('hidden'); d.spd.innerHTML = `${P.car.spec.icon} ${Math.round(Math.hypot(P.car.vx, P.car.vy) * .22)} km/h · 🔧 ${Math.max(0, Math.round(P.car.hp / P.car.maxhp * 100))}%`; } else d.spd.classList.add('hidden');
      if (this.stars && this.copSeen && Math.floor(this.W.time * 4) % 2) d.stars.style.opacity = .5; else d.stars.style.opacity = 1;
      this.dom.wp.innerHTML = `${this.weapon().icon} <b>${this.weapon().name}</b> · ${OG.state.data.weapons[OG.state.data.wsel] || 0}${P.dbl > 0 ? ' 💥×2' : ''}${P.magnet > 0 ? ' 🧲' : ''}${P.ghost > 0 ? ' 👻' : ''}${P.inv > 1 ? ' ⭐' : ''}`;
    }
  };
})(window.OG);
