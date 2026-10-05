/* EXTRA 3 minigame – SPF Explorer: you are Dijkstra */
(function (OG) {
  const { el, svg, pick, randi, shuffle } = OG;
  const TEMPL = {
    6: { n: { A: [70, 225], B: [230, 90], C: [230, 360], D: [440, 90], E: [440, 360], F: [730, 225] }, e: [['A', 'B'], ['A', 'C'], ['B', 'C'], ['B', 'D'], ['C', 'E'], ['D', 'E'], ['D', 'F'], ['E', 'F'], ['B', 'E']] },
    7: { n: { A: [70, 225], B: [220, 80], C: [220, 225], D: [220, 370], E: [440, 110], F: [440, 340], G: [730, 225] }, e: [['A', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'C'], ['C', 'D'], ['B', 'E'], ['C', 'E'], ['C', 'F'], ['D', 'F'], ['E', 'G'], ['F', 'G'], ['E', 'F']] },
    8: { n: { A: [60, 225], B: [190, 90], C: [190, 360], D: [340, 225], E: [490, 90], F: [490, 360], G: [640, 150], H: [740, 310] }, e: [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['B', 'E'], ['C', 'F'], ['D', 'E'], ['D', 'F'], ['E', 'G'], ['F', 'H'], ['G', 'H'], ['E', 'F'], ['D', 'G']] }
  };
  const nm = k => 'R' + (k.charCodeAt(0) - 64);

  OG.games.e3 = {
    title: 'סייר ה-SPF', story: 'אתם עכשיו האלגוריתם של Dijkstra! בכל צעד בחרו את הנתב הקרוב ביותר שעוד לא ביקרתם בו – והאלגוריתם יעדכן את שכניו.',
    how: { 1: 'המספר מעל כל נתב הוא המרחק הנוכחי מ-R1. לחצו על הנתב הלא-מבוקר עם המרחק <b>הנמוך ביותר</b>.', 2: 'בכל צעד: בחרו את הנתב, ואז סמנו אילו מהשכנים שלו <b>משתפרים</b> (d(u)+w < המרחק הנוכחי) ולחצו "אישור".', 3: 'גרף גדול יותר, וגם שאלה אחרונה: מה ה-Next-Hop של R1 ליעד מסוים?' },
    cfg: { 1: { tasks: 5, lives: 3, time: 120 }, 2: { tasks: 6, lives: 4, time: 170 }, 3: { tasks: 8, lives: 4, time: 220 } },
    help: 'בחרו את הלא-מבוקר עם המרחק הנמוך ביותר',
    start(stage, level, sh) {
      const root = el('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' } }); stage.append(root);
      const info = el('div.fb', { style: { margin: '6px 14px', minHeight: '38px' }, text: 'התחילו: הנתב R1 הוא השורש (מרחק 0).' }); const view = el('div', { style: { flex: 1, minHeight: 0 } }); const bar = el('div.row', { style: { padding: '6px 14px', justifyContent: 'center' } });
      root.append(info, view, bar);
      const T = TEMPL[level === 1 ? 6 : level === 2 ? 7 : 8]; const g = { n: T.n, e: T.e.map(([a, b]) => [a, b, randi(1, 9)]) };
      const dist = {}, prev = {}, vis = new Set(); Object.keys(g.n).forEach(k => dist[k] = Infinity); dist['A'] = 0;
      let phase = 'pick', cur = null, cand = [], sel = new Set(), pulse = new Set(), finalQ = false, locked = false;
      const nb = u => OG.spfCore.nb(g, u);
      function relax(u) { const ch = []; for (const [v, w] of nb(u)) if (!vis.has(v) && dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; ch.push(v); } return ch; }
      vis.add('A'); relax('A');
      function minUnvisited() { let m = Infinity; for (const k of Object.keys(g.n)) if (!vis.has(k) && dist[k] < m) m = dist[k]; return m; }
      function draw() {
        view.innerHTML = ''; const s = svg('svg', { viewBox: '0 0 800 450', style: 'width:100%;height:100%' }); view.append(s);
        const defs = svg('defs'); defs.innerHTML = '<radialGradient id="gS2" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#4aa3e0"/><stop offset="1" stop-color="#0f3d66"/></radialGradient>'; s.append(defs);
        const tree = new Set(); Object.entries(prev).forEach(([v, u]) => { if (vis.has(v)) tree.add(u + v); });
        for (const [a, b, w] of g.e) { const A = g.n[a], B = g.n[b]; const inT = tree.has(a + b) || tree.has(b + a); s.append(svg('line', { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: inT ? '#34d399' : '#4b68c8', 'stroke-width': inT ? 7 : 3, 'stroke-linecap': 'round' })); const gr = svg('g', { transform: `translate(${(A[0] + B[0]) / 2},${(A[1] + B[1]) / 2})` }); gr.append(svg('rect', { x: -13, y: -11, width: 26, height: 22, rx: 11, fill: '#0b1230', stroke: '#2b3a6e' }), svg('text', { 'text-anchor': 'middle', y: 5, style: 'font:800 13px var(--mono);fill:#fff' }, w)); s.append(gr); }
        for (const id of Object.keys(g.n)) {
          const [x, y] = g.n[id]; const v = vis.has(id), isCand = phase === 'relax' && cand.includes(id), isSel = sel.has(id), isCur = cur === id;
          const gr = svg('g', { transform: `translate(${x},${y})`, style: 'cursor:pointer' });
          gr.append(svg('circle', { r: 27, fill: v ? '#065f46' : 'url(#gS2)', stroke: isCur ? '#fbbf24' : isSel ? '#fbbf24' : isCand ? '#a78bfa' : v ? '#34d399' : '#8bd0ff', 'stroke-width': isCur || isSel ? 6 : isCand ? 5 : 3, 'stroke-dasharray': isCand && !isSel ? '6 4' : '' }), svg('text', { y: 5, 'text-anchor': 'middle', style: 'font:900 15px Heebo;fill:#fff' }, nm(id)));
          const d = dist[id]; gr.append(svg('text', { y: -36, 'text-anchor': 'middle', style: `font:900 19px var(--mono);fill:${d === Infinity ? '#94a3b8' : pulse.has(id) ? '#34d399' : '#fbbf24'}` }, d === Infinity ? '∞' : d));
          gr.addEventListener('click', () => click(id)); s.append(gr);
        }
      }
      function setInfo(html, cls) { info.className = 'fb ' + (cls || ''); info.innerHTML = html; }
      function click(id) {
        if (locked) return; OG.snd.init();
        if (finalQ) return;
        if (phase === 'relax') { if (!cand.includes(id)) return; sel.has(id) ? sel.delete(id) : sel.add(id); OG.snd.play('click'); draw(); return; }
        if (vis.has(id)) { setInfo(`${nm(id)} כבר מבוקר – מרחקו סופי.`, 'no'); return; }
        const m = minUnvisited();
        if (dist[id] !== m) { sh.wrong({ advance: true, x: 400, y: 120, msg: '✖' }); setInfo(`❌ ${nm(id)} לא הכי קרוב. הלא-מבוקר הקרוב ביותר הוא <b>${nm(Object.keys(g.n).find(k => !vis.has(k) && dist[k] === m))}</b> (מרחק ${m}). האלגוריתם ממשיך איתו.`, 'no'); const best = Object.keys(g.n).find(k => !vis.has(k) && dist[k] === m); locked = true; setTimeout(() => { apply(best, false); locked = false; }, 1600); return; }
        if (level === 1) { apply(id, true); return; }
        cur = id; vis.add(id); phase = 'relax'; cand = nb(id).map(x => x[0]).filter(v => !vis.has(v)); sel = new Set(); vis.delete(id);
        if (!cand.length) { apply(id, true, true); return; }
        setInfo(`✅ נבחר ${nm(id)} (מרחק ${dist[id]}). עכשיו סמנו אילו שכנים מתעדכנים לערך נמוך יותר, ולחצו "אישור".`, 'ok'); draw(); mkBar();
      }
      function mkBar() { bar.innerHTML = ''; if (phase === 'relax') bar.append(el('button.btn.primary', { text: 'אישור ✔', onclick: confirmRelax })); }
      function confirmRelax() {
        const u = cur; const truth = nb(u).filter(([v, w]) => !vis.has(v) && dist[u] + w < dist[v]).map(x => x[0]);
        const ok = truth.length === sel.size && truth.every(v => sel.has(v)); apply(u, ok, false, truth);
      }
      function apply(u, ok, noCand, truth) {
        vis.add(u); const ch = relax(u); pulse = new Set(ch); phase = 'pick'; cur = null; sel = new Set(); bar.innerHTML = '';
        const unvis = Object.keys(g.n).filter(k => !vis.has(k));
        if (ok) { sh.correct({ x: 400, y: 120 }); setInfo(`✅ מצוין! עדכנו: ${ch.map(v => nm(v) + '=' + dist[v]).join(', ') || 'אף שכן לא השתפר'}.`, 'ok'); }
        else if (truth) { sh.wrong({ advance: true, x: 400, y: 120 }); setInfo(`❌ השכנים שהשתפרו: ${truth.map(v => nm(v)).join(', ') || 'אף אחד'} – כי d(${nm(u)})+w קטן מהמרחק הקודם.`, 'no'); }
        draw();
        if (!unvis.length || unvis.every(k => dist[k] === Infinity)) { setTimeout(() => finalPhase(), 900); }
      }
      function finalPhase() {
        if (sh.ended) return;
        if (level < 3) { sh.finish(true); return; }
        finalQ = true; const dests = Object.keys(g.n).filter(k => k !== 'A' && prev[k] && prev[k] !== 'A'); const d = pick(dests.length ? dests : Object.keys(g.n).filter(k => k !== 'A'));
        const nh = OG.spfCore.nextHop(prev, 'A', d); const opts = nb('A').map(x => x[0]);
        setInfo(`🏁 האלגוריתם הסתיים! שאלה אחרונה: מה ה-<b>Next-Hop</b> של R1 ליעד <b>${nm(d)}</b>? (הצומת הראשון בדרך מ-R1)`, ''); bar.innerHTML = '';
        opts.forEach(o => bar.append(el('button.btn', { text: nm(o), onclick() { if (locked) return; locked = true; const ok = o === nh; setInfo(ok ? `✅ נכון! הדרך ל-${nm(d)}: ` + path(d) : `❌ ה-Next-Hop הוא ${nm(nh)}. הדרך: ` + path(d), ok ? 'ok' : 'no'); if (ok) sh.correct({ x: 400, y: 120 }); else sh.wrong({ advance: true, x: 400, y: 120 }); } })));
      }
      const path = d => { const p = [d]; let c = d; while (prev[c]) { c = prev[c]; p.unshift(c); } return p.map(nm).join(' → ') + ` (עלות ${dist[d]})`; };
      draw();
      return { destroy() { root.remove(); } };
    }
  };
})(window.OG);
