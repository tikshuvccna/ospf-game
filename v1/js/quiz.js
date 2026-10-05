/* OSPF City – multiple-choice engine (used by lesson checkpoints and chapter quizzes) */
(function (OG) {
  const { el } = OG;

  // item: {q, opts[], a: index, why: string, fb?: {idx: string}}
  OG.mcq = function (parent, item, cb = {}) {
    const order = OG.shuffle(item.opts.map((_, i) => i));
    const wrap = el('div.mcq');
    if (item.q) wrap.append(el('div.q', { html: item.q }));
    const list = el('div'); wrap.append(list);
    const fb = el('div'); wrap.append(fb);
    const row = el('div.row', { style: { marginTop: '8px' } }); wrap.append(row);
    let attempts = 0, solved = false;
    const btns = {};
    order.forEach(i => {
      const b = el('button.opt', { html: item.opts[i] });
      btns[i] = b; list.append(b);
      b.addEventListener('click', () => {
        if (solved) return;
        OG.snd.init();
        attempts++;
        if (i === item.a) {
          solved = true; b.classList.add('ok'); OG.snd.play('ok');
          fb.className = 'fb ok'; fb.innerHTML = '✅ <b>נכון!</b> ' + (item.why || '');
          hintBtn.remove(); revealBtn.remove();
          cb.onDone && cb.onDone({ correct: true, attempts, revealed: false });
        } else {
          b.classList.add('no', 'off'); OG.snd.play('bad');
          fb.className = 'fb no'; fb.innerHTML = '❌ <b>עדיין לא.</b> ' + ((item.fb && item.fb[i]) || 'נסו שוב – חשבו על מה שראיתם בהנפשה.');
          cb.onWrong && cb.onWrong(attempts);
          if (attempts >= (cb.revealAfter || 2)) revealBtn.classList.remove('hidden');
          if (cb.maxAttempts && attempts >= cb.maxAttempts) reveal();
        }
      });
    });
    const hintBtn = el('button.btn.small', { html: '💡 רמז (' + OG.state.data.items.hint + ')', onclick() {
      if (solved) return;
      if (OG.state.data.items.hint <= 0) { OG.toast('אין לכם רמזים. אפשר לקנות בחנות!', 'warn'); return; }
      OG.state.data.items.hint--; OG.state.save(); OG.snd.play('pop');
      const wrong = order.filter(i => i !== item.a && !btns[i].classList.contains('off'));
      OG.shuffle(wrong).slice(0, Math.min(2, wrong.length - 1)).forEach(i => btns[i].classList.add('off'));
      hintBtn.innerHTML = '💡 רמז (' + OG.state.data.items.hint + ')';
      attempts = Math.max(attempts, 1); // using a hint costs the "first try" bonus
    } });
    const reveal = () => {
      if (solved) return; solved = true; btns[item.a].classList.add('ok');
      fb.className = 'fb ok'; fb.innerHTML = '💡 <b>התשובה:</b> ' + item.opts[item.a] + '<br>' + (item.why || '');
      hintBtn.remove(); revealBtn.remove();
      cb.onDone && cb.onDone({ correct: false, attempts, revealed: true });
    };
    const revealBtn = el('button.btn.small.hidden', { text: 'הצג תשובה', onclick: reveal });
    if (cb.allowHint !== false) row.append(hintBtn);
    row.append(revealBtn);
    parent.append(wrap);
    return { el: wrap, reveal };
  };

  OG.Quiz = {
    run(chId, onClose) {
      const ch = OG.chById(chId); const all = OG.quizzes[chId] || [];
      const qs = OG.shuffle(all).slice(0, Math.min(6, all.length));
      let i = 0, pts = 0, right = 0, streak = 0; const wrong = [];
      const scr = el('div.screen.solid'); document.getElementById('screens').append(scr);
      OG.ui && OG.ui.pauseWorld(true);
      const close = res => { scr.remove(); onClose && onClose(res); };
      const render = () => {
        scr.innerHTML = '';
        if (i >= qs.length) return summary();
        const p = el('div.panel.quiz');
        p.append(el('div.quiz-top', el('h2', { text: `❓ חידון – ${ch.title}` }), el('div.grow'), el('span.tag', { text: `שאלה ${i + 1}/${qs.length}` }), el('span.tag', { html: `⭐ ${pts}` }), streak >= 2 ? el('span.tag', { html: `🔥 ${streak}` }) : ''));
        const prog = el('div.progress', el('i')); prog.firstChild.style.width = (i / qs.length * 100) + '%'; p.append(prog);
        const holder = el('div'); p.append(holder);
        const nextBtn = el('button.btn.primary.hidden', { text: i === qs.length - 1 ? 'לסיכום ←' : 'לשאלה הבאה ←', onclick() { i++; render(); } });
        const item = qs[i];
        OG.mcq(holder, item, {
          onDone(r) {
            if (r.correct) { const g = r.attempts === 1 ? 10 : 5; pts += g; right++; streak++; if (streak >= 3) { pts += 2; } if (r.attempts > 1) streak = 0; }
            else { streak = 0; wrong.push(item); }
            nextBtn.classList.remove('hidden');
          }
        });
        p.append(el('div.row', { style: { marginTop: '14px' } }, el('button.btn.small', { text: 'יציאה לעיר', onclick() { close({ aborted: true }); } }), el('div.grow'), nextBtn));
        scr.append(p);
      };
      const summary = () => {
        const pct = Math.round(right / qs.length * 100), passed = pct >= 60 || right >= qs.length - 2;
        const c = OG.state.ch(chId); const prev = c.quiz ? c.quiz.pts : 0;
        if (!c.quiz || pts > c.quiz.pts) c.quiz = { best: pct, pts, passed: passed || (c.quiz && c.quiz.passed) };
        else if (passed) c.quiz.passed = true;
        OG.state.addCoins(Math.round(pts / 2)); OG.state.save();
        OG.snd.play(passed ? 'win' : 'lose');
        const p = el('div.panel.quiz.result');
        p.append(el('div.big', { text: pts + ' נק׳' }), el('div.grade', { html: passed ? '🎉 עברתם את החידון!' : '😅 כמעט – נסו שוב אחרי חזרה קצרה' }),
          el('p.muted', { html: `ענו נכון על ${right} מתוך ${qs.length} (${pct}%). ${passed ? '' : 'צריך לפחות 4 תשובות נכונות.'}` }));
        if (wrong.length) { const w = el('div.callout.info', { html: '<b>כדאי לחזור על:</b><ul>' + wrong.map(q => `<li>${q.q}<br><span class="muted">${q.why || ''}</span></li>`).join('') + '</ul>' }); w.style.textAlign = 'right'; p.append(w); }
        p.append(el('div.row', { style: { justifyContent: 'center', marginTop: '12px' } },
          el('button.btn', { text: '🔁 שוב', onclick() { i = 0; pts = 0; right = 0; streak = 0; wrong.length = 0; qs.splice(0, qs.length, ...OG.shuffle(all).slice(0, Math.min(6, all.length))); render(); } }),
          el('button.btn.primary', { text: 'המשך ←', onclick() { close({ passed, pts, pct }); } })));
        scr.innerHTML = ''; scr.append(p);
      };
      render();
    }
  };
})(window.OG);
