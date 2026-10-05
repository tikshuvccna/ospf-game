/* OSPF City – side jobs (courier / gang cleanup / race), hidden LSA shards, achievements */
(function (OG) {
  const TWO = Math.PI * 2, EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  const { el } = OG;

  const TYPES = {
    courier: { name: 'שליח חבילות', icon: '📦', desc: 'אספו חבילה ממקום אחד והעבירו אותה ליעד לפני שנגמר הזמן.' },
    cleanup: { name: 'ניקוי כנופיה', icon: '💀', desc: 'חסלו את חברי הכנופיה שהשתלטו על אזור התעשייה.' },
    race: { name: 'מרוץ OSPF', icon: '🏁', desc: 'עברו בכל נקודות הביקורת ברכב לפני שהזמן נגמר.' },
    taxi: { name: 'נהג מונית', icon: '🚕', desc: 'אספו נוסע מתחנה והורידו אותו ביעד – ככל שמהר יותר, הטיפ גדול יותר.' }
  };

  const M = OG.Missions = {
    cur: null, shards: [], t: 0,
    init(world) { this.W = world; this.buildShards(); this.buildHud(); },
    pts() { return this.W.doors.filter(d => d.ch || d.svc || d.shop); },
    buildShards() {
      const W = this.W, g = W.gen, rng = OG.rng(777), blocks = g.blocks.filter(b => !b.spec.gang || true);
      let n = 0, guard = 0;
      while (n < 25 && guard++ < 600) {
        const b = blocks[Math.floor(rng() * blocks.length)]; const x = b.x + 50 + rng() * (b.w - 100), y = b.y + 50 + rng() * (b.h - 100);
        if (W.isWater(x, y) || W.solidsNear(x, y, 16).some(s => s.kind !== 'water' && x > s.x - 20 && x < s.x + s.w + 20 && y > s.y - 20 && y < s.y + s.h + 20)) continue;
        if (this.shards.some(s => OG.dist(s.x, s.y, x, y) < 500)) continue;
        this.shards.push({ id: 's' + n, x, y }); n++;
      }
    },
    minimapDots() {
      const out = []; const c = this.cur; if (c && c.target) out.push({ x: c.target.x, y: c.target.y, c: '#fde047', r: 5, ring: true });
      if (c && c.type === 'cleanup') for (const f of OG.Combat.foes) if (f.type === 'gang') out.push({ x: f.x, y: f.y, c: '#f87171', r: 2.5 });
      if (OG.state.data.items.radar) for (const s of this.shards) if (!OG.state.data.shards[s.id]) out.push({ x: s.x, y: s.y, c: '#c084fc', r: 3 });
      return out;
    },

    /* ---------------- job lifecycle ---------------- */
    start(type) {
      if (this.cur) { OG.toast('כבר יש לכם משימה פעילה. בטלו אותה בתפריט הערים ✕', 'warn'); return; }
      const W = this.W, P = W.P, f = P.car || P, pts = this.pts(), S = OG.state.data, pw = OG.state.power();
      const mult = 1 + pw * .06;
      if (type === 'courier') {
        const near = pts.filter(d => OG.dist(d.x, d.y, f.x, f.y) > 700).sort(() => Math.random() - .5);
        const a = near[0], b = near.find(d => d !== a && OG.dist(d.x, d.y, a.x, a.y) > 1500) || near[1];
        const dist = OG.dist(f.x, f.y, a.x, a.y) + OG.dist(a.x, a.y, b.x, b.y); const time = Math.round(dist / 230 + 40);
        this.cur = { type, stage: 0, a, b, target: { x: a.x, y: a.y + 60 }, time, t: time, reward: Math.round(dist / 9 * mult), label: 'אספו את החבילה' };
      } else if (type === 'taxi') {
        const near = pts.filter(d => OG.dist(d.x, d.y, f.x, f.y) > 500 && OG.dist(d.x, d.y, f.x, f.y) < 2600).sort(() => Math.random() - .5); const a = near[0], b = near.find(d => d !== a && OG.dist(d.x, d.y, a.x, a.y) > 1200) || pts[0];
        const dist = OG.dist(f.x, f.y, a.x, a.y) + OG.dist(a.x, a.y, b.x, b.y);
        this.cur = { type, stage: 0, a, b, target: { x: a.x, y: a.y + 60 }, time: Math.round(dist / 260 + 35), t: Math.round(dist / 260 + 35), reward: Math.round(dist / 8 * mult), label: 'אספו את הנוסע' };
      } else if (type === 'cleanup') {
        const blocks = W.gen.gangBlocks.slice().sort((p, q) => OG.dist(p.x, p.y, f.x, f.y) - OG.dist(q.x, q.y, f.x, f.y)); const b = blocks[Math.min(blocks.length - 1, Math.floor(Math.random() * 3))];
        const need = 6 + Math.min(6, Math.floor(pw / 2));
        this.cur = { type, blk: b, need, got: 0, target: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, reward: Math.round((150 + need * 35) * mult), label: 'חסלו כנופיה' };
        OG.Combat.spawnT = 0;
      } else if (type === 'race') {
        const cps = []; let x = f.x, y = f.y; const G = OG.Gen;
        for (let k = 0; k < 7; k++) { for (let t = 0; t < 40; t++) { let i = Math.floor(Math.random() * (G.COLS + 1)); if (i === G.RIVER_I) i--; const j = Math.floor(Math.random() * (G.LROWS + 1)); const nx = G.gx(i), ny = G.gy(j); if (OG.dist(nx, ny, x, y) > 900 && OG.dist(nx, ny, x, y) < 2400) { cps.push({ x: nx, y: ny }); x = nx; y = ny; break; } } }
        if (cps.length < 4) { OG.toast('לא נמצא מסלול, נסו שוב', 'warn'); return; }
        let len = OG.dist(f.x, f.y, cps[0].x, cps[0].y); for (let k = 1; k < cps.length; k++) len += OG.dist(cps[k - 1].x, cps[k - 1].y, cps[k].x, cps[k].y);
        this.cur = { type, cps, i: 0, target: cps[0], time: Math.round(len / 330 + 20), t: Math.round(len / 330 + 20), reward: Math.round(len / 7 * mult), label: 'מרוץ – נקודה 1/' + cps.length };
      }
      OG.toast(`${TYPES[type].icon} משימה התחילה: ${TYPES[type].name}`, 'good'); OG.snd.play('power'); this.hud();
    },
    cancel() { if (!this.cur) return; this.cur = null; OG.toast('המשימה בוטלה', 'warn'); this.hud(); },
    finish(ok, why) {
      const c = this.cur; if (!c) return; this.cur = null; const d = OG.state.data;
      if (ok) {
        let bonus = 0; if (c.t > 0) bonus = Math.round(c.t * 2);
        const cash = Math.round(c.reward * (1 + OG.Combat.perk('cash'))) + bonus, coins = 4 + Math.floor(c.reward / 60);
        OG.state.addCash(cash); OG.state.addCoins(coins); d.missions.done++; d.missions.byType[c.type] = (d.missions.byType[c.type] || 0) + 1;
        OG.toast(`✅ משימה הושלמה! +💵 ${cash} · +🪙 ${coins}${bonus ? ' (בונוס זמן ' + bonus + ')' : ''}`, 'good'); OG.snd.play('win');
        if (d.missions.done % 3 === 0) OG.toast('💪 כוח +1! אתם חזקים יותר (נזק ובריאות)', 'good');
        OG.Combat.recalc(); OG.Ach.check();
      } else { OG.toast('❌ המשימה נכשלה' + (why ? ': ' + why : ''), 'bad'); OG.snd.play('lose'); }
      OG.state.save(); this.hud(); OG.ui && OG.ui.refreshHud();
    },
    onKill(f) { const c = this.cur; if (c && c.type === 'cleanup' && f.type === 'gang') { c.got++; OG.snd.play('click'); if (c.got >= c.need) this.finish(true); else this.hud(); } },
    update(dt) {
      this.t += dt; const W = this.W, P = W.P, f = P.car || P, d = OG.state.data;
      for (const s of this.shards) { if (d.shards[s.id]) continue; if (Math.abs(s.x - f.x) < 34 && Math.abs(s.y - f.y) < 34 && OG.dist(s.x, s.y, f.x, f.y) < 32) { d.shards[s.id] = 1; const n = Object.keys(d.shards).length; OG.state.addCoins(6); OG.state.addCash(40); OG.snd.play('level'); OG.toast(`💎 שבב LSA נמצא (${n}/25) · +6🪙 +40💵` + (n === 25 ? ' – כל השברים! 🎉' : ''), 'good'); OG.Ach.check(); } }
      const c = this.cur; if (!c) return;
      if (c.time) { c.t -= dt; if (c.t <= 0) { this.finish(false, 'נגמר הזמן'); return; } }
      if (c.type === 'cleanup') { if (OG.dist(f.x, f.y, c.target.x, c.target.y) > 2600) { /* wandered off */ } return; }
      if (!c.target) return; const near = OG.dist(f.x, f.y, c.target.x, c.target.y);
      if (c.type === 'race') { if (!P.car) { c.walk = (c.walk || 0) + dt; if (c.walk > 10) this.finish(false, 'חייבים רכב'); } else c.walk = 0; if (near < 90) { c.i++; OG.snd.play('coin'); if (c.i >= c.cps.length) this.finish(true); else { c.target = c.cps[c.i]; c.label = `מרוץ – נקודה ${c.i + 1}/${c.cps.length}`; c.t += 6; this.hud(); } } return; }
      if ((c.type === 'courier' || c.type === 'taxi') && near < 70) {
        if (c.stage === 0 && (c.type === 'courier' || !P.car || true)) { if (c.type === 'taxi' && !P.car) { c.label = 'צריך רכב כדי להסיע נוסע'; this.hud(); return; } c.stage = 1; c.target = { x: c.b.x, y: c.b.y + 60 }; c.label = c.type === 'courier' ? 'מסרו את החבילה' : 'הורידו את הנוסע'; OG.snd.play('power'); this.hud(); }
        else if (c.stage === 1) { if (c.type === 'taxi' && !P.car) { c.label = 'חזרו לרכב!'; this.hud(); return; } this.finish(true); }
      }
      if (this.W.P.dead && this.cur) this.finish(false, 'נפלתם');
    },
    draw(c, vis) {
      const W = this.W, d = OG.state.data, t = W.time;
      for (const s of this.shards) { if (d.shards[s.id] || !vis(s.x, s.y)) continue; c.save(); c.translate(s.x, s.y + Math.sin(t * 3 + s.x) * 3); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, 0, 2, 0, 0, 26); g.addColorStop(0, 'rgba(216,180,254,.8)'); g.addColorStop(1, 'rgba(168,85,247,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 26, 0, TWO); c.fill(); c.globalCompositeOperation = 'source-over'; c.rotate(t * 1.5); c.fillStyle = '#e9d5ff'; c.strokeStyle = '#a855f7'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -11); c.lineTo(8, 0); c.lineTo(0, 11); c.lineTo(-8, 0); c.closePath(); c.fill(); c.stroke(); c.restore(); }
      const cur = this.cur; if (!cur || !cur.target) return; const tg = cur.target, P = W.P, f = P.car || P;
      if (vis(tg.x, tg.y, 200)) { c.save(); c.translate(tg.x, tg.y); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(0, -260, 0, 0); g.addColorStop(0, 'rgba(250,204,21,0)'); g.addColorStop(1, 'rgba(250,204,21,.5)'); c.fillStyle = g; c.fillRect(-26, -260, 52, 260); c.strokeStyle = '#fde047'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 34 + Math.sin(t * 5) * 3, 0, TWO); c.stroke(); c.globalCompositeOperation = 'source-over'; c.font = `30px ${EMOJI}`; c.textAlign = 'center'; c.fillText(cur.type === 'race' ? '🏁' : cur.stage === 0 ? '📦' : '📍', 0, -42 + Math.sin(t * 4) * 4); c.restore(); }
      else { const a = Math.atan2(tg.y - f.y, tg.x - f.x), r = Math.min(OG.dist(f.x, f.y, tg.x, tg.y) * .5, 170); c.save(); c.translate(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r); c.rotate(a); c.fillStyle = 'rgba(253,224,71,.9)'; c.beginPath(); c.moveTo(16, 0); c.lineTo(-8, -12); c.lineTo(-4, 0); c.lineTo(-8, 12); c.closePath(); c.fill(); c.restore(); }
      if (cur.type === 'race' && cur.cps[cur.i + 1] && vis(cur.cps[cur.i + 1].x, cur.cps[cur.i + 1].y, 200)) { const n = cur.cps[cur.i + 1]; c.strokeStyle = 'rgba(253,224,71,.4)'; c.lineWidth = 3; c.beginPath(); c.arc(n.x, n.y, 34, 0, TWO); c.stroke(); }
    },
    buildHud() {
      this.dom = el('div#mission.chip.hidden', { style: { position: 'absolute', top: '58px', left: '12px', maxWidth: '300px', borderColor: '#fde047', background: 'rgba(30,25,0,.8)', lineHeight: 1.5 } });
      document.getElementById('hud').append(this.dom);
    },
    hud() {
      const c = this.cur, d = this.dom; if (!d) return; if (!c) { d.classList.add('hidden'); return; } d.classList.remove('hidden');
      const T = TYPES[c.type]; let line = `${T.icon} <b>${T.name}</b><br>${c.label}`; if (c.type === 'cleanup') line += ` · ${c.got}/${c.need}`; if (c.time) line += `<br>⏱️ <span id="m-t">${Math.ceil(c.t)}</span>s`; line += ` · 💵 ${c.reward}`; d.innerHTML = line + ' <button class="btn small" style="padding:0 6px;margin-inline-start:6px" id="m-x">✕</button>';
      d.querySelector('#m-x').onclick = () => this.cancel(); d.style.pointerEvents = 'auto';
    },
    tickHud() { const c = this.cur; if (c && c.time) { const e = document.getElementById('m-t'); if (e) e.textContent = Math.ceil(c.t); } },

    /* ---------------- Job Center UI ---------------- */
    open() {
      const root = el('div.screen'); document.getElementById('screens').append(root); const d = OG.state.data;
      const render = () => {
        root.innerHTML = ''; const p = el('div.panel', { style: { width: 'min(760px,96vw)' } });
        p.append(el('div.row', el('h2', { text: '💼 מרכז המשימות' }), el('div.grow'), el('span.chip', { html: `✔ ${d.missions.done} משימות · 💪 כוח ${OG.state.power()}` }), el('button.btn.small', { text: '✕', onclick() { root.remove(); } })));
        p.append(el('p.muted', { text: 'כל 3 משימות מעלות את הכוח שלכם ב-1. כוח נותן יותר נזק ובריאות – גם נגד שחקנים אחרים.' }));
        const g = el('div.shop-grid');
        for (const k in TYPES) { const T = TYPES[k]; g.append(el('div.item', el('div.ic', { text: T.icon }), el('div.nm', { text: T.name }), el('div.ds', { text: T.desc + ` (בוצעו: ${d.missions.byType[k] || 0})` }), el('button.btn.small.warn', { text: this.cur ? 'יש משימה פעילה' : 'קבלו משימה', disabled: !!this.cur, onclick: () => { root.remove(); this.start(k); } }))); }
        p.append(g); if (this.cur) p.append(el('button.btn.danger.small', { text: 'בטלו משימה פעילה', onclick: () => { this.cancel(); render(); }, style: { marginTop: '10px' } }));
        root.append(p);
      }; render();
    }
  };

  /* ---------------- achievements ---------------- */
  const ACH = [
    ['first', '🩸', 'דם ראשון', 'חסלו אויב ראשון', s => s.stats.kills >= 1, 10], ['k25', '💀', 'מחסל', '25 חיסולים', s => s.stats.kills >= 25, 30], ['k100', '☠️', 'אגדת רחוב', '100 חיסולים', s => s.stats.kills >= 100, 80],
    ['wanted3', '🚨', 'מבוקש', 'הגיעו ל-3 כוכבי מבוקש', s => s.stats.wanted >= 3, 25], ['wanted5', '🚁', 'אויב ציבורי', 'הגיעו ל-5 כוכבים', s => s.stats.wanted >= 5, 60],
    ['rich', '💰', 'עשיר', 'צברו 1000 💵 (מצטבר)', s => s.stats.cashEarned >= 1000, 30], ['rich2', '🏦', 'מיליונר', '10,000 💵 מצטבר', s => s.stats.cashEarned >= 10000, 100],
    ['jobs3', '💼', 'עובד חרוץ', '3 משימות', s => s.missions.done >= 3, 20], ['jobs12', '🧰', 'מקצוען', '12 משימות', s => s.missions.done >= 12, 70],
    ['shard10', '💎', 'אספן שברים', '10 שברי LSA', s => Object.keys(s.shards).length >= 10, 40], ['shard25', '🔮', 'LSDB מלא', 'כל 25 השברים', s => Object.keys(s.shards).length >= 25, 150],
    ['gamble', '🎰', 'מהמר', '20 משחקים בקזינו', s => s.casino.plays >= 20, 20], ['jack', '🍒', 'ג׳קפוט', 'זכו ב-Jackpot בסלוטס', s => s.ach._jackpot, 60],
    ['garage', '🚗', 'אספן רכבים', 'קנו 3 רכבים', s => s.ownedVeh.length >= 3, 40], ['arm', '🔫', 'חמוש עד השיניים', 'החזיקו 5 נשקים', s => Object.keys(s.weapons).length >= 5, 40],
    ['ch4', '🏆', 'שליש דרך', 'סיימו 4 פרקים', s => OG.state.chaptersDone() >= 4, 40], ['ch13', '🎓', 'מאסטר OSPF', 'סיימו את כל 13 הפרקים', s => OG.state.chaptersDone() >= 13, 200],
    ['mp', '⚔️', 'לוחם רשת', 'נצחו 3 שחקנים', s => s.stats.mpKills >= 3, 50]
  ];
  OG.Ach = {
    list: ACH,
    check() { const s = OG.state.data; for (const [id, ic, nm, ds, fn, rw] of ACH) { if (s.ach[id]) continue; let ok = false; try { ok = fn(s); } catch (e) { } if (ok) { s.ach[id] = 1; OG.state.addCoins(rw); OG.toast(`🏅 הישג: ${ic} ${nm} · +${rw}🪙`, 'good'); OG.snd.play('level'); } } OG.state.save(); }
  };
})(window.OG);
