/* OSPF City – generic interactive widgets for lessons (chapter-specific ones live in content files) */
(function (OG) {
  const { el } = OG;
  const W = OG.W = {};

  // Interactive CLI practice.  cfg: {title, intro, tasks:[{prompt:'R1(config)#', ask:'html', ok:[RegExp], hint:'', echo:'output', ps}]}
  W.cliTask = function (host, cfg, ctx) {
    host.append(el('div.wbox', el('h3', { text: cfg.title || '⌨️ תרגול בשורת הפקודה' }), el('div', { html: cfg.intro || '' })));
    const term = el('div.cli', { style: { minHeight: '140px', maxHeight: '38vh', overflow: 'auto', whiteSpace: 'pre-wrap' } });
    const askBox = el('div.wbox.fo-note.y', { style: { fontSize: '16px', lineHeight: 1.6 } });
    const input = el('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'הקלידו פקודה ולחצו Enter' });
    const prompt = el('span.pr', { text: '' });
    const fbk = el('div.fb', { style: { display: 'none' } });
    const hintBtn = el('button.btn.small', { text: '💡 רמז' });
    const skipBtn = el('button.btn.small', { text: 'הצג פתרון' });
    host.append(askBox, el('div.cli-in', prompt, input), el('div.row', hintBtn, skipBtn), fbk, term);
    let i = 0, fails = 0, finished = false;
    const log = (t, cls) => { const d = el('div', { html: t }); if (cls) d.className = cls; term.append(d); term.scrollTop = 1e6; };
    const setTask = () => {
      const t = cfg.tasks[i]; fails = 0; fbk.style.display = 'none';
      askBox.innerHTML = `<b>משימה ${i + 1}/${cfg.tasks.length}:</b> ${t.ask}`;
      prompt.textContent = t.prompt + ' '; input.value = ''; input.focus();
    };
    const norm = s => s.trim().replace(/\s+/g, ' ').toLowerCase();
    const accept = (t, v) => t.ok.some(r => r.test(v));
    const advance = (t, shown) => {
      log(`<span class="pr">${OG.esc(t.prompt)}</span> ${OG.esc(shown)}`);
      if (t.echo) log(`<span class="dim">${OG.esc(t.echo)}</span>`);
      OG.snd.play('ok'); i++;
      if (i >= cfg.tasks.length) { finished = true; askBox.innerHTML = '🎉 <b>כל הכבוד!</b> סיימתם את התרגול.'; input.disabled = true; prompt.textContent = ''; ctx && ctx.done && ctx.done(); OG.state.data.bonusScore += 5; OG.state.save(); }
      else setTask();
    };
    input.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key !== 'Enter' || finished) return;
      const t = cfg.tasks[i], v = norm(input.value); if (!v) return;
      if (accept(t, v)) advance(t, input.value.trim());
      else {
        fails++; OG.snd.play('bad'); fbk.style.display = ''; fbk.className = 'fb no';
        fbk.innerHTML = '❌ לא בדיוק. ' + (fails >= 2 ? (t.hint || '') : 'נסו שוב, ואפשר ללחוץ על 💡 לרמז.');
        log(`<span class="pr">${OG.esc(t.prompt)}</span> ${OG.esc(input.value.trim())}\n<span style="color:#fb7185">% Invalid input detected</span>`);
        input.select();
      }
    });
    hintBtn.onclick = () => { const t = cfg.tasks[i]; if (!t) return; fbk.style.display = ''; fbk.className = 'fb ok'; fbk.innerHTML = '💡 ' + (t.hint || ''); };
    skipBtn.onclick = () => { const t = cfg.tasks[i]; if (!t || finished) return; advance(t, t.show || ''); };
    setTask();
  };

  // helper to build a labelled row in widgets
  W.row = (...k) => el('div.wrow', ...k);
  W.box = (...k) => el('div.wbox', ...k);
})(window.OG);
