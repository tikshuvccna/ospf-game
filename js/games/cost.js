/* Chapter 4 minigame – Cheapest Route Rush: click routers to build the path with the lowest total OSPF cost */
(function (OG) {
  const { el, svg, pick, randi, shuffle } = OG;
  const TEMPL = [
    { S: 'S', D: 'D', n: { S: [70, 225], A: [230, 95], B: [230, 355], C: [400, 225], X: [570, 95], Y: [570, 355], D: [735, 225] }, e: [['S', 'A'], ['S', 'B'], ['A', 'C'], ['B', 'C'], ['A', 'X'], ['B', 'Y'], ['C', 'X'], ['C', 'Y'], ['X', 'D'], ['Y', 'D'], ['A', 'B']] },
    { S: 'S', D: 'D', n: { S: [70, 225], a: [240, 90], b: [240, 225], c: [240, 360], d: [430, 90], e: [430, 225], f: [430, 360], D: [735, 225] }, e: [['S', 'a'], ['S', 'b'], ['S', 'c'], ['a', 'b'], ['b', 'c'], ['a', 'd'], ['b', 'e'], ['c', 'f'], ['d', 'e'], ['e', 'f'], ['d', 'D'], ['e', 'D'], ['f', 'D']] },
    { S: 'S', D: 'D', n: { S: [65, 225], A: [200, 100], B: [200, 350], C: [380, 55], E: [380, 225], F: [380, 395], G: [570, 100], H: [570, 350], D: [740, 225] }, e: [['S', 'A'], ['S', 'B'], ['A', 'C'], ['A', 'E'], ['B', 'E'], ['B', 'F'], ['C', 'G'], ['E', 'G'], ['E', 'H'], ['F', 'H'], ['G', 'D'], ['H', 'D'], ['E', 'D']] }
  ];
  const costOf = (ref, bw) => Math.max(1, Math.floor(ref / bw));
  const sp = m => m >= 1000 ? (m / 1000) + 'G' : m + 'M';
  function dijkstra(nodes, edges, s, d) {
    const dist = {}, prev = {}; nodes.forEach(n => dist[n] = Infinity); dist[s] = 0; const Q = new Set(nodes);
    while (Q.size) { let u = null; for (const q of Q) if (u === null || dist[q] < dist[u]) u = q; Q.delete(u); if (u === d) break; edges.forEach(e => { const v = e.a === u ? e.b : e.b === u ? e.a : null; if (v && Q.has(v) && dist[u] + e.cost < dist[v]) { dist[v] = dist[u] + e.cost; prev[v] = u; } }); }
    const path = []; let c = d; while (c) { path.unshift(c); c = prev[c]; } return { cost: dist[d], path };
  }

  OG.games.ch4 = {
    title: 'מרוץ המסלול הזול', story: 'מכונית הבורסה צריכה להגיע מ-S ל-D. בכל כביש מחיר שנגזר ממהירותו. בחרו את המסלול עם <b>סך העלות הנמוך ביותר</b> – לא את הקצר ביותר!',
    how: { 1: 'העלות מוצגת על כל קו (Reference = 100). לחצו על הצמתים לפי הסדר, מ-S ועד D.', 2: 'מוצגת רק המהירות! חשבו בעצמכם לפי Reference Bandwidth המוצג (עלות = Ref ÷ מהירות, מינימום 1).', 3: 'יש גם קווים עם <code>ip ospf cost</code> ידני ו-<code>bandwidth</code> שמשנה את ההתייחסות. שימו לב!' },
    cfg: { 1: { tasks: 5, lives: 3, time: 130 }, 2: { tasks: 5, lives: 3, time: 150 }, 3: { tasks: 6, lives: 3, time: 170 } },
    help: 'לחצו על צמתים סמוכים לפי הסדר מ-S עד D',
    start(stage, level, sh) {
      const root = el('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' } }); stage.append(root);
      const head = el('div.row', { style: { padding: '8px 14px', justifyContent: 'space-between' } }); const view = el('div', { style: { flex: 1, minHeight: 0 } });
      const fb = el('div.fb', { style: { margin: '0 14px 8px', display: 'none' } }); root.append(head, view, fb);
      let G = null, path = [], locked = false;
      function setup() {
        locked = false; path = [];
        const T = pick(TEMPL); const ref = level === 1 ? 100 : pick([1000, 10000, 100000].slice(0, level === 2 ? 2 : 3));
        const names = Object.keys(T.n);
        const speeds = level === 1 ? [10, 100, 100, 1000, 1000] : [10, 100, 1000, 1000, 10000];
        const edges = T.e.map(([a, b]) => {
          const bw = pick(speeds); let cost = costOf(ref, bw), note = sp(bw) + 'b/s', manual = null, fake = null;
          if (level === 3 && Math.random() < .28) { manual = pick([2, 5, 20, 50, 100]); cost = manual; note = `ip ospf cost ${manual}`; }
          else if (level === 3 && Math.random() < .25) { fake = pick([100, 1000, 10000]); cost = costOf(ref, fake); note = `${sp(bw)} · bandwidth ${fake * 1000}`; }
          return { a, b, bw, cost, note, manual, fake };
        });
        G = { T, ref, names, edges }; G.best = dijkstra(names, edges, T.S, T.D);
        draw();
      }
      function draw() {
        head.innerHTML = '';
        head.append(el('span.tag', { html: `Reference BW = <b>${G.ref}</b> Mb/s` }), el('span.tag', { id: 'tot', html: path.length > 1 && level === 1 ? 'סכום: <b>' + curCost() + '</b>' : '' }), el('button.btn.small', { text: '↺ איפוס מסלול', onclick() { if (locked) return; path = [G.T.S]; draw(); } }));
        view.innerHTML = '';
        const s = svg('svg', { viewBox: '0 0 800 450', style: 'width:100%;height:100%' }); view.append(s);
        for (const e of G.edges) {
          const A = G.T.n[e.a], B = G.T.n[e.b]; const inPath = pathHas(e.a, e.b);
          s.append(svg('line', { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: inPath ? '#22d3ee' : '#4b68c8', 'stroke-width': inPath ? 7 : 3.5, 'stroke-linecap': 'round', opacity: inPath ? 1 : .8 }));
          const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2; const label = level === 1 ? `${e.note} → ${e.cost}` : e.note;
          const tg = svg('g', { transform: `translate(${mx},${my})` }); const tx = svg('text', { 'text-anchor': 'middle', y: 4, style: 'font:700 11.5px var(--mono);fill:#fff' }, label); tg.append(tx); s.append(tg);
          const w = label.length * 7 + 12; tg.insertBefore(svg('rect', { x: -w / 2, y: -10, width: w, height: 20, rx: 10, fill: '#0b1230', stroke: e.manual ? '#fbbf24' : e.fake ? '#a78bfa' : '#2b3a6e' }), tx);
        }
        for (const id of G.names) {
          const [x, y] = G.T.n[id]; const on = path.includes(id); const last = path[path.length - 1] === id; const g = svg('g', { transform: `translate(${x},${y})`, style: 'cursor:pointer' });
          const isS = id === G.T.S, isD = id === G.T.D;
          g.append(svg('circle', { r: 22, fill: isS ? '#065f46' : isD ? '#7c2d12' : 'url(#gR)', stroke: on ? '#22d3ee' : '#8bd0ff', 'stroke-width': last ? 5 : 2.5 }), svg('text', { y: 5, 'text-anchor': 'middle', style: 'font:900 14px Heebo;fill:#fff' }, isS ? 'S' : isD ? 'D' : '↔'));
          if (isS) g.append(svg('text', { y: -30, 'text-anchor': 'middle', style: 'font:800 12px Heebo;fill:#34d399' }, 'התחלה'));
          if (isD) g.append(svg('text', { y: -30, 'text-anchor': 'middle', style: 'font:800 12px Heebo;fill:#fb923c' }, 'יעד'));
          g.addEventListener('click', () => click(id)); s.append(g);
        }
        const defs = svg('defs'); defs.innerHTML = '<radialGradient id="gR" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#4aa3e0"/><stop offset="1" stop-color="#0f3d66"/></radialGradient>'; s.prepend(defs);
        if (!path.length) path = [G.T.S], draw();
      }
      const pathHas = (a, b) => { for (let i = 0; i < path.length - 1; i++) if ((path[i] === a && path[i + 1] === b) || (path[i] === b && path[i + 1] === a)) return true; return false; };
      const edgeOf = (a, b) => G.edges.find(e => (e.a === a && e.b === b) || (e.a === b && e.b === a));
      const curCost = () => { let c = 0; for (let i = 0; i < path.length - 1; i++) c += edgeOf(path[i], path[i + 1]).cost; return c; };
      function click(id) {
        if (locked) return; OG.snd.init(); const last = path[path.length - 1];
        if (id === last) return;
        if (path.length > 1 && id === path[path.length - 2]) { path.pop(); OG.snd.play('click'); draw(); return; }
        if (!edgeOf(last, id) || path.includes(id)) { OG.snd.play('bad'); return; }
        path.push(id); OG.snd.play('pop'); draw();
        if (id === G.T.D) finish();
      }
      function finish() {
        locked = true; const c = curCost(); const best = G.best.cost;
        const ok = c === best;
        const optimal = G.best.path.join(' → ');
        fb.style.display = ''; fb.className = 'fb ' + (ok ? 'ok' : 'no');
        fb.innerHTML = ok ? `✅ מצוין! העלות הכוללת <b>${c}</b> – הזולה ביותר.` : `❌ העלות שבחרתם <b>${c}</b>, אבל אפשר <b>${best}</b> דרך ${optimal}.`;
        if (ok) sh.correct({ x: 400, y: 200 }); else sh.wrong({ advance: true, x: 400, y: 200 });
        setTimeout(() => { fb.style.display = 'none'; if (!sh.ended) setup(); }, ok ? 1500 : 3200);
      }
      setup();
      return { destroy() { root.remove(); } };
    }
  };
})(window.OG);
