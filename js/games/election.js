/* Chapter 6 minigame – Election Day: choose DR and BDR (and handle a DR crash) */
(function (OG) {
  const { el, pick, randi, shuffle } = OG;
  const rid = () => `${randi(1, 9)}.${randi(1, 9)}.${randi(1, 9)}.${randi(1, 9)}`;
  const NAMES = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];
  const rank = rs => rs.filter(r => r.alive !== false && r.pri > 0).sort((a, b) => b.pri - a.pri || OG.ip2n(b.rid) - OG.ip2n(a.rid));

  function mkRouters(level, n) {
    const used = new Set(), out = [];
    const pris = level === 1 ? shuffle([1, 50, 100, 200, 10]).slice(0, n) : null;
    for (let i = 0; i < n; i++) {
      let r; do { r = rid(); } while (used.has(r)); used.add(r);
      const o = { name: NAMES[i], rid: r, pri: 1, alive: true, lines: [] };
      if (level === 1) o.pri = pris[i];
      else { const x = Math.random(); o.pri = x < .25 ? 0 : x < .6 ? 1 : pick([1, 100, 100, 200]); }
      if (level === 3) {
        const mode = pick(['manual', 'loop', 'phys']);
        const p1 = rid(), p2 = rid();
        if (mode === 'manual') { o.lines = [`router-id ${r}`, `Fa0/0 ${p1}`, `Gi0/1 ${p2}`]; }
        else if (mode === 'loop') { o.lines = [`Lo0 ${r}`, `Fa0/0 ${p1}`, `Gi0/1 ${p2}`]; }
        else { const hi = OG.ip2n(p1) > OG.ip2n(p2) ? p1 : p2; let lo = hi === p1 ? p2 : p1; o.rid = hi; used.add(hi); if (used.size) { } o.lines = [`Fa0/0 ${p1}`, `Gi0/1 ${p2}`]; }
        o.lines = shuffle(o.lines);
      }
      out.push(o);
    }
    // guarantee unique RIDs after derivation
    const seen = new Set(); out.forEach(o => { while (seen.has(o.rid)) { o.rid = rid(); o.lines = [`router-id ${o.rid}`]; } seen.add(o.rid); });
    // at least two eligible
    if (rank(out).length < 2) { out[0].pri = 1; out[1].pri = 1; }
    return out;
  }

  OG.games.ch6 = {
    title: 'יום הבחירות', story: 'ברחבת העירייה כל הנתבים מצביעים. אתם הקלפי! קבעו מי ה-<b>DR</b> (👑 ראשון) ומי ה-<b>BDR</b> (🥈 שני) לפי הכללים.',
    how: { 1: 'לחצו קודם על ה-DR ואז על ה-BDR. הקדימות לפי Priority גבוה.', 2: 'יש תיקו בקדימות (אז Router-ID גבוה מנצח) ונתבים עם Priority 0 – שלעולם לא נבחרים.', 3: 'ה-Router-ID לא נתון – חשבו אותו (ידני › Loopback › IP פיזי גבוה). ואז קורה אירוע: ה-DR נופל, או נתב חזק מצטרף. מי DR/BDR עכשיו? (זכרו: אין Preemption)' },
    cfg: { 1: { tasks: 6, lives: 3 }, 2: { tasks: 8, lives: 3 }, 3: { tasks: 6, lives: 3 } },
    help: 'לחצו על ה-DR ואז על ה-BDR',
    start(stage, level, sh) {
      const root = el('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', overflow: 'auto' } }); stage.append(root);
      const card = el('div.panel', { style: { width: 'min(980px,98%)', textAlign: 'center' } }); root.append(card);
      const secs = [0, 30, 30, 55][level]; let R, phase, locked, sel, ET, event, before;
      function start() { const n = level === 1 ? randi(3, 4) : level === 2 ? randi(4, 5) : 5; R = mkRouters(level, n); phase = 1; locked = false; sel = []; ET = 0; event = null; render(); }
      function expected() { const e = rank(R); return [e[0], e[1]]; }
      function render(msg) {
        card.innerHTML = '';
        const title = phase === 1 ? 'בחרו: קודם DR, אחר כך BDR' : event.text;
        card.append(el('div', { style: { fontSize: '22px', fontWeight: 800, marginBottom: '6px' }, html: (phase === 2 ? '⚡ ' : '🗳️ ') + title }));
        const bar = el('div.progress', el('i')); card.append(bar); card.bar = bar;
        const row = el('div', { style: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', margin: '14px 0' } });
        R.forEach(r => {
          const si = sel.indexOf(r); const dead = r.alive === false;
          const c = el('button.wbox', { style: { minWidth: '150px', border: `3px solid ${si === 0 ? '#fbbf24' : si === 1 ? '#a78bfa' : r.joined ? '#22d3ee' : '#2b3a6e'}`, background: dead ? '#1a1a22' : '', opacity: dead ? .35 : 1, color: 'inherit', cursor: dead ? 'default' : 'pointer', textAlign: 'center' }, onclick() { pick1(r); } },
            el('div', { style: { fontSize: '34px' }, text: dead ? '💀' : si === 0 ? '👑' : si === 1 ? '🥈' : r.joined ? '🆕' : '🔀' }), el('b', { text: r.name }), el('div', { style: { fontFamily: 'var(--mono)', fontSize: '13px', direction: 'ltr', lineHeight: 1.5 }, html: `Priority <b style="color:#fbbf24">${r.pri}</b>` + (level === 3 && !r.joined && phase === 1 && r.lines.length ? '<br>' + r.lines.join('<br>') : level === 3 && phase === 2 ? `<br>RID ${r.rid}` : `<br>RID ${r.rid}`) }));
          row.append(c);
        });
        card.append(row);
        const fb = el('div.fb', { style: { display: 'none', textAlign: 'right' } }); card.append(fb); card.fb = fb;
        card.append(el('div.row', { style: { justifyContent: 'center' } }, el('button.btn.small', { text: '↺ נקה בחירה', onclick() { if (!locked) { sel = []; render(); } } })));
      }
      function pick1(r) {
        if (locked || r.alive === false) return; OG.snd.init();
        if (sel.includes(r)) return; sel.push(r); OG.snd.play('pop');
        if (sel.length < 2) { render(); return; }
        evaluate();
      }
      function evaluate(timeout) {
        locked = true; const [dr, bdr] = expected(); const ok = !timeout && sel[0] === dr && sel[1] === bdr;
        const list = rank(R).map(r => `${r.name} (Pri ${r.pri}${rank(R).filter(x => x.pri === r.pri).length > 1 ? `, RID ${r.rid}` : ''})`).join(' › ');
        const zero = R.filter(r => r.pri === 0 && r.alive !== false).map(r => r.name);
        const msg = `${ok ? '✅ נכון!' : timeout ? '⏰ נגמר הזמן.' : '❌ לא מדויק.'} <b>DR = ${dr.name}, BDR = ${bdr.name}</b>. דירוג: ${list}${zero.length ? `. ${zero.join(', ')} עם Priority 0 – לא משתתפים.` : ''}${event && event.note ? '<br>' + event.note : ''}`;
        render(); card.fb.style.display = ''; card.fb.className = 'fb ' + (ok ? 'ok' : 'no'); card.fb.innerHTML = msg;
        // keep selection display
        const [a, b] = [dr, bdr]; OG.$$('.wbox', card).forEach((c, i) => { if (R[i] === a) c.style.border = '3px solid #fbbf24'; else if (R[i] === b) c.style.border = '3px solid #a78bfa'; });
        if (!ok) { sh.wrong({ advance: true, x: 400, y: 80 }); setTimeout(() => { if (!sh.ended) start(); }, 3600); return; }
        if (level === 3 && phase === 1) { setTimeout(() => { if (!sh.ended) phase2(dr, bdr); }, 1600); return; }
        sh.correct({ speed: Math.max(0, 1 - ET / secs), x: 400, y: 80 }); setTimeout(() => { if (!sh.ended) start(); }, 1500);
      }
      function phase2(dr, bdr) {
        phase = 2; locked = false; sel = [];
        if (Math.random() < .5) {
          dr.alive = false; event = { text: `💥 ${dr.name} (ה-DR) נפל! מי DR ומי BDR עכשיו?`, note: 'ה-BDR הופך מיד ל-DR, ונבחר BDR חדש מבין הנותרים לפי Priority/Router-ID.' };
          const rest = R.filter(r => r.alive !== false && r !== bdr);
          // new DR must be previous BDR: emulate by giving DR/BDR ranking via custom expected
          R._override = [bdr, rank(rest)[0]];
        } else {
          const n = { name: 'R6', rid: '9.9.9.9', pri: 255, alive: true, lines: [], joined: true }; R.push(n);
          event = { text: `🆕 נתב R6 עם Priority 255 הצטרף לרשת. מי DR ומי BDR עכשיו?`, note: 'אין Preemption! נתב חדש, גם אם חזק מאוד, לא מחליף DR/BDR קיימים עד בחירות חדשות.' };
          R._override = [dr, bdr];
        }
        render();
      }
      const expOrig = expected; expected = function () { return R._override && phase === 2 ? R._override : expOrig(); };
      start();
      const l = sh.raf(dt => { if (locked) return; ET += dt; const left = secs - ET; if (card.bar) card.bar.firstChild.style.width = Math.max(0, left / secs * 100) + '%'; if (left <= 0) { sel = []; evaluate(true); } });
      return { destroy() { l.stop(); root.remove(); } };
    }
  };
})(window.OG);
