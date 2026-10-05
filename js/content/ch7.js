/* Chapter 7 – show commands and reading outputs */
(function (OG) {
  const { el } = OG;

  function routeLineWidget(host) {
    const parts = [
      ['O', 'הניתוב נלמד ב-OSPF', '#34d399'], ['192.168.23.0/24', 'רשת היעד ותחילית (מסכה)', '#22d3ee'], ['[110/2]', 'AD = 110 (ברירת מחדל של OSPF) / Cost כולל = 2', '#fbbf24'], ['via 192.168.13.3', 'ה-Next-Hop: הנתב הבא בדרך', '#a78bfa'], ['00:00:26', 'כמה זמן הניתוב קיים בטבלה', '#fb923c'], ['FastEthernet1/0', 'הממשק שממנו יוצאים', '#f472b6']
    ];
    const info = el('div.callout.info', { text: 'לחצו על חלק בשורה כדי להבין אותו.' });
    const line = el('div.cli', { style: { fontSize: '16px', lineHeight: 2.2, whiteSpace: 'normal' } });
    parts.forEach(([t, d, c]) => { const s = el('span', { text: t + ' ', style: { cursor: 'pointer', padding: '2px 6px', borderRadius: '6px', borderBottom: `2px solid ${c}`, margin: '0 3px' }, onclick() { info.innerHTML = `<b style="color:${c}">${t}</b> – ${d}`; OG.snd.play('pop'); OG.$$('span', line).forEach(x => x.style.background = ''); s.style.background = c + '33'; } }); line.append(s); });
    host.append(el('div.wbox', el('h3', { text: '🔬 קריאת שורה בטבלת הניתוב' }), el('div.muted', { html: 'הפקודה: <code>R1# show ip route ospf</code>' })), line, info,
      el('div.wbox', el('b', { text: 'וכך נראים סוגי המסלולים:' }), el('div.cli', { html: '<span class="hl">O</span>      192.168.23.0/24 [110/2] via 192.168.13.3 …   <span class="dim">← נלמד ב-OSPF באזור שלי</span>\n<span class="hl">O IA</span>   192.168.45.0/24 [110/21] via …            <span class="dim">← Inter-Area: מאזור אחר (דרך ABR)</span>\n<span class="hl">O E2</span>   172.16.0.0/16 [110/20] via …              <span class="dim">← External: חיצוני (דרך ASBR)</span>\n<span class="hl">O*E2</span>  0.0.0.0/0 [110/1] via …                 <span class="dim">← ברירת מחדל שנלמדה ב-OSPF</span>' })));
  }

  const SHOW = {
    'show ip route ospf': { out: `R1#show ip route ospf\n     2.0.0.0/32 is subnetted, 1 subnets\n<span class="hl">O       2.2.2.2 [110/3] via 192.168.13.3, 00:00:26, FastEthernet1/0</span>\n<span class="hl">O    192.168.23.0/24 [110/2] via 192.168.13.3, 00:00:26, FastEthernet1/0</span>\nO IA 192.168.45.0/24 [110/21] via 192.168.13.3, 00:00:12, FastEthernet1/0`, tips: ['שורות שמתחילות ב-<b>O</b>: נתיבים שנלמדו ב-OSPF.', '<b>O IA</b> = Inter-Area (מאזור אחר).', 'הסוגריים [110/2]: ה-AD ואז העלות הכוללת.'] },
    'show ip protocols': { out: `R1#show ip protocols\nRouting Protocol is "ospf 1"\n  <span class="hl">Router ID 1.1.1.1</span>\n  <span class="hl">Number of areas in this router is 2. 1 normal 1 stub 0 nssa</span>\n  <span class="hl">Maximum path: 4</span>\n  Routing for Networks:\n    192.168.12.0 0.0.0.255 area 0\n    192.168.13.0 0.0.0.255 area 1\n  <span class="hl">Passive Interface(s):\n    GigabitEthernet0/1</span>\n  Routing Information Sources:\n    Gateway         Distance      Last Update\n    2.2.2.2              110      00:01:12`, tips: ['ה-<b>Router-ID</b>, מספר האזורים וסוגם.', '<b>Maximum path</b> – מקסימום מסלולים שווים (איזון עומסים).', '<b>Routing for Networks</b> – הרשתות שהנתב מפרסם.', '<b>Passive Interface</b> – ממשקים שלא שולחים Hello.', '<b>Routing Information Sources</b> – נתבים שממנם מקבלים עדכונים.'] },
    'show ip ospf neighbor': { out: `R1#show ip ospf neighbor\nNeighbor ID     Pri   State        Dead Time   Address         Interface\n2.2.2.2           1   <span class="hl">FULL/BDR</span>     00:00:32    192.168.123.2   FastEthernet0/0\n3.3.3.3           1   <span class="hl">FULL/DR</span>      00:00:31    192.168.123.3   FastEthernet0/0\n4.4.4.4           0   FULL/  -     00:00:36    10.0.0.4        Serial1/0`, tips: ['<b>Neighbor ID</b> – ה-Router-ID של השכן. <b>Pri</b> – ה-Priority שלו.', '<b>State</b>: FULL = שכנות מלאה; יש גם Init, 2-Way, ExStart, Exchange, Loading, Down. אחרי הלוכסן – תפקידו (DR/BDR/DROTHER), או "-" אם אין.', '<b>Dead Time</b> – כמה שניות נשארו עד שהשכן יוכרז מת.', '<b>Address</b> – כתובת הפורט של השכן; <b>Interface</b> – הממשק שלנו.'] },
    'show ip ospf database': { out: `R1#show ip ospf database\n            OSPF Router with ID (1.1.1.1) (Process ID 1)\n\n                Router Link States (Area 0)\nLink ID         ADV Router      Age         Seq#       Checksum Link count\n<span class="hl">1.1.1.1         1.1.1.1         412         0x80000005 0x00A1B2 2</span>\n<span class="hl">2.2.2.2         2.2.2.2         398         0x80000004 0x00C3D4 2</span>\n\n                Net Link States (Area 0)\nLink ID         ADV Router      Age         Seq#       Checksum\n192.168.12.2    2.2.2.2         398         0x80000001 0x00E5F6`, tips: ['זהו ה-<b>LSDB</b> (טבלת הטופולוגיה) – כל ה-LSA שהנתב קיבל.', 'ממוינים לפי סוג: Router Link States (Type 1), Net Link States (Type 2) ועוד.', '<b>ADV Router</b> = מי יצר את ה-LSA.'] },
    'show ip ospf': { out: `R1#show ip ospf\n <span class="hl">Routing Process "ospf 1" with ID 1.1.1.1</span>\n <span class="hl">It is an area border router</span>\n Number of areas in this router is 2. 2 normal 0 stub 0 nssa\n    Area BACKBONE(0)\n        <span class="hl">Number of interfaces in this area is 1</span>\n    Area 1\n        Number of interfaces in this area is 1`, tips: ['שם התהליך (Process), ה-Router-ID.', 'סוג הנתב: <b>ABR</b> / ASBR / רגיל (ריק).', 'לכמה אזורים הנתב שייך, ומה סוג כל אזור, וכמה ממשקים בכל אזור.'] },
    'show ip ospf interface': { out: `R4#show ip ospf interface\nFastEthernet0/0 is up, line protocol is up\n  Internet Address 10.0.0.4/24, <span class="hl">Area 0</span>\n  Process ID 1, Router ID 4.4.4.4, <span class="hl">Network Type BROADCAST</span>, <span class="hl">Cost: 1</span>\n  Transmit Delay is 1 sec, <span class="hl">State DR, Priority 1</span>\n  <span class="hl">Designated Router (ID) 4.4.4.4</span>, Interface address 10.0.0.4\n  <span class="hl">Backup Designated router (ID) 3.3.3.3</span>, Interface address 10.0.0.3\n  <span class="hl">Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5</span>`, tips: ['כתובת, אזור ותהליך של הממשק.', '<b>Network Type</b>: BROADCAST / POINT_TO_POINT… ו-<b>Cost</b> של הפורט.', '<b>State</b> – התפקיד של הנתב ברשת (DR/BDR/DROTHER) ו-Priority.', 'ה-Router-ID של ה-DR וה-BDR.', 'הטיימרים: Hello, Dead, Wait, Retransmit.'] }
  };
  function showExplorer(host) {
    const keys = Object.keys(SHOW); const tabs = el('div.row'); const out = el('div.cli', { style: { maxHeight: '36vh', overflow: 'auto' } }); const tips = el('div.callout.tip');
    function pickK(k) { OG.$$('button', tabs).forEach(b => b.classList.toggle('warn', b.dataset.k === k)); out.innerHTML = SHOW[k].out; tips.innerHTML = '<b>מה מחפשים כאן?</b><ul>' + SHOW[k].tips.map(t => `<li>${t}</li>`).join('') + '</ul>'; OG.snd.play('click'); }
    keys.forEach(k => tabs.append(el('button.btn.small', { text: k, 'data-k': k, onclick: () => pickK(k) })));
    host.append(el('div.wbox', el('h3', { text: '🖥️ ארגז הכלים: פקודות show' }), el('div.muted', { text: 'בחרו פקודה, וקראו איך מפענחים את הפלט. השורות המסומנות הן המידע החשוב.' })), tabs, out, tips); pickK(keys[0]);
  }

  OG.lessons.ch7 = {
    steps: [
      {
        title: 'show ip route – טבלת הניתוב',
        html: `<div class="callout story">🖥️ הבלשית: "לא מנחשים – קוראים. כל אות בשורה מספרת סיפור."</div>
          <p>אחרי ההגדרות מציגים את טבלת הניתוב עם <code>show ip route</code> (או <code>show ip route ospf</code> לסינון). נפרק שורה אחת לחלקים:</p>`,
        widget: routeLineWidget
      },
      {
        title: 'O, IA, E2 – מה האותיות אומרות',
        html: `<ul><li><b>O</b> – הניתוב נלמד ע"י OSPF.</li><li><b>O IA</b> – נלמד מאזור אחר (<i>Inter-Area</i>), דרך ABR.</li><li><b>O E1 / E2</b> – <i>External</i>: הגיע מניתוב חיצוני דרך ASBR.</li><li><b>O*E2</b> – ניתוב ברירת מחדל שנלמד באמצעות OSPF כ-External.</li></ul>
          <p>שימו לב בהנפשה לאות שמופיעה בכל שורה ולמה היא מצביעה.</p>`,
        scene(S) {
          S.node('R1', 120, 190, { label: 'R1', sub: 'אתם כאן' });
          S.node('A', 400, 80, { label: 'ABR' }); S.node('E', 400, 300, { label: 'ASBR' }); S.node('IA', 690, 80, { type: 'lan', label: '192.168.45.0', ly: 4 }); S.node('EX', 690, 300, { type: 'cloud', label: 'חיצוני' });
          S.link('R1', 'A'); S.link('R1', 'E'); S.link('A', 'IA'); S.link('E', 'EX');
          S.table('t', 20, 330, { w: 330, ltr: true, title: 'R1# show ip route', head: ['', 'Route'], rows: [{ c: ['O IA', '192.168.45.0/24 via ABR'], hidden: true }, { c: ['O E2', '172.16.0.0/16 via ASBR'], hidden: true }, { c: ['O*E2', '0.0.0.0/0 via ASBR'], hidden: true }] });
          S.at(1, S => { S.packet(['IA', 'A', 'R1'], null, { label: 'LSA', color: '#fbbf24', dur: 2.5 }); S.mark('A', '#fbbf24'); });
          S.at(3.6, S => { S.rowShow('t', 0); S.rowCls('t', 0, 'hl'); });
          S.at(4.5, S => { S.packet(['EX', 'E', 'R1'], null, { label: 'External', color: '#f472b6', dur: 2.5 }); S.mark('E', '#f472b6'); });
          S.at(7, S => { S.rowShow('t', 1); S.rowShow('t', 2); S.rowCls('t', 0, ''); S.rowCls('t', 1, 'hl'); S.rowCls('t', 2, 'hl'); });
        }
      },
      {
        title: 'בדיקת הבנה #1',
        html: '<p>איזו אות לאיזה סוג?</p>',
        check: { q: 'בטבלת הניתוב מופיעה שורה שמתחילה ב-<code>O IA</code>. מה זה אומר?', opts: ['ניתוב ברירת מחדל', 'ניתוב מאזור אחר שהגיע דרך ABR (Inter-Area)', 'ניתוב חיצוני שהגיע מ-ASBR', 'ניתוב סטטי'], a: 1, why: 'IA = Inter-Area. הניתוב נלמד מ-OSPF ומגיע מאזור אחר דרך ABR.', fb: { 2: 'חיצוני מסומן E1/E2.', 0: 'ברירת מחדל מסומנת O*E2.' } }
      },
      {
        title: 'ארגז הכלים של הבלש',
        html: `<p>שש פקודות show שכדאי להכיר – ולדעת מה לחפש בכל אחת. נסו אותן ובדקו את ההסברים.</p>
          <div class="callout tip">💡 במשחקון תצטרכו למצוא שורות מסוימות בתוך פלטים כאלה – אז תתרגלו כאן!</div>`,
        widget: showExplorer
      },
      {
        title: 'בדיקת הבנה #2',
        html: '<p>קראו את הפלט.</p><div class="cli">R1#show ip ospf neighbor\nNeighbor ID     Pri   State        Dead Time   Address         Interface\n2.2.2.2           1   FULL/BDR     00:00:32    192.168.123.2   Fa0/0\n3.3.3.3           1   FULL/DR      00:00:31    192.168.123.3   Fa0/0</div>',
        check: { q: 'לפי הפלט, מי ה-DR ברשת הזו?', opts: ['2.2.2.2', '3.3.3.3', 'R1 עצמו', 'אין DR'], a: 1, why: 'בעמודת State: FULL/DR אצל 3.3.3.3. השכן 2.2.2.2 הוא ה-BDR.', fb: { 0: '2.2.2.2 הוא ה-BDR (FULL/BDR).' } }
      },
      {
        title: 'תרגיל: מתחקרים בקונסול',
        html: '<p>הקלידו את הפקודה המתאימה לכל שאלה ותראו את הפלט.</p>',
        widget(host, ctx) {
          OG.W.cliTask(host, { title: '⌨️ הבלש בשטח', intro: 'אתם על נתב R1 במצב privileged (R1#).', tasks: [
            { prompt: 'R1#', ask: 'הציגו רק את הנתיבים שנלמדו ב-OSPF בטבלת הניתוב', ok: [/^sh(ow)? ip route ospf$/], hint: 'show ip route ospf', show: 'show ip route ospf', echo: 'O    192.168.23.0/24 [110/2] via 192.168.13.3, 00:00:26, FastEthernet1/0' },
            { prompt: 'R1#', ask: 'הציגו את השכנים של OSPF', ok: [/^sh(ow)? ip ospf nei(ghbor)?s?$/], hint: 'show ip ospf neighbor', show: 'show ip ospf neighbor', echo: '3.3.3.3  1  FULL/DR  00:00:31  192.168.123.3  FastEthernet0/0' },
            { prompt: 'R1#', ask: 'הציגו את ה-LSDB (מסד הנתונים של OSPF)', ok: [/^sh(ow)? ip ospf data(base)?$/], hint: 'show ip ospf database', show: 'show ip ospf database', echo: 'Router Link States (Area 0) ...' },
            { prompt: 'R1#', ask: 'הציגו מידע על פרוטוקולי הניתוב הפועלים (Router-ID, רשתות, ממשקים פסיביים)', ok: [/^sh(ow)? ip pro(tocols)?$/], hint: 'show ip protocols', show: 'show ip protocols', echo: 'Routing Protocol is "ospf 1"  Router ID 1.1.1.1 ...' }
          ] }, ctx);
        }
      },
      {
        title: 'סיכום הפרק',
        html: `<div class="callout story">🕵️‍♀️ הבלשית: "מצוין! עכשיו אתם יודעים לקרוא את הרשת. אתם מוכנים לאפלה הגדולה."</div>
          <ul><li><code>show ip route</code>: O, O IA, O E1/E2, O*E2.</li><li><code>show ip protocols</code>: Router-ID, רשתות, פסיביים, Max path.</li><li><code>show ip ospf neighbor</code>: State (FULL/DR…), Dead Time.</li><li><code>show ip ospf database</code>: LSDB. <code>show ip ospf</code>: תהליך, סוג נתב, אזורים. <code>show ip ospf interface</code>: Cost, טיימרים, DR/BDR.</li></ul>`,
        scene(S) { S.node('T', 400, 190, { type: 'emoji', emoji: '🕵️‍♀️', fs: 100 }); }
      }
    ]
  };

  OG.quizzes.ch7 = [
    { q: 'איזה פקודה מציגה את טבלת השכנים של OSPF?', opts: ['show ip route', 'show ip ospf neighbor', 'show ip ospf database', 'show ip protocols'], a: 1, why: 'show ip ospf neighbor.' },
    { q: 'מה מסמלת האות O בתחילת שורה בטבלת הניתוב?', opts: ['Connected', 'נלמד ב-OSPF', 'סטטי', 'RIP'], a: 1, why: 'O = OSPF. (C = connected, S = static, R = RIP).' },
    { q: 'איזה סימון מצביע על ניתוב ברירת מחדל שנלמד ב-OSPF?', opts: ['O IA', 'O*E2', 'C*', 'R*'], a: 1, why: 'O*E2: כוכבית = ברירת מחדל, E2 = External.' },
    { q: 'הסוגריים [110/2] בשורת ניתוב אומרים:', opts: ['Hello=110, Dead=2', 'AD=110, Cost כולל=2', 'אזור 110 ונתב 2', 'פורט 110/2'], a: 1, why: 'AD ואחריו המטריקה (Cost).' },
    { q: 'איזו פקודה מציגה את ה-Router-ID, הרשתות המפורסמות והממשקים הפסיביים?', opts: ['show ip ospf neighbor', 'show ip protocols', 'show ip interface brief', 'show ip ospf database'], a: 1, why: 'show ip protocols.' },
    { q: 'בעמודת State מופיע <code>FULL/DR</code>. מה זה אומר על השכן?', opts: ['השכן הוא DR ויש איתו שכנות מלאה', 'השכן מת', 'השכן הוא ABR', 'השכנות נתקעה'], a: 0, why: 'FULL = שכנות מלאה, DR = תפקידו ברשת.' },
    { q: 'מה אפשר לראות ב-<code>show ip ospf interface</code>?', opts: ['Cost, סוג רשת, טיימרים, DR/BDR', 'רק את טבלת הניתוב', 'סיסמאות', 'דבר'], a: 0, why: 'Cost, Network Type, State, Hello/Dead/Wait/Retransmit, DR ו-BDR.' },
    { q: 'בטבלת השכנים ב-State מופיע "-" ללא תפקיד. אפשרות סבירה:', opts: ['Priority הוגדר ל-0 או שהחיבור Point-to-Point', 'השכן הוא ASBR', 'Router-ID כפול', 'הנתב מת'], a: 0, why: 'ב-P2P ובמצב Priority 0 אין תפקיד DR/BDR.' }
  ];
})(window.OG);
