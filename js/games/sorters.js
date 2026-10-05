/* Minigames built on the falling-items Sorter: ch1 (route dispatch), ch2 (router roles), e2 (LSA post office), e4 (customs) */
(function (OG) {
  const { el, pick, randi, shuffle } = OG;
  const ip = (a, b, c, d) => [a, b, c, d].join('.');

  /* ================= CH1 – Dispatch gate: longest prefix + AD ================= */
  const SRC_NAME = { S: 'Static', C: 'Connected', D: 'EIGRP', O: 'OSPF', R: 'RIP' };
  function pickRoute(table, ipa) {
    const m = table.filter(r => OG.inNet(ipa, r.net, r.p));
    if (!m.length) return { gate: 'X', why: 'אין שום התאמה בטבלה ואין ברירת מחדל – החבילה נזרקת (Drop).' };
    const maxP = Math.max(...m.map(r => r.p)); const top = m.filter(r => r.p === maxP);
    top.sort((a, b) => a.ad - b.ad); const w = top[0];
    let why = '';
    if (top.length > 1) why = `אותה תחילית /${maxP} מכמה מקורות – מנצח ה-AD הנמוך: ${SRC_NAME[w.s]} (${w.ad}).`;
    else if (m.length > 1) why = `כמה מסלולים תואמים – נבחרה התחילית הארוכה ביותר /${maxP}.`;
    else why = w.p === 0 ? 'רק ברירת המחדל תואמת.' : `התאמה יחידה: ${w.net}/${w.p}.`;
    return { gate: w.g, why, route: w };
  }
  const T1 = { 1: [{ net: '10.1.0.0', p: 16, s: 'O', ad: 110, g: 'A' }, { net: '10.2.0.0', p: 16, s: 'O', ad: 110, g: 'B' }, { net: '172.16.0.0', p: 16, s: 'O', ad: 110, g: 'C' }, { net: '0.0.0.0', p: 0, s: 'S', ad: 1, g: 'D' }],
    2: [{ net: '10.0.0.0', p: 8, s: 'O', ad: 110, g: 'A' }, { net: '10.1.0.0', p: 16, s: 'O', ad: 110, g: 'B' }, { net: '10.1.5.0', p: 24, s: 'O', ad: 110, g: 'C' }, { net: '0.0.0.0', p: 0, s: 'S', ad: 1, g: 'D' }],
    3: [{ net: '10.0.0.0', p: 8, s: 'O', ad: 110, g: 'A' }, { net: '10.0.0.0', p: 8, s: 'R', ad: 120, g: 'B' }, { net: '10.5.0.0', p: 16, s: 'R', ad: 120, g: 'B' }, { net: '192.168.10.0', p: 24, s: 'S', ad: 1, g: 'C' }, { net: '192.168.10.0', p: 24, s: 'O', ad: 110, g: 'A' }, { net: '192.168.20.0', p: 24, s: 'D', ad: 90, g: 'D' }, { net: '192.168.20.0', p: 24, s: 'O', ad: 110, g: 'A' }] };
  const GEN1 = {
    1: () => { const r = Math.random(); return r < .25 ? ip(10, 1, randi(0, 255), randi(1, 250)) : r < .5 ? ip(10, 2, randi(0, 255), randi(1, 250)) : r < .75 ? ip(172, 16, randi(0, 255), randi(1, 250)) : pick([ip(8, 8, 8, 8), ip(1, 1, 1, 1), ip(100, randi(1, 99), 4, 4)]); },
    2: () => { const r = Math.random(); return r < .3 ? ip(10, 1, 5, randi(1, 250)) : r < .55 ? ip(10, 1, randi(6, 250), randi(1, 250)) : r < .8 ? ip(10, randi(2, 250), randi(1, 250), randi(1, 250)) : pick([ip(8, 8, 4, 4), ip(172, 20, 1, 1), ip(11, 0, 0, 1)]); },
    3: () => { const r = Math.random(); return r < .2 ? ip(10, 5, randi(0, 250), randi(1, 250)) : r < .4 ? ip(10, randi(6, 250), randi(0, 250), randi(1, 250)) : r < .6 ? ip(192, 168, 10, randi(1, 250)) : r < .8 ? ip(192, 168, 20, randi(1, 250)) : pick([ip(172, 16, 4, 4), ip(8, 8, 8, 8), ip(192, 168, 30, 7)]); }
  };
  OG.games.ch1 = {
    title: 'שער המיון', story: 'חבילות מגיעות לשער העיר! לפי טבלת הניתוב – שלחו כל חבילה אל השער (A–D) שהנתב היה בוחר. זוכרים? התחילית הארוכה קודמת, ובין מקורות שווים – ה-AD הנמוך.',
    how: { 1: 'בחרו את השער לפי כתובת היעד ולפי הטבלה בצד. לחצו על השער או על מקשי 1–4.', 2: 'שימו לב: יש תחיליות חופפות – /8, /16 ו-/24. הספציפי מנצח!', 3: 'הוסיפו מקורות ניתוב שונים (Static / EIGRP / OSPF / RIP) לאותה רשת, ו"שער 5" = Drop. הספציפי קודם, ובשווה – AD נמוך.' },
    cfg: { 1: { tasks: 10, lives: 3 }, 2: { tasks: 12, lives: 3 }, 3: { tasks: 14, lives: 3 } },
    help: '1–4 / לחיצה: בחירת שער',
    start(stage, level, sh) {
      const table = T1[level]; const gates = ['A', 'B', 'C', 'D'];
      const bins = gates.map((g, i) => ({ id: g, label: 'שער ' + g, glyph: ['🟦', '🟩', '🟨', '🟪'][i], color: ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa'][i] }));
      if (level === 3) bins.push({ id: 'X', label: 'Drop', sub: 'אין מסלול', glyph: '🗑️', color: '#fb7185' });
      return OG.Sorter(stage, sh, {
        bins, fall: [0, 11, 9, 7.5][level], gap: [0, 4.2, 3.4, 2.8][level], maxActive: level === 1 ? 2 : 3,
        next() { const dest = GEN1[level](); const r = pickRoute(table, dest); return { icon: '📦', title: dest, detail: 'יעד', bin: r.gate, why: r.why, r: r.route }; },
        side(box, item) {
          const rows = table.map(r => { const hit = item && OG.inNet(item.title, r.net, r.p); return `<tr class="${hit ? 'flash' : ''}"><td>${r.s}</td><td>${r.net}/${r.p}</td><td>${r.ad}</td><td>${r.g}</td></tr>`; }).join('');
          box.innerHTML = `<div class="wbox"><b>📋 טבלת ניתוב</b><table><tr><th>Src</th><th>Prefix</th><th>AD</th><th>→</th></tr>${rows}</table><div class="muted" style="margin-top:4px">שורה מוארת = תואמת לחבילה</div></div>`;
        },
        explain(item, choice, ok) { return (ok ? '' : `נכון: <b>${item.bin === 'X' ? 'Drop' : 'שער ' + item.bin}</b>. `) + item.why; }
      });
    }
  };

  /* ================= CH2 – Router role conveyor ================= */
  function genRouter(level) {
    const names = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12'];
    const kinds = level === 1 ? ['standard', 'backbone', 'abr'] : level === 2 ? ['standard', 'backbone', 'abr', 'asbr'] : ['standard', 'backbone', 'abr', 'asbr', 'both'];
    const kind = pick(kinds); const ifs = []; const A = () => randi(1, 5);
    const ports = shuffle(['Fa0/0', 'Fa0/1', 'Gi0/0', 'Gi0/1', 'Se1/0', 'Gi0/2']);
    const ext = pick([['EIGRP', 'מוזרק (redistribute) מ-EIGRP'], ['Static', 'ניתוב סטטי מחוץ ל-OSPF + redistribute static'], ['RIP', 'רשת RIP – מבצע redistribute']]);
    if (kind === 'standard') { const a = A(); ifs.push([ports[0], 'Area ' + a], [ports[1], 'Area ' + a]); if (Math.random() > .5) ifs.push([ports[2], 'Area ' + a]); }
    if (kind === 'backbone') { ifs.push([ports[0], 'Area 0'], [ports[1], 'Area 0']); if (Math.random() > .5) ifs.push([ports[2], 'Area 0']); }
    if (kind === 'abr') { const a = A(), b = Math.random() > .3 ? 0 : A() + 5; ifs.push([ports[0], 'Area 0'], [ports[1], 'Area ' + a]); if (Math.random() > .6) ifs.push([ports[2], 'Area ' + (a + 1)]); }
    if (kind === 'asbr') { const a = Math.random() > .5 ? 0 : A(); ifs.push([ports[0], 'Area ' + a], [ports[1], 'Area ' + a], [ports[2], ext[0] + ' (חיצוני)']); }
    if (kind === 'both') { const a = A(); ifs.push([ports[0], 'Area 0'], [ports[1], 'Area ' + a], [ports[2], ext[0] + ' (חיצוני)']); }
    const areas = new Set(ifs.filter(i => /Area/.test(i[1])).map(i => i[1])); const hasExt = ifs.some(i => /חיצוני/.test(i[1]));
    const multi = areas.size >= 2; let bin;
    if (hasExt && multi) bin = 'both'; else if (hasExt) bin = 'asbr'; else if (multi) bin = 'abr'; else if (areas.has('Area 0')) bin = 'backbone'; else bin = 'standard';
    const why = { standard: 'כל הממשקים באותו אזור שאינו 0 → נתב רגיל (Standard/Internal).', backbone: 'כל הממשקים ב-Area 0 → נתב Backbone.', abr: 'ממשקים בלפחות שני אזורים → ABR.', asbr: 'מחובר לרשת/פרוטוקול חיצוני ומבצע Redistribute → ASBR.', both: 'גם בכמה אזורים וגם חיבור חיצוני → ABR וגם ASBR.' }[bin];
    return { icon: '🔀', title: pick(names) + ' · ' + OG.randi(1, 99), detail: ifs.map(i => `<div class="ltr">${i[0]} – ${i[1]}</div>`).join(''), bin, why };
  }
  OG.games.ch2 = {
    title: 'מסוע הנתבים', story: 'בנתב מעבדת Link-State מגיעים נתבים על מסוע. הסתכלו על הממשקים שלהם ושלחו כל נתב לתא הנכון לפי התפקיד שלו ב-OSPF.',
    how: { 1: 'מיינו ל-Standard (כל הממשקים באותו אזור ≠0), Backbone (הכול ב-Area 0) ו-ABR (כמה אזורים).', 2: 'נוסף ASBR: ממשק שמחובר לפרוטוקול/רשת חיצוניים (Redistribute).', 3: 'נוסף תא "ABR+ASBR" – נתב שגם בין אזורים וגם חיבור חיצוני. המסוע מהיר!' },
    cfg: { 1: { tasks: 10, lives: 3 }, 2: { tasks: 12, lives: 3 }, 3: { tasks: 14, lives: 3 } },
    help: '1–5 / לחיצה: בחירת תפקיד',
    start(stage, level, sh) {
      const B = { standard: { id: 'standard', label: 'Standard', sub: 'פנימי באזור ≠ 0', glyph: '🏠', color: '#60a5fa' }, backbone: { id: 'backbone', label: 'Backbone', sub: 'הכול ב-Area 0', glyph: '🧱', color: '#fbbf24' }, abr: { id: 'abr', label: 'ABR', sub: 'בין אזורים', glyph: '🌉', color: '#34d399' }, asbr: { id: 'asbr', label: 'ASBR', sub: 'חיבור חיצוני', glyph: '🌍', color: '#f472b6' }, both: { id: 'both', label: 'ABR + ASBR', sub: 'שניהם', glyph: '🌉🌍', color: '#a78bfa' } };
      const bins = level === 1 ? [B.standard, B.backbone, B.abr] : level === 2 ? [B.standard, B.backbone, B.abr, B.asbr] : [B.standard, B.backbone, B.abr, B.asbr, B.both];
      return OG.Sorter(stage, sh, { bins, fall: [0, 11, 9, 7.5][level], gap: [0, 4.4, 3.5, 2.9][level], maxActive: 3, next() { return genRouter(level); }, explain(item, c, ok) { return (ok ? '' : `נכון: <b>${B[item.bin].label}</b>. `) + item.why; } });
    }
  };

  /* ================= E2 – LSA post office ================= */
  const LSA = {
    1: { name: 'Type 1 – Router', clues: ['כל נתב יוצר אחד כזה: מתאר את הממשקים והעלויות שלו באזור', 'מוצף רק בתוך האזור – מכיל מידע על הנתב עצמו וקישוריו', 'ה-LSA הבסיסי ביותר: "הנה הממשקים שלי והעלות לכל אחד"'], l3: ['נוצר על ידי כל נתב ללא יוצא מן הכלל, וגבולו האזור', 'ב-LSDB של אזור תראו אחד כזה לכל נתב באזור'] },
    2: { name: 'Type 2 – Network', clues: ['נוצר על ידי ה-DR ברשת מרובת גישה', 'מפרט אילו נתבים מחוברים למתג/ל-Segment', 'קיים רק ברשתות Broadcast שבהן נבחר DR'], l3: ['"מי יושב על הרשת הזו?" – רשימת הנתבים המחוברים, מאת ה-DR', 'בלי DR (למשל Point-to-Point) אין כזה'] },
    3: { name: 'Type 3 – Summary', clues: ['נוצר על ידי ABR ומתאר רשתות מאזור אחר', 'בטבלת הניתוב מופיע כ-O IA (Inter-Area)', 'ABR מפרסם בעזרתו לאזור שלי את הרשתות של האזורים האחרים'], l3: ['הסיבה שבגללה בטבלת הניתוב רואים O IA', 'הסוג שחסום ב-Totally Stub (פרט לברירת מחדל)'] },
    4: { name: 'Type 4 – ASBR Summary', clues: ['ABR יוצר אותו כדי לספר היכן נמצא ה-ASBR', 'מגדיר איך להגיע אל ה-ASBR מאזורים אחרים', 'ABR → "ה-ASBR נמצא שם ועולה כך וכך"'], l3: ['לא מכיל רשתות – מכיל נתיב אל הנתב שהזריק רשתות חיצוניות', 'שומר שנתבים באזורים אחרים ידעו איך להגיע ל-ASBR כדי להשתמש ב-Type 5'] },
    5: { name: 'Type 5 – External', clues: ['נוצר על ידי ASBR ומכיל ניתובים חיצוניים (Redistribute)', 'מוצף בכל ה-AS פרט לאזורי Stub', 'בטבלת הניתוב מסומן E1 או E2'], l3: ['אזור Stub חוסם אותו', 'הזרקת redistribute static / EIGRP לתוך OSPF יוצרת אותו'] },
    7: { name: 'Type 7 – NSSA External', clues: ['נוצר על ידי ASBR שנמצא באזור NSSA', 'ABR ממיר אותו ל-Type 5 כשהוא יוצא מהאזור', 'בא במקום Type 5 בתוך אזור NSSA'], l3: ['Not-So-Stubby: מאפשר ASBR בתוך האזור, בלי לשבור את החסימה של Type 5', 'הסוג היחיד שעובר "המרה" בגבול האזור'] }
  };
  OG.games.e2 = {
    title: 'מיון הדואר', story: 'בדואר ה-LSA מגיעים מכתבים ללא כתובת! קראו את הרמז ושלחו כל LSA לתא של הסוג הנכון. כל סוג מכיל מי יצר אותו ועד לאן הוא מגיע.',
    how: { 1: 'ארבעה סוגים: 1 (נתב), 2 (רשת/DR), 3 (סיכום/ABR), 5 (חיצוני/ASBR).', 2: 'כל ששת הסוגים, כולל 4 (ASBR Summary) ו-7 (NSSA).', 3: 'רמזים עקיפים וקשים: קודי מסלול, אזורי Stub ועוד. מהר!' },
    cfg: { 1: { tasks: 10, lives: 3 }, 2: { tasks: 12, lives: 3 }, 3: { tasks: 14, lives: 3 } },
    help: '1–6 / לחיצה: סוג ה-LSA',
    start(stage, level, sh) {
      const types = level === 1 ? [1, 2, 3, 5] : [1, 2, 3, 4, 5, 7]; const col = { 1: '#60a5fa', 2: '#34d399', 3: '#fbbf24', 4: '#fb923c', 5: '#f472b6', 7: '#a78bfa' };
      const bins = types.map(t => ({ id: String(t), label: 'Type ' + t, sub: LSA[t].name.split('– ')[1], glyph: '✉️', color: col[t] }));
      return OG.Sorter(stage, sh, { bins, fall: [0, 12, 10, 8.5][level], gap: [0, 4.6, 3.8, 3.2][level], maxActive: 3, next() { const t = pick(types); const L = LSA[t]; const clue = level === 3 ? pick(L.l3.concat(L.clues)) : pick(L.clues); return { icon: '✉️', title: 'LSA ?', detail: clue, bin: String(t), name: L.name }; }, explain(item, c, ok) { return (ok ? '' : 'נכון: ') + `<b>${item.name}</b>`; } });
    }
  };

  /* ================= E4 – Customs (area types) ================= */
  const AREAS = { normal: 'אזור רגיל', stub: 'Stub', tstub: 'Totally Stub', nssa: 'NSSA', tnssa: 'Totally NSSA' };
  function rule(area, type, dflt) {
    // returns 'allow' | 'block' | 'convert'
    if (type === '1' || type === '2') return 'allow';
    if (area === 'normal') return type === '7' ? 'block' : 'allow';
    if (type === '3') { if (dflt) return 'allow'; return (area === 'tstub' || area === 'tnssa') ? 'block' : 'allow'; }
    if (type === '4') return 'block';
    if (type === '5') return 'block';
    if (type === '7') return (area === 'nssa' || area === 'tnssa') ? 'allow' : 'block';
    return 'allow';
  }
  const WHY = {
    '5-stub': 'Stub חוסם Type 5 (וגם 4) – במקומם ה-ABR מזריק ברירת מחדל.', '5-tstub': 'Totally Stub חוסם Type 5.', '5-nssa': 'NSSA חוסם Type 5 – חיצוניים נכנסים כ-Type 7.', '5-tnssa': 'Totally NSSA חוסם Type 5.',
    '3-tstub': 'Totally Stub חוסם גם Type 3 (פרט לברירת המחדל).', '3-tnssa': 'Totally NSSA חוסם Type 3 (פרט לברירת המחדל).', '3-stub': 'ב-Stub רגיל Type 3 עדיין עובר – רק Type 5 נחסם.', '3-nssa': 'ב-NSSA רגיל Type 3 עובר.',
    '7-nssa': 'NSSA מתיר ASBR באזור ולכן Type 7 מותר.', '7-tnssa': 'Totally NSSA מתיר Type 7.', '7-stub': 'ב-Stub אין ASBR – Type 7 לא קיים/חסום.', '7-tstub': 'ב-Totally Stub אין ASBR – חסום.', '7-normal': 'באזור רגיל Type 7 לא בשימוש.',
    '4-stub': 'Type 4 חסום באזור Stub (אין צורך לדעת איפה ה-ASBR).', 'dflt': 'ברירת המחדל (0.0.0.0) ש-ABR מזריק כ-Type 3 חייבת לעבור – זה כל הרעיון!', 'ok': 'מידע פנים-אזורי או רגיל – עובר.'
  };
  OG.games.e4 = {
    title: 'ביקורת המכס', story: 'אזורים קטנים לא רוצים לקבל את כל מה שקיים בעולם. אתם קציני המכס: LSA מגיע לגבול אזור – להכניס, לחסום, או (ב-ABR) להמיר Type 7 ל-Type 5?',
    how: { 1: 'אזורים: רגיל ו-Stub. Stub חוסם Type 5.', 2: 'הוסיפו Totally Stub (חוסם Type 3), NSSA (מתיר Type 7, חוסם Type 5).', 3: 'כל הסוגים, כולל Totally NSSA, ברירת מחדל Type 3 ("0.0.0.0" עובר תמיד!), והמרת Type 7→5 בגבול. בלי תזכורת בצד!' },
    cfg: { 1: { tasks: 10, lives: 3 }, 2: { tasks: 12, lives: 3 }, 3: { tasks: 14, lives: 3 } },
    help: '1 מותר · 2 חסום · 3 המרה',
    start(stage, level, sh) {
      const areas = level === 1 ? ['normal', 'stub'] : level === 2 ? ['stub', 'tstub', 'nssa', 'normal'] : ['stub', 'tstub', 'nssa', 'tnssa'];
      const types = level === 1 ? ['1', '2', '3', '5'] : ['1', '2', '3', '5', '7', '4'];
      const bins = [{ id: 'allow', label: 'מותר', sub: 'נכנס לאזור', glyph: '✅', color: '#34d399' }, { id: 'block', label: 'חסום', sub: 'לא נכנס', glyph: '⛔', color: '#fb7185' }];
      if (level === 3) bins.push({ id: 'convert', label: 'המרה', sub: 'ABR: 7 → 5', glyph: '🔄', color: '#a78bfa' });
      return OG.Sorter(stage, sh, {
        bins, fall: [0, 11, 9, 7.5][level], gap: [0, 4.4, 3.5, 2.9][level], maxActive: 3,
        next() {
          const area = pick(areas); let type = pick(types); let dflt = false, convert = false;
          if (level === 3 && Math.random() < .2) { type = '3'; dflt = true; }
          else if (level === 3 && Math.random() < .2) { type = '7'; convert = true; }
          let ans = rule(area, type, dflt); let detail = `אזור: <b>${AREAS[area]}</b>`;
          if (dflt) detail += '<br>(ברירת מחדל 0.0.0.0/0)';
          if (convert) { detail = 'בגבול אזור NSSA → <b>ה-ABR</b> מעביר אל שאר ה-AS'; ans = 'convert'; }
          const key = dflt ? 'dflt' : convert ? '7-nssa' : `${type}-${area}`;
          const why = convert ? 'ה-ABR ממיר Type 7 ל-Type 5 כשהוא יוצא מאזור NSSA אל שאר ה-AS.' : dflt ? WHY.dflt : (WHY[key] || WHY.ok);
          return { icon: '🛂', title: 'LSA Type ' + type, detail, bin: ans, why };
        },
        side: level < 3 ? (box) => { box.innerHTML = '<div class="wbox" style="font-size:12.5px;line-height:1.6"><b>📋 תזכורת</b><br>Stub: חוסם 5<br>Totally Stub: חוסם 5 + 3<br>NSSA: מתיר 7, חוסם 5<br>1 ו-2 – תמיד עוברים</div>'; } : null,
        explain(item, c, ok) { return (ok ? '' : `נכון: <b>${{ allow: 'מותר', block: 'חסום', convert: 'המרה' }[item.bin]}</b>. `) + item.why; }
      });
    }
  };
})(window.OG);
