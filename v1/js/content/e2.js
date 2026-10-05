/* EXTRA 2 – LSA types, LSDB, route codes (IA, E1, E2) */
(function (OG) {
  const { el } = OG;

  const TYPES = [
    ['1', 'Router LSA', '#60a5fa', 'כל נתב', 'מתאר את הממשקים, העלויות והשכנים של הנתב. מוצף לכל הנתבים <b>באותו אזור</b> בלבד.', 'שורות "O" בטבלת הניתוב (נתיבים באזור).'],
    ['2', 'Network LSA', '#34d399', 'ה-DR', 'נוצר ברשת Multi-Access (שיש בה DR/BDR). מפרט אילו נתבים מחוברים לרשת. מוצף באזור.', 'מאפשר לתאר את המתג כצומת ב-LSDB.'],
    ['3', 'Summary LSA', '#fbbf24', 'ABR', 'מכיל מידע על רשתות <b>מאזור אחר</b>. ה-ABR יוצר אותו ומפרסם בין האזורים.', 'מסומן <b>O IA</b> בטבלת הניתוב.'],
    ['4', 'ASBR Summary LSA', '#fb923c', 'ABR', 'ה-ABR מספר היכן נמצא ה-<b>ASBR</b> (לא מכיל רשתות – רק דרך אל ה-ASBR).', 'מאפשר לנתבים באזורים אחרים להשתמש במסלולים החיצוניים.'],
    ['5', 'External LSA', '#f472b6', 'ASBR', 'עדכוני ניתוב שהגיעו מבחוץ (Redistribute). מוצף בכל ה-AS פרט לאזורי Stub.', 'מסומן <b>O E1 / O E2</b> (ברירת מחדל: <b>O*E2</b>).'],
    ['7', 'NSSA External LSA', '#a78bfa', 'ASBR באזור NSSA', 'במקום Type 5 בתוך אזור NSSA. כשהוא מגיע ל-ABR – הוא <b>מומר ל-Type 5</b>.', 'מסומן O N1 / O N2 בתוך האזור.']
  ];
  function typesWidget(host) {
    const info = el('div.wbox'); const g = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '8px' } });
    TYPES.forEach(([t, n, c, who, what, code]) => g.append(el('button.opt', { style: { borderColor: c, margin: 0, textAlign: 'center' }, html: `<b style="color:${c};font-size:20px">Type ${t}</b><div class="muted" style="font-size:12px">${n}</div>`, onclick() { info.innerHTML = `<h3 style="color:${c}">Type ${t} – ${n}</h3><p>👤 <b>נוצר על ידי:</b> ${who}</p><p>${what}</p><p>🧭 <b>בטבלת הניתוב:</b> ${code}</p>`; OG.snd.play('pop'); } })));
    host.append(el('div.wbox', el('h3', { text: '📮 ששת סוגי ה-LSA' }), el('div.muted', { text: 'לחצו על סוג כדי לראות מי יצר אותו ועד לאן הוא מגיע.' })), g, info); g.firstChild.click();
  }

  function dbWidget(host) {
    const out = el('div.cli', { style: { maxHeight: '40vh', overflow: 'auto' } }), tip = el('div.callout.tip', { text: 'לחצו על כותרת של סוג LSA כדי להבין אותו.' });
    const sec = [
      ['Router Link States (Area 0)', '1', 'Type 1 – כל נתב באזור מופיע כאן עם מספר הקישורים שלו.', ['1.1.1.1         1.1.1.1         412         0x80000005 0x00A1B2 2', '2.2.2.2         2.2.2.2         398         0x80000004 0x00C3D4 2']],
      ['Net Link States (Area 0)', '2', 'Type 2 – נוצר ע"י ה-DR (ADV Router = ה-DR) על רשת Multi-Access.', ['192.168.12.2    2.2.2.2         398         0x80000001 0x00E5F6']],
      ['Summary Net Link States (Area 0)', '3', 'Type 3 – רשתות מאזורים אחרים, מפורסמות ע"י ה-ABR.', ['192.168.45.0    1.1.1.1         122         0x80000002 0x001FA0']],
      ['Summary ASB Link States (Area 0)', '4', 'Type 4 – איפה ה-ASBR.', ['5.5.5.5         1.1.1.1         118         0x80000001 0x00B1C2']],
      ['Type-5 AS External Link States', '5', 'Type 5 – רשתות חיצוניות מ-ASBR. נראה פעם אחת לכל ה-AS (לא לפי אזור).', ['0.0.0.0         5.5.5.5         95          0x80000001 0x00D1E3']]
    ];
    out.innerHTML = '<span class="dim">R1#show ip ospf database</span>\n<span class="dim">            OSPF Router with ID (1.1.1.1) (Process ID 1)</span>\n';
    sec.forEach(([title, t, why, rows], i) => { const h = el('div', { html: `\n<span class="hl" style="cursor:pointer">                ${title}</span>`, onclick() { tip.innerHTML = `<b>Type ${t}:</b> ${why}`; OG.snd.play('pop'); } }); out.append(h, el('div', { text: 'Link ID         ADV Router      Age         Seq#       Checksum' }), ...rows.map(r => el('div', { text: r }))); });
    host.append(el('div.wbox', el('h3', { text: '🗄️ LSDB אמיתי: show ip ospf database' }), el('div.muted', { text: 'כל בלוק בפלט הוא סוג LSA אחר. לחצו על הכותרות הצהובות.' })), out, tip);
  }
  function e12Widget(host) {
    let internal = 15, ext = 20; const out = el('div.wbox'), sl = el('input', { type: 'range', min: 1, max: 100, value: internal }), sv = el('b.ltr', { text: internal });
    const render = () => { out.innerHTML = `<table style="width:100%;text-align:center;border-collapse:collapse;direction:ltr;font-family:var(--mono)"><tr><th style="border:1px solid #2b3a6e;padding:6px">Type</th><th style="border:1px solid #2b3a6e">מטריקה בטבלה</th><th style="border:1px solid #2b3a6e">איך מחושב</th></tr><tr><td style="border:1px solid #2b3a6e;padding:8px;color:#fbbf24">E2 (ברירת מחדל)</td><td style="border:1px solid #2b3a6e;font-size:22px">${ext}</td><td style="border:1px solid #2b3a6e;font-family:var(--font)">רק העלות החיצונית – <b>לא משתנה</b> לאורך הדרך</td></tr><tr><td style="border:1px solid #2b3a6e;padding:8px;color:#34d399">E1</td><td style="border:1px solid #2b3a6e;font-size:22px">${ext + internal}</td><td style="border:1px solid #2b3a6e;font-family:var(--font)">עלות חיצונית <b>+ עלות פנימית</b> עד ה-ASBR (${ext}+${internal})</td></tr></table>`; };
    sl.oninput = () => { internal = +sl.value; sv.textContent = internal; render(); };
    host.append(el('div.wbox', el('h3', { text: '🧮 E1 מול E2' }), el('div.muted', { html: 'ה-ASBR מזריק רשת חיצונית בעלות 20. גררו את העלות הפנימית מהנתב שלכם עד ה-ASBR.' }), el('div.wrow', { style: { marginTop: '8px' } }, el('span.wlabel', { text: 'עלות פנימית עד ה-ASBR:' }), sl, sv)), out, el('div.callout.info', { html: 'ב-E2 כל הנתבים רואים אותה מטריקה (נוח, פשוט). ב-E1 המטריקה גדלה ככל שרחוקים מה-ASBR – שימושי כשיש כמה ASBR ורוצים לבחור את הקרוב.' })); render();
  }

  OG.lessons.e2 = {
    steps: [
      {
        title: 'למה יש סוגי LSA?',
        html: `<div class="callout story">📮 הדוור הראשי: "לא כל מכתב דומה למכתב אחר. לכל אחד סוג, יוצר ותחום הפצה."</div>
          <p>ה-LSA הוא יחידת המידע הבסיסית של OSPF. יש כמה סוגים – וכל אחד יוצר <b>מי שיוצר אותו</b> וגם <b>מגיע עד אזור מסוים</b>. נכיר אותם אחד אחד.</p>`,
        widget: typesWidget
      },
      {
        title: 'Type 1 ו-Type 2 – בתוך האזור',
        html: `<ul><li><b>Type 1 (Router LSA)</b> – כל נתב יוצר אחד: הממשקים, העלויות והשכנים שלו. מוצף <b>לכל הנתבים באזור</b>.</li><li><b>Type 2 (Network LSA)</b> – נוצר ע"י ה-DR ברשת Multi-Access, ומתאר אילו נתבים מחוברים אליה.</li></ul>`,
        scene(S) {
          S.area('a', { cx: 400, cy: 190, rx: 330, ry: 160, color: '#60a5fa', label: 'Area 1', lx: 400, ly: 52 });
          S.node('R1', 200, 130, { label: 'R1' }); S.node('R2', 600, 130, { label: 'R2' }); S.node('SW', 400, 240, { type: 'switch', label: '' }); S.node('DR', 400, 120, { label: '👑 DR' }); S.node('R4', 250, 300, { label: 'R4' });
          ['R1', 'R2', 'DR', 'R4'].forEach(r => S.link('SW', r));
          S.at(.6, S => { S.flood('R1', { shape: 'emoji', emoji: '🧩', label: 'Type 1', color: '#60a5fa', hop: .8 }); });
          S.at(4, S => { ['R1', 'R2', 'R4'].forEach(r => S.packet(['DR', 'SW', r], null, { label: 'Type 2', color: '#34d399', dur: 2 })); S.note('n', 20, 20, '👑 ה-DR מדווח: "הנתבים הבאים מחוברים למתג"', { w: 300, cls: 'g' }); });
        }
      },
      {
        title: 'Type 3 ו-Type 4 – נתבי ה-ABR',
        html: `<ul><li><b>Type 3 (Summary)</b> – נוצר ע"י ABR ומכיל מידע על <b>רשתות מאזור אחר</b>. בטבלת הניתוב: <b>O IA</b>.</li><li><b>Type 4 (ASBR Summary)</b> – ה-ABR מספר <b>היכן נמצא ה-ASBR</b> (כדי שנתבים באזורים אחרים ידעו איך להגיע אליו).</li></ul>`,
        scene(S) {
          S.area('a1', { cx: 150, cy: 200, rx: 130, ry: 150, color: '#fb923c', label: 'Area 1', lx: 150, ly: 70 }); S.area('a0', { cx: 450, cy: 200, rx: 150, ry: 130, color: '#fbbf24', label: 'Area 0', lx: 450, ly: 90 }); S.area('a2', { cx: 700, cy: 200, rx: 90, ry: 130, color: '#f472b6', label: 'Area 2', lx: 700, ly: 90 });
          S.node('R1', 120, 220, { label: 'R1' }); S.node('ABR1', 285, 200, { label: 'ABR' }); S.node('ABR2', 600, 200, { label: 'ABR' }); S.node('ASBR', 700, 270, { label: 'ASBR' }); S.node('M', 450, 200, { label: 'R' });
          S.link('R1', 'ABR1'); S.link('ABR1', 'M'); S.link('M', 'ABR2'); S.link('ABR2', 'ASBR');
          S.at(.6, S => { S.packet(['R1', 'ABR1'], null, { label: 'Type 1', color: '#60a5fa', dur: 1.4, then: S => { S.packet(['ABR1', 'M', 'ABR2'], null, { label: 'Type 3', color: '#fbbf24', dur: 2.6 }); S.say('ABR1', 'ABR: הרשתות של Area 1 – כ-Type 3', { w: 190, dy: 100, cls: 'y', dur: 3 }); } }); });
          S.at(5.5, S => { S.packet(['ASBR', 'ABR2'], null, { label: 'Type 1 (ASBR)', color: '#60a5fa', dur: 1.4, then: S => { S.packet(['ABR2', 'M', 'ABR1'], null, { label: 'Type 4', color: '#fb923c', dur: 2.6 }); S.say('ABR2', 'ABR: "ה-ASBR נמצא אצלי באזור"', { w: 190, dy: 100, cls: 'y', dur: 3 }); } }); });
        }
      },
      {
        title: 'Type 5 ו-Type 7 – מבחוץ',
        html: `<ul><li><b>Type 5 (External)</b> – ה-ASBR מזריק ניתובים חיצוניים (Redistribute) והם מוצפים בכל ה-AS (פרט לאזורי Stub). בטבלה: <b>O E1/E2</b>.</li><li><b>Type 7 (NSSA External)</b> – כש-ASBR נמצא באזור <b>NSSA</b>. ה-ABR <b>ממיר אותו ל-Type 5</b> כשהוא יוצא מהאזור.</li></ul>`,
        scene(S) {
          S.node('CL', 70, 190, { type: 'cloud', label: 'חיצוני' }); S.node('ASBR', 220, 190, { label: 'ASBR' }); S.node('ABR', 440, 190, { label: 'ABR' }); S.node('R', 650, 190, { label: 'R (Area 0)' });
          S.area('nssa', { x: 150, y: 90, w: 250, h: 200, rect: true, color: '#a78bfa', label: 'NSSA', lx: 275, ly: 112 });
          S.link('CL', 'ASBR'); S.link('ASBR', 'ABR'); S.link('ABR', 'R');
          S.at(.6, S => S.packet('CL', 'ASBR', { label: 'מסלול חיצוני', color: '#f472b6', dur: 1.4 }));
          S.at(2.2, S => S.packet('ASBR', 'ABR', { label: 'Type 7', color: '#a78bfa', dur: 2 }));
          S.at(4.4, S => { S.mark('ABR', '#fbbf24'); S.say('ABR', 'ממיר 7 → 5', { cls: 'y', dy: 80, w: 110, dur: 2 }); });
          S.at(5.2, S => S.packet('ABR', 'R', { label: 'Type 5', color: '#f472b6', dur: 2 }));
        }
      },
      {
        title: 'בדיקת הבנה #1',
        html: '<p>איזה LSA נוצר ע"י מי?</p>',
        check: { q: 'מי יוצר LSA מסוג <b>Type 3</b>, ומה הוא מכיל?', opts: ['נתב רגיל – מידע על ממשקיו', 'ה-DR – רשימת הנתבים ברשת', 'ABR – מידע על רשתות מאזור אחר', 'ASBR – ניתובים חיצוניים'], a: 2, why: 'Type 3 (Summary) נוצר ע"י ABR ומתאר רשתות מאזורים אחרים. הוא מסומן O IA בטבלת הניתוב.', fb: { 0: 'זה Type 1.', 1: 'זה Type 2.', 3: 'זה Type 5.' } }
      },
      {
        title: 'ה-LSDB בפועל',
        html: `<p>כך נראה בפועל <code>show ip ospf database</code>. כל בלוק הוא סוג LSA אחר. שימו לב ל-<b>ADV Router</b> – מי יצר את ה-LSA.</p>`,
        widget: dbWidget
      },
      {
        title: 'E1 מול E2',
        html: `<p>ניתוב חיצוני (Type 5) יכול להיכנס לטבלה כ-<b>E2</b> (ברירת מחדל) או <b>E1</b>:</p>
          <ul><li><b>E2</b> – המטריקה היא רק העלות החיצונית (נשארת קבועה).</li><li><b>E1</b> – העלות החיצונית <b>ועוד</b> העלות הפנימית עד ל-ASBR.</li></ul>`,
        widget: e12Widget
      },
      {
        title: 'בדיקת הבנה #2',
        html: '<p>חשבו.</p>',
        check: { q: 'ה-ASBR מזריק רשת עם עלות חיצונית 20, והעלות הפנימית אליו היא 15. מה המטריקה ב-E2 וב-E1?', opts: ['E2=35, E1=20', 'E2=20, E1=35', 'E2=15, E1=20', 'שניהם 35'], a: 1, why: 'E2 = רק החיצונית (20). E1 = חיצונית + פנימית (20+15=35).' }
      },
      {
        title: 'בדיקת הבנה #3',
        html: '<p>מה קורה בגבול NSSA?</p>',
        check: { q: 'מה עושה ה-ABR ל-LSA מסוג Type 7 כשהוא יוצא מאזור NSSA?', opts: ['חוסם אותו', 'ממיר אותו ל-Type 5', 'ממיר אותו ל-Type 3', 'משאיר אותו כמו שהוא'], a: 1, why: 'ABR ממיר Type 7 ל-Type 5 כדי שכל ה-AS יכיר את המסלול החיצוני.' }
      },
      {
        title: 'סיכום',
        html: `<div class="callout story">📮 הדוור: "מצוין! עכשיו תמיינו את הדואר בעצמכם."</div>
          <ul><li>1 – נתב (באזור). 2 – DR (רשת). 3 – ABR (מאזור אחר, O IA). 4 – ABR (איפה ה-ASBR). 5 – ASBR (חיצוני, E1/E2). 7 – ASBR ב-NSSA (מומר ל-5 ב-ABR).</li><li>E2 = חיצוני בלבד. E1 = חיצוני + פנימי.</li></ul>`,
        scene(S) { S.node('P', 400, 190, { type: 'emoji', emoji: '📮', fs: 110 }); }
      }
    ]
  };

  OG.quizzes.e2 = [
    { q: 'איזה LSA מכיל רשימת נתבים המחוברים לרשת מרובת גישה?', opts: ['Type 1', 'Type 2', 'Type 3', 'Type 5'], a: 1, why: 'Network LSA – נוצר ע"י ה-DR.' },
    { q: 'איזה סוג LSA מסומן בטבלת הניתוב כ-O IA?', opts: ['Type 1', 'Type 3', 'Type 5', 'Type 7'], a: 1, why: 'Summary LSA שיוצר ABR.' },
    { q: 'מה תפקיד LSA Type 4?', opts: ['לספר היכן נמצא ה-ASBR', 'לתאר ממשקי נתב', 'להפיץ ברירת מחדל', 'לאשר LSA'], a: 0, why: 'ASBR Summary LSA, שיוצר ה-ABR.' },
    { q: 'אזור Stub חוסם איזה סוג LSA?', opts: ['Type 1', 'Type 2', 'Type 5', 'Type 3 תמיד'], a: 2, why: 'Stub חוסם Type 5 (וגם 4).' },
    { q: 'מי יוצר LSA Type 7?', opts: ['ABR', 'DR', 'ASBR הנמצא באזור NSSA', 'כל נתב'], a: 2, why: 'ASBR באזור NSSA. ה-ABR ממיר אותו ל-5.' },
    { q: 'בטבלת הניתוב מופיע O E2. מה זה אומר?', opts: ['ניתוב מאזור אחר', 'ניתוב חיצוני שנלמד דרך ASBR, ומטריקה = העלות החיצונית בלבד', 'ניתוב סטטי', 'ניתוב באזור'], a: 1, why: 'E2 = External Type 2.' },
    { q: 'מי יוצר LSA Type 1?', opts: ['רק ה-DR', 'כל נתב', 'רק ABR', 'רק ASBR'], a: 1, why: 'Router LSA – כל נתב יוצר אחד.' },
    { q: 'ב-E1 המטריקה היא…', opts: ['העלות החיצונית בלבד', 'העלות החיצונית + העלות הפנימית עד ה-ASBR', 'תמיד 1', 'AD'], a: 1, why: 'E1 מוסיף את העלות הפנימית.' }
  ];
})(window.OG);
