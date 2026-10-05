/* OSPF City – multiplayer: rooms over Firebase Realtime DB (free Spark plan) or same-browser BroadcastChannel.
   Presence is broadcast ~6×/s, events (shots/kills/chat/emotes) go through a short-lived event list.
   PvP is victim-authoritative: everybody spawns the shooter's bullets, only the target applies damage to itself. */
(function (OG) {
  const { el } = OG;
  const TWO = Math.PI * 2, EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  const FB_VER = '10.12.2', LSKEY = 'ospf-fb-config', NAMEKEY = 'ospf-mp-name';
  const MAXP = 8;
  const COLS = ['#22d3ee', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#f87171', '#fb923c', '#e5e7eb'];

  const loadScript = src => new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.head.append(s); });
  const parseCfg = txt => {
    txt = (txt || '').trim(); if (!txt) return null;
    try { const j = JSON.parse(txt); if (j && j.databaseURL) return j; } catch (e) { }
    const o = {}; const re = /["']?(apiKey|authDomain|databaseURL|projectId|storageBucket|messagingSenderId|appId)["']?\s*:\s*["']([^"']+)["']/g; let m; while ((m = re.exec(txt))) o[m[1]] = m[2];
    return o.databaseURL ? o : null;
  };
  const getCfg = () => { try { const l = localStorage.getItem(LSKEY); if (l) return JSON.parse(l); } catch (e) { } return window.OG_FIREBASE && window.OG_FIREBASE.databaseURL ? window.OG_FIREBASE : null; };

  /* ---------------- transports ---------------- */
  class LocalNet {
    constructor(room, id, h) { this.id = id; this.h = h; this.kind = 'local'; this.off = 0; this.bc = new BroadcastChannel('ospf-city-' + room); this.bc.onmessage = e => { const m = e.data; if (!m || m.from === id) return; if (m.t === 'p') h.presence(m.from, m.d); else if (m.t === 'e') h.event(m.d); else if (m.t === 'l') h.left(m.from); else if (m.t === 'hi') { h.hello && h.hello(); } }; }
    async connect() { this.bc.postMessage({ t: 'hi', from: this.id }); }
    now() { return Date.now(); }
    sendPresence(d) { this.bc.postMessage({ t: 'p', from: this.id, d }); }
    sendEvent(d) { this.bc.postMessage({ t: 'e', from: this.id, d }); }
    leave() { try { this.bc.postMessage({ t: 'l', from: this.id }); this.bc.close(); } catch (e) { } }
  }
  class FbNet {
    constructor(room, id, h, cfg) { this.id = id; this.h = h; this.cfg = cfg; this.room = room; this.kind = 'firebase'; this.off = 0; }
    async connect() {
      await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app-compat.js`); await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-database-compat.js`);
      const fb = window.firebase; const app = fb.apps.length ? fb.app() : fb.initializeApp(this.cfg); this.db = fb.database(app);
      await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout – בדקו את ה-databaseURL והכללים')), 9000); this.db.ref('.info/connected').on('value', s => { if (s.val() === true) { clearTimeout(t); res(); } }); });
      this.db.ref('.info/serverTimeOffset').on('value', s => this.off = s.val() || 0);
      const base = `rooms/${this.room}`; this.pRef = this.db.ref(base + '/players'); this.eRef = this.db.ref(base + '/ev'); this.me = this.pRef.child(this.id);
      this.me.onDisconnect().remove();
      this.pRef.on('child_added', s => s.key !== this.id && this.h.presence(s.key, s.val())); this.pRef.on('child_changed', s => s.key !== this.id && this.h.presence(s.key, s.val())); this.pRef.on('child_removed', s => this.h.left(s.key));
      this.eRef.limitToLast(30).on('child_added', s => { const v = s.val(); if (v && v.id !== this.id) this.h.event(v); });
    }
    now() { return Date.now() + this.off; }
    sendPresence(d) { this.me.set(d).catch(() => { }); }
    sendEvent(d) { const r = this.eRef.push(d); setTimeout(() => r.remove().catch(() => { }), 15000); }
    leave() { try { this.me.remove(); this.pRef.off(); this.eRef.off(); } catch (e) { } }
  }

  const MP = OG.MP = {
    active: false, id: Math.random().toString(36).slice(2, 9), players: {}, net: null, room: '', name: '', sendT: 0, last: null, kf: [], chat: [], emotes: [], seen: new Set(), showBoard: false, joinT: 0,
    init(world) { this.W = world; try { this.name = localStorage.getItem(NAMEKEY) || ''; } catch (e) { } this.buildHud(); },
    buildHud() {
      const hud = document.getElementById('hud');
      this.feed = el('div#mpfeed', { style: { position: 'absolute', top: '100px', left: '12px', maxWidth: '320px', fontSize: '13px', pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '3px', textShadow: '0 1px 3px #000' } });
      this.boardEl = el('div#mpboard.panel.hidden', { style: { position: 'fixed', top: '90px', left: '50%', transform: 'translateX(-50%)', zIndex: 18, minWidth: '300px', pointerEvents: 'none' } });
      this.badge = el('div.chip.hidden', { style: { position: 'absolute', bottom: '64px', right: '12px', borderColor: '#34d399' } });
      this.chatBox = el('input#mpchat.hidden', { placeholder: 'הודעה לחדר… (Enter לשליחה, Esc לביטול)', maxlength: 80, style: { position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)', width: 'min(460px,90vw)', zIndex: 30, background: '#0a1024', color: '#fff', border: '2px solid #22d3ee', borderRadius: '10px', padding: '8px 12px', fontSize: '15px' } });
      this.chatBox.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { const t = this.chatBox.value.trim(); if (t) this.say(t); this.closeChat(); } else if (e.key === 'Escape') this.closeChat(); });
      hud.append(this.feed, this.badge); document.body.append(this.boardEl, this.chatBox);
    },
    handlers() {
      return { presence: (id, d) => this.onPresence(id, d), event: d => this.onEvent(d), left: id => this.onLeft(id), hello: () => this.sendNow() };
    },

    /* ---------------- connect / leave ---------------- */
    async join(opts) {
      if (this.active) this.leave(); this.name = (opts.name || 'Router').slice(0, 14); this.room = (opts.room || 'city').toLowerCase().replace(/[^a-z0-9א-ת_-]/gi, '').slice(0, 20) || 'city';
      try { localStorage.setItem(NAMEKEY, this.name); } catch (e) { }
      const h = this.handlers(); const net = opts.mode === 'local' ? new LocalNet(this.room, this.id, h) : new FbNet(this.room, this.id, h, opts.cfg);
      await net.connect(); this.net = net; this.active = true; this.players = {}; this.seen.clear(); this.joinT = net.now(); this.sendT = 0; this.col = COLS[parseInt(this.id.slice(0, 3), 36) % COLS.length]; this.last = null;
      this.badge.classList.remove('hidden'); this.updateBadge(); this.sendNow(true); this.log(`🌐 התחברתם לחדר <b>${this.room}</b> (${net.kind === 'local' ? 'מקומי' : 'אונליין'})`);
      OG.Ach && 0; OG.toast(`🌐 מחוברים לחדר "${this.room}". Enter = צ׳אט · V = אימוג׳י · Tab = לוח תוצאות`, 'good');
    },
    leave() { if (!this.active) return; try { this.net.leave(); } catch (e) { } this.active = false; this.players = {}; this.badge.classList.add('hidden'); this.boardEl.classList.add('hidden'); this.feed.innerHTML = ''; OG.toast('התנתקתם מהחדר', 'warn'); },
    count() { return Object.keys(this.players).length + 1; },
    updateBadge() { if (this.active) this.badge.innerHTML = `🌐 ${this.room} · 👥 ${this.count()}`; },

    /* ---------------- presence ---------------- */
    sendNow(force) {
      if (!this.active) return; const P = this.W.P, c = P.car, o = c || P;
      const d = { n: this.name, pw: OG.state.power(), x: Math.round(o.x), y: Math.round(o.y), a: +(c ? c.a : P.face).toFixed(2), c: c ? c.type : '', col: c ? c.color : OG.state.data.look.jacket, hp: Math.max(0, Math.round(P.hp)), mhp: P.maxHp, k: OG.state.data.stats.mpKills, busy: this.W.paused ? 1 : 0, dead: P.dead ? 1 : 0, ts: this.net.now() };
      const key = [d.x, d.y, d.a, d.hp, d.c, d.busy, d.dead].join('|'); if (!force && key === this.last && this.sendT < 1.2) return; this.last = key; this.sendT = 0; this.net.sendPresence(d);
    },
    tick(dt) {
      if (!this.active) return; this.sendT += dt; this.pt = (this.pt || 0) + dt; if (this.pt >= .16) { this.pt = 0; this.sendNow(); }
      const now = this.net.now();
      for (const id in this.players) {
        const p = this.players[id]; const k = Math.min(1, dt * 11); const dx = p.tx - p.x, dy = p.ty - p.y;
        if (Math.hypot(dx, dy) > 700) { p.x = p.tx; p.y = p.ty; } else { p.x += dx * k; p.y += dy * k; }
        p.vx = dx * 6; p.vy = dy * 6; let da = p.ta - p.a; while (da > Math.PI) da -= TWO; while (da < -Math.PI) da += TWO; p.a += da * k; p.ph += Math.hypot(dx, dy) * .05 + dt * 2;
        if (now - p.seen > 12000) { delete this.players[id]; this.updateBadge(); }
      }
      for (let i = this.emotes.length - 1; i >= 0; i--) { this.emotes[i].t += dt; if (this.emotes[i].t > 2.5) this.emotes.splice(i, 1); }
      if (this.showBoard) this.renderBoard();
    },
    onPresence(id, d) {
      if (!d || id === this.id) return; let p = this.players[id];
      if (!p) { if (Object.keys(this.players).length >= MAXP - 1) return; p = this.players[id] = { id, x: d.x, y: d.y, a: d.a, ph: 0, vx: 0, vy: 0 }; this.log(`➕ <b>${esc(d.n)}</b> הצטרף/ה (💪${d.pw})`); this.updateBadge(); this.sendNow(true); }
      Object.assign(p, { n: d.n, pw: d.pw, tx: d.x, ty: d.y, ta: d.a, c: d.c, col: d.col, hp: d.hp, mhp: d.mhp, k: d.k, busy: d.busy, dead: d.dead, seen: this.net.now() });
    },
    onLeft(id) { const p = this.players[id]; if (p) { this.log(`➖ ${esc(p.n)} עזב/ה`); delete this.players[id]; this.updateBadge(); } },

    /* ---------------- events ---------------- */
    emit(d) { if (!this.active) return; d.id = this.id; d.n = this.name; d.ts = this.net.now(); this.net.sendEvent(d); },
    onEvent(d) {
      if (!d || d.id === this.id) return; const key = d.id + d.ts + d.t; if (this.seen.has(key)) return; this.seen.add(key); if (this.seen.size > 400) this.seen.clear();
      if (d.ts < this.net.now() - 5000) return; const W = this.W, C = OG.Combat;
      if (d.t === 'shot') { if (W.paused && !W.attract) { /* in a menu – ignore */ } else { C.spawnRemoteBullet({ id: d.id, w: d.w, x: d.x, y: d.y, a: d.a, pw: d.pw }); const f = W.P.car || W.P; if (OG.dist(f.x, f.y, d.x, d.y) < 800) OG.snd.play((OG.WEAPONS[d.w] || OG.WEAPONS.pistol).snd); } }
      else if (d.t === 'kill') {
        this.log(`💀 <b>${esc(d.killerName || '?')}</b> ← ${esc(d.n)}`, '#fb7185');
        if (d.killer === this.id) { const S = OG.state.data; S.stats.mpKills++; const pay = 100 + (d.pw || 0) * 10; OG.state.addCash(pay); OG.toast(`⚔️ הפלתם את ${d.n}! +💵 ${pay}`, 'good'); OG.snd.play('win'); OG.Ach.check(); OG.state.save(); }
      }
      else if (d.t === 'chat') this.log(`💬 <b style="color:${d.col || '#22d3ee'}">${esc(d.n)}</b>: ${esc(d.m)}`);
      else if (d.t === 'emote') this.emotes.push({ id: d.id, e: d.e, t: 0 });
      else if (d.t === 'fx') C.fx.push({ t: 0, life: .7, k: 'pulse', x: d.x, y: d.y, r: 230, col: '#22d3ee' });
    },
    sendShot(w, x, y, a) { this.emit({ t: 'shot', w, x: Math.round(x), y: Math.round(y), a: +a.toFixed(3), pw: OG.state.power() }); },
    sendDeath(from) { const kid = from && String(from).startsWith('r:') ? String(from).slice(2) : null; const kp = kid && this.players[kid]; this.emit({ t: 'kill', killer: kid, killerName: kp ? kp.n : null, pw: OG.state.power() }); },
    sendFx(k, x, y) { this.emit({ t: 'fx', k, x: Math.round(x), y: Math.round(y) }); },
    say(m) { this.log(`💬 <b style="color:${this.col}">${esc(this.name)}</b>: ${esc(m)}`); this.emit({ t: 'chat', m, col: this.col }); },
    emote() { const e = OG.pick(['😎', '😂', '🔥', '👋', '💀', '❤️', '🤝', '🚀']); this.emotes.push({ id: this.id, e, t: 0 }); this.emit({ t: 'emote', e }); },
    openChat() { this.chatBox.classList.remove('hidden'); this.chatBox.value = ''; this.chatBox.focus(); this.W.keys = {}; },
    closeChat() { this.chatBox.classList.add('hidden'); this.chatBox.blur(); },
    log(html, col) { const d = el('div', { html, style: { background: 'rgba(5,10,25,.7)', padding: '3px 8px', borderRadius: '8px', color: col || '#e6ecff' } }); this.feed.append(d); while (this.feed.children.length > 6) this.feed.firstChild.remove(); setTimeout(() => d.remove(), 9000); },

    /* ---------------- board ---------------- */
    board(on) { this.showBoard = !!on && this.active; this.boardEl.classList.toggle('hidden', !this.showBoard); if (this.showBoard) this.renderBoard(); },
    renderBoard() {
      const rows = [{ n: this.name + ' (אתם)', pw: OG.state.power(), k: OG.state.data.stats.mpKills, me: 1 }].concat(Object.values(this.players)).sort((a, b) => (b.k || 0) - (a.k || 0) || b.pw - a.pw);
      this.boardEl.innerHTML = `<h3 style="margin:0 0 8px">🏆 לוח שחקנים · ${this.room}</h3>` + rows.map(r => `<div style="display:flex;gap:12px;padding:3px 0;${r.me ? 'color:#22d3ee;font-weight:800' : ''}"><span style="flex:1">${esc(r.n)}</span><span>💪 ${r.pw}</span><span>⚔️ ${r.k || 0}</span></div>`).join('');
    },

    /* ---------------- drawing ---------------- */
    draw(c, vis) {
      const W = this.W, t = W.time;
      for (const id in this.players) {
        const p = this.players[id]; if (!vis(p.x, p.y, 120)) continue;
        if (p.c && OG.VEH[p.c]) { const v = p.veh && p.veh.type === p.c ? p.veh : (p.veh = OG.makeVehicle(p.c, p.x, p.y, p.a, p.col)); v.x = p.x; v.y = p.y; v.a = p.a; v.vx = p.vx; v.vy = p.vy; v.color = p.col; v.parked = false; v.driver = id; OG.drawVehicle(c, v, t, W); }
        else if (p.dead) { c.font = `22px ${EMOJI}`; c.textAlign = 'center'; c.fillText('💀', p.x, p.y); }
        else { W.drawPed(c, p.x, p.y, p.a, p.ph, p.col, '#f1c9a5', '#3b2a1a', 1.18); c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.fillStyle = '#222'; c.fillRect(8, -2, 13, 4); c.restore(); }
        c.save(); c.textAlign = 'center'; c.font = '800 13px Heebo, Arial'; const label = `${p.n}  💪${p.pw}`; c.strokeStyle = 'rgba(0,0,0,.8)'; c.lineWidth = 4; c.strokeText(label, p.x, p.y - 38); c.fillStyle = p.col; c.fillText(label, p.x, p.y - 38);
        const w = 38; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(p.x - w / 2, p.y - 32, w, 5); c.fillStyle = p.hp / (p.mhp || 100) > .4 ? '#4ade80' : '#f87171'; c.fillRect(p.x - w / 2, p.y - 32, w * Math.max(0, p.hp / (p.mhp || 100)), 5);
        if (p.busy) { c.font = `14px ${EMOJI}`; c.fillText('📖', p.x + 24, p.y - 34); }
        c.restore();
      }
      for (const e of this.emotes) { const p = e.id === this.id ? (W.P.car || W.P) : this.players[e.id]; if (!p) continue; c.save(); c.globalAlpha = Math.max(0, 1 - e.t / 2.5); c.font = `30px ${EMOJI}`; c.textAlign = 'center'; c.fillText(e.e, p.x, p.y - 56 - e.t * 14); c.restore(); }
    },
    minimapDots() { const out = []; for (const id in this.players) { const p = this.players[id]; out.push({ x: p.x, y: p.y, c: p.col, r: 4, ring: true }); } return out; },

    /* ---------------- lobby UI ---------------- */
    openLobby() {
      const root = el('div.screen'); document.getElementById('screens').append(root); const close = () => root.remove();
      const render = () => {
        root.innerHTML = ''; const p = el('div.panel', { style: { width: 'min(640px,96vw)' } });
        p.append(el('div.row', el('h2', { text: '🌐 רב־משתתפים' }), el('div.grow'), el('button.btn.small', { text: '✕', onclick: close })));
        if (this.active) {
          p.append(el('div.callout.good', { html: `מחוברים לחדר <b>${this.room}</b> (${this.net.kind === 'local' ? 'מקומי – אותו דפדפן' : 'אונליין'}) כ-<b>${esc(this.name)}</b> · 👥 ${this.count()} שחקנים` }), el('div.muted', { html: Object.values(this.players).map(q => `${esc(q.n)} (💪${q.pw})`).join(' · ') || 'עוד אין שחקנים אחרים – שלחו חברים את קוד החדר!' }));
          p.append(el('p.muted', { html: '<b>Enter</b> צ׳אט · <b>V</b> אימוג׳י · <b>Tab</b> לוח תוצאות. ירי בשחקנים מחוץ לאזורים הבטוחים (🕊️) פוגע בהם. ככל שסיימתם יותר פרקים ומשימות – הכוח (💪) שלכם גבוה יותר: יותר נזק ובריאות. אפשר גם להיכנס לבניין־פרק באמצע – השחקנים האחרים יראו 📖.' }), el('div.row', el('button.btn.danger', { text: 'התנתקות', onclick: () => { this.leave(); render(); } }), el('button.btn.primary', { text: 'חזרה למשחק', onclick: close })));
        } else {
          const cfg = getCfg(); const nm = el('input', { value: this.name || ('Router' + Math.floor(Math.random() * 900 + 100)), maxlength: 14, style: inp() }), rm = el('input', { value: 'city', maxlength: 20, style: inp() });
          p.append(el('p', { text: 'שחקו עם חברים באותו עולם: כולם נכנסים לאותו קוד חדר. אפשר להילחם זה בזה, ואפשר גם ללמוד ולהיכנס לפרקים – מי שמשלים יותר פרקים ומשימות הופך חזק יותר.' }), el('label.muted', { text: 'שם שחקן' }), nm, el('label.muted', { text: 'קוד חדר (עד 8 שחקנים)' }), rm);
          const msg = el('div.muted', { style: { minHeight: '22px', marginTop: '8px' } });
          const go = async (mode) => { msg.innerHTML = '⏳ מתחבר…'; try { await this.join({ name: nm.value.trim() || 'Router', room: rm.value.trim(), mode, cfg: getCfg() }); render(); } catch (e) { msg.innerHTML = '❌ ' + esc(e.message || String(e)); } };
          p.append(msg, el('div.row', { style: { marginTop: '8px' } }, el('button.btn.primary', { text: cfg ? '🌐 התחברות אונליין' : '🌐 אונליין (צריך הגדרת Firebase)', onclick: () => { if (!getCfg()) { msg.innerHTML = '⚠️ עוד לא הוגדר Firebase – הדביקו את ה-config למטה.'; return; } go('firebase'); } }), el('button.btn', { text: '🖥️ מקומי (לשוניות באותו דפדפן)', onclick: () => go('local') })));
          const ta = el('textarea', { placeholder: 'הדביקו כאן את firebaseConfig (הבלוק { apiKey: …, databaseURL: … } מ-Firebase Console)', style: { ...inp(), height: '90px', direction: 'ltr', fontFamily: 'monospace', fontSize: '12px' } });
          const sv = el('button.btn.small', { text: 'שמירת הגדרות', onclick: () => { const c = parseCfg(ta.value); if (!c) { msg.innerHTML = '❌ לא זוהה databaseURL בהגדרה'; return; } try { localStorage.setItem(LSKEY, JSON.stringify(c)); } catch (e) { } msg.innerHTML = '✅ נשמר בדפדפן הזה'; render(); } });
          p.append(el('details', { style: { marginTop: '12px' } }, el('summary', { text: '⚙️ הגדרת Firebase (פעם אחת)' }), el('div.muted', { style: { margin: '6px 0' }, html: 'מומלץ לשמור את ה-config בקובץ <code>js/firebase-config.js</code> כדי שכל השחקנים יתחברו אוטומטית. כאן אפשר לבדוק מהר בדפדפן שלכם בלבד.' }), ta, sv));
        }
        root.append(p);
      }; render();
    }
  };
  const inp = () => ({ display: 'block', width: '100%', background: '#0a1024', color: '#fff', border: '1px solid #2b3a6e', borderRadius: '8px', padding: '8px 10px', margin: '4px 0 8px', fontSize: '15px', boxSizing: 'border-box' });
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  addEventListener('beforeunload', () => { try { MP.active && MP.net.leave(); } catch (e) { } });
})(window.OG);
