/* OSPF City – generic falling-items sorter (used by several minigames with different skins/content) */
(function (OG) {
  const { el } = OG;

  // cfg: {bins:[{id,label,sub,glyph,color}], next(i)->item{title,detail,bin,bins?,icon?}, fall, gap, maxActive, side(el,item,state), explain(item,choice,ok)->html, bg}
  OG.Sorter = function (stage, sh, cfg) {
    const root = el('div.srt'); stage.append(root);
    if (cfg.bg) root.style.background = cfg.bg;
    const lane = el('div.srt-lane'); const binsEl = el('div.srt-bins'); root.append(lane, binsEl);
    let sideEl = null; if (cfg.side) { sideEl = el('div.srt-side'); lane.append(sideEl); }
    const fb = el('div', { style: { position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', maxWidth: '80%', zIndex: 4, textAlign: 'center', pointerEvents: 'none' } }); lane.append(fb);
    const binEls = {};
    cfg.bins.forEach((b, i) => {
      const e = el('button.srt-bin', { style: { '--bc': b.color || '#6f86ff' }, onclick: () => choose(b.id) }, el('kbd', { text: String(i + 1) }), b.glyph ? el('span.glyph', { text: b.glyph }) : '', el('div', { html: b.label }), b.sub ? el('small', { html: b.sub }) : '');
      binEls[b.id] = e; binsEl.append(e);
    });
    let items = [], spawned = 0, sinceSpawn = 99, active = null, destroyed = false;
    const fall = cfg.fall || 9, gap = cfg.gap || 3.2, maxActive = cfg.maxActive || 3;
    const keyH = e => { if (/INPUT|TEXTAREA/.test(e.target.tagName)) return; const n = parseInt(e.key, 10); if (n >= 1 && n <= cfg.bins.length) choose(cfg.bins[n - 1].id); };
    document.addEventListener('keydown', keyH);

    function laneRect() { return lane.getBoundingClientRect(); }
    function spawn() {
      const data = cfg.next(spawned); spawned++;
      const e = el('div.srt-item', { html: `${data.icon ? `<div style="font-size:22px">${data.icon}</div>` : ''}<div class="t">${data.title}</div>${data.detail ? `<div class="d">${data.detail}</div>` : ''}` });
      lane.append(e);
      const r = laneRect(); const sideW = sideEl ? Math.min(340, r.width * .4) + 20 : 0;
      const w = e.offsetWidth || 160; const x0 = 10, x1 = Math.max(x0 + 1, r.width - sideW - w - 10);
      const it = { data, e, x: x0 + Math.random() * (x1 - x0), p: 0, dead: false };
      e.style.left = it.x + 'px'; items.push(it); updateActive();
    }
    function updateActive() {
      const alive = items.filter(i => !i.dead); const a = alive.sort((x, y) => y.p - x.p)[0] || null;
      if (a !== active) {
        if (active) active.e.classList.remove('active');
        active = a; if (a) a.e.classList.add('active');
        cfg.bins.forEach(b => { binEls[b.id].style.display = (!a || !a.data.bins || a.data.bins.includes(b.id)) ? '' : 'none'; });
        if (sideEl) cfg.side(sideEl, a ? a.data : null);
      }
    }
    function say(html, ok) { fb.innerHTML = `<div class="fb ${ok ? 'ok' : 'no'}" style="background:rgba(8,12,28,.95)">${html}</div>`; clearTimeout(say.t); say.t = setTimeout(() => fb.innerHTML = '', 3200); }
    function resolve(it, choice, ok, timeout) {
      it.dead = true; const r = laneRect();
      const bin = choice && binEls[choice]; const lr = laneRect();
      if (bin && !timeout) { const br = bin.getBoundingClientRect(); it.e.style.transition = 'all .35s ease-in'; it.e.style.left = (br.left - lr.left + br.width / 2 - it.e.offsetWidth / 2) + 'px'; it.e.style.top = (lr.height - 20) + 'px'; it.e.style.opacity = 0; it.e.style.transform = 'scale(.4)'; bin.classList.add(ok ? 'good' : 'bad'); setTimeout(() => bin.classList.remove('good', 'bad'), 400); }
      else { it.e.style.transition = 'all .4s'; it.e.style.opacity = 0; it.e.style.background = '#7f1d1d'; }
      setTimeout(() => it.e.remove(), 420);
      const ex = cfg.explain ? cfg.explain(it.data, choice, ok) : '';
      if (ok) { sh.correct({ speed: Math.max(0, 1 - it.p), x: it.x + 60, y: it.p * (r.height - 100) }); if (ex) say('✅ ' + ex, true); }
      else { sh.wrong({ advance: true, msg: timeout ? '⏰' : '✖', x: it.x + 60, y: it.p * (r.height - 100) }); say((timeout ? '⏰ הפריט הגיע לתחתית! ' : '❌ ') + (ex || ''), false); }
      updateActive();
    }
    function choose(binId) {
      if (sh.paused || sh.ended || !active) return; OG.snd.init();
      const it = active; resolve(it, binId, it.data.bin === binId);
    }
    const loop = sh.raf(dt => {
      if (destroyed) return;
      const r = laneRect(); const H = r.height - 70;
      sinceSpawn += dt;
      const aliveN = items.filter(i => !i.dead).length;
      if (spawned < sh.total && sinceSpawn >= gap && aliveN < maxActive || (spawned < sh.total && aliveN === 0 && sinceSpawn > .6)) { sinceSpawn = 0; spawn(); }
      for (const it of items) {
        if (it.dead) continue;
        it.p += dt / fall; it.e.style.top = (it.p * H) + 'px';
        if (it.p >= 1) { resolve(it, null, false, true); }
      }
    });
    // first item immediately
    setTimeout(() => { if (!destroyed && !spawned) spawn(); }, 100);
    return { destroy() { destroyed = true; document.removeEventListener('keydown', keyH); loop.stop(); root.remove(); } };
  };
})(window.OG);
