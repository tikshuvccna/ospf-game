/* Chapter 5 minigame – Wildcard Vault: crack the lock by converting masks/wildcards and matching interfaces */
(function (OG) {
  const { el, pick, randi, shuffle } = OG;
  const P_ALL = [8, 16, 24, 25, 26, 27, 28, 29, 30, 22, 23, 21, 20, 19, 17, 12];
  const maskOf = p => OG.prefix2mask(p), wildOf = p => OG.mask2wild(OG.prefix2mask(p));

  // round generators ---------------------------------------------------------------
  function rMask2Wild(level, mc) {
    const p = pick(level === 1 ? [8, 16, 24, 25, 26, 27, 28, 30] : P_ALL); const asPrefix = level >= 2 && Math.random() < .3;
    const ans = wildOf(p); const q = asPrefix ? `/${p}` : maskOf(p);
    const r = { type: 'mask2wild', q: `מהו ה-Wildcard של <b class="ltr">${q}</b> ?`, ans, expl: `${asPrefix ? `/${p} = ${maskOf(p)}. ` : ''}255.255.255.255 − ${maskOf(p)} = ${ans}` };
    if (mc) { const d = new Set([ans]); const pool = [maskOf(p), wildOf(Math.min(32, p + 1)), wildOf(Math.max(1, p - 1)), wildOf(Math.min(30, p + 2)), OG.mask2wild(maskOf(p)).split('.').reverse().join('.')]; for (const x of shuffle(pool)) if (d.size < 4) d.add(x); r.opts = shuffle([...d]); }
    return r;
  }
  function rWild2Mask(level, mc) {
    const p = pick(level === 1 ? [8, 16, 24, 25, 26, 27, 28, 30] : P_ALL); const w = wildOf(p), ans = maskOf(p);
    const r = { type: 'wild2mask', q: `איזו מסכת רשת מתאימה ל-Wildcard <b class="ltr">${w}</b> ?`, ans, expl: `255.255.255.255 − ${w} = ${ans} (/${p})` };
    if (mc) { const d = new Set([ans]); for (const x of shuffle([w, maskOf(Math.min(30, p + 1)), maskOf(Math.max(1, p - 1)), maskOf(Math.min(30, p + 2))])) if (d.size < 4) d.add(x); r.opts = shuffle([...d]); }
    return r;
  }
  function rMatch(level) {
    const p = pick([22, 23, 24, 25, 26, 27]); const base = `${pick([10, 172, 192])}.${randi(16, 31)}.${randi(0, 3) * 4}.0`;
    const bn = OG.ip2n(base) >>> 0; const size = 2 ** (32 - p); const net = OG.n2ip(Math.floor(bn / size) * size); const wild = wildOf(p);
    const nn = OG.ip2n(net); const cand = [nn + 5, nn + size - 2, nn + size + 4, nn - 3, nn + Math.floor(size / 2)].map(OG.n2ip);
    const ifs = shuffle(cand).slice(0, 4).map((ip, i) => ({ n: ['Fa0/0', 'Fa0/1', 'Gi0/0', 'Se1/0'][i], ip, hit: OG.inWild(ip, net, wild) }));
    return { type: 'match', q: `הפקודה <code class="ltr">network ${net} ${wild} area 0</code> – על אילו ממשקים OSPF יופעל?`, ifs, expl: `הטווח: ${net} עד ${OG.n2ip(OG.ip2n(net) + size - 1)}. ממשקים שבתוכו: ${ifs.filter(i => i.hit).map(i => i.ip).join(', ') || 'אף אחד'}.` };
  }
  function rCmd() {
    const p = pick([21, 22, 23, 24, 26, 27]); const size = 2 ** (32 - p); const base = OG.ip2n(`${pick([10, 172])}.${randi(16, 31)}.0.0`); const net = OG.n2ip(Math.floor((base + randi(1, 200) * 256) / size) * size);
    const w = wildOf(p); const wrongs = new Set([`network ${net} ${maskOf(p)} area 0`, `network ${net} ${wildOf(Math.min(30, p + 1))} area 0`, `network ${net} ${wildOf(Math.max(8, p - 2))} area 0`, `network ${net} 0.0.0.255 area 0`]);
    wrongs.delete(`network ${net} ${w} area 0`); const opts = shuffle([`network ${net} ${w} area 0`, ...[...wrongs].slice(0, 3)]);
    return { type: 'cmd', q: `באילו פקודה תפעילו OSPF בדיוק על הרשת <b class="ltr">${net}/${p}</b> באזור 0?`, opts, ans: `network ${net} ${w} area 0`, expl: `/${p} ⟹ מסכה ${maskOf(p)} ⟹ Wildcard ${w}. בפקודת network משתמשים ב-Wildcard (לא במסכה).` };
  }

  OG.games.ch5 = {
    title: 'פריצת הכספת', story: 'כספת הבנק נפתחת רק כשפותרים את כל המנעולים. כל מנעול הוא חידת Wildcard. פתרו מהר ובלי טעויות – לפני שהמעורר מופעל!',
    how: { 1: 'בחרו את התשובה הנכונה: המרת מסכה ל-Wildcard ולהפך.', 2: 'מקלידים את התשובה! כולל רשתות מסובנטות ו-/prefix. Enter לאישור.', 3: 'מנעולים מעורבים: המרות מוקלדות, "אילו ממשקים יופעלו" ובחירת הפקודה הנכונה. זמן קצר לכל מנעול.' },
    cfg: { 1: { tasks: 10, lives: 3, time: 130 }, 2: { tasks: 10, lives: 3, time: 150 }, 3: { tasks: 12, lives: 3, time: 170 } },
    help: 'Enter = אישור',
    start(stage, level, sh) {
      const root = el('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', overflow: 'auto' } }); stage.append(root);
      const card = el('div.panel', { style: { width: 'min(720px,96%)', textAlign: 'center' } }); root.append(card);
      let R = null, locked = false, ET = 0; const secs = [0, 14, 18, 20][level];
      function gen() {
        if (level === 1) return Math.random() < .5 ? rMask2Wild(1, true) : rWild2Mask(1, true);
        if (level === 2) { const r = Math.random(); return r < .4 ? rMask2Wild(2, false) : r < .8 ? rWild2Mask(2, false) : rMatch(2); }
        const r = Math.random(); return r < .3 ? rMask2Wild(3, false) : r < .5 ? rWild2Mask(3, false) : r < .75 ? rMatch(3) : rCmd();
      }
      function next() {
        locked = false; R = gen(); card.innerHTML = ''; ET = 0;
        const dial = el('div', { style: { fontSize: '54px', filter: 'drop-shadow(0 0 14px #22d3ee)' }, text: '🔐' });
        const bar = el('div.progress', el('i')); const fb = el('div.fb', { style: { display: 'none', marginTop: '10px', textAlign: 'right' } });
        card.append(dial, el('div', { style: { fontSize: '24px', fontWeight: 800, margin: '8px 0 12px', lineHeight: 1.6 }, html: R.q }), bar);
        card.bar = bar;
        const submit = ans => finish(ans);
        if (R.type === 'match') {
          const sel = new Set(); const list = el('div', { style: { margin: '10px 0' } });
          R.ifs.forEach(i => { const b = el('button.opt', { html: `<b>${i.n}</b> &nbsp; <code>${i.ip}</code>`, onclick() { if (locked) return; if (sel.has(i.ip)) { sel.delete(i.ip); b.classList.remove('ok'); } else { sel.add(i.ip); b.classList.add('ok'); } OG.snd.play('click'); } }); list.append(b); });
          card.append(list, el('button.btn.primary', { text: 'אישור 🔓', onclick() { const ok = R.ifs.every(i => i.hit === sel.has(i.ip)); submit(ok ? '__ok' : '__bad'); } }));
        } else if (R.opts) {
          const list = el('div', { style: { display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' } });
          R.opts.forEach(o => list.append(el('button.opt', { style: { textAlign: 'center', fontFamily: 'var(--mono)', direction: 'ltr' }, text: o, onclick: () => submit(o) })));
          card.append(list);
        } else {
          const inp = el('input', { type: 'text', placeholder: 'לדוגמה 0.0.0.255', autocomplete: 'off', style: { fontSize: '24px', width: '260px', textAlign: 'center' } });
          inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') submit(inp.value.trim()); });
          card.append(el('div.row', { style: { justifyContent: 'center' } }, inp, el('button.btn.primary', { text: 'אישור 🔓', onclick: () => submit(inp.value.trim()) })));
          setTimeout(() => inp.focus(), 50);
        }
        card.append(fb); card.fb = fb;
      }
      function finish(ans, timeout) {
        if (locked) return; locked = true; OG.snd.init();
        const ok = !timeout && (R.type === 'match' ? ans === '__ok' : ans === R.ans);
        const fb = card.fb; fb.style.display = ''; fb.className = 'fb ' + (ok ? 'ok' : 'no');
        fb.innerHTML = (timeout ? '⏰ נגמר הזמן. ' : ok ? '🔓 נפתח! ' : '🔒 שגוי. ') + (ok ? '' : `<br>התשובה: <b class="ltr">${R.ans || ''}</b><br>`) + R.expl;
        const spent = ET;
        if (ok) sh.correct({ speed: Math.max(0, 1 - spent / secs), x: 360, y: 90 }); else sh.wrong({ advance: true, msg: '✖', x: 360, y: 90 });
        setTimeout(() => { if (!sh.ended) next(); }, ok ? 1100 : 3000);
      }
      next();
      const l = sh.raf(dt => { if (locked) return; ET += dt; const left = secs - ET; if (card.bar) card.bar.firstChild.style.width = Math.max(0, left / secs * 100) + '%'; if (left <= 0) finish('', true); });
      return { destroy() { l.stop(); root.remove(); } };
    }
  };
})(window.OG);
