/* Chapter 2 – Link-State, LSA, LSDB, SPF, areas, ABR/ASBR, router types, tables */
(function (OG) {
  const { el } = OG;

  function areasTopo(S, o = {}) {
    S.area('a0', { cx: 400, cy: 130, rx: 205, ry: 92, color: '#fbbf24', label: 'Area 0 · Backbone', lx: 400, ly: 52 });
    S.area('a1', { cx: 128, cy: 320, rx: 112, ry: 100, color: '#fb923c', label: 'Area 1', lx: 128, ly: 410 });
    S.area('a2', { cx: 400, cy: 372, rx: 118, ry: 78, color: '#f472b6', label: 'Area 2', lx: 400, ly: 436 });
    S.area('a3', { cx: 685, cy: 320, rx: 118, ry: 100, color: '#22d3ee', label: 'Area 3', lx: 685, ly: 410 });
    S.node('B1', 325, 105, { label: 'R', size: .8 }); S.node('B2', 475, 105, { label: 'R', size: .8 }); S.node('B3', 400, 170, { label: 'R', size: .8 });
    S.node('ABR1', 215, 215, { label: 'ABR', size: .8 }); S.node('ABR2', 400, 262, { label: 'ABR', size: .8 }); S.node('ABR3', 585, 215, { label: 'ABR', size: .8 });
    S.node('A1', 105, 330, { label: 'R', size: .8 }); S.node('A2', 400, 372, { label: 'R', size: .8 }); S.node('A3', 695, 330, { label: 'R', size: .8 });
    S.node('AS', 595, 60, { label: 'ASBR', size: .8 }); S.node('CL', 735, 70, { type: 'cloud', label: 'רשת חיצונית', sub: 'RIP / EIGRP', ly: 46 });
    [['B1', 'B2'], ['B1', 'B3'], ['B2', 'B3'], ['B1', 'ABR1'], ['ABR1', 'A1'], ['B3', 'ABR2'], ['ABR2', 'A2'], ['B2', 'ABR3'], ['ABR3', 'A3'], ['B2', 'AS'], ['AS', 'CL']].forEach(([a, b]) => S.link(a, b, { w: 3 }));
  }

  OG.lessons.ch2 = {
    steps: [
      {
        title: 'OSPF – פרוטוקול Link-State: מרגיש מהירויות',
        html: `<div class="callout story">🧪 ברוכים הבאים למעבדה של ד"ר דייקסטרה: "OSPF לא מאמין לשמועות. הוא רואה את כל המפה."</div>
          <p>OSPF שייך למשפחת <b>Link-State</b>: הוא "חש" את הממשקים (הפורטים) <b>ואת המהירות שלהם</b>. הוא בוחר את הדרך היעילה ביותר לפי <b>עלות (Cost)</b> – שנגזרת מרוחב הפס. העלויות של כל הדרך <b>מסתכמות</b>.</p>
          <p>בהנפשה: מסלול ישיר אחד איטי (10Mb) מול שני קווים מהירים. מי ינצח?</p>`,
        scene(S) {
          S.node('R1', 140, 225, { label: 'R1' }); S.node('R2', 660, 225, { label: 'R2' }); S.node('R3', 400, 90, { label: 'R3' });
          S.link('R1', 'R2', { label: 'Ethernet 10Mb · cost 10', lo: -22 });
          S.link('R1', 'R3', { label: '1Gb · cost 1', lo: -16 }); S.link('R3', 'R2', { label: '1Gb · cost 1', lo: 16 });
          S.node('PC', 60, 330, { type: 'pc', label: 'PC' });
          S.note('rip', 30, 20, '🗣️ <b>RIP</b>: "ישיר = קפיצה אחת. מצוין!"', { w: 230, cls: 'y', hidden: true });
          S.note('ospf', 540, 20, '🗺️ <b>OSPF</b>: "ישיר = עלות 10. דרך R3 = 1+1 = <b>2</b>"', { w: 250, cls: 'g', hidden: true });
          S.at(.8, S => { S.show('rip', true); S.packet('R1', 'R2', { label: 'RIP', color: '#fbbf24', dur: 3 }); S.trace(['R1', 'R2'], { color: '#fbbf24', dur: 1.5 }); });
          S.at(4.5, S => { S.clearTraces(); S.show('ospf', true); S.trace(['R1', 'R3', 'R2'], { color: '#34d399', dur: 1.5 }); S.packet(['R1', 'R3', 'R2'], null, { label: 'OSPF', color: '#34d399', dur: 3 }); });
          S.at(8, S => { S.mark('R3', '#34d399'); S.say('R3', 'שתי קפיצות – אבל הכי מהירות!', { w: 170, dy: 90, cls: 'g', dur: 3 }); });
        }
      },
      {
        title: 'LSA ו-LSDB – כולם מספרים לכולם',
        html: `<p>הנתבים מעדכנים זה את זה ב-<b>LSA</b> – <b>Link State Advertisement</b>. כל עדכון נשמר במפה של הנתב, ה-<b>LSDB</b> (<i>Link State Database</i>).</p>
          <p>ה-LSA "מוצף" (Flooding) מנתב לנתב, כך שבסוף כל נתב באזור מחזיק <b>אותה מפה בדיוק</b>.</p>
          <p>בהנפשה: ה-LSA של R1 נוסע בכל הרשת, ובטבלה של R4 נוספות שורות.</p>`,
        scene(S) {
          S.node('R1', 120, 130, { label: 'R1' }); S.node('R2', 330, 70, { label: 'R2' }); S.node('R3', 330, 220, { label: 'R3' }); S.node('R4', 540, 145, { label: 'R4' });
          S.link('R1', 'R2'); S.link('R1', 'R3'); S.link('R2', 'R4'); S.link('R3', 'R4'); S.link('R2', 'R3');
          S.table('lsdb', 40, 280, { w: 340, title: '🗄️ LSDB של R4', head: ['LSA מ-', 'מידע'], rows: [{ c: ['R1', 'ממשקים + עלויות'], hidden: true }, { c: ['R2', 'ממשקים + עלויות'], hidden: true }, { c: ['R3', 'ממשקים + עלויות'], hidden: true }, { c: ['R4', 'ממשקים + עלויות (שלי)'], hidden: true }] });
          S.at(.3, S => S.rowShow('lsdb', 3));
          let k = 0;
          [['R1', 1], ['R2', 4.2], ['R3', 7.4]].forEach(([r, t], i) => S.at(t, S => { S.flood(r, { shape: 'emoji', emoji: '🧩', label: 'LSA ' + r, color: '#22d3ee', hop: .9, onArrive: (nid) => { if (nid === 'R4' && !S['got' + r]) { S['got' + r] = 1; S.rowShow('lsdb', ['R1', 'R2', 'R3'].indexOf(r)); S.rowCls('lsdb', ['R1', 'R2', 'R3'].indexOf(r), 'hl'); } } }); }));
          S.at(11, S => { S.note('ok', 420, 300, '✅ עכשיו לכל נתב יש מפה זהה של כל הרשת', { w: 330, cls: 'g' }); });
        }
      },
      {
        title: 'האלגוריתם SPF → טבלת הניתוב',
        html: `<p>אחרי ש-ה-LSDB מלא, הנתב מריץ עליו את האלגוריתם <b>SPF</b> (Shortest Path First, או בשמו המקצועי <b>Dijkstra</b>) ומוצא את המסלול המהיר ביותר לכל יעד.</p>
          <p>רק <b>הנתיב הטוב ביותר</b> נכנס ל<b>טבלת הניתוב</b>. כל השאר נשארים במפה (LSDB), מוכנים למקרה שהקו ייפול.</p>`,
        scene(S) {
          S.table('lsdb', 20, 40, { w: 270, title: '🗄️ LSDB (המפה)', head: ['נתיב ל-LAN', 'עלות'], rows: [['דרך R2', 12], ['דרך R3', 2], ['דרך R4', 5]] });
          S.node('SPF', 400, 170, { type: 'emoji', emoji: '⚙️', fs: 60, label: 'SPF', sub: 'Dijkstra' });
          S.table('rt', 510, 40, { w: 270, title: '📋 טבלת הניתוב', head: ['יעד', 'דרך'], rows: [{ c: ['LAN', 'R3 (עלות 2)'], hidden: true }] });
          S.at(1, S => { S.rowCls('lsdb', 0, 'bad'); S.rowCls('lsdb', 1, 'win'); S.rowCls('lsdb', 2, 'bad'); });
          S.at(2, S => { S.glow('SPF', true, '#fbbf24'); });
          S.at(3, S => { S.rowShow('rt', 0, true); S.rowCls('rt', 0, 'win'); S.note('t', 220, 300, 'המנצח (עלות 2) נכנס לטבלת הניתוב. שאר הנתיבים נשארים ב-LSDB כגיבוי.', { w: 360, cls: 'g' }); });
        }
      },
      {
        title: 'בדיקת הבנה #1',
        html: '<p>LSA, LSDB ו-SPF – איך הם מתחברים?</p>',
        check: { q: 'מה הסדר הנכון בתהליך של OSPF?', opts: ['SPF רץ → LSA נשלחים → LSDB נבנה', 'LSA נשלחים → ה-LSDB נבנה → SPF מחשב → הנתיב הטוב נכנס לטבלת הניתוב', 'LSDB נבנה → Hello נשלחים → הכל נכנס לטבלת הניתוב', 'LSA מוחקים את ה-LSDB בכל פעם'], a: 1, why: 'LSA = הודעות, LSDB = המפה שנבנית מהן, SPF = האלגוריתם שמחשב מהמפה את הנתיבים הטובים.', fb: { 0: 'SPF צריך מפה מלאה – הוא רץ אחרי שה-LSDB נבנה.' } }
      },
      {
        title: 'למה אזורים (Areas)?',
        html: `<p>כל נתב מכיר את כל המפה של הרשת – וזה גורם לעומס בזיכרון ובעיבוד. ככל שהרשת גדולה, <b>SPF</b> קשה יותר לחישוב.</p>
          <p>הפתרון: <b>לחלק את הרשת לאזורים</b>. כל נתב מכיר בפירוט רק את האזור שלו. 💡 שימו לב איך העומס יורד.</p>`,
        scene(S) {
          let id = 0; const pos = [];
          for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { const x = 90 + c * 120, y = 100 + r * 110; S.node('n' + id, x, y, { type: 'dot', label: '', size: .8 }); pos.push([x, y]); id++; }
          for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { const i = r * 6 + c; if (c < 5) S.link('n' + i, 'n' + (i + 1), { w: 2 }); if (r < 2) S.link('n' + i, 'n' + (i + 6), { w: 2 }); }
          S.note('load', 580, 330, '<b>עומס על הנתב</b><div style="height:14px;background:#0b1230;border-radius:7px;overflow:hidden;margin-top:6px"><i id="ldbar" style="display:block;height:100%;width:95%;background:linear-gradient(90deg,#fbbf24,#ef4444);transition:width 1.4s"></i></div><div id="ldtx" style="margin-top:4px">🔥 אזור אחד גדול – כל נתב מכיר 18 נתבים</div>', { w: 200, cls: 'r' });
          S.at(2, S => { S.area('x1', { cx: 150, cy: 210, rx: 125, ry: 160, color: '#fb923c', label: 'Area 1', lx: 150, ly: 62 }); S.area('x0', { cx: 390, cy: 210, rx: 125, ry: 160, color: '#fbbf24', label: 'Area 0', lx: 390, ly: 62 }); S.area('x2', { cx: 630, cy: 210, rx: 125, ry: 160, color: '#22d3ee', label: 'Area 2', lx: 630, ly: 62 }); });
          S.at(3, S => { const b = S.items.load.d.querySelector('#ldbar'); if (b) b.style.width = '30%'; S.items.load.d.querySelector('#ldtx').textContent = '✅ כל נתב מכיר בפירוט רק את האזור שלו'; });
        }
      },
      {
        title: 'Area 0 – עמוד השדרה (Backbone)',
        html: `<p><b>אזור 0</b> הוא האזור החשוב ביותר – ה<b>Backbone</b>. אם יש רק אזור אחד (<i>Single-Area OSPF</i>) הוא חייב להיות אזור 0.</p>
          <p>במצב של <b>Multi-Area OSPF</b>: <b>כל אזור חייב להיות מחובר לאזור 0</b>. מידע בין אזורים לא-0 חייב לזרום <b>דרך אזור 0</b>.</p>
          <p>לחצו ▶: חבילה מאזור 1 לאזור 3 עוברת דרך ה-Backbone. ואז – אזור 4 שלא חובר ל-0…</p>`,
        scene(S) {
          areasTopo(S);
          S.at(1, S => { S.packet(['A1', 'ABR1', 'B1', 'B2', 'ABR3', 'A3'], null, { label: 'Area 1 → Area 3', color: '#34d399', dur: 5.5 }); S.trace(['A1', 'ABR1', 'B1', 'B2', 'ABR3', 'A3'], { color: '#34d399', dur: 3 }); });
          S.at(7.4, S => { S.clearTraces(); S.note('n4', 20, 20, '❌ אזור שלא מחובר ל-Area 0 לא יכול להחליף מידע עם שאר האזורים', { w: 270, cls: 'r' }); S.node('X', 250, 410, { type: 'dot', label: 'Area 4', size: .9, stroke: '#fb7185' }); S.link('X', 'A1', { dashed: true, color: '#fb7185' }); S.packet(['X', 'A1'], null, { label: '?', color: '#fb7185', dur: 1.4 }); S.say('A1', 'אין לי דרך ל-Area 3 😕', { dur: 3, cls: 'r', dy: 80, w: 150 }); });
        }
      },
      {
        title: 'ABR ו-ASBR – נתבי הגבול',
        html: `<p>🌉 <b>ABR – Area Border Router</b>: נתב שפורט אחד שלו באזור מסוים ופורט אחר באזור אחר. הוא מחבר בין אזורים.</p>
          <p>🌍 <b>ASBR – Autonomous System Border Router</b>: הנתב שמקשר בין רשת OSPF לרשת שרצה עליה פרוטוקול ניתוב אחר (RIP, EIGRP…) או ניתוב סטטי, ועושה <b>Redistribute</b> לתוך OSPF.</p>
          <div class="callout info">💡 <b>AS – מערכת אוטונומית</b>: תחום בניהול אחד. אם לחברה יש סניפים ולכל סניף מנהל משלו – חיבור ביניהם הוא חיבור בין AS-ים.</div>`,
        scene(S) {
          areasTopo(S);
          ['ABR1', 'ABR2', 'ABR3'].forEach(a => S.mark(a, '#34d399'));
          S.mark('AS', '#f472b6');
          S.at(1, S => { S.say('ABR1', 'ABR: פורט באזור 1 ופורט באזור 0', { w: 190, dx: 10, dy: 110, cls: 'g', dur: 4.5 }); });
          S.at(5.5, S => { S.say('AS', 'ASBR: מחבר לרשת חיצונית', { w: 170, dy: 100, cls: 'v', dur: 4, dx: -30 }); S.packet('CL', 'AS', { label: 'external', color: '#f472b6', dur: 1.5 }); });
          S.at(7.5, S => { S.packet(['AS', 'B2', 'B1'], null, { label: 'Redistribute', color: '#f472b6', dur: 2.5 }); });
        }
      },
      {
        title: 'סוגי הנתבים ב-OSPF',
        html: `<ul><li><b>Standard</b> (פנימי) – נתב רגיל בתוך Area שאינו 0.</li><li><b>Backbone</b> – נתב ש-ממשקיו ב-Area 0.</li><li><b>ABR</b> – נתב בין אזורים; מעביר עדכונים מאזור אחד לאחר.</li><li><b>ASBR</b> – בין OSPF שלי לפרוטוקול אחר ומבצע Redistribute (למשל מ-EIGRP, או אפילו מניתוב סטטי).</li></ul>
          <p>שימו לב להארת הנתבים בהנפשה – תסווגו אותם בעצמכם במשחקון!</p>`,
        scene(S) {
          areasTopo(S);
          const seq = [['A1', '#60a5fa', 'Standard – פנימי באזור 1'], ['B3', '#fbbf24', 'Backbone – כל ממשקיו ב-Area 0'], ['ABR2', '#34d399', 'ABR – בין Area 0 ל-Area 2'], ['AS', '#f472b6', 'ASBR – חיבור חיצוני']];
          seq.forEach(([id, col, txt], i) => S.at(.6 + i * 3, S => { seq.forEach(([o]) => S.mark(o, null, false)); S.mark(id, col); S.note('lab' + i, 20, 20, `<b style="color:${col}">${txt}</b>`, { w: 300, cls: 'c' }); if (i) S.show('lab' + (i - 1), false); }));
        }
      },
      {
        title: 'בדיקת הבנה #2',
        html: '<p>נתב עם ממשק אחד ב-Area 0 וממשק אחד ב-Area 2…</p>',
        check: { q: 'נתב שפורט אחד שלו ב-Area 0 ופורט שני ב-Area 2 הוא:', opts: ['ASBR', 'Standard', 'ABR', 'DR'], a: 2, why: 'נתב שמחבר בין שני אזורים (פורט בכל אזור) הוא ABR – Area Border Router.', fb: { 0: 'ASBR מחבר ל-<b>רשת/פרוטוקול חיצוני</b>, לא בין אזורי OSPF.', 3: 'DR הוא תפקיד ברשת מרובת גישה – לא קשור לאזורים.' } }
      },
      {
        title: 'שלוש הטבלאות של OSPF',
        html: `<p>OSPF מחזיק שלוש טבלאות:</p>
          <ul><li>👥 <b>טבלת השכנים</b> – <code>show ip ospf neighbor</code>: השכנים, היחס מולם, Router-ID ו-Priority.</li>
          <li>🗺️ <b>טבלת הטופולוגיה (LSDB)</b> – <code>show ip ospf database</code>: כל ה-LSA שהנתב קיבל = מפת הרשת.</li>
          <li>📋 <b>טבלת הניתוב</b> – <code>show ip route</code>: הנתיבים הטובים ביותר שנבחרו מתוך הטופולוגיה.</li></ul>`,
        scene(S) {
          S.node('H', 90, 90, { type: 'emoji', emoji: '👋', fs: 44, label: 'Hello' }); S.node('L', 90, 215, { type: 'emoji', emoji: '🧩', fs: 44, label: 'LSA' }); S.node('P', 90, 340, { type: 'emoji', emoji: '⚙️', fs: 44, label: 'SPF' });
          S.table('t1', 260, 40, { w: 480, title: '👥 Neighbor Table', head: ['Neighbor ID', 'State', 'Interface'], rows: [{ c: ['2.2.2.2', 'FULL/BDR', 'Fa0/0'], hidden: true }] });
          S.table('t2', 260, 150, { w: 480, title: '🗺️ Topology / LSDB', head: ['LSA', 'Adv Router', 'Link'], rows: [{ c: ['Router (1)', '2.2.2.2', '2 links'], hidden: true }, { c: ['Network (2)', '3.3.3.3', '192.168.12.0'], hidden: true }] });
          S.table('t3', 260, 290, { w: 480, title: '📋 Routing Table', head: ['Code', 'Network', 'Via'], rows: [{ c: ['O', '192.168.23.0/24 [110/2]', '192.168.13.3'], hidden: true }] });
          S.at(.8, S => { S.rowShow('t1', 0); S.rowCls('t1', 0, 'hl'); });
          S.at(3.2, S => { S.rowShow('t2', 0); S.rowShow('t2', 1); S.rowCls('t2', 0, 'hl'); });
          S.at(5.6, S => { S.rowShow('t3', 0); S.rowCls('t3', 0, 'win'); });
        }
      },
      {
        title: 'בדיקת הבנה #3',
        html: '<p>איפה נמצאות כל ה-LSA?</p>',
        check: { q: 'איזה פקודה מציגה את מסד הנתונים (LSDB) עם כל ה-LSA שהנתב קיבל?', opts: ['show ip route', 'show ip ospf neighbor', 'show ip ospf database', 'show ip protocols'], a: 2, why: '<code>show ip ospf database</code> מציג את טבלת הטופולוגיה (LSDB).', fb: { 0: 'זו טבלת הניתוב – רק הנתיבים הטובים ביותר.', 1: 'זו טבלת השכנים.' } }
      },
      {
        title: 'סיכום הפרק',
        html: `<div class="callout story">🏆 ד"ר דייקסטרה: "עכשיו אתם מבינים איך הנתבים חושבים. אבל עוד לא ראיתם איך הם נפגשים – לשם יש <b>נמל ה-Hello</b>."</div>
          <ul><li>OSPF = Link-State, מחשב לפי Cost (רוחב פס), מסכם עלויות לאורך הדרך.</li><li>LSA → LSDB → SPF (Dijkstra) → טבלת ניתוב.</li><li>אזורים מפחיתים עומס. Area 0 = Backbone, וכל אזור חייב להתחבר אליו.</li><li>ABR בין אזורים, ASBR בין OSPF לעולם החיצוני (Redistribute).</li><li>שלוש טבלאות: שכנים, טופולוגיה, ניתוב.</li></ul>`,
        scene(S) { areasTopo(S); }
      }
    ]
  };

  OG.quizzes.ch2 = [
    { q: 'איזה אלגוריתם משתמש OSPF לחישוב המסלול הטוב ביותר?', opts: ['Bellman-Ford', 'SPF (Dijkstra)', 'Hop count', 'Round-robin'], a: 1, why: 'SPF – Shortest Path First, בשמו המקצועי Dijkstra.' },
    { q: 'מהו LSA?', opts: ['טבלת הניתוב', 'הודעת עדכון ניתוב שעוברת בין הנתבים', 'סוג של כבל', 'כתובת Multicast'], a: 1, why: 'Link State Advertisement – הודעת עדכון שמוצפת בין הנתבים ונשמרת ב-LSDB.' },
    { q: 'מה היתרון המרכזי של חלוקה לאזורים?', opts: ['מהירות כבלים גבוהה יותר', 'הפחתת עומס זיכרון ועיבוד – כל נתב מכיר בפירוט רק את אזורו', 'אין צורך ב-Router-ID', 'מונע שימוש ב-Hello'], a: 1, why: 'LSDB קטן יותר וחישוב SPF קל יותר.' },
    { q: 'במצב Multi-Area OSPF איזה אזור חייב להתקיים?', opts: ['Area 1', 'Area 0 (Backbone)', 'Area 100', 'אף אחד'], a: 1, why: 'כל אזור חייב להיות מחובר ל-Area 0.' },
    { q: 'נתב שמחבר בין OSPF לרשת EIGRP ומבצע Redistribute הוא:', opts: ['ABR', 'ASBR', 'Backbone', 'DR'], a: 1, why: 'ASBR – Autonomous System Boundary Router.' },
    { q: 'מה סוג הנתב שכל ממשקיו ב-Area 0?', opts: ['Standard', 'ABR', 'Backbone', 'ASBR'], a: 2, why: 'נתב Backbone.' },
    { q: 'איזה טבלה מכילה את כל עדכוני ה-LSA ומרכיבה את מפת הרשת?', opts: ['טבלת השכנים', 'טבלת הניתוב', 'טבלת הטופולוגיה (LSDB)', 'טבלת ARP'], a: 2, why: 'הטופולוגיה/LSDB – <code>show ip ospf database</code>.' },
    { q: 'ב-OSPF, מה קורה לנתיבים שאינם הטובים ביותר?', opts: ['נמחקים', 'נשארים ב-LSDB ולא בטבלת הניתוב', 'נכנסים לטבלת הניתוב', 'נשלחים ל-ISP'], a: 1, why: 'רק הטוב ביותר נכנס לטבלת הניתוב; השאר שמורים ב-LSDB.' },
    { q: 'איזה הצהרה על RIP לעומת OSPF נכונה?', opts: ['RIP מתחשב בעיקר בקפיצות ו-OSPF במהירות הקווים', 'שניהם מתחשבים אך ורק בקפיצות', 'OSPF מתחשב רק בקפיצות', 'RIP הוא Link-State'], a: 0, why: 'RIP – hop count. OSPF – Cost לפי רוחב פס.' }
  ];
})(window.OG);
