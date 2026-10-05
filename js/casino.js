/* OSPF City – Lucky Packets Casino: slots, hi-lo, quiz-bet, exchange desk (coins 🪙 are the chips) */
(function (OG) {
  const { el } = OG;
  const SYM = ['🍒', '🔔', '🍋', '💎', '7️⃣', '📡'];
  const bank = () => OG.state.data;

  OG.Casino = {
    open() {
      const root = el('div.screen'); document.getElementById('screens').append(root); OG.snd.duck(true);
      const close = () => { root.remove(); OG.snd.duck(false); OG.ui.refreshHud(); };
      let tab = 'slots';
      const render = () => {
        root.innerHTML = ''; const d = bank();
        const p = el('div.panel.casino', { style: { width: 'min(820px,96vw)', borderColor: '#f5c542', boxShadow: '0 0 40px rgba(245,197,66,.25)' } });
        p.append(el('div.row', el('h2', { html: '🎰 <span style="color:#f5c542">Lucky Packets</span> Casino' }), el('div.grow'), el('span.chip', { html: `🪙 <b id="cz-coins">${d.coins}</b>` }), el('span.chip', { html: `💵 <b>${d.cash}</b>` }), el('button.btn.small', { text: '✕', onclick: close })));
        const tabs = el('div.row', { style: { margin: '10px 0' } });
        [['slots', '🎰 סלוטס'], ['hilo', '🃏 גבוה/נמוך'], ['quiz', '🧠 הימור OSPF'], ['ex', '💱 החלפה']].forEach(([k, n]) => tabs.append(el('button.btn.small' + (tab === k ? '.primary' : ''), { text: n, onclick() { tab = k; render(); } })));
        p.append(tabs); const body = el('div'); p.append(body);
        ({ slots, hilo, quiz, ex })[tab](body, render);
        p.append(el('div.muted', { style: { fontSize: '12px', marginTop: '10px' }, text: `סך זכיות: ${d.casino.won} 🪙 · הפסדים: ${d.casino.lost} 🪙 · משחקים: ${d.casino.plays} · שחקו באחריות 😉` }));
        root.append(p);
      }; render();
    }
  };

  function betRow(parent, st) {
    const d = bank(); const row = el('div.row', { style: { margin: '8px 0' } }, el('b', { text: 'הימור:' }));
    for (const v of [5, 10, 25, 50]) row.append(el('button.btn.small' + (st.bet === v ? '.warn' : ''), { text: v + ' 🪙', onclick() { st.bet = v; st.rerender(); } }));
    parent.append(row);
  }
  function pay(win, bet) { const d = bank(), net = win - bet; d.casino.plays++; d.coins += net; if (net > 0) d.casino.won += net; else d.casino.lost -= net; OG.state.save(); OG.Ach.check(); const e = document.getElementById('cz-coins'); if (e) e.textContent = d.coins; OG.ui.refreshHud(); }

  /* ---------- slots ---------- */
  const SS = { bet: 10 };
  function slots(body, render) {
    const d = bank(); SS.rerender = render; body.append(el('p.muted', { text: 'שלושה זהים = זכייה! 7️⃣7️⃣7️⃣ = ג׳קפוט ×30 · שני זהים = ×1.5' }));
    const reels = el('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center', fontSize: '64px', margin: '12px 0' } });
    const cells = [0, 1, 2].map(() => { const c = el('div', { text: '🎰', style: { width: '100px', height: '100px', display: 'grid', placeItems: 'center', background: '#0a1024', border: '3px solid #f5c542', borderRadius: '16px', boxShadow: 'inset 0 0 20px rgba(0,0,0,.6)' } }); reels.append(c); return c; });
    body.append(reels); betRow(body, SS);
    const msg = el('div', { style: { textAlign: 'center', minHeight: '28px', fontWeight: 800, fontSize: '18px' } });
    let busy = false;
    const spin = el('button.btn.primary', { text: '🎰 סובבו!', onclick() {
      if (busy) return; if (d.coins < SS.bet) { OG.toast('אין מספיק מטבעות. אפשר להחליף 💵 ב-🪙 בלשונית "החלפה"', 'warn'); OG.snd.play('bad'); return; }
      busy = true; msg.textContent = ''; d.coins -= SS.bet; const e = document.getElementById('cz-coins'); if (e) e.textContent = d.coins;
      const res = []; const r = Math.random(); let target;
      // house edge: ~ 93% RTP
      if (r < .012) target = ['7️⃣', '7️⃣', '7️⃣']; else if (r < .08) { const s = OG.pick(SYM.slice(0, 4).concat(['📡'])); target = [s, s, s]; } else if (r < .3) { const s = OG.pick(SYM); const o = OG.pick(SYM.filter(x => x !== s)); target = OG.shuffle([s, s, o]); } else { target = OG.shuffle(SYM.slice()).slice(0, 3); }
      const stops = [700, 1100, 1500]; const t0 = performance.now();
      const iv = setInterval(() => { const now = performance.now() - t0; cells.forEach((c, i) => { if (now < stops[i]) { c.textContent = OG.pick(SYM); OG.snd.play('slot'); c.style.transform = `translateY(${(Math.random() - .5) * 6}px)`; } else if (c.dataset.done !== '1') { c.dataset.done = '1'; c.textContent = target[i]; c.style.transform = ''; OG.snd.play('click'); } }); if (now > stops[2] + 60) { clearInterval(iv); cells.forEach(c => c.dataset.done = ''); settle(target); } }, 80);
    } });
    const settle = t => {
      busy = false; let win = 0; const all = t[0] === t[1] && t[1] === t[2], two = t[0] === t[1] || t[1] === t[2] || t[0] === t[2];
      if (all) win = t[0] === '7️⃣' ? SS.bet * 30 : SS.bet * 6; else if (two) win = Math.floor(SS.bet * 1.5);
      d.coins += SS.bet; pay(win, SS.bet);
      if (win > SS.bet) { msg.innerHTML = `<span style="color:#34d399">זכיתם ${win} 🪙 ${all && t[0] === '7️⃣' ? '– JACKPOT! 🎉' : ''}</span>`; OG.snd.play(all ? 'jackpot' : 'win'); if (all && t[0] === '7️⃣') { d.ach._jackpot = 1; OG.ui.confetti(); OG.Ach.check(); } }
      else if (win > 0) { msg.innerHTML = `<span style="color:#fbbf24">החזר חלקי: ${win} 🪙</span>`; OG.snd.play('coin'); } else { msg.innerHTML = '<span style="color:#fb7185">לא הפעם…</span>'; OG.snd.play('bad'); }
    };
    body.append(msg, el('div.row', { style: { justifyContent: 'center', marginTop: '8px' } }, spin));
  }

  /* ---------- hi-lo ---------- */
  const HS = { bet: 10 };
  function hilo(body, render) {
    const d = bank(); HS.rerender = render; if (!HS.card) HS.card = 1 + Math.floor(Math.random() * 13); const names = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
    body.append(el('p.muted', { text: 'האם הקלף הבא גבוה או נמוך מהקלף הנוכחי? ניחוש נכון ×1.9 · שוויון = החזר.' }));
    const card = el('div', { text: names[HS.card] || HS.card, style: { width: '110px', height: '150px', margin: '8px auto', borderRadius: '14px', background: '#fff', color: '#111', display: 'grid', placeItems: 'center', fontSize: '64px', fontWeight: 900, border: '3px solid #f5c542', boxShadow: '0 8px 24px rgba(0,0,0,.5)' } });
    body.append(card); betRow(body, HS); const msg = el('div', { style: { textAlign: 'center', minHeight: '28px', fontWeight: 800 } });
    const go = guess => {
      if (d.coins < HS.bet) { OG.toast('אין מספיק מטבעות', 'warn'); OG.snd.play('bad'); return; }
      let n; do { n = 1 + Math.floor(Math.random() * 13); } while (false); const cur = HS.card; let win = 0;
      if (n === cur) { msg.innerHTML = 'שוויון – ההימור הוחזר'; OG.snd.play('click'); pay(0, 0); } else if ((guess === 'hi') === (n > cur)) { win = Math.round(HS.bet * 1.9); pay(win, HS.bet); msg.innerHTML = `<span style="color:#34d399">צדקתם! +${win - HS.bet} 🪙</span>`; OG.snd.play('win'); } else { pay(0, HS.bet); msg.innerHTML = '<span style="color:#fb7185">טעיתם 😅</span>'; OG.snd.play('bad'); }
      HS.card = n; card.textContent = names[n] || n; card.animate([{ transform: 'rotateY(90deg)' }, { transform: 'none' }], { duration: 250 });
    };
    body.append(msg, el('div.row', { style: { justifyContent: 'center', marginTop: '8px' } }, el('button.btn.warn', { text: '⬆️ גבוה', onclick: () => go('hi') }), el('button.btn.warn', { text: '⬇️ נמוך', onclick: () => go('lo') })));
  }

  /* ---------- quiz bet ---------- */
  const QS = { bet: 10 };
  function quiz(body, render) {
    const d = bank(); QS.rerender = render; body.append(el('p.muted', { text: 'הימור על הידע שלכם! ענו נכון בניסיון ראשון = ×2 · טעות = מפסידים את ההימור. (ככל שלמדתם יותר – קל יותר 😉)' }));
    betRow(body, QS); const holder = el('div'); body.append(holder);
    holder.append(el('button.btn.primary', { text: '🧠 שאלה!', onclick() {
      if (d.coins < QS.bet) { OG.toast('אין מספיק מטבעות', 'warn'); return; }
      const pool = []; for (const k in OG.quizzes) pool.push(...OG.quizzes[k]); const item = OG.pick(pool); d.coins -= QS.bet; const e = document.getElementById('cz-coins'); if (e) e.textContent = d.coins; holder.innerHTML = '';
      OG.mcq(holder, item, { maxAttempts: 1, allowHint: false, onDone(r) { d.coins += QS.bet; if (r.correct && r.attempts === 1) { pay(QS.bet * 2, QS.bet); OG.toast(`🧠 נכון! +${QS.bet} 🪙`, 'good'); } else pay(0, QS.bet); holder.append(el('button.btn.small', { text: 'עוד שאלה', onclick: render, style: { marginTop: '8px' } })); } });
    } }));
  }

  /* ---------- exchange ---------- */
  function ex(body, render) {
    const d = bank(); body.append(el('p.muted', { text: 'שער חליפין: 💵 10 = 🪙 1 · 🪙 1 = 💵 6' }));
    const mk = (label, fn) => el('button.btn.warn', { text: label, onclick() { fn(); OG.state.save(); OG.ui.refreshHud(); render(); } });
    body.append(el('div.row', mk('💵 100 → 🪙 10', () => { if (d.cash < 100) { OG.toast('אין מספיק מזומן', 'warn'); return; } d.cash -= 100; d.coins += 10; OG.snd.play('coin'); }), mk('💵 500 → 🪙 50', () => { if (d.cash < 500) { OG.toast('אין מספיק מזומן', 'warn'); return; } d.cash -= 500; d.coins += 50; OG.snd.play('coin'); }), mk('🪙 10 → 💵 60', () => { if (d.coins < 10) { OG.toast('אין מספיק מטבעות', 'warn'); return; } d.coins -= 10; d.cash += 60; OG.snd.play('coin'); })));
  }
})(window.OG);
