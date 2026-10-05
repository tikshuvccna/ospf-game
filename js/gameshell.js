/* OSPF City – minigame shell: intro, countdown, HUD (score/lives/timer), pause, results, scoring */
(function (OG) {
  const { el } = OG;

  OG.Game = {
    // launch: shows intro screen for (chId, level), then runs the game
    launch(chId, level, onExit) {
      const G = OG.games[chId], ch = OG.chById(chId);
      if (!G) { OG.toast('המשחקון בבנייה', 'warn'); onExit && onExit(); return; }
      OG.ui && OG.ui.pauseWorld(true);
      const root = el('div.screen.solid'); document.getElementById('screens').append(root);
      const exit = res => { root.remove(); OG.snd.duck(false); onExit && onExit(res); };
      const useItems = { shield: false, time: false };

      const intro = () => {
        root.innerHTML = '';
        const lv = OG.GAME_LEVELS[level], cfg = G.cfg[level];
        const p = el('div.panel.hub', { style: { '--cc': ch.color } });
        p.append(el('div.hub-head', el('div.hub-icon', { text: '🎮', style: { '--c': ch.color + '33', '--cc': ch.color } }), el('div', el('h2', { text: G.title }), el('div.hub-sub', { html: `${ch.icon} פרק ${ch.num} · רמה: <b style="color:${lv.color}">${lv.icon} ${lv.name}</b> · עד <b>${lv.max}</b> נק׳` }))));
        p.append(el('div.hub-story', { html: G.story || ch.game }));
        p.append(el('div.callout.info', { html: '<b>איך משחקים:</b> ' + (G.how && G.how[level] || G.how || '') }));
        const it = OG.state.data.items;
        const info = [];
        info.push(`❤️ ${cfg.lives || 3} חיים`); if (cfg.time) info.push(`⏱️ ${cfg.time} שניות`); info.push(`🎯 ${cfg.tasks} משימות`);
        p.append(el('div.row', info.map(t => el('span.tag', { text: t }))));
        const sw = el('div.row', { style: { marginTop: '10px' } });
        const mk = (key, label, have) => { const b = el('button.btn.small', { text: `${label} (${have})`, onclick() { if (!OG.state.data.items[key]) { OG.toast('אין פריט כזה – אפשר לקנות בחנות 🛒', 'warn'); return; } useItems[key] = !useItems[key]; b.classList.toggle('good', useItems[key]); } }); sw.append(b); };
        mk('shield', '🛡️ מגן (חיים נוספים)', it.shield); if (cfg.time) mk('time', '⏱️ +15 שניות', it.time);
        p.append(sw);
        p.append(el('div.row', { style: { marginTop: '14px' } },
          el('button.btn', { text: '→ חזרה', onclick: () => exit({}) }), el('div.grow'),
          [1, 2, 3].map(l => el('button.btn.small' + (l === level ? '.warn' : ''), { text: OG.GAME_LEVELS[l].icon + ' ' + OG.GAME_LEVELS[l].name, onclick() { level = l; intro(); } })),
          el('button.btn.primary', { text: '▶ התחל!', onclick: countdown })));
        root.append(p);
      };

      const countdown = () => {
        root.innerHTML = '';
        const n = el('div', { style: { fontSize: '120px', fontWeight: 900, color: '#22d3ee', textShadow: '0 0 40px #22d3ee' } });
        root.append(n); let c = 3;
        const tick = () => { if (c === 0) { n.textContent = 'קדימה!'; OG.snd.play('level'); setTimeout(run, 500); return; } n.textContent = c; OG.snd.play('tick'); c--; setTimeout(tick, 700); };
        tick();
      };

      const run = () => {
        root.innerHTML = ''; OG.snd.duck(true);
        const lv = OG.GAME_LEVELS[level], cfg = G.cfg[level];
        const game = el('div.game', { style: { background: `radial-gradient(1000px 600px at 50% -10%, ${ch.color}33 0%, #0a0f22 65%)` } }); root.append(game);
        const heartsEl = el('span.hearts'), scoreEl = el('span.g-stat', { text: '0' }), timerBar = el('div.g-timer', el('i')), timeEl = el('span.g-stat', { text: '' });
        const top = el('div.g-top', el('span.g-title', { html: `${ch.icon} ${G.title}` }), el('span.g-lvl.l' + level, { text: lv.name }), heartsEl, el('span', { text: '⭐' }), scoreEl, cfg.time ? [timerBar, timeEl] : el('div.grow'),
          el('button.btn.small', { text: '⏸', onclick: () => pause(true) }), el('button.btn.small.danger', { text: '✕', onclick: () => { if (confirm('לצאת מהמשחקון? ההתקדמות תאבד.')) { destroy(); exit({}); } } }));
        const stage = el('div.g-stage'); const helpEl = el('div.g-help'); game.append(top, stage); stage.append(helpEl);

        let lives = cfg.lives || 3, shield = 0, score = 0, doneN = 0, correctN = 0, wrongN = 0, combo = 0, bestCombo = 0, ended = false, paused = false, timeLeft = cfg.time || 0;
        const total = cfg.tasks, unit = lv.max / total;
        if (useItems.shield && OG.state.data.items.shield > 0) { OG.state.data.items.shield--; shield = 1; }
        if (useItems.time && cfg.time && OG.state.data.items.time > 0) { OG.state.data.items.time--; timeLeft += 15; }
        OG.state.save();
        const rafs = new Set();
        const sh = {
          level, cfg, stage, total, ch,
          get paused() { return paused; }, get ended() { return ended; },
          get timeLeft() { return timeLeft; },
          help(t) { helpEl.innerHTML = t || ''; },
          raf(fn) { const l = OG.loop((dt, t) => { if (!paused && !ended) fn(dt, t); }); rafs.add(l); return l; },
          timeout(fn, ms) { const id = setTimeout(() => { if (!ended) fn(); }, ms); return id; },
          correct(o = {}) {
            if (ended) return; doneN++; correctN++; combo++; bestCombo = Math.max(bestCombo, combo);
            const mult = 1 + (o.speed || 0) * .25 + Math.min(.2, (combo - 1) * .04);
            const g = unit * mult; score += g; scoreEl.textContent = Math.round(score);
            OG.snd.play('ok'); game.classList.remove('flash-good'); void game.offsetWidth; game.classList.add('flash-good');
            const r = stage.getBoundingClientRect(); OG.pop(stage, '+' + Math.round(g), o.x ?? r.width / 2, o.y ?? r.height / 2, '#34d399');
            if (combo >= 3) OG.pop(stage, `🔥 קומבו ×${combo}`, (o.x ?? r.width / 2), (o.y ?? r.height / 2) - 28, '#fbbf24');
            if (doneN >= total) sh.finish(true);
          },
          wrong(o = {}) {
            if (ended) return; wrongN++; combo = 0; OG.snd.play('bad');
            game.classList.remove('flash-bad'); void game.offsetWidth; game.classList.add('flash-bad');
            if (o.count !== false) doneN += o.advance ? 1 : 0;
            if (shield > 0) { shield--; OG.toast('🛡️ המגן הציל אתכם!', 'good'); setHearts(); if (o.advance && doneN >= total) sh.finish(true); return; }
            lives--; setHearts();
            const r = stage.getBoundingClientRect(); OG.pop(stage, o.msg || '✖', o.x ?? r.width / 2, o.y ?? r.height / 2, '#fb7185');
            if (lives <= 0) sh.finish(false); else if (o.advance && doneN >= total) sh.finish(true);
          },
          addTime(s) { timeLeft += s; },
          bonus(pts) { score += pts; scoreEl.textContent = Math.round(score); },
          finish(win) { if (ended) return; ended = true; setTimeout(() => result(win), 650); }
        };
        const setHearts = () => { heartsEl.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, (cfg.lives || 3) - lives)) + (shield ? '🛡️' : ''); };
        setHearts();
        const updTimer = () => { timerBar.firstChild.style.width = Math.max(0, timeLeft / (cfg.time + (useItems.time ? 15 : 0)) * 100) + '%'; timeEl.textContent = Math.ceil(Math.max(0, timeLeft)); };
        let tl = null;
        if (cfg.time) { updTimer(); tl = setInterval(() => { if (paused || ended) return; timeLeft -= .2; updTimer(); if (timeLeft <= 0) { sh.finish(doneN >= total * .7); } if (timeLeft <= 5 && timeLeft > 0 && Math.abs(timeLeft - Math.round(timeLeft)) < .11) OG.snd.play('tick'); }, 200); }

        const pauseOv = el('div.screen', { style: { zIndex: 5 } }, el('div.panel', { style: { textAlign: 'center' } }, el('h2', { text: '⏸ מושהה' }), el('div.row', { style: { justifyContent: 'center', marginTop: '10px' } }, el('button.btn.primary', { text: '▶ המשך', onclick: () => pause(false) }), el('button.btn.danger', { text: 'יציאה', onclick() { destroy(); exit({}); } }))));
        function pause(on) { if (ended) return; paused = on; if (on) game.append(pauseOv); else pauseOv.remove(); inst && inst.pause && (on ? inst.pause() : inst.resume && inst.resume()); }
        const kd = e => { if (e.key === 'Escape') pause(!paused); };
        document.addEventListener('keydown', kd);
        function destroy() { clearInterval(tl); document.removeEventListener('keydown', kd); rafs.forEach(l => l.stop()); inst && inst.destroy && inst.destroy(); ended = true; }

        const result = win => {
          clearInterval(tl); rafs.forEach(l => l.stop()); inst && inst.destroy && inst.destroy(); document.removeEventListener('keydown', kd);
          const frac = correctN / total; let pts = Math.round(Math.min(lv.max * 1.15, score)); if (!win && frac < .7) pts = Math.round(Math.min(pts, lv.max * frac));
          const pass = win && frac >= .7;
          const c = OG.state.ch(chId); const prev = c.games[level] || { pts: 0, pass: false };
          const best = { pts: Math.max(prev.pts, pts), pass: prev.pass || pass };
          const gain = Math.max(0, best.pts - prev.pts); c.games[level] = best;
          OG.state.addCoins(Math.round(gain / 4)); OG.state.save();
          OG.snd.duck(false); OG.snd.play(pass ? 'win' : 'lose');
          const grade = pass ? (frac >= .95 && wrongN === 0 ? 'מושלם! 🏆' : 'כל הכבוד! 🎉') : 'לא נורא, עוד ניסיון? 💪';
          const p = el('div.panel.result');
          p.append(el('div.grade', { text: grade }), el('div.big', { text: pts }), el('div.muted', { text: `מתוך ${lv.max} נקודות (כולל בונוס מהירות וקומבו עד +15%)` }),
            el('table', el('tr', el('td', 'משימות שהושלמו'), el('td.ltr', `${correctN}/${total}`)), el('tr', el('td', 'טעויות'), el('td.ltr', wrongN)), el('tr', el('td', 'קומבו מקסימלי'), el('td.ltr', '×' + bestCombo)), el('tr', el('td', 'שיא אישי ברמה'), el('td.ltr', best.pts)), el('tr', el('td', 'מטבעות שהרווחתם'), el('td.ltr', '🪙 ' + Math.round(gain / 4)))),
            el('div.callout.' + (pass ? 'tip' : 'warn'), { html: pass ? '✅ הרמה נחשבת עברה (70% ומעלה).' : '⚠️ כדי לעבור צריך להשלים לפחות 70% מהמשימות.' }),
            G.outro ? el('div.callout.story', { html: G.outro }) : '',
            el('div.row', { style: { justifyContent: 'center', marginTop: '10px' } }, el('button.btn', { text: '🔁 שוב', onclick: intro }), level < 3 ? el('button.btn.warn', { text: 'לרמה הבאה ←', onclick() { level++; intro(); } }) : '', el('button.btn.primary', { text: 'חזרה לעיר', onclick: () => exit({ pass }) })));
          if (win) OG.ui && OG.ui.confetti && OG.ui.confetti();
          root.innerHTML = ''; root.append(p);
        };
        sh.help(G.help && (G.help[level] || G.help) || '');
        const inst = G.start(stage, level, sh) || {};
      };
      intro();
    }
  };
})(window.OG);
