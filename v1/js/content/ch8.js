/* Chapter 8 (Boss) – The Blackout: troubleshooting review */
(function (OG) {
  const { el } = OG;

  const SYM = [
    ['🔌 טבלת השכנים ריקה – אין שכנות כלל', 'בדקו בסדר הזה: ממשק UP? שתי הכתובות באותה רשת ומסכה? פקודת network/wildcard תופסת את הממשק? האם הממשק passive? ואז Area, טיימרים, אימות, Stub.', 'show ip ospf interface · show ip protocols · show ip interface brief'],
    ['⏱️ שכנות לא נוצרת – טיימרים שונים', 'Hello/Dead חייבים להיות זהים. יישרו עם <code>ip ospf hello-interval</code> / <code>dead-interval</code>.', 'show ip ospf interface'],
    ['🏷️ שכנות לא נוצרת – Area ID שונה', 'שני הצדדים חייבים באותו Area. תקנו את פקודת ה-network.', 'show ip ospf interface · show ip protocols'],
    ['🔑 שכנות לא נוצרת – אימות / Stub שונה', 'אם יש אימות – הסיסמה חייבת להיות זהה. סוג ה-Stub חייב להיות זהה.', 'show ip ospf interface'],
    ['🆔 Router-ID כפול', 'לשני שכנים אסור אותו Router-ID. הגדירו <code>router-id</code> ייחודי.', 'show ip protocols · show ip ospf'],
    ['🔇 הממשק passive', 'ממשק פסיבי לא שולח Hello – אין שכנות. הסירו עם <code>no passive-interface</code>.', 'show ip protocols (Passive Interface(s))'],
    ['🌐 רשת לא מופיעה אצל השאר', 'כנראה לא פורסמה: network שגוי / Wildcard שלא תופס. (passive לא מונע פרסום.)', 'show ip protocols (Routing for Networks)'],
    ['🐢 תנועה עוברת במסלול איטי', 'ה-Cost לא משקף מהירות: Reference Bandwidth ברירת מחדל? הגדירו <code>auto-cost reference-bandwidth</code> זהה בכל הנתבים, או <code>ip ospf cost</code>.', 'show ip ospf interface (Cost)'],
    ['🚪 אין יציאה לאינטרנט', 'הנתב היוצא צריך <code>ip route 0.0.0.0 0.0.0.0 …</code> ו-<code>default-information originate</code>.', 'show ip route (O*E2)'],
    ['🧭 אזור מנותק – חסרים נתיבי O IA', 'כל אזור חייב להתחבר ל-Area 0 דרך ABR (או Virtual-Link).', 'show ip ospf · show ip route'],
    ['🥇 נתיב סטטי "שובר" את ה-OSPF', 'AD של סטטי (1) מנצח את OSPF (110). מחקו את הסטטי או קבעו לו AD גבוה (Floating Static).', 'show ip route']
  ];
  function symWidget(host) {
    const info = el('div.wbox'); const list = el('div');
    SYM.forEach(([t, fix, cmd], i) => { const b = el('button.opt', { html: t, onclick() { OG.$$('.opt', list).forEach(x => x.classList.remove('ok')); b.classList.add('ok'); info.innerHTML = `<b>${t}</b><div style="margin:8px 0;line-height:1.7">${fix}</div><div class="muted">🔎 פקודות לבדיקה: <code>${cmd}</code></div>`; OG.snd.play('pop'); } }); list.append(b); });
    host.append(el('div.wbox', el('h3', { text: '🩺 מדריך אבחון מהיר' }), el('div.muted', { text: 'כל תסמין, סיבה אפשרית ופקודת בדיקה. אלה בדיוק המצבים שתיתקלו בהם במשחקון.' })), list, info);
    list.firstChild.click();
  }

  OG.lessons.ch8 = {
    steps: [
      {
        title: 'האפלה הגדולה',
        html: `<div class="callout story">🚨 מפקדת ה-NOC: "כל העיר חשוכה! בכמה צמתים ה-OSPF קרס. אתם הרופאים האחרונים של הרשת."</div>
          <p>זה פרק הסיכום: נחבר את כל מה שלמדתם לפתרון תקלות. כל תקלה במשחקון מורכבת מ<b>תסמין</b>, <b>ראיה</b> (פלט של show) ו<b>תיקון</b>.</p>`,
        scene(S) {
          S.node('A', 130, 120, { label: 'R1' }); S.node('B', 340, 70, { label: 'R2' }); S.node('C', 560, 120, { label: 'R3' }); S.node('D', 230, 300, { label: 'R4' }); S.node('E', 470, 300, { label: 'R5' }); S.node('F', 680, 280, { label: 'R6' });
          [['A', 'B'], ['B', 'C'], ['A', 'D'], ['B', 'D'], ['D', 'E'], ['C', 'E'], ['C', 'F'], ['E', 'F']].forEach(([a, b]) => S.link(a, b));
          S.at(1, S => { S.linkDown('B', 'C'); S.linkDown('D', 'E'); S.mark('B', '#fb7185'); S.mark('E', '#fb7185'); S.badge('C', '🚨', { bg: '#7f1d1d' }); });
          S.at(2.4, S => { S.say('B', 'אין שכנות מול R3!', { cls: 'r', w: 150, dy: 90, dur: 3 }); S.say('E', 'מסלול איטי!', { cls: 'y', w: 120, dy: 90, dur: 3 }); });
        }
      },
      {
        title: 'מדריך האבחון',
        html: `<p>בחרו תסמין ותראו איך מאבחנים אותו. זו שיטת עבודה: <b>תסמין ➜ פקודת show ➜ סיבה ➜ תיקון</b>.</p>`,
        widget: symWidget
      },
      {
        title: 'בדיקת הבנה #1',
        html: '<p>מקרה: שני נתבים מחוברים ישירות, ובטבלת השכנים אין כלום.</p>',
        check: { q: 'ב-<code>show ip protocols</code> רואים <code>Passive Interface(s): GigabitEthernet0/0</code>, והשכן מחובר דרך gi0/0. מה הסיבה לכך שאין שכנות?', opts: ['הממשק פסיבי ולכן לא שולח Hello', 'Router-ID כפול', 'ה-Reference Bandwidth שגוי', 'אין ברירת מחדל'], a: 0, why: 'ממשק passive חוסם Hello. התיקון: <code>no passive-interface gi0/0</code>.' }
      },
      {
        title: 'בדיקת הבנה #2',
        html: '<p>עוד אחת – תנועה בכיוון הלא נכון.</p>',
        check: { q: 'כל הקווים (FastEthernet וגם Gigabit) מקבלים Cost=1, ולכן OSPF לא מעדיף את ה-Gigabit. מה התיקון?', opts: ['ip ospf priority 255', 'auto-cost reference-bandwidth 1000 (או יותר) על כל הנתבים', 'passive-interface default', 'router-id 1.1.1.1'], a: 1, why: 'הגדלת ה-Reference Bandwidth גורמת לעלויות להבדיל בין מהירויות.' }
      },
      {
        title: 'כל המספרים החשובים',
        html: `<p>דף העזר האחרון לפני הקרב. נסו לזכור בלי להסתכל!</p>`,
        size: { w: 800, h: 450 },
        scene(S) {
          S.table('t', 70, 30, { w: 660, fs: 15, head: ['נושא', 'ערך'], rows: [['Hello / Dead (Broadcast, P2P)', '10 / 40 שניות'], ['Multicast של כל נתבי OSPF / של DR+BDR', '224.0.0.5 / 224.0.0.6'], ['Administrative Distance של OSPF', '110 (סטטי 1, EIGRP 90, RIP 120)'], ['Reference Bandwidth ברירת מחדל', '100 Mb/s'], ['Priority ברירת מחדל / טווח', '1 / 0–255 (0 = לעולם לא DR)'], ['איזון עומסים ברירת מחדל / טווח', '4 / 1–32'], ['יחידות בפקודת bandwidth', 'Kb/s'], ['Router-ID – סדר בחירה', 'ידני › Loopback גבוה › IP פיזי גבוה פעיל'], ['אזור חובה ב-Multi-Area', 'Area 0 (Backbone)']].map(r => ({ c: r, hidden: true })) });
          for (let i = 0; i < 9; i++) S.at(.4 + i * .9, S => { S.rowShow('t', i); S.rowCls('t', i, 'hl'); if (i) S.rowCls('t', i - 1, ''); });
        }
      },
      {
        title: 'מוכנים לקרב?',
        html: `<div class="callout story">🚨 המפקדת: "חשיכה בכל מקום. כל קריאה היא תקלה אחרת. אבחנו, תקנו, והעירו את העיר!"</div>
          <p>אחרי שתעברו את החידון ותנצחו ברמה כלשהי במשחקון – <b>הגשר לאי ההרחבה ייפתח</b> ותקבלו גישה לחבילת ה-EXTRA 🌉</p>`,
        scene(S) { S.node('N', 400, 190, { type: 'emoji', emoji: '🚨', fs: 110 }); }
      }
    ]
  };

  OG.quizzes.ch8 = [
    { q: 'שני נתבים מחוברים, אצל אחד Area 0 ואצל השני Area 1 על אותו קו. מה הבעיה?', opts: ['אין בעיה', 'Area ID חייב להתאים – לא תיווצר שכנות', 'Router-ID שונה', 'Cost שונה'], a: 1, why: 'Area ID חייב להיות זהה בין שכנים.' },
    { q: 'ב-<code>show ip ospf neighbor</code> אין שורות. מהו הצעד הראשון בבדיקה?', opts: ['לשנות Priority', 'לבדוק שהממשקים UP, באותה רשת, ושה-network תופס אותם', 'לשנות את ה-AD', 'להפעיל מחדש את הנתב'], a: 1, why: 'מתחילים מהיסודות: ממשק, כתובות, פקודת network.' },
    { q: 'לשני שכנים אותו Router-ID. מה התיקון?', opts: ['לשנות את ה-Priority', 'להגדיר router-id ייחודי לאחד מהם', 'לשנות את ה-Hello', 'להוסיף area'], a: 1, why: 'Router-ID חייב להיות שונה בין שכנים.' },
    { q: 'איזו פקודה תציג כמה אזורים יש לנתב והאם הוא ABR?', opts: ['show ip ospf', 'show ip route', 'show ip ospf neighbor', 'show ip protocols'], a: 0, why: 'show ip ospf מציג סוג נתב ואזורים.' },
    { q: 'יש ניתוב סטטי ו-OSPF לאותה רשת ותחילית. איזה ייכנס לטבלה?', opts: ['OSPF (110)', 'סטטי (AD 1)', 'שניהם', 'אף אחד'], a: 1, why: 'AD נמוך מנצח; סטטי = 1.' },
    { q: 'הנתב היוצא לאינטרנט יש לו ip route 0.0.0.0 0.0.0.0 …, אבל שאר הנתבים לא מקבלים ברירת מחדל. מה חסר?', opts: ['default-information originate', 'passive-interface', 'ip ospf cost', 'clear ip ospf'], a: 0, why: 'צריך לפרסם את הסטטי ב-OSPF.' },
    { q: 'מה ההבדל בין passive-interface ב-OSPF לשכנות?', opts: ['אין הבדל', 'הממשק לא שולח Hello ולכן אין שכנות, אבל הרשת מפורסמת', 'הממשק נכבה', 'הוא עובר ל-Area 0'], a: 1, why: 'חוסם Hello, לא מונע פרסום הרשת.' },
    { q: 'איזה צמד נכון?', opts: ['224.0.0.5 = DR/BDR, 224.0.0.6 = כולם', '224.0.0.5 = כל נתבי OSPF, 224.0.0.6 = DR/BDR', 'שניהם לכולם', 'שניהם ל-DR'], a: 1, why: '5 = AllSPFRouters, 6 = AllDRouters.' }
  ];
})(window.OG);
