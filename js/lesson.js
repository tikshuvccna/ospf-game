/* OSPF City – lesson player: animated steps, playback controls, checkpoint questions */
(function (OG) {
  const { el } = OG;

  OG.Lesson = {
    open(chId, onClose) {
      const ch = OG.chById(chId), L = OG.lessons[chId];
      if (!L) { OG.toast('השיעור בבנייה', 'warn'); onClose && onClose({}); return; }
      const steps = L.steps; const cdata = OG.state.ch(chId); cdata.chk = cdata.chk || {};
      let idx = 0, playing = true, speed = 1, scene = null, loopT = 0, frozen = false; const seen = new Set(), solved = new Set(Object.keys(cdata.chk).map(Number));
      const free = OG.state.data.settings.free;

      const root = el('div.screen.solid'); const lesson = el('div.lesson'); root.append(lesson);
      document.getElementById('screens').append(root);
      OG.ui && OG.ui.pauseWorld(true);

      const prog = el('div.progress.l-prog', el('i'));
      const counter = el('span.stepcount');
      lesson.append(el('div.l-top',
        el('button.btn.small', { text: '✕ יציאה', onclick: () => close(false) }),
        el('h2', { html: `${ch.icon} פרק ${ch.num}: ${ch.title}` }), el('div.grow'), prog, counter));
      const textCol = el('div.l-text'), stage = el('div.l-stage'), view = el('div.stage-view');
      const body = el('div.l-body', textCol, stage); lesson.append(body);
      const bPlay = el('button.cbtn', { title: 'הפעלה / עצירה (רווח)', text: '⏸' }), bRe = el('button.cbtn', { title: 'הפעל מההתחלה', text: '↻' }), bEnd = el('button.cbtn', { title: 'דלג לסוף ההנפשה', text: '⏭' });
      const bSub = el('button.cbtn', { title: 'צעד קטן אחורה (1 שנ׳)', text: '⏪' }), bSf = el('button.cbtn', { title: 'צעד קטן קדימה (1 שנ׳)', text: '⏩' });
      const seg = el('div.seg'); [[.5, '0.5×'], [1, '1×'], [2, '2×'], [3, '3×']].forEach(([v, t]) => { const b = el('button', { text: t, onclick() { speed = v; [...seg.children].forEach(c => c.classList.toggle('on', c === b)); } }); if (v === 1) b.classList.add('on'); seg.append(b); });
      const ctl = el('div.stage-ctl', bSub, bPlay, bSf, bRe, bEnd, el('span.wlabel', { text: 'מהירות' }), seg);
      stage.append(view, ctl);

      const h3 = el('h3'), bodyEl = el('div.step-body'), checkEl = el('div'), nav = el('div.l-nav');
      const bPrev = el('button.btn', { text: '→ הקודם', onclick: () => go(idx - 1) }), bNext = el('button.btn.primary', { text: 'הבא ←', onclick: () => next() });
      const dots = el('div.dots');
      nav.append(bPrev, dots, bNext); textCol.append(h3, bodyEl, checkEl, nav);

      function close(done) {
        loop.stop(); document.removeEventListener('keydown', keys); if (scene) scene.destroy(); root.remove();
        OG.ui && OG.ui.pauseWorld(false); onClose && onClose({ done });
      }
      function stepLocked(i) { const s = steps[i]; return s.check && !solved.has(i) && !free; }
      function next() {
        if (idx >= steps.length - 1) { finish(); return; }
        if (stepLocked(idx)) { OG.toast('ענו על השאלה כדי להמשיך 🙂', 'warn'); return; }
        go(idx + 1);
      }
      function finish() {
        const c = OG.state.ch(chId); const first = !c.lesson; c.lesson = true;
        if (first) { OG.state.data.bonusScore += 20; OG.state.addCoins(15); OG.toast('סיימתם את השיעור! +20 נק׳ ו-15 🪙', 'good'); OG.snd.play('level'); }
        OG.state.save(); close(true);
      }
      function setStatus() {
        prog.firstChild.style.width = ((idx + 1) / steps.length * 100) + '%';
        counter.textContent = `שלב ${idx + 1} מתוך ${steps.length}`;
        dots.innerHTML = '';
        steps.forEach((s, i) => {
          const d = el('button.dot' + (i === idx ? '.cur' : seen.has(i) ? '.seen' : '') + (s.check ? '.q' : ''), { title: s.title, onclick: () => { if (i > idx && steps.slice(idx, i).some((_, k) => stepLocked(idx + k))) { OG.toast('קודם ענו על השאלה בשלב הנוכחי', 'warn'); return; } go(i); } });
          dots.append(d);
        });
        bPrev.disabled = idx === 0;
        bNext.textContent = idx === steps.length - 1 ? 'סיום שיעור ✓' : 'הבא ←';
        bNext.disabled = stepLocked(idx);
      }
      function build() {
        const s = steps[idx];
        if (scene) { scene.destroy(); scene = null; }
        view.innerHTML = ''; frozen = false;
        if (s.widget) {
          const host = el('div.widget'); view.append(host);
          s.widget(host, { done() { solved.add(idx); setStatus(); }, ch: chId });
          ctl.style.display = 'none';
        } else if (s.scene) {
          ctl.style.display = '';
          scene = new OG.Scene(view, s.size || {});
          s.scene(scene);
          loopT = 0;
        } else if (s.check) {
          let j = idx - 1; while (j >= 0 && !steps[j].scene) j--;
          ctl.style.display = 'none';
          if (j >= 0) { scene = new OG.Scene(view, steps[j].size || {}); steps[j].scene(scene); scene.update(scene.end + 4); scene.update(.5); frozen = true; scene.svg.style.opacity = .55; }
          else view.append(el('div', { style: { fontSize: '120px' }, text: '🧠' }));
        } else ctl.style.display = 'none';
        stage.classList.toggle('paused', !playing);
      }
      function go(i) {
        if (i < 0 || i >= steps.length) return;
        idx = i; seen.add(i); const s = steps[i];
        h3.textContent = s.title; bodyEl.innerHTML = s.html || '';
        checkEl.innerHTML = '';
        if (s.check) {
          const box = el('div.check', el('h4', { text: '🧠 בדיקת הבנה' })); checkEl.append(box);
          if (solved.has(i)) { box.append(el('div.fb.ok', { html: '✅ כבר ענית נכון על השאלה הזו.' })); }
          else OG.mcq(box, s.check, {
            onDone(r) {
              solved.add(i); const c = OG.state.ch(chId); c.chk = c.chk || {};
              if (!c.chk[i]) { c.chk[i] = 1; const g = r.correct ? (r.attempts === 1 ? 5 : 2) : 0; c.checks = (c.checks || 0) + g; if (g) OG.pop(document.body, '+' + g, innerWidth / 2, innerHeight / 2); OG.state.save(); OG.ui && OG.ui.refreshHud(); }
              setStatus();
            }
          });
        }
        build(); setStatus(); textCol.scrollTop = 0;
      }
      function togglePlay() { playing = !playing; bPlay.textContent = playing ? '⏸' : '▶'; stage.classList.toggle('paused', !playing); }
      bPlay.onclick = togglePlay;
      bRe.onclick = () => { playing = true; bPlay.textContent = '⏸'; build(); };
      bEnd.onclick = () => { if (scene) { scene.update(scene.end + 3); scene.update(.3); scene.update(.3); } };
      bSf.onclick = () => { if (scene) scene.update(1); };
      bSub.onclick = () => { if (!scene) return; const t = Math.max(0, scene.t - 1); build(); scene.update(t); };
      const keys = e => {
        if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
        if (e.key === 'ArrowLeft') next(); else if (e.key === 'ArrowRight') go(idx - 1);
        else if (e.key === ' ') { e.preventDefault(); togglePlay(); } else if (e.key === 'Escape') close(false);
      };
      document.addEventListener('keydown', keys);
      const loop = OG.loop(dt => {
        if (!scene || !playing || frozen) return;
        scene.update(dt * speed);
        if (steps[idx].loop !== false && scene.finished) { loopT += dt * speed; if (loopT > 2.2) { const keep = true; build(); } }
      });
      go(0);
    }
  };
})(window.OG);
