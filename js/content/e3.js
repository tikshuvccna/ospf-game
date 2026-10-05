/* EXTRA 3 – SPF / Dijkstra */
(function (OG) {
  const { el, svg } = OG;

  // ---- shared Dijkstra core ----
  OG.spfCore = {
    steps(g, root) {
      const dist = {}, prev = {}, vis = new Set(); Object.keys(g.n).forEach(k => dist[k] = Infinity); dist[root] = 0; const out = [];
      const nb = u => g.e.filter(e => e[0] === u || e[1] === u).map(e => [e[0] === u ? e[1] : e[0], e[2]]);
      while (vis.size < Object.keys(g.n).length) {
        let u = null; for (const k of Object.keys(g.n)) if (!vis.has(k) && (u === null || dist[k] < dist[u])) u = k;
        if (u === null || dist[u] === Infinity) break;
        vis.add(u); const relaxed = [];
        for (const [v, w] of nb(u)) if (!vis.has(v) && dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; relaxed.push(v); }
        out.push({ pick: u, dist: { ...dist }, prev: { ...prev }, vis: new Set(vis), relaxed });
      }
      return out;
    },
    nb: (g, u) => g.e.filter(e => e[0] === u || e[1] === u).map(e => [e[0] === u ? e[1] : e[0], e[2]]),
    nextHop(prev, root, dst) { let c = dst; while (prev[c] && prev[c] !== root) c = prev[c]; return prev[dst] ? c : null; }
  };
  const G1 = { n: { A: [90, 190], B: [260, 70], C: [260, 320], D: [470, 70], E: [470, 320], F: [680, 190] }, e: [['A', 'B', 4], ['A', 'C', 2], ['B', 'C', 1], ['B', 'D', 5], ['C', 'E', 9], ['C', 'D', 10], ['D', 'E', 2], ['D', 'F', 6], ['E', 'F', 3]] };

  function drawGraph(s, g, st, root) {
    s.innerHTML = '';
    const defs = svg('defs'); defs.innerHTML = '<radialGradient id="gS" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#4aa3e0"/><stop offset="1" stop-color="#0f3d66"/></radialGradient>'; s.append(defs);
    const tree = new Set(); if (st) Object.entries(st.prev).forEach(([v, u]) => { if (st.vis.has(v)) tree.add(u + '-' + v); });
    for (const [a, b, w] of g.e) {
      const A = g.n[a], B = g.n[b]; const inTree = tree.has(a + '-' + b) || tree.has(b + '-' + a);
      s.append(svg('line', { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: inTree ? '#34d399' : '#4b68c8', 'stroke-width': inTree ? 7 : 3, 'stroke-linecap': 'round' }));
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2; const gr = svg('g', { transform: `translate(${mx},${my})` });
      gr.append(svg('rect', { x: -14, y: -11, width: 28, height: 22, rx: 11, fill: '#0b1230', stroke: '#2b3a6e' }), svg('text', { 'text-anchor': 'middle', y: 5, style: 'font:800 13px var(--mono);fill:#fff' }, w)); s.append(gr);
    }
    for (const id of Object.keys(g.n)) {
      const [x, y] = g.n[id]; const vis = st && st.vis.has(id), cur = st && st.pick === id; const d = st ? st.dist[id] : (id === root ? 0 : Infinity);
      const gr = svg('g', { transform: `translate(${x},${y})` });
      gr.append(svg('circle', { r: 26, fill: vis ? '#065f46' : 'url(#gS)', stroke: cur ? '#fbbf24' : vis ? '#34d399' : '#8bd0ff', 'stroke-width': cur ? 6 : 3 }), svg('text', { y: 5, 'text-anchor': 'middle', style: 'font:900 16px Heebo;fill:#fff' }, id === root ? 'R1' : 'R' + (id.charCodeAt(0) - 64)));
      gr.append(svg('text', { y: -34, 'text-anchor': 'middle', style: `font:900 18px var(--mono);fill:${d === Infinity ? '#94a3b8' : '#fbbf24'}` }, d === Infinity ? '∞' : d)); s.append(gr);
    }
  }

  function stepper(host) {
    const root = 'A'; const steps = OG.spfCore.steps(G1, root); let i = -1;
    const s = svg('svg', { viewBox: '0 0 780 390', style: 'width:100%;max-height:48vh' }); const log = el('div.callout.info', { text: 'לחצו "צעד הבא" כדי להריץ איטרציה אחת של האלגוריתם.' }); const tbl = el('div');
    function render() {
      const st = i >= 0 ? steps[i] : null; drawGraph(s, G1, st, root);
      const dist = st ? st.dist : Object.fromEntries(Object.keys(G1.n).map(k => [k, k === root ? 0 : Infinity])); const prev = st ? st.prev : {};
      tbl.innerHTML = `<table style="width:100%;text-align:center;border-collapse:collapse;direction:ltr;font-family:var(--mono)"><tr>${Object.keys(G1.n).map(k => `<th style="border:1px solid #2b3a6e;padding:4px;background:#1c2a58">R${k.charCodeAt(0) - 64}</th>`).join('')}</tr><tr>${Object.keys(G1.n).map(k => `<td style="border:1px solid #2b3a6e;padding:4px;color:${st && st.vis.has(k) ? '#34d399' : '#fbbf24'}">${dist[k] === Infinity ? '∞' : dist[k]}</td>`).join('')}</tr><tr>${Object.keys(G1.n).map(k => `<td style="border:1px solid #2b3a6e;padding:4px;color:#9fb0e8;font-size:12px">${prev[k] ? 'via R' + (prev[k].charCodeAt(0) - 64) : '—'}</td>`).join('')}</tr></table>`;
      if (st) { const rel = st.relaxed.map(v => `R${v.charCodeAt(0) - 64}=${st.dist[v]}`).join(', '); log.innerHTML = `צעד ${i + 1}: נבחר <b>R${st.pick.charCodeAt(0) - 64}</b> (עלות ${st.dist[st.pick]}) – הקרוב ביותר שעוד לא ביקרנו בו. ${rel ? 'עדכנו שכנים: ' + rel : 'לא שיפרנו אף שכן.'}`; }
    }
    const next = () => { if (i < steps.length - 1) { i++; OG.snd.play('pop'); render(); } else log.innerHTML = '✅ האלגוריתם הסתיים. הקווים הירוקים הם <b>עץ המסלולים הקצרים</b> – משם נגזרת טבלת הניתוב.'; };
    host.append(el('div.wbox', el('h3', { text: '⚙️ הריצו את Dijkstra צעד אחר צעד' }), el('div.muted', { text: 'השורש הוא R1. מעל כל נתב – המרחק המצטבר הנוכחי. ירוק = ביקרנו (המרחק סופי).' })), el('div.wbox', s), tbl, log, el('div.row', el('button.btn.primary', { text: '▶ צעד הבא', onclick: next }), el('button.btn', { text: '⏩ הרץ הכול', onclick() { i = steps.length - 1; render(); log.innerHTML = '✅ האלגוריתם הסתיים. הירוק = עץ המסלולים הקצרים.'; } }), el('button.btn.small', { text: '↺ איפוס', onclick() { i = -1; render(); log.textContent = 'התחילו מחדש.'; } }))); render();
  }

  OG.lessons.e3 = {
    steps: [
      {
        title: 'ממפה לעץ',
        html: `<div class="callout story">🔭 האסטרונום: "ה-LSDB הוא מפה של כוכבים. הנתב צריך לדעת את הדרך הקצרה ביותר מעצמו לכל כוכב."</div>
          <p>אחרי שה-LSDB מלא, נתב מריץ <b>SPF</b> (אלגוריתם Dijkstra). הוא הופך את המפה ל<b>עץ מסלולים קצרים</b> ששורשו הוא הנתב עצמו. העלויות על הקווים הן ה-Cost.</p>`,
        scene(S) {
          const P = G1.n; Object.entries(P).forEach(([k, [x, y]]) => S.node(k, x + 20, y + 15, { label: k === 'A' ? 'R1 (שורש)' : 'R' + (k.charCodeAt(0) - 64) }));
          G1.e.forEach(([a, b, w]) => S.link(a, b, { label: String(w) }));
          S.at(1, S => { S.mark('A', '#fbbf24'); });
          S.at(2, S => { S.trace(['A', 'C', 'B'], { color: '#34d399', dur: 1.2 }); S.trace(['C', 'B', 'D'], { color: '#34d399', dur: 1.2 }); S.trace(['D', 'E', 'F'], { color: '#34d399', dur: 1.4 }); });
          S.at(5, S => S.note('n', 250, 360, 'העץ הירוק: הדרכים הזולות ביותר מ-R1 לכל נתב', { w: 320, cls: 'g', align: 'center' }));
        }
      },
      {
        title: 'ארבעת הכללים של Dijkstra',
        html: `<ol><li>מתחילים בשורש: מרחק 0. לכל השאר – ∞.</li><li><b>בוחרים</b> את הצומת הלא-מבוקר עם המרחק הנמוך ביותר ומסמנים אותו כמבוקר.</li><li>עבור כל שכן שלו: אם <b>מרחק הצומת + עלות הקו &lt; המרחק הנוכחי של השכן</b> – מעדכנים (ושומרים מאיפה הגענו).</li><li>חוזרים לכלל 2 עד שכולם מבוקרים.</li></ol>`,
        scene(S) {
          const rules = ['1️⃣ שורש = 0, השאר ∞', '2️⃣ בוחרים את הלא-מבוקר הכי קרוב', '3️⃣ משפרים שכנים: d(u)+w < d(v)?', '4️⃣ חוזרים עד שכולם מבוקרים'];
          rules.forEach((r, i) => { S.note('r' + i, 150, 50 + i * 80, `<b style="font-size:17px">${r}</b>`, { w: 500, cls: i % 2 ? 'c' : 'v', hidden: true }); S.at(.5 + i * 1.8, S => S.show('r' + i, true)); });
        }
      },
      {
        title: 'הריצו בעצמכם',
        html: `<p>לחצו "צעד הבא" וראו איך האלגוריתם בוחר צומת, מעדכן שכנים, ומתקדם. שימו לב לשינויים בטבלה.</p>`,
        widget: stepper
      },
      {
        title: 'בדיקת הבנה #1',
        html: '<p>דמיינו את הצעד השני של האלגוריתם. הצומת R1 כבר סופי.</p>',
        check: { q: 'אחרי שביקרנו ב-R1: מרחקים: R2=4, R3=2, השאר ∞. איזה צומת האלגוריתם יבחר עכשיו?', opts: ['R2 (מרחק 4)', 'R3 (מרחק 2)', 'R4 (∞)', 'כולם במקביל'], a: 1, why: 'בוחרים את הלא-מבוקר עם המרחק הנמוך ביותר: R3 (2).' }
      },
      {
        title: 'מעץ לטבלת ניתוב: Next-Hop',
        html: `<p>מהעץ נגזרת טבלת הניתוב: לכל יעד – <b>הנתב הבא (Next-Hop)</b> – הצומת הראשון בדרך מהשורש. כך R1 יודע לאן לשלוח חבילות.</p>`,
        scene(S) {
          Object.entries(G1.n).forEach(([k, [x, y]]) => S.node(k, x + 20, y + 15, { label: k === 'A' ? 'R1' : 'R' + (k.charCodeAt(0) - 64) })); G1.e.forEach(([a, b, w]) => S.link(a, b, { label: String(w) }));
          S.table('rt', 20, 330, { w: 330, ltr: true, title: 'R1 routing table', head: ['Dest', 'Next hop', 'Cost'], rows: [{ c: ['R6', 'R3', '13'], hidden: true }, { c: ['R5', 'R3', '10'], hidden: true }] });
          S.at(1, S => { S.rowShow('rt', 0); S.rowCls('rt', 0, 'hl'); S.trace(['A', 'C', 'B', 'D', 'E', 'F'], { color: '#fbbf24', dur: 3 }); });
          S.at(4.5, S => { S.rowShow('rt', 1); S.rowCls('rt', 0, ''); S.rowCls('rt', 1, 'hl'); });
          S.at(6, S => S.note('n', 400, 340, 'כל המסלולים יוצאים דרך R3 – ה-Next-Hop לשניהם', { w: 340, cls: 'y' }));
        }
      },
      {
        title: 'בדיקת הבנה #2',
        html: '<p>קראו את העץ: R1→R3 (2), R3→R2 (1) → R2=3, R2→R4 (5) → R4=8, R4→R5 (2) → R5=10 …</p>',
        check: { q: 'ב-R1 הדרך הזולה ל-R4 היא R1→R3→R2→R4 (עלות 8). מה ה-Next-Hop של R1 ליעד R4?', opts: ['R2', 'R3', 'R4', 'R5'], a: 1, why: 'ה-Next-Hop הוא הצומת הראשון בדרך מהשורש: R3.', fb: { 0: 'R2 הוא בצעד השני בדרך, לא הראשון.' } }
      },
      {
        title: 'מתי SPF רץ מחדש, ולמה אזורים?',
        html: `<p>כל פעם שמתקבל LSA חדש שמשנה את הטופולוגיה (קו נפל, קו חזר) – ה-LSDB משתנה ו-<b>SPF רץ מחדש</b>. ברשת גדולה זה צורך CPU וזמן.</p>
          <p>לכן יש <b>אזורים</b>: שינוי באזור אחד לא מפעיל SPF מלא בנתבים של אזורים אחרים – הם מקבלים רק סיכום (Type 3).</p>`,
        scene(S) {
          Object.entries(G1.n).forEach(([k, [x, y]]) => S.node(k, x + 20, y + 15, { label: 'R' + (k.charCodeAt(0) - 64) })); G1.e.forEach(([a, b, w]) => S.link(a, b, { label: String(w) }));
          S.trace(['A', 'C', 'B', 'D', 'E', 'F'], { color: '#34d399', dur: 1.5 });
          S.at(3, S => { S.clearTraces(); S.linkDown('B', 'D'); S.mark('D', '#fb7185'); S.note('n', 240, 355, '⚡ קו נפל → LSA חדש → SPF רץ מחדש', { w: 300, cls: 'r', align: 'center' }); });
          S.at(5, S => { S.trace(['A', 'C', 'E', 'F'], { color: '#fbbf24', dur: 1.5 }); S.node('SPF', 400, 200, { type: 'emoji', emoji: '⚙️', fs: 38 }); });
        }
      },
      {
        title: 'סיכום',
        html: `<div class="callout story">🔭 האסטרונום: "עכשיו אתם האלגוריתם. לכו לסייר!"</div>
          <ul><li>SPF = Dijkstra: בוחרים תמיד את הצומת הקרוב ביותר שעוד לא ביקרנו בו, ומשפרים שכנים.</li><li>התוצאה: עץ מסלולים קצרים, ושם נגזרים Next-Hop ועלות.</li><li>שינוי טופולוגיה ← SPF מחדש. אזורים מקטינים את העבודה.</li></ul>`,
        scene(S) { S.node('N', 400, 190, { type: 'emoji', emoji: '🔭', fs: 110 }); }
      }
    ]
  };

  OG.quizzes.e3 = [
    { q: 'איך נקרא האלגוריתם ש-OSPF משתמש בו?', opts: ['SPF (Dijkstra)', 'Bellman-Ford', 'Round Robin', 'DUAL'], a: 0, why: 'Shortest Path First, בשמו המקצועי Dijkstra.' },
    { q: 'בכל צעד ב-Dijkstra בוחרים…', opts: ['את הצומת האקראי', 'את הצומת הלא-מבוקר עם המרחק הנמוך ביותר', 'את הצומת עם הכי הרבה שכנים', 'את הצומת האחרון'], a: 1, why: 'הקרוב ביותר שעוד לא ביקרנו.' },
    { q: 'מתי מעדכנים מרחק של שכן?', opts: ['תמיד', 'כש-d(u)+w קטן מהמרחק הנוכחי של השכן', 'כש-w גדול', 'לעולם'], a: 1, why: 'רק אם נמצא מסלול זול יותר.' },
    { q: 'מה התוצאה של SPF?', opts: ['עץ מסלולים קצרים ששורשו הנתב עצמו', 'טבלת ARP', 'רשימת שכנים', 'רשימת אזורים'], a: 0, why: 'מהעץ נגזרת טבלת הניתוב.' },
    { q: 'מתי SPF רץ מחדש?', opts: ['כל 10 שניות', 'כשמתקבל LSA ששינה את הטופולוגיה', 'רק כשהנתב עולה', 'אף פעם'], a: 1, why: 'שינוי טופולוגיה = LSDB חדש = חישוב מחדש.' },
    { q: 'מה ה-Next-Hop ליעד כלשהו בעץ?', opts: ['היעד עצמו תמיד', 'הצומת הראשון בדרך מהשורש אל היעד', 'השורש', 'הצומת האחרון'], a: 1, why: 'הצומת הראשון בדרך.' },
    { q: 'איך אזורים עוזרים ל-SPF?', opts: ['שינוי באזור אחד לא מחייב SPF מלא בכל האזורים', 'הם מגדילים את ה-Cost', 'הם מבטלים את ה-LSDB', 'הם מכפילים את ה-Hello'], a: 0, why: 'ה-LSDB קטן יותר והחישוב מוגבל לאזור.' }
  ];
})(window.OG);
