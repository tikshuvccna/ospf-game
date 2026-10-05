/* OSPF City – vehicle specs and drawing: cars, bikes, boats, police */
(function (OG) {
  const TWO = Math.PI * 2;
  const shade = (hex, f) => OG.Gen.shade(hex, f);
  const rr = (c, x, y, w, h, r) => OG.Gen.rr(c, x, y, w, h, r);

  // top = max speed px/s, acc = acceleration, steer = turn rate, hp = durability, price in cash (0 = not for sale)
  OG.VEH = {
    scooter: { name: 'קטנוע', icon: '🛵', cls: 'bike', len: 28, wid: 12, top: 360, acc: 520, steer: 3.8, hp: 60, price: 120, ambient: .08 },
    bike: { name: 'אופנוע מרוץ', icon: '🏍️', cls: 'bike', len: 36, wid: 12, top: 700, acc: 620, steer: 3.3, hp: 90, price: 650, ambient: .04 },
    sedan: { name: 'סדאן', icon: '🚗', cls: 'car', len: 40, wid: 20, top: 440, acc: 380, steer: 2.5, hp: 120, price: 0, ambient: .38 },
    taxi: { name: 'מונית', icon: '🚕', cls: 'car', len: 40, wid: 20, top: 470, acc: 400, steer: 2.5, hp: 120, price: 0, ambient: .1 },
    van: { name: 'ואן', icon: '🚐', cls: 'car', len: 46, wid: 22, top: 380, acc: 320, steer: 2.2, hp: 160, price: 0, ambient: .12 },
    truck: { name: 'משאית', icon: '🚚', cls: 'truck', len: 62, wid: 24, top: 330, acc: 260, steer: 1.9, hp: 260, price: 0, ambient: .1 },
    sports: { name: 'ספורט', icon: '🏎️', cls: 'car', len: 42, wid: 19, top: 650, acc: 560, steer: 2.7, hp: 130, price: 950, ambient: .04 },
    racer: { name: 'פורמולה OSPF', icon: '🏁', cls: 'car', len: 44, wid: 18, top: 820, acc: 700, steer: 2.9, hp: 110, price: 1900, ambient: 0 },
    armored: { name: 'משוריין', icon: '🛡️', cls: 'truck', len: 50, wid: 26, top: 400, acc: 340, steer: 2.1, hp: 700, price: 2600, ambient: 0 },
    police: { name: 'ניידת', icon: '🚓', cls: 'car', len: 42, wid: 20, top: 560, acc: 480, steer: 2.7, hp: 170, price: 0, ambient: 0 },
    boat: { name: 'סירה', icon: '🚤', cls: 'boat', len: 60, wid: 26, top: 430, acc: 300, steer: 1.9, hp: 150, price: 0, water: true, ambient: 0 },
    speedboat: { name: 'סירת מירוץ', icon: '🛥️', cls: 'boat', len: 56, wid: 22, top: 760, acc: 520, steer: 2.3, hp: 130, price: 1300, water: true, ambient: 0 }
  };
  OG.AMBIENT_TYPES = Object.keys(OG.VEH).filter(k => OG.VEH[k].ambient > 0);

  OG.makeVehicle = function (type, x, y, a, color) {
    const S = OG.VEH[type];
    return { x, y, a: a || 0, vx: 0, vy: 0, type, kind: type, spec: S, len: S.len, wid: S.wid, color: color || '#ef4444', hp: S.hp, maxhp: S.hp, ai: false, parked: true, route: [], max: S.top * OG.rand(.3, .42), brake: 0, stuck: 0, id: Math.random(), burn: 0 };
  };
  OG.pickAmbientType = function () { let r = Math.random(), tot = OG.AMBIENT_TYPES.reduce((s, k) => s + OG.VEH[k].ambient, 0); r *= tot; for (const k of OG.AMBIENT_TYPES) { r -= OG.VEH[k].ambient; if (r <= 0) return k; } return 'sedan'; };

  OG.drawVehicle = function (c, v, time, world) {
    const S = v.spec, L = v.len, W = v.wid; const col = v.color;
    c.save(); c.translate(v.x, v.y); c.rotate(v.a);
    const sp = Math.hypot(v.vx, v.vy);
    if (S.cls === 'boat') {
      // wake
      c.globalAlpha = Math.min(.5, sp / 600); c.strokeStyle = '#d9f4ff'; c.lineWidth = 3;
      for (let k = 1; k <= 3; k++) { c.beginPath(); c.ellipse(-L * .5 - k * 14, 0, 10 + k * 5, W * .35 + k * 9, 0, -1.2, 1.2); c.stroke(); }
      c.globalAlpha = 1;
      c.fillStyle = 'rgba(0,0,12,.35)'; c.beginPath(); c.ellipse(3, 5, L / 2, W / 2, 0, 0, TWO); c.fill();
      c.fillStyle = '#e8eefc'; c.beginPath(); c.moveTo(L / 2 + 8, 0); c.quadraticCurveTo(L / 4, -W / 2 - 2, -L / 2, -W / 2); c.lineTo(-L / 2, W / 2); c.quadraticCurveTo(L / 4, W / 2 + 2, L / 2 + 8, 0); c.fill();
      c.fillStyle = col; c.beginPath(); c.moveTo(L / 2 - 2, 0); c.quadraticCurveTo(L / 5, -W / 2 + 4, -L / 2 + 6, -W / 2 + 4); c.lineTo(-L / 2 + 6, W / 2 - 4); c.quadraticCurveTo(L / 5, W / 2 - 4, L / 2 - 2, 0); c.fill();
      c.fillStyle = '#9fd6ff'; rr(c, -L * .05, -W * .28, L * .22, W * .56, 4); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(-L / 2 + 6, -1.5, L * .3, 3);
    } else if (S.cls === 'bike') {
      c.fillStyle = 'rgba(0,0,12,.4)'; rr(c, -L / 2 + 2, -W / 2 + 4, L, W, 5); c.fill();
      c.fillStyle = '#1c1c24'; rr(c, -L / 2, -3, 9, 6, 2); c.fill(); rr(c, L / 2 - 9, -3, 9, 6, 2); c.fill();
      c.fillStyle = col; rr(c, -L / 2 + 6, -W / 2 + 2, L - 12, W - 4, 4); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-L / 2 + 8, -1, L - 18, 2);
      c.strokeStyle = '#cbd5e1'; c.lineWidth = 2; c.beginPath(); c.moveTo(L / 2 - 9, -W / 2 - 3); c.lineTo(L / 2 - 9, W / 2 + 3); c.stroke();
      if (v.rider !== false && (v.driver || v.ai)) { c.fillStyle = v.driver === 'p' ? OG.state.data.look.jacket : '#475569'; c.beginPath(); c.ellipse(-2, 0, 6, 8, 0, 0, TWO); c.fill(); c.fillStyle = '#f1c9a5'; c.beginPath(); c.arc(1, 0, 4.6, 0, TWO); c.fill(); c.fillStyle = '#222'; c.beginPath(); c.arc(0, 0, 4.8, Math.PI * .5, Math.PI * 1.5); c.fill(); }
    } else {
      c.fillStyle = 'rgba(0,0,10,.4)'; rr(c, -L / 2 + 3, -W / 2 + 5, L, W, 6); c.fill();
      if (S.cls === 'truck') { c.fillStyle = shade(col, -.2); rr(c, -L / 2, -W / 2, L * .66, W, 3); c.fill(); c.fillStyle = col; rr(c, L * .16, -W / 2 + 1, L * .34, W - 2, 4); c.fill(); c.fillStyle = '#9fd6ff'; c.fillRect(L * .38, -W / 2 + 3, 4, W - 6); c.strokeStyle = 'rgba(0,0,0,.4)'; c.strokeRect(-L / 2, -W / 2, L * .66, W); if (v.type === 'armored') { c.fillStyle = 'rgba(255,255,255,.18)'; for (let k = 0; k < 4; k++) c.fillRect(-L / 2 + 6 + k * 9, -W / 2 + 3, 4, W - 6); } }
      else {
        c.fillStyle = col; rr(c, -L / 2, -W / 2, L, W, 6); c.fill();
        c.fillStyle = 'rgba(255,255,255,.18)'; rr(c, -L / 2 + 2, -W / 2 + 1.5, L - 4, W / 3, 4); c.fill();
        c.fillStyle = shade(col, -.35); rr(c, -L * .18, -W / 2 + 2.5, L * .38, W - 5, 4); c.fill();
        c.fillStyle = '#9fd6ff'; c.fillRect(L * .2, -W / 2 + 3, L * .1, W - 6); c.fillStyle = '#6a8fb8'; c.fillRect(-L * .32, -W / 2 + 3.5, L * .07, W - 7);
        c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 1.2; rr(c, -L / 2, -W / 2, L, W, 6); c.stroke();
        if (v.type === 'taxi') { c.fillStyle = '#111827'; c.fillRect(-3, -4, 9, 8); c.fillStyle = '#fde047'; c.fillRect(-2, -3, 7, 6); }
        if (v.type === 'sports' || v.type === 'racer') { c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(-L / 2 + 3, -1.5, L - 6, 3); if (v.type === 'racer') { c.fillStyle = '#111'; c.fillRect(-L / 2 - 2, -W / 2 - 1, 5, W + 2); } }
        if (v.type === 'police') { c.fillStyle = '#f8fafc'; c.fillRect(-L * .1, -W / 2, L * .3, W); const on = v.siren && Math.floor(time * 6) % 2; c.fillStyle = on ? '#ef4444' : '#3b82f6'; c.fillRect(-2, -W / 2 + 1, 5, W / 2 - 1); c.fillStyle = on ? '#3b82f6' : '#ef4444'; c.fillRect(-2, 0, 5, W / 2 - 1); if (v.siren) { c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, 0, 2, 0, 0, 46); g.addColorStop(0, on ? 'rgba(239,68,68,.6)' : 'rgba(59,130,246,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 46, 0, TWO); c.fill(); c.globalCompositeOperation = 'source-over'; } }
      }
      const braking = v.brake || (v === world.P.car && (world.keys.s || world.keys.arrowdown || world.keys[' ']));
      c.fillStyle = braking ? '#ff2a2a' : '#7f1d1d'; c.fillRect(-L / 2 - 1, -W / 2 + 1.5, 3, 4); c.fillRect(-L / 2 - 1, W / 2 - 5.5, 3, 4);
      c.fillStyle = '#fff7c2'; c.fillRect(L / 2 - 2, -W / 2 + 1.5, 3, 4); c.fillRect(L / 2 - 2, W / 2 - 5.5, 3, 4);
    }
    // damage smoke / fire
    if (v.hp < v.maxhp * .35) { c.fillStyle = 'rgba(40,40,50,.55)'; c.beginPath(); c.arc(L * .3, 0, 7 + Math.sin(time * 9) * 2, 0, TWO); c.fill(); }
    if (v.burn > 0) { c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, 0, 2, 0, 0, 40); g.addColorStop(0, 'rgba(255,200,60,.9)'); g.addColorStop(1, 'rgba(255,60,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 40, 0, TWO); c.fill(); c.globalCompositeOperation = 'source-over'; }
    c.restore();
  };
  OG.drawHeadlights = function (c, v) {
    if (v.parked && !v.driver) return; if (v.spec.cls === 'boat') return;
    c.save(); c.translate(v.x, v.y); c.rotate(v.a);
    const g = c.createLinearGradient(v.len / 2, 0, v.len / 2 + 90, 0); g.addColorStop(0, 'rgba(255,240,180,.28)'); g.addColorStop(1, 'rgba(255,240,180,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(v.len / 2, -v.wid / 2); c.lineTo(v.len / 2 + 95, -34); c.lineTo(v.len / 2 + 95, 34); c.lineTo(v.len / 2, v.wid / 2); c.closePath(); c.fill(); c.restore();
  };
})(window.OG);
