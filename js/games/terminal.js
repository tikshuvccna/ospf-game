/* Chapter 7 minigame – Terminal Detective: find the right line in a show-command output */
(function (OG) {
  const { el, pick, randi, shuffle } = OG;
  const pad = (s, n) => String(s).padEnd(n, ' ');
  const ipr = (a) => `${a}.${randi(1, 250)}`;
  const age = () => `00:0${randi(0, 5)}:${String(randi(10, 59))}`;
  const ifn = () => pick(['Fa0/0', 'Fa1/0', 'Gi0/0', 'Gi0/1', 'Se1/0']);

  // each generator returns {cmd, lines:[{t, ans}], q, expl, mc?:{opts,ans}}
  function routeRound(level) {
    const nets = shuffle([`10.${randi(1, 9)}.0.0/16`, `192.168.${randi(1, 60)}.0/24`, `172.16.${randi(1, 60)}.0/24`, `192.168.${randi(61, 120)}.0/24`, `172.20.0.0/16`]);
    const types = shuffle(['O', 'O IA', 'O E2', 'O*E2', 'O']);
    const cost = { 'O': () => randi(2, 20), 'O IA': () => randi(21, 60), 'O E2': () => 20, 'O*E2': () => 1 };
    const rows = types.map((t, i) => { const net = t === 'O*E2' ? '0.0.0.0/0' : nets[i]; return { t, net, c: cost[t](), via: ipr('10.0.0'), a: age(), i: ifn() }; });
    const mk = r => ({ t: `${pad(r.t, 5)}${pad(r.net, 18)}[110/${r.c}] via ${r.via}, ${r.a}, ${r.i}` });
    const lines = rows.map(mk); lines.unshift({ t: 'R1#show ip route', dim: true }, { t: `C    10.0.0.0/24 is directly connected, Gi0/0` });
    const askType = pick(level === 1 ? ['O IA', 'O E2', 'O*E2'] : ['O IA', 'O E2', 'O*E2', 'low', 'high', 'O']);
    let q, idx, expl;
    if (askType === 'low' || askType === 'high') {
      const cs = rows.map(r => r.c); const target = askType === 'low' ? Math.min(...cs) : Math.max(...cs); idx = rows.findIndex(r => r.c === target);
      if (cs.filter(c => c === target).length > 1) return routeRound(level);
      q = askType === 'low' ? 'לחצו על הנתיב עם ה-<b>Cost הנמוך ביותר</b> (המספר השני בסוגריים)' : 'לחצו על הנתיב עם ה-<b>Cost הגבוה ביותר</b>'; expl = `[110/${target}] – ה-Cost הוא המספר השני בסוגריים.`;
    } else {
      const cnt = rows.filter(r => r.t === askType).length; if (cnt !== 1) return routeRound(level); idx = rows.findIndex(r => r.t === askType);
      q = { 'O IA': 'לחצו על הנתיב שנלמד <b>מאזור אחר</b> (Inter-Area)', 'O E2': 'לחצו על הנתיב ה<b>חיצוני</b> (External) שאינו ברירת מחדל', 'O*E2': 'לחצו על <b>ניתוב ברירת המחדל</b> שנלמד ב-OSPF', 'O': 'לחצו על נתיב OSPF רגיל מתוך <b>האזור</b> (ללא IA/E)' }[askType];
      expl = { 'O IA': 'IA = Inter-Area: הגיע מאזור אחר דרך ABR.', 'O E2': 'E2 = External: נלמד מחוץ ל-OSPF דרך ASBR.', 'O*E2': 'הכוכבית (*) מסמנת ברירת מחדל; E2 – חיצוני.', 'O': 'O ללא תוספת = נתיב בתוך האזור.' }[askType];
    }
    lines[idx + 2].ans = true; return { lines, q, expl };
  }
  function nbrRound(level) {
    const n = randi(3, 4); const roles = shuffle(['FULL/DR', 'FULL/BDR', 'FULL/DROTHER', '2WAY/DROTHER', 'INIT/-', 'EXSTART/-']).slice(0, n);
    const hasDR = roles.includes('FULL/DR'), hasB = roles.includes('FULL/BDR');
    const rows = roles.map((r, i) => ({ id: `${i + 2}.${i + 2}.${i + 2}.${i + 2}`, pri: r.endsWith('-') ? 0 : pick([1, 1, 100]), st: r, dead: `00:00:${randi(20, 39)}`, ad: `192.168.1.${i + 2}`, i: 'Fa0/0' }));
    const lines = [{ t: 'R1#show ip ospf neighbor', dim: true }, { t: 'Neighbor ID     Pri   State        Dead Time   Address         Interface', dim: true }];
    rows.forEach(r => lines.push({ t: `${pad(r.id, 16)}${pad(r.pri, 6)}${pad(r.st, 13)}${pad(r.dead, 12)}${pad(r.ad, 16)}${r.i}` }));
    const opts = [];
    if (hasDR) opts.push(['DR', 'לחצו על השכן שהוא <b>DR</b>', r => r.st === 'FULL/DR', 'FULL/DR – התפקיד אחרי הלוכסן.']);
    if (hasB) opts.push(['BDR', 'לחצו על השכן שהוא <b>BDR</b>', r => r.st === 'FULL/BDR', 'FULL/BDR – גיבוי ל-DR.']);
    if (roles.includes('2WAY/DROTHER')) opts.push(['2W', 'לחצו על השכן שבשכנות <b>חלקית (2-Way)</b> – DROTHER', r => r.st === '2WAY/DROTHER', '2-WAY בין DROTHER-ים: Hello בלבד, בלי עדכוני ניתוב.']);
    if (roles.includes('INIT/-')) opts.push(['init', 'לחצו על השכן ש<b>עדיין לא הגיע ל-FULL</b> ונתקע בשלב Init', r => r.st === 'INIT/-', 'INIT – שמענו Hello מהשכן, אבל הוא עוד לא ראה אותנו ברשימה שלו.']);
    if (roles.includes('EXSTART/-')) opts.push(['ex', 'לחצו על השכן שנמצא בשלב <b>ExStart</b> (בחירת Master/Slave)', r => r.st === 'EXSTART/-', 'ExStart – בחירת אדון ועבד לפני החלפת תקצירים (DBD).']);
    if (level >= 2) { const m = Math.max(...rows.map(r => r.pri)); if (rows.filter(r => r.pri === m).length === 1 && m > 1) opts.push(['pri', 'לחצו על השכן עם ה-<b>Priority הגבוה</b>', r => r.pri === m, 'עמודת Pri – הערך 100 גבוה מ-1.']); const mn = Math.min(...rows.map(r => parseInt(r.dead.slice(-2)))); if (rows.filter(r => parseInt(r.dead.slice(-2)) === mn).length === 1) opts.push(['dead', 'איזה שכן ה-<b>Dead Time</b> שלו הנמוך ביותר (הכי קרוב להיחשב מת)?', r => parseInt(r.dead.slice(-2)) === mn, 'Dead Time – השניות שנותרו לפני שהשכן מוכרז מת.']); }
    const o = pick(opts); const idx = rows.findIndex(o[2]); lines[idx + 2].ans = true; return { lines, q: o[1], expl: o[3] };
  }
  function ifRound(level) {
    const cost = pick([1, 10, 20, 64]), hello = pick([10, 5, 30]), dead = hello * 4, pri = pick([1, 100, 0]);
    const net = pick(['BROADCAST', 'POINT_TO_POINT']); const st = net === 'POINT_TO_POINT' ? 'POINT_TO_POINT' : pick(['DR', 'BDR', 'DROTHER']);
    const lines = [{ t: 'R4#show ip ospf interface fa0/0', dim: true }, { t: 'FastEthernet0/0 is up, line protocol is up', dim: true }, { t: `  Internet Address 10.0.0.4/24, Area ${pick([0, 1, 2])}` }, { t: `  Process ID 1, Router ID 4.4.4.4, Network Type ${net}, Cost: ${cost}` }, { t: `  Transmit Delay is 1 sec, State ${st}${net === 'BROADCAST' ? ', Priority ' + pri : ''}` }, { t: `  Timer intervals configured, Hello ${hello}, Dead ${dead}, Wait ${dead}, Retransmit 5` }];
    const qs = [['לחצו על השורה שמראה את ה-<b>Cost</b> של הממשק', 3, 'Cost מופיע בשורת Process ID, אחרי Network Type.'], ['לחצו על השורה שמראה את ה-<b>טיימרי Hello ו-Dead</b>', 5, 'Timer intervals configured…'], ['לחצו על השורה שמראה את <b>סוג הרשת</b> (Network Type)', 3, 'Network Type: BROADCAST או POINT_TO_POINT.'], ['לחצו על השורה שמראה את <b>האזור (Area)</b> של הממשק', 2, 'Internet Address …, Area N.'], ['לחצו על השורה שמראה את <b>התפקיד</b> של הנתב ברשת (State)', 4, 'State DR/BDR/DROTHER – או POINT_TO_POINT.']];
    const [q, i, expl] = pick(level === 1 ? qs.slice(0, 2) : qs); lines[i].ans = true; return { lines, q, expl };
  }
  function protoRound() {
    const rid = `${randi(1, 9)}.${randi(1, 9)}.${randi(1, 9)}.${randi(1, 9)}`; const mp = pick([4, 4, 8, 2]); const pas = pick(['GigabitEthernet0/1', 'FastEthernet1/0']);
    const lines = [{ t: 'R1#show ip protocols', dim: true }, { t: 'Routing Protocol is "ospf 1"' }, { t: `  Router ID ${rid}` }, { t: '  Number of areas in this router is 2. 1 normal 1 stub 0 nssa' }, { t: `  Maximum path: ${mp}` }, { t: '  Routing for Networks:', dim: true }, { t: '    192.168.12.0 0.0.0.255 area 0' }, { t: '    192.168.13.0 0.0.0.255 area 1' }, { t: '  Passive Interface(s):', dim: true }, { t: `    ${pas}` }];
    const qs = [['לחצו על ה-<b>Router-ID</b> של הנתב', 2, 'Router ID – בשורה הראשונה אחרי שם התהליך.'], ['לחצו על השורה שמראה את <b>מקסימום המסלולים השווים</b> (איזון עומסים)', 4, 'Maximum path.'], ['לחצו על הממשק ה<b>פסיבי</b>', 9, 'תחת Passive Interface(s).'], ['לחצו על השורה שמראה <b>כמה אזורים</b> יש לנתב', 3, 'Number of areas in this router…'], ['לחצו על הרשת שמפורסמת ב-<b>Area 1</b>', 7, 'Routing for Networks … area 1.']];
    const [q, i, expl] = pick(qs); lines[i].ans = true; return { lines, q, expl };
  }
  function cmdRound() {
    const Q = [['איזו פקודה מציגה את ה-<b>LSDB</b> (כל ה-LSA)?', 'show ip ospf database', ['show ip route', 'show ip ospf neighbor', 'show ip protocols']], ['איזו פקודה מציגה את <b>טבלת השכנים</b>?', 'show ip ospf neighbor', ['show ip ospf database', 'show ip route ospf', 'show ip ospf interface']], ['איזו פקודה תראה את ה-<b>Cost והטיימרים</b> של ממשק?', 'show ip ospf interface', ['show ip ospf', 'show ip ospf neighbor', 'show ip route']], ['איזו פקודה תראה <b>סוג הנתב</b> (ABR/ASBR) ומספר האזורים?', 'show ip ospf', ['show ip ospf interface', 'show ip ospf neighbor', 'show ip route']], ['איזו פקודה מציגה את <b>הנתיבים שנבחרו</b> לטבלת הניתוב?', 'show ip route', ['show ip ospf database', 'show ip ospf neighbor', 'show ip ospf']]];
    const [q, a, w] = pick(Q); return { mc: { opts: shuffle([a, ...w]), ans: a }, q, expl: `<code>${a}</code>` };
  }

  OG.games.ch7 = {
    title: 'הבלש בטרמינל', story: 'התקלה בעיר! הבלשית שולחת לכם פלטים של פקודות show. מצאו את השורה הנכונה לפני שהזמן נגמר – כל שורה היא עדות.',
    how: { 1: 'לחצו על השורה שעונה על השאלה (סוגי מסלולים בטבלת הניתוב, שכנים, טיימרים).', 2: 'כולל Cost הנמוך/הגבוה, Priority, Dead Time ופלט של show ip protocols.', 3: 'שאלות מורכבות, פחות זמן, ושאלות "איזו פקודה מציגה…".' },
    cfg: { 1: { tasks: 8, lives: 3, time: 150 }, 2: { tasks: 9, lives: 3, time: 150 }, 3: { tasks: 10, lives: 3, time: 140 } },
    help: 'לחצו על השורה המתאימה בפלט',
    start(stage, level, sh) {
      const root = el('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', overflow: 'auto' } }); stage.append(root);
      const card = el('div.panel', { style: { width: 'min(900px,98%)' } }); root.append(card);
      let R, locked, ET; const secs = [0, 25, 22, 20][level];
      function gen() { const r = Math.random(); if (level === 1) return r < .55 ? routeRound(1) : r < .8 ? nbrRound(1) : ifRound(1); if (level === 2) return r < .3 ? routeRound(2) : r < .55 ? nbrRound(2) : r < .8 ? ifRound(2) : protoRound(); return r < .2 ? routeRound(3) : r < .4 ? nbrRound(3) : r < .55 ? ifRound(3) : r < .75 ? protoRound() : cmdRound(); }
      function next() {
        locked = false; ET = 0; R = gen(); card.innerHTML = '';
        card.append(el('div', { style: { fontSize: '21px', fontWeight: 800, marginBottom: '8px' }, html: '🕵️ ' + R.q }));
        const bar = el('div.progress', el('i')); card.append(bar); card.bar = bar;
        if (R.mc) {
          const g = el('div', { style: { display: 'grid', gap: '8px', margin: '14px 0' } });
          R.mc.opts.forEach(o => g.append(el('button.opt', { style: { fontFamily: 'var(--mono)', direction: 'ltr', textAlign: 'left' }, text: o, onclick() { done(o === R.mc.ans, null); } })));
          card.append(g);
        } else {
          const term = el('div.cli', { style: { fontSize: '14px', margin: '12px 0' } });
          R.lines.forEach(l => { const d = el('div', { text: l.t || ' ', style: { cursor: l.dim ? 'default' : 'pointer', padding: '1px 6px', borderRadius: '4px', whiteSpace: 'pre', color: l.dim ? '#6f7ea8' : '' } }); if (!l.dim) { d.onmouseenter = () => { if (!locked) d.style.background = 'rgba(34,211,238,.15)'; }; d.onmouseleave = () => { if (!locked) d.style.background = ''; }; d.onclick = () => done(!!l.ans, d); } l.el = d; term.append(d); });
          card.append(term);
        }
        card.fb = el('div.fb', { style: { display: 'none' } }); card.append(card.fb);
      }
      function done(ok, node, timeout) {
        if (locked) return; locked = true; OG.snd.init();
        if (R.lines) R.lines.forEach(l => { if (l.ans) { l.el.style.background = 'rgba(52,211,153,.35)'; l.el.style.outline = '2px solid #34d399'; } }); if (node && !ok) node.style.background = 'rgba(251,113,133,.4)';
        card.fb.style.display = ''; card.fb.className = 'fb ' + (ok ? 'ok' : 'no'); card.fb.innerHTML = (timeout ? '⏰ נגמר הזמן. ' : ok ? '✅ מצוין! ' : '❌ לא זו השורה. ') + R.expl;
        if (ok) sh.correct({ speed: Math.max(0, 1 - ET / secs), x: 400, y: 80 }); else sh.wrong({ advance: true, x: 400, y: 80 });
        setTimeout(() => { if (!sh.ended) next(); }, ok ? 1300 : 3000);
      }
      next();
      const l = sh.raf(dt => { if (locked) return; ET += dt; const left = secs - ET; card.bar.firstChild.style.width = Math.max(0, left / secs * 100) + '%'; if (left <= 0) done(false, null, true); });
      return { destroy() { l.stop(); root.remove(); } };
    }
  };
})(window.OG);
