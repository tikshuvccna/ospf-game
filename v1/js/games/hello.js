/* Chapter 3 minigame – Border Control: compare two Hello packets, approve or reject and mark the mismatching fields */
(function (OG) {
  const { el, pick, randi, shuffle } = OG;
  const rid = () => `${randi(1, 9)}.${randi(1, 9)}.${randi(1, 9)}.${randi(1, 9)}`;

  function defs(level) {
    const d = [
      { k: 'area', n: 'Area ID', must: 'same' }, { k: 'hello', n: level === 3 ? 'Hello interval' : 'Hello / Dead', must: 'same' }];
    if (level === 3) d.push({ k: 'dead', n: 'Dead interval', must: 'same' });
    d.push({ k: 'net', n: 'רשת + מסכה', must: 'same' });
    if (level >= 2) d.push({ k: 'auth', n: 'אימות', must: 'same' }, { k: 'stub', n: 'סוג אזור', must: 'same' }, { k: 'ip', n: 'כתובת IP', must: 'diff' });
    d.push({ k: 'rid', n: 'Router-ID', must: 'diff' });
    if (level >= 2) d.push({ k: 'prio', n: 'Priority', must: 'free' });
    if (level === 3) d.push({ k: 'pid', n: 'Process ID', must: 'free' }, { k: 'cost', n: 'Cost של הממשק', must: 'free' });
    if (level === 1) return d.filter(x => ['area', 'hello', 'net', 'rid'].includes(x.k));
    return d;
  }

  function genPair(level) {
    const D = defs(level); const N = randi(1, 8);
    const base = { area: pick(['0', '0', '1', '2']), hello: level === 3 ? '10' : '10 / 40', dead: '40', net: `192.168.${N}.0 /24`, auth: pick(['אין', 'cisco', 'OSPF-key']), stub: 'רגיל', prio: pick(['1', '1', '1', '100']), pid: pick(['1', '10', '100']), cost: pick(['1', '10', '64']) };
    const A = { ...base, ip: `192.168.${N}.1`, rid: rid() }, B = { ...base, ip: `192.168.${N}.2`, rid: rid() };
    while (B.rid === A.rid) B.rid = rid();
    if (Math.random() < .5) { A.stub = B.stub = pick(['רגיל', 'Stub']); }
    const must = D.filter(x => x.must !== 'free').map(x => x.k);
    const m = level === 1 ? (Math.random() < .35 ? 0 : 1) : (() => { const r = Math.random(); return r < .25 ? 0 : r < .75 ? 1 : 2; })();
    const bad = shuffle(must).slice(0, m);
    const why = {};
    for (const k of bad) {
      if (k === 'area') { B.area = pick(['0', '1', '2'].filter(x => x !== A.area)); why[k] = `Area ${A.area} מול Area ${B.area} – חייבים להיות באותו אזור.`; }
      if (k === 'hello') { if (level === 3) { B.hello = '5'; why[k] = 'Hello interval שונה (10 מול 5).'; } else { B.hello = '5 / 20'; why[k] = 'הטיימרים שונים (10/40 מול 5/20).'; } }
      if (k === 'dead') { B.dead = '30'; why[k] = 'Dead interval שונה (40 מול 30) – גם הוא חייב להתאים.'; }
      if (k === 'net') { if (Math.random() < .5) { B.net = `192.168.${N} .0 /25`.replace(' ', ''); B.ip = `192.168.${N}.2`; why[k] = 'מסכת הרשת שונה (/24 מול /25).'; } else { B.net = `192.168.${N + 1}.0 /24`; B.ip = `192.168.${N + 1}.2`; why[k] = 'הרשתות שונות – לא באותה רשת.'; } }
      if (k === 'auth') { if (A.auth === 'אין') { B.auth = 'cisco'; why[k] = 'אצל אחד אין אימות ואצל השני יש.'; } else { B.auth = A.auth === 'cisco' ? 'Cisco' : 'cisco'; why[k] = 'סיסמאות האימות שונות.'; } }
      if (k === 'stub') { B.stub = A.stub === 'רגיל' ? 'Stub' : 'רגיל'; why[k] = 'סוג אזור שונה (Stub flag).'; }
      if (k === 'ip') { B.ip = A.ip; why[k] = 'לשני הנתבים אותה כתובת IP – חייבת להיות שונה.'; }
      if (k === 'rid') { B.rid = A.rid; why[k] = 'אותו Router-ID – חייב להיות שונה בין שכנים.'; }
    }
    if (D.some(x => x.k === 'prio') && Math.random() < .6) B.prio = pick(['0', '1', '50', '200'].filter(x => x !== A.prio));
    if (D.some(x => x.k === 'pid') && Math.random() < .6) B.pid = pick(['2', '20', '200']);
    if (D.some(x => x.k === 'cost') && Math.random() < .6) B.cost = pick(['5', '20', '100']);
    return { D, A, B, bad, why, na: 'R-' + randi(1, 4), nb: 'R-' + randi(5, 9) };
  }

  OG.games.ch3 = {
    title: 'בקרת הגבולות', story: 'ספינות־נתבים מגיעות לנמל. בדקו את תעודות ה-Hello של שתיים סמוכות: אם הכול תקין – אשרו שכנות. אם לא – סמנו את <b>השדות הבעייתיים</b> ודחו.',
    how: { 1: 'לחצו על שורה כדי לסמן אותה כבעייתית. אם אין בעיה – "אשר". אחרת – סמנו בדיוק את השדות הבעייתיים ולחצו "דחה".', 2: 'עוד שדות, כולל מלכודות: Priority לא חייב להתאים, אבל IP ו-Router-ID חייבים להיות שונים.', 3: 'שדות נפרדים ל-Hello ול-Dead, ועוד "שדות פתיינים" (Process ID, Cost) שאין חובה שיתאימו. הזמן קצר!' },
    cfg: { 1: { tasks: 8, lives: 3 }, 2: { tasks: 10, lives: 3 }, 3: { tasks: 12, lives: 3 } },
    help: 'סמנו שורות בעייתיות ← "דחה" · אם הכול תקין ← "אשר"',
    start(stage, level, sh) {
      const root = el('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '10px' } }); stage.append(root);
      const secs = [0, 25, 19, 13][level]; let round = null, locked = false, left = 0; const marked = new Set();
      const card = el('div.panel', { style: { width: 'min(760px,96%)', position: 'relative' } }); root.append(card);
      const bar = el('div.progress', el('i')); const stamp = el('div', { style: { position: 'absolute', inset: 0, display: 'none', alignItems: 'center', justifyContent: 'center', fontSize: '64px', fontWeight: 900, transform: 'rotate(-12deg)', pointerEvents: 'none', zIndex: 3, textShadow: '0 0 30px currentColor' } });
      let tick = null;
      function newRound() {
        locked = false; marked.clear(); round = genPair(level); left = secs; card.innerHTML = ''; stamp.style.display = 'none';
        card.append(stamp);
        card.append(el('div.row', el('div', { style: { fontSize: '40px' }, text: '🚢' }), el('div.grow', el('b', { text: `${round.na}  ⟷  ${round.nb}` }), el('div.muted', { text: 'האם הנתבים האלה יוכלו להפוך לשכנים?' })), el('div', { style: { fontSize: '40px' }, text: '🚢' })), bar);
        const grid = el('div.field-grid', { style: { marginTop: '10px', gridTemplateColumns: 'auto 1fr 1fr' } });
        grid.append(el('div.fh', { text: 'שדה' }), el('div.fh', { text: round.na }), el('div.fh', { text: round.nb }));
        round.D.forEach(f => {
          const hint = level === 1 ? (f.must === 'same' ? ' · חייב זהה' : ' · חייב שונה') : '';
          const a = el('div.fcell', { text: round.A[f.k] }), b = el('div.fcell', { text: round.B[f.k] });
          const n = el('button.opt', { style: { margin: 0, padding: '6px 10px' }, html: `${f.n}<span class="muted" style="font-size:11px">${hint}</span>` });
          n.onclick = () => { if (locked) return; OG.snd.play('click'); if (marked.has(f.k)) { marked.delete(f.k); n.classList.remove('no'); a.classList.remove('diff'); b.classList.remove('diff'); } else { marked.add(f.k); n.classList.add('no'); a.classList.add('diff'); b.classList.add('diff'); } };
          f._el = { n, a, b }; grid.append(n, a, b);
        });
        card.append(grid);
        const fb = el('div.fb', { style: { display: 'none' } });
        card.append(fb, el('div.row', { style: { marginTop: '10px', justifyContent: 'center' } },
          el('button.btn.good', { text: '✅ אשר – יהיו שכנים', onclick: () => decide(false, fb) }), el('button.btn.danger', { text: '⛔ דחה – סימנתי את הבעיה', onclick: () => decide(true, fb) })));
        card.fb = fb;
      }
      function decide(reject, fb, timeout) {
        if (locked) return; locked = true; OG.snd.init();
        const truth = new Set(round.bad); let ok;
        if (timeout) ok = false; else if (!reject) ok = truth.size === 0; else ok = truth.size > 0 && marked.size === truth.size && [...marked].every(k => truth.has(k));
        // reveal
        round.D.forEach(f => { const bad = truth.has(f.k); if (bad) { f._el.a.classList.add('diff'); f._el.b.classList.add('diff'); f._el.n.classList.add('no'); } else f._el.n.classList.remove('no'); });
        const msg = truth.size ? '<ul style="margin:4px 0;padding-right:18px">' + round.bad.map(k => `<li>${round.why[k]}</li>`).join('') + '</ul>' : 'אין שום בעיה – כל מה שחייב להתאים תואם, והשונה (Priority/Process/Cost) לא משפיע.';
        fb.style.display = ''; fb.className = 'fb ' + (ok ? 'ok' : 'no'); fb.innerHTML = (timeout ? '⏰ נגמר הזמן! ' : ok ? '✅ נכון! ' : '❌ לא מדויק. ') + (truth.size ? 'הבעיות:' : '') + msg;
        stamp.style.display = 'flex'; stamp.style.color = truth.size ? '#fb7185' : '#34d399'; stamp.textContent = truth.size ? 'נדחה ✖' : 'מאושר ✔'; OG.snd.play('stamp');
        if (ok) sh.correct({ speed: left / secs, x: 300, y: 120 }); else sh.wrong({ advance: true, msg: timeout ? '⏰' : '✖', x: 300, y: 120 });
        setTimeout(() => { if (!sh.ended) newRound(); }, ok ? 1700 : 2900);
      }
      newRound();
      const l = sh.raf(dt => { if (locked) return; left -= dt; bar.firstChild.style.width = Math.max(0, left / secs * 100) + '%'; if (left <= 0) decide(true, card.fb, true); });
      return { destroy() { l.stop(); root.remove(); } };
    }
  };
})(window.OG);
