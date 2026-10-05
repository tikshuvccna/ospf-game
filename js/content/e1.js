/* EXTRA 1 – Neighbor states and OSPF packet types */
(function (OG) {
  const { el } = OG;

  const PK = [
    ['Hello', 'Type 1', '#22d3ee', 'יוצר ומתחזק שכנות. מכיל מידע על הנתב וחיבורו (Router-ID, טיימרים, Area, Priority, שכנים…). בעזרתו מגיעים ל-2-Way.'],
    ['DBD', 'Type 2', '#a78bfa', 'Database Descriptor: תקציר של מה שהנתב יודע – רשימת כותרות LSA מה-LSDB שלו (לא את ה-LSA עצמם).'],
    ['LSR', 'Type 3', '#fbbf24', 'Link-State Request: "אני חסר את ה-LSA האלה – שלחו לי". מבקש מידע על רשתות מסוימות.'],
    ['LSU', 'Type 4', '#34d399', 'Link-State Update: מכיל את ה-LSA עצמם (אחד או כמה). הוא גם הדרך להפיץ עדכוני ניתוב.'],
    ['LSAck', 'Type 5', '#f472b6', 'Link-State Acknowledgment: אישור קבלה של LSA שהגיעו ב-LSU. אם לא מגיע אישור – שולחים שוב אחרי Retransmit (5 שנ׳).']
  ];
  function packetCards(host) {
    const info = el('div.callout.info', { text: 'לחצו על חבילה כדי לראות מה היא עושה.' });
    const g = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '10px' } });
    PK.forEach(([n, t, c, d]) => g.append(el('button.opt', { style: { borderColor: c, textAlign: 'center', margin: 0 }, html: `<div style="font-size:26px">✉️</div><b style="color:${c}">${n}</b><div class="muted" style="font-size:12px">${t}</div>`, onclick() { info.innerHTML = `<b style="color:${c}">${n} (${t})</b><br>${d}`; OG.snd.play('pop'); } })));
    host.append(el('div.wbox', el('h3', { text: '📬 חמש חבילות ה-OSPF' }), el('div.muted', { html: 'OSPF רץ ישירות על IP (פרוטוקול 89) וכולל חמישה סוגי הודעות. ה-<b>LSA</b> עצמו אינו חבילה – הוא "המטען" שנישא בתוך LSU.' })), g, info);
  }

  function stuckWidget(host) {
    const D = [
      ['Down', '#94a3b8', 'לא התקבל Hello מהשכן (או OSPF לא מופעל).', 'בדקו שהממשק UP, שפקודת network תופסת אותו, ושאין passive-interface.'],
      ['Init', '#fb923c', 'קיבלנו Hello מהשכן, אבל הוא עוד לא ראה אותנו (ה-Router-ID שלנו לא ברשימת השכנים שלו). חד-כיווני!', 'חסימה בכיוון אחד (ACL / אימות / ממשק), או Hello שלנו לא מגיע אליו.'],
      ['2-Way', '#fbbf24', 'שני הצדדים רואים זה את זה – תקשורת דו-כיוונית. ברשת Multi-Access כאן נבחרים DR ו-BDR. בין DROTHER-ים זה המצב הסופי הנורמלי.', 'בעיה רק אם ציפיתם ל-FULL: למשל כולם Priority 0 – אין DR.'],
      ['ExStart', '#a78bfa', 'בחירת Master ו-Slave (הנתב עם ה-Router-ID הגבוה הוא Master) לפני החלפת DBD.', 'תקוע שם? סיבה נפוצה: <b>MTU לא תואם</b> בין שני הצדדים. או Router-ID כפול.'],
      ['Exchange', '#818cf8', 'מחליפים הודעות DBD – תקצירי LSDB.', 'תקוע? שוב MTU, או בעיית חבילות גדולות.'],
      ['Loading', '#34d399', 'שולחים LSR לבקשת ה-LSA החסרים, ומקבלים LSU (ו-LSAck).', 'תקוע? LSA פגומים או MTU.'],
      ['Full', '#22c55e', 'הסנכרון הושלם – שכנות מלאה (Adjacency).', 'מצב רצוי! (אחרי שינוי מצב מופיעה הודעת %OSPF-5-ADJCHG).']
    ];
    const info = el('div.wbox'); const g = el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } });
    D.forEach(([n, c, w, f], i) => g.append(el('button.btn.small', { text: `${i + 1}. ${n}`, style: { borderColor: c }, onclick() { info.innerHTML = `<h3 style="color:${c}">${n}</h3><p>${w}</p><div class="callout warn">🔧 <b>אם תקוע כאן:</b> ${f}</div>`; OG.snd.play('pop'); } })));
    host.append(el('div.wbox', el('h3', { text: '🩺 מצבי השכנות ומה כשהם נתקעים' }), el('div.muted', { text: 'לחצו על שלב כדי לראות מה קורה בו ומה גורם לתקיעה.' })), g, info); g.children[1].click();
  }

  OG.lessons.e1 = {
    steps: [
      {
        title: 'חמש ההודעות של OSPF',
        html: `<div class="callout story">🤝 ברוכים הבאים לאי ההרחבה! ד"ר Handshake: "לפני שנתבים נהיים FULL – יש ביניהם ריקוד שלם של חבילות."</div>
          <p>OSPF מחליף חמישה סוגי הודעות. ה-<b>Hello</b> מקים ומתחזק שכנות, <b>DBD</b> מתאר מה יש, <b>LSR</b> מבקש מה שחסר, <b>LSU</b> נושא את ה-LSA, ו-<b>LSAck</b> מאשר.</p>`,
        widget: packetCards
      },
      {
        title: 'שלבי השכנות (1): Down ← Init ← 2-Way',
        html: `<ol><li><b>Down</b> – אין Hello (או OSPF לא פועל).</li><li><b>Init</b> – R2 קיבל Hello מ-R1, אך עוד לא ראה את עצמו ברשימה שלו.</li><li><b>2-Way</b> – כל אחד רואה את השני ב-Hello של האחר: דו-כיווני. ברשת Multi-Access כאן נבחרים DR/BDR.</li></ol>
          <p>(ברשת Non-Broadcast קיים גם שלב <b>Attempt</b> עם Hello ביוניקסט לנתבים מסוימים.)</p>`,
        scene(S) {
          S.node('R1', 160, 150, { label: 'R1', sub: 'RID 1.1.1.1' }); S.node('R2', 640, 150, { label: 'R2', sub: 'RID 2.2.2.2' }); S.link('R1', 'R2');
          const st = (id, txt, col) => { S.items['st' + id] && S.items['st' + id].fo.remove(); S.note('st' + id, S.nodes[id].x - 70, 230, `<b style="color:${col}">${txt}</b>`, { w: 140, cls: 'c', align: 'center' }); };
          S.at(.2, S => { st('R1', 'Down', '#94a3b8'); st('R2', 'Down', '#94a3b8'); });
          S.at(1, S => S.packet('R1', 'R2', { label: 'Hello (שכנים: —)', color: '#22d3ee', dur: 2 }));
          S.at(3.1, S => { st('R2', 'Init', '#fb923c'); S.say('R2', 'שמעתי את R1 – אבל הוא עוד לא ראה אותי', { w: 200, dy: 100, cls: 'y', dur: 3 }); });
          S.at(4.2, S => S.packet('R2', 'R1', { label: 'Hello (שכנים: 1.1.1.1)', color: '#34d399', dur: 2 }));
          S.at(6.4, S => { st('R1', '2-Way', '#fbbf24'); S.say('R1', 'ראיתי את עצמי ברשימה שלו ✔', { w: 170, dy: 100, cls: 'g', dur: 2.5 }); });
          S.at(7.5, S => { S.packet('R1', 'R2', { label: 'Hello (שכנים: 2.2.2.2)', color: '#22d3ee', dur: 2 }); });
          S.at(9.6, S => { st('R2', '2-Way', '#fbbf24'); S.note('dr', 200, 340, 'ברשת Multi-Access: כאן מתקיימות בחירות DR/BDR', { w: 400, cls: 'v', align: 'center' }); });
        }
      },
      {
        title: 'שלבי השכנות (2): ExStart ← Exchange ← Loading ← Full',
        html: `<ol start="4"><li><b>ExStart</b> – בחירת Master (Router-ID גבוה) ו-Slave.</li><li><b>Exchange</b> – מחליפים <b>DBD</b>: תקצירי ה-LSDB.</li><li><b>Loading</b> – שולחים <b>LSR</b> על מה שחסר, מקבלים <b>LSU</b>, מאשרים ב-<b>LSAck</b>.</li><li><b>Full</b> – שכנות מלאה (Adjacency).</li></ol>`,
        scene(S) {
          S.node('R1', 160, 130, { label: 'R1', sub: 'RID 1.1.1.1' }); S.node('R2', 640, 130, { label: 'R2', sub: 'RID 2.2.2.2' }); S.link('R1', 'R2');
          const st = (id, txt, col) => { S.items['st' + id] && S.items['st' + id].fo.remove(); S.note('st' + id, S.nodes[id].x - 70, 200, `<b style="color:${col}">${txt}</b>`, { w: 140, cls: 'c', align: 'center' }); };
          S.at(.1, S => { st('R1', '2-Way', '#fbbf24'); st('R2', '2-Way', '#fbbf24'); });
          S.at(.8, S => { S.packet('R1', 'R2', { label: 'DBD (Master?)', color: '#a78bfa', dur: 1.6 }); S.packet('R2', 'R1', { label: 'DBD', color: '#a78bfa', dur: 1.6 }); st('R1', 'ExStart', '#a78bfa'); st('R2', 'ExStart', '#a78bfa'); });
          S.at(3, S => { S.note('ms', 250, 270, '👑 R2 – Router-ID גבוה → <b>Master</b>; R1 → Slave', { w: 300, cls: 'v', align: 'center' }); });
          S.at(4.2, S => { st('R1', 'Exchange', '#818cf8'); st('R2', 'Exchange', '#818cf8'); S.packet('R2', 'R1', { label: 'DBD (תקציר)', color: '#818cf8', dur: 1.6 }); S.packet('R1', 'R2', { label: 'DBD (תקציר)', color: '#818cf8', dur: 1.6 }); });
          S.at(6.4, S => { st('R1', 'Loading', '#34d399'); S.packet('R1', 'R2', { label: 'LSR', color: '#fbbf24', dur: 1.5 }); });
          S.at(8, S => { S.packet('R2', 'R1', { label: 'LSU 🧩', color: '#34d399', dur: 1.5 }); });
          S.at(9.6, S => { S.packet('R1', 'R2', { label: 'LSAck', color: '#f472b6', dur: 1.5 }); });
          S.at(11.2, S => { st('R1', 'FULL', '#22c55e'); st('R2', 'FULL', '#22c55e'); S.mark('R1', '#22c55e'); S.mark('R2', '#22c55e'); S.note('log', 120, 310, '<span class="ltr" style="font-family:var(--mono);font-size:12px">%OSPF-5-ADJCHG: Process 1, Nbr 2.2.2.2 on Fa0/0 from LOADING to FULL, Loading Done</span>', { w: 560, cls: 'g' }); });
        }
      },
      {
        title: 'FULL מול 2-WAY',
        html: `<ul><li><b>FULL</b> – שכנות מלאה: מתחלפים כל סוגי ההודעות, כולל עדכוני ניתוב. נוצרת בין שני נתבים ב-<b>Point-to-Point</b>, וברשת Multi-Access – <b>מול ה-DR וה-BDR</b>.</li>
          <li><b>2-WAY</b> – שכנות חלקית: בין <b>DROTHER</b>-ים. רק Hello לזיהוי ולשמירה על קשר – <b>בלי</b> עדכוני ניתוב.</li></ul>`,
        scene(S) {
          S.node('SW', 400, 190, { type: 'switch', label: '' }); S.node('DR', 400, 70, { label: 'DR' }); S.node('BDR', 680, 190, { label: 'BDR' }); S.node('A', 120, 110, { label: 'DROTHER A' }); S.node('B', 120, 290, { label: 'DROTHER B' });
          ['DR', 'BDR', 'A', 'B'].forEach(r => S.link('SW', r));
          S.at(.8, S => { S.packet('A', 'DR', { label: 'LSU', color: '#34d399', dur: 2 }); S.packet('B', 'BDR', { label: 'LSU', color: '#34d399', dur: 2.4 }); S.note('f', 250, 330, '<b style="color:#34d399">FULL</b> מול DR/BDR – כל ההודעות', { w: 330, cls: 'g', align: 'center' }); });
          S.at(4, S => { S.packet('A', 'B', { label: 'Hello בלבד', color: '#22d3ee', dur: 2 }); S.note('t', 250, 375, '<b style="color:#fbbf24">2-WAY</b> בין DROTHER-ים – Hello בלבד', { w: 330, cls: 'y', align: 'center' }); });
        }
      },
      {
        title: 'בדיקת הבנה #1',
        html: '<p>מי המנהל ומי העבד?</p>',
        check: { q: 'מה קורה בשלב <b>ExStart</b>?', opts: ['מחליפים LSA מלאים', 'בוחרים Master ו-Slave לפני החלפת תקצירי DBD', 'נבחרים DR ו-BDR', 'הנתב נחשב מת'], a: 1, why: 'ב-ExStart נקבע מי ה-Master (Router-ID גבוה) והחלפת ה-DBD מתחילה אחריו.', fb: { 2: 'בחירת DR/BDR נעשית ב-2-Way.' } }
      },
      {
        title: 'כשהשכנות נתקעת',
        html: `<p>כל שלב יכול "להיתקע". הכירו את הסימפטומים והסיבות הנפוצות.</p><div class="callout tip">💡 סימן קלאסי: <b>ExStart/Exchange</b> שנתקע = חשדו ב-<b>MTU</b>.</div>`,
        widget: stuckWidget
      },
      {
        title: 'בדיקת הבנה #2',
        html: '<p>שכנות שלא מתקדמת מעבר ל-ExStart.</p>',
        check: { q: 'שכנות נתקעת ב-ExStart/Exchange. מה הסיבה הנפוצה?', opts: ['Hello שונה', 'MTU לא תואם בין שני הצדדים', 'מסכה שונה', 'אזור שונה'], a: 1, why: 'Hello/מסכה/אזור שונים היו עוצרים כבר ב-Init או לפני כן. תקיעה בשלבי ה-DBD היא בדרך כלל MTU.' }
      },
      {
        title: 'בדיקת הבנה #3',
        html: '<p>איזו הודעה מכילה את ה-LSA עצמם?</p>',
        check: { q: 'איזו הודעה נושאת את ה-LSA עצמם (המידע על רשתות)?', opts: ['Hello', 'DBD – רק תקציר', 'LSR – רק בקשה', 'LSU (Link-State Update)'], a: 3, why: 'ה-LSU מכיל LSA (אחד או כמה). ה-DBD רק מתאר, ה-LSR מבקש, וה-LSAck מאשר.' }
      },
      {
        title: 'סיכום',
        html: `<div class="callout story">🤝 ד"ר Handshake: "יופי! עכשיו תארגנו את הלחיצה בעצמכם ברכבת הלחיצות."</div>
          <ul><li>5 הודעות: Hello, DBD, LSR, LSU, LSAck.</li><li>7 שלבים: Down › Init › 2-Way › ExStart › Exchange › Loading › Full.</li><li>FULL מול DR/BDR (ובין P2P). 2-WAY בין DROTHER-ים.</li><li>תקיעה ב-ExStart/Exchange ← חשדו ב-MTU.</li></ul>`,
        scene(S) { S.node('N', 400, 190, { type: 'emoji', emoji: '🤝', fs: 110 }); }
      }
    ]
  };

  OG.quizzes.e1 = [
    { q: 'מהו סדר השלבים הנכון?', opts: ['Init › Down › 2-Way › Full › Exchange', 'Down › Init › 2-Way › ExStart › Exchange › Loading › Full', 'Down › 2-Way › Init › Loading › Exchange › Full', 'Init › ExStart › 2-Way › Full'], a: 1, why: 'Down › Init › 2-Way › ExStart › Exchange › Loading › Full.' },
    { q: 'איזו הודעה מבקשת מידע על רשתות מסוימות?', opts: ['LSR', 'LSU', 'DBD', 'LSAck'], a: 0, why: 'LSR – Link-State Request.' },
    { q: 'מה תפקיד הודעות DBD?', opts: ['מאשרות קבלה', 'מכילות תקציר של מה שהנתב יודע (כותרות LSA)', 'נושאות את ה-LSA המלאים', 'בוחרות DR'], a: 1, why: 'Database Descriptor – תקציר של ה-LSDB.' },
    { q: 'אילו נתבים נשארים ב-2-WAY?', opts: ['נתבי Point-to-Point', 'DROTHER-ים בינם לבין עצמם', 'ה-DR מול ה-BDR', 'ABR מול ASBR'], a: 1, why: 'בין DROTHER-ים – שכנות חלקית (Hello בלבד).' },
    { q: 'ב-Multi-Access, באיזה שלב נבחרים DR ו-BDR?', opts: ['Down', 'Init', '2-Way', 'Full'], a: 2, why: 'בשלב 2-Way, לפני שמתחילים להחליף DBD.' },
    { q: 'מי ה-Master בשלב ExStart?', opts: ['הנתב עם ה-Router-ID הגבוה', 'הנתב עם ה-Router-ID הנמוך', 'ה-DR תמיד', 'נבחר אקראית'], a: 0, why: 'ה-Router-ID הגבוה הוא Master.' },
    { q: 'הודעת LSAck מאשרת…', opts: ['קבלת Hello', 'קבלת LSA (שהגיעו ב-LSU)', 'בחירת DR', 'שינוי טיימרים'], a: 1, why: 'LSAck מאשר קבלת LSA. אם אין אישור – ה-LSA נשלח שוב אחרי Retransmit.' },
    { q: 'מה הפרוטוקול ש-OSPF רץ עליו?', opts: ['TCP פורט 89', 'UDP פורט 89', 'IP ישירות – פרוטוקול מספר 89', 'ICMP'], a: 2, why: 'OSPF נישא ישירות על IP כפרוטוקול 89 – לא TCP ולא UDP.' }
  ];
})(window.OG);
