/* EXTRA 5 – authentication, virtual links, protocol 89, process id, timers, redistribute, network types, OSPFv3 */
(function (OG) {
  const { el } = OG;

  function authWidget(host) {
    const A = { type: 2, kid: '1', key: 'Secret' }; const B = { type: 2, kid: '1', key: 'Secret' };
    const res = el('div.fb'), pkt = el('div.cli');
    const TN = ['Aut:0 – ללא אימות (Null)', 'Aut:1 – סיסמה פשוטה (ללא גיבוב)', 'Aut:2 – MD5 (עם גיבוב)'];
    const mk = (S, who) => {
      const ty = el('select', { onchange() { S.type = +ty.value; render(); } }, TN.map((t, i) => el('option', { value: i, text: t }))); ty.value = S.type;
      const kid = el('input', { type: 'text', value: S.kid, style: { width: '60px' }, oninput() { S.kid = kid.value; render(); } });
      const key = el('input', { type: 'text', value: S.key, style: { width: '120px' }, oninput() { S.key = key.value; render(); } });
      return el('div.wbox', el('b', { text: who }), el('div.wrow', { style: { marginTop: '6px' } }, ty), el('div.wrow', el('span.wlabel', { text: 'Key ID (רק MD5)' }), kid, el('span.wlabel', { text: 'סיסמה' }), key));
    };
    function render() {
      const probs = [];
      if (A.type !== B.type) probs.push('סוגי האימות שונים (Aut ' + A.type + ' מול Aut ' + B.type + ')');
      else if (A.type >= 1 && A.key !== B.key) probs.push('הסיסמה שונה');
      else if (A.type === 2 && A.kid !== B.kid) probs.push('ה-Key ID שונה');
      res.className = 'fb ' + (probs.length ? 'no' : 'ok'); res.innerHTML = probs.length ? '❌ <b>לא תהיה שכנות:</b> ' + probs.join(', ') : '✅ <b>האימות תואם – אפשר ליצור שכנות.</b>' + (A.type === 1 ? '<br>⚠️ סיסמה פשוטה נשלחת <b>בגלוי</b> – כל מי שמקשיב (Wireshark) רואה אותה. מומלץ MD5/SHA.' : '');
      pkt.innerHTML = `<span class="dim">// שדות באימות בחבילת OSPF של B</span>\nAuthentication Type: <span class="hl">${B.type}</span> (${['Null', 'Simple password', 'Cryptographic (MD5)'][B.type]})\nAuthentication Data: ${B.type === 0 ? '(none)' : B.type === 1 ? '<span class="hl">' + OG.esc(B.key) + '</span>   ← נראה בגלוי!' : 'Key ID ' + B.kid + ', digest: 8f2c…e91a   ← גיבוב, לא הסיסמה'}`;
    }
    host.append(el('div.wbox', el('h3', { text: '🔑 אימות ב-OSPF' }), el('div.muted', { html: 'נתב A מוגדר MD5 עם הסיסמה <b>Secret</b>. שנו את נתב B ובדקו מתי תהיה שכנות.' })), mk(A, 'נתב A'), mk(B, 'נתב B'), res, pkt); render();
  }

  function netTypes(host) {
    const T = [['Broadcast', 'Ethernet', 'כן (DR/BDR)', '10 / 40', 'ברירת מחדל באתרנט'], ['Point-to-Point', 'קו ישיר (Serial/PPP)', 'לא', '10 / 40', 'שני נתבים FULL'], ['Non-Broadcast (NBMA)', 'Frame Relay', 'כן', '30 / 120', 'Hello ביוניקסט (שלב Attempt)'], ['Point-to-Multipoint', 'Frame Relay/אחרים', 'לא', '30 / 120', 'שכנות לכל שכן בנפרד']];
    host.append(el('div.wbox', el('h3', { text: '🌐 סוגי רשת ב-OSPF' }), el('div.muted', { html: 'סוג הרשת משפיע על: בחירת DR/BDR וטיימרי ברירת המחדל. רואים אותו ב-<code>show ip ospf interface</code>.' })), el('div.wbox', el('table', { style: { width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '13px' } }, el('tr', ['סוג', 'דוגמה', 'DR/BDR', 'Hello/Dead', 'הערה'].map(h => el('th', { text: h, style: { background: '#1c2a58', border: '1px solid #2b3a6e', padding: '6px' } }))), T.map(r => el('tr', r.map((c, i) => el('td', { text: c, style: { border: '1px solid #2b3a6e', padding: '6px', fontWeight: i === 0 ? 800 : 400 } })))))),
      el('div.callout.tip', { html: '💡 על קו Ethernet שמחבר בדיוק שני נתבים אפשר לייעל: <code>ip ospf network point-to-point</code> – מבטל בחירת DR/BDR ומקצר את יצירת השכנות.' }),
      el('div.callout.warn', { html: '⚠️ בחומר נכתב ש"בממשקים סריאליים Hello=30". בפועל זה תלוי בסוג הרשת: ב-<b>Point-to-Point</b> (למשל Serial עם HDLC/PPP) ברירת המחדל היא <b>10/40</b>, ו-30/120 שייך ל-NBMA ול-Point-to-Multipoint. (גם בפלט <code>show ip ospf int s1/0</code> מהחומר רואים POINT_TO_POINT עם Hello 10, Dead 40.)' }));
  }

  OG.lessons.e5 = {
    steps: [
      {
        title: 'אימות – שומרים על ה-OSPF',
        html: `<div class="callout story">✈️ הקברניט: "לא כל מי שרוצה להיות שכן – מקבל להיות שכן. בודקים תעודה."</div>
          <p>אפשר להגדיר <b>אימות</b> בין נתבים, כך שרק מי שמכיר את הסיסמה יוצר שכנות. בהודעות מסומן הסוג:</p>
          <ul><li><b>Aut:0</b> – אין אימות.</li><li><b>Aut:1</b> – סיסמה פשוטה, <b>ללא גיבוב</b> (חלש – נראה בגלוי).</li><li><b>Aut:2</b> – <b>MD5</b>, עם גיבוב.</li></ul>
          <p>(קיימת גם אפשרות SHA, אך היא לא נכנסת לחומר.)</p>`,
        scene(S) {
          S.node('R1', 120, 160, { label: 'R1' }); S.node('R2', 680, 160, { label: 'R2' }); S.node('H', 400, 300, { type: 'person', label: 'מאזין', emoji: '🥷', stroke: '#fb7185' }); S.link('R1', 'R2');
          S.note('c', 20, 20, '<div class="cli" style="margin:0;font-size:11.5px;line-height:1.4">interface gi0/0\n ip ospf authentication message-digest\n ip ospf message-digest-key 1 md5 Secret</div>', { w: 330 });
          S.at(1, S => { S.packet('R1', 'R2', { label: 'Aut:1 "Secret"', color: '#fb7185', dur: 2.5 }); S.say('H', '😈 ראיתי את הסיסמה בגלוי!', { cls: 'r', dy: 80, w: 190, dur: 3 }); });
          S.at(5, S => { S.packet('R1', 'R2', { label: 'Aut:2 (MD5 hash)', color: '#34d399', dur: 2.5 }); S.say('H', 'רק גיבוב… אין מה לעשות', { cls: 'g', dy: 80, w: 170, dur: 3 }); });
        }
      },
      {
        title: 'מתי האימות מתאים?',
        html: `<p>שני הצדדים חייבים להיות עם <b>אותו סוג אימות ואותה סיסמה</b> (וב-MD5 גם אותו Key ID). אחרת – אין שכנות. נסו.</p>`,
        widget: authWidget
      },
      {
        title: 'Virtual-Link – חיבור אזור בלי Area 0',
        html: `<p>ראינו: כל אזור חייב להתחבר ל-Area 0. אבל אפשר לעקוף: <b>Virtual-Link</b> יוצר חיבור לוגי דרך אזור מתווך, כאילו קיים נתב ABR משותף בין האזורים.</p>
          <div class="cli">ABR-A(config-router)# <span class="hl">area 1 virtual-link 3.3.3.3</span>\nABR-B(config-router)# <span class="hl">area 1 virtual-link 1.1.1.1</span></div>
          <p>המספרים הם ה-<b>Router-ID</b> של ה-ABR בצד השני. האזור המתווך (כאן Area 1) לא יכול להיות Stub.</p>`,
        scene(S) {
          S.area('a0', { cx: 130, cy: 190, rx: 110, ry: 90, color: '#fbbf24', label: 'Area 0', lx: 130, ly: 110 }); S.area('a1', { cx: 400, cy: 190, rx: 130, ry: 90, color: '#fb923c', label: 'Area 1 (מתווך)', lx: 400, ly: 110 }); S.area('a3', { cx: 670, cy: 190, rx: 110, ry: 90, color: '#22d3ee', label: 'Area 3', lx: 670, ly: 110 });
          S.node('B', 100, 200, { label: 'R', size: .8 }); S.node('ABRA', 270, 200, { label: 'ABR-A', sub: '1.1.1.1', size: .8 }); S.node('ABRB', 530, 200, { label: 'ABR-B', sub: '3.3.3.3', size: .8 }); S.node('C', 700, 200, { label: 'R', size: .8 });
          S.link('B', 'ABRA'); S.link('ABRA', 'ABRB'); S.link('ABRB', 'C');
          S.at(.8, S => S.packet(['C', 'ABRB', 'ABRA', 'B'], null, { label: '❌ אין חיבור ל-0', color: '#fb7185', dur: 3 }));
          S.at(4, S => { S.linkColor('ABRA', 'ABRB', '#a78bfa', 5); S.note('v', 270, 290, '🔗 Virtual-Link: Area 3 "מחובר" ל-Area 0 דרך Area 1', { w: 270, cls: 'v', align: 'center' }); S.packet(['C', 'ABRB', 'ABRA', 'B'], null, { label: '✔', color: '#34d399', dur: 3 }); });
        }
      },
      {
        title: 'בדיקת הבנה #1',
        html: '<p>סיבות וקישורים.</p>',
        check: { q: 'איזה פתרון מאפשר לחבר אזור שאין לו חיבור פיזי ל-Area 0?', opts: ['ip ospf priority 255', 'Virtual-Link דרך אזור מתווך', 'passive-interface', 'auto-cost reference-bandwidth'], a: 1, why: 'Virtual-Link יוצר חיבור לוגי ל-Area 0 דרך אזור אחר.' }
      },
      {
        title: 'OSPF רץ על IP פרוטוקול 89',
        html: `<div class="callout warn">⚠️ <b>תיקון חשוב:</b> OSPF <b>לא</b> משתמש ב-TCP וגם לא ב-UDP. הוא נישא <b>ישירות על IP</b> עם מספר פרוטוקול <b>89</b> (בשדה Protocol של כותרת ה-IP). לכן אין לו "פורט". (בחומר שקיבלתם נכתב TCP – זו לא הגרסה הנכונה.)</div>
          <p>הודעות Hello נשלחות עם TTL=1 ל-<code>224.0.0.5</code>, כך שהן לא יוצאות מהרשת המקומית.</p>`,
        scene(S) {
          S.note('hdr', 100, 40, `<div class="tt">כותרת IP</div><table class="ltr"><tr><th>Field</th><th>Value</th></tr><tr><td>Version</td><td>4</td></tr><tr class="hl"><td><b>Protocol</b></td><td><b>89 = OSPF</b></td></tr><tr><td>TTL</td><td>1</td></tr><tr><td>Destination</td><td>224.0.0.5</td></tr></table>`, { w: 600, cls: 'c' });
          S.table('pr', 100, 230, { w: 600, ltr: true, title: 'מספרי פרוטוקול נפוצים', head: ['Protocol #', 'שם'], rows: [['1', 'ICMP'], ['6', 'TCP'], ['17', 'UDP'], { c: ['89', 'OSPF  ← ישירות על IP'], cls: 'win' }] });
        }
      },
      {
        title: 'Process ID, טיימרי Wait ו-Retransmit',
        html: `<ul><li><b>Process ID</b> – מספר שמזהה את תהליך ה-OSPF על הנתב (נקבע ע"י המנהל; <code>router ospf 1</code>). אפשר כמה תהליכים במקביל, אבל לא נהוג. הוא <b>מקומי</b> – אין צורך שיהיה זהה בין נתבים.</li>
          <li><b>Wait</b> – (ברירת מחדל 40 שניות) הזמן שבו הממשק ממתין, אחרי שעלה, לפני שמכריז על DR/BDR – כדי להכיר קודם את הנתבים הקיימים.</li>
          <li><b>Retransmit</b> – (5 שניות) כמה זמן הנתב ממתין ל-LSAck לפני ששולח את ה-LSA שוב.</li></ul>
          <div class="cli">Timer intervals configured, Hello 10, Dead 40, <span class="hl">Wait 40, Retransmit 5</span></div>`,
        scene(S) {
          S.node('R1', 160, 130, { label: 'R1' }); S.node('R2', 640, 130, { label: 'R2' }); S.link('R1', 'R2');
          S.note('t', 220, 230, '<div class="tt">⏱️ Retransmit = 5 שניות</div><div id="rt">R1 שולח LSU…</div>', { w: 360, cls: 'y' });
          S.at(.5, S => S.packet('R1', 'R2', { label: 'LSU', color: '#34d399', dur: 1.6 })); S.at(2.4, S => { S.say('R2', '🙈 האישור (LSAck) הלך לאיבוד', { cls: 'r', dy: 80, w: 190, dur: 2.5 }); S.items.t.d.querySelector('#rt').textContent = 'אין LSAck… מחכים 5 שניות'; });
          S.at(5.5, S => { S.items.t.d.querySelector('#rt').textContent = 'עברו 5 שניות – שולחים את ה-LSU שוב'; S.packet('R1', 'R2', { label: 'LSU (שוב)', color: '#fbbf24', dur: 1.6 }); });
          S.at(7.5, S => S.packet('R2', 'R1', { label: 'LSAck', color: '#f472b6', dur: 1.6 }));
        }
      },
      {
        title: 'סוגי רשת ו-ip ospf network',
        html: `<p>סוג הרשת של הממשק קובע אם יש DR/BDR ומה הטיימרים.</p>`,
        widget: netTypes
      },
      {
        title: 'בדיקת הבנה #2',
        html: '<p>פרוטוקול ומספר.</p>',
        check: { q: 'על איזה פרוטוקול תעבורה/שכבה OSPF רץ?', opts: ['TCP פורט 89', 'UDP פורט 89', 'ישירות על IP – פרוטוקול מספר 89', 'ICMP'], a: 2, why: 'OSPF נישא ישירות על IP כפרוטוקול מספר 89 – לא TCP ולא UDP.', fb: { 0: 'OSPF לא משתמש בכלל ב-TCP.' } }
      },
      {
        title: 'Redistribute – הזרקה מבחוץ',
        html: `<p>כדי להכניס מסלולים שאינם ב-OSPF לתוכו – נתב <b>ASBR</b> מבצע <b>Redistribute</b>:</p>
          <div class="cli">R1(config-router)# <span class="hl">redistribute static subnets</span>\nR1(config-router)# <span class="hl">default-information originate</span>   <span class="dim">! הזרקת ברירת מחדל</span></div>
          <p>המסלולים יוצאים כ-<b>Type 5</b> ומופיעים אצל השאר כ-<b>O E2</b> (ברירת מחדל: מטריקה 20). אפשר גם <code>redistribute eigrp 100</code> וכו'.</p>`,
        scene(S) {
          S.node('ST', 80, 190, { type: 'cloud', label: 'סטטי/EIGRP' }); S.node('ASBR', 280, 190, { label: 'ASBR' }); S.node('R', 520, 190, { label: 'R' }); S.node('R2', 720, 190, { label: 'R' });
          S.link('ST', 'ASBR'); S.link('ASBR', 'R'); S.link('R', 'R2');
          S.at(.6, S => S.packet('ST', 'ASBR', { label: 'חיצוני', color: '#f472b6', dur: 1.4 }));
          S.at(2.2, S => S.flood('ASBR', { shape: 'emoji', emoji: '🧩', label: 'Type 5', color: '#f472b6', hop: 1.1, skip: n => n === 'ST' }));
          S.table('rt', 400, 300, { w: 330, ltr: true, title: 'R: show ip route', head: ['', 'Route'], rows: [{ c: ['O E2', '172.16.0.0/16 [110/20]'], hidden: true }] });
          S.at(5, S => { S.rowShow('rt', 0); S.rowCls('rt', 0, 'win'); });
        }
      },
      {
        title: 'בדיקת הבנה #3',
        html: '<p>מי צריך אימות?</p>',
        check: { q: 'בנתב A מוגדר אימות MD5, ובנתב B אין אימות. מה יקרה?', opts: ['שכנות תיווצר רגיל', 'לא תיווצר שכנות – סוג האימות חייב להתאים', 'A יוותר על האימות', 'שכנות רק ב-2-Way'], a: 1, why: 'סוג האימות והסיסמה חייבים להתאים בשני הצדדים.' }
      },
      {
        title: 'בונוס: OSPFv3',
        html: `<p><b>OSPFv3</b> הוא OSPF עבור IPv6: אותו רעיון (Link-State, אזורים, DR/BDR, SPF), בהבדלים: מופעל על הממשק (<code>ipv6 ospf 1 area 0</code>), מתקשר עם כתובות Link-Local, ו-Multicast <code>FF02::5</code> ו-<code>FF02::6</code> (במקום 224.0.0.5/6). ה-Router-ID עדיין <b>32 ביט</b> בפורמט IPv4.</p>`,
        scene(S) { S.node('A', 200, 190, { label: 'R1' }); S.node('B', 600, 190, { label: 'R2' }); S.link('A', 'B', { label: 'FF02::5', lo: -20 }); S.at(.5, S => { S.packet('A', 'B', { label: 'Hello v3', color: '#22d3ee', dur: 2 }); S.packet('B', 'A', { label: 'Hello v3', color: '#34d399', dur: 2 }); }); }
      },
      {
        title: 'סיכום – סיימתם את ה-EXTRA!',
        html: `<div class="callout story">✈️ הקברניט: "נחתתם. עכשיו – נסיעה אחרונה בכביש המהיר!"</div>
          <ul><li>אימות: Aut 0/1/2 – חייב להתאים. MD5 עדיף על סיסמה פשוטה.</li><li>Virtual-Link מחבר אזור ל-Area 0 דרך אזור מתווך.</li><li>OSPF = IP פרוטוקול 89 (לא TCP).</li><li>Process ID מקומי. Wait=40, Retransmit=5. Redistribute → Type 5 / E2.</li><li>סוג רשת קובע DR/BDR וטיימרים.</li></ul>`,
        scene(S) { S.node('N', 400, 190, { type: 'emoji', emoji: '✈️', fs: 110 }); }
      }
    ]
  };

  OG.quizzes.e5 = [
    { q: 'איזה סימון מציין אימות MD5 בהודעת OSPF?', opts: ['Aut:0', 'Aut:1', 'Aut:2', 'Aut:5'], a: 2, why: 'Aut:0 = ללא, Aut:1 = סיסמה פשוטה, Aut:2 = MD5.' },
    { q: 'מה החסרון של אימות Aut:1?', opts: ['הוא איטי', 'הסיסמה נשלחת בגלוי (ללא גיבוב)', 'הוא לא נתמך', 'הוא חייב Priority 0'], a: 1, why: 'אימות פשוט חושף את הסיסמה בחבילה.' },
    { q: 'כאשר אזור לא מחובר פיזית ל-Area 0 משתמשים ב…', opts: ['Virtual-Link', 'ip ospf cost', 'passive-interface', 'bandwidth'], a: 0, why: 'Virtual-Link יוצר חיבור לוגי דרך אזור מתווך.' },
    { q: 'איזה מספר פרוטוקול מזהה את OSPF בכותרת ה-IP?', opts: ['6', '17', '89', '110'], a: 2, why: '89. (110 הוא ה-AD).' },
    { q: 'האם OSPF משתמש ב-TCP?', opts: ['כן, פורט 89', 'לא – הוא נישא ישירות על IP', 'כן, פורט 110', 'רק ב-Area 0'], a: 1, why: 'OSPF נישא ישירות על IP כפרוטוקול 89, בלי TCP או UDP.' },
    { q: 'מהו ה-Process ID ב-OSPF?', opts: ['מזהה מקומי של תהליך ה-OSPF בנתב – לא חייב להתאים לשכן', 'מספר האזור', 'ה-Router-ID', 'סיסמת האימות'], a: 0, why: 'מקומי לנתב בלבד.' },
    { q: 'מה עושה טיימר ה-Retransmit (ברירת מחדל 5 שנ׳)?', opts: ['קובע כמה זמן מחכים ל-LSAck לפני שליחה חוזרת של ה-LSA', 'קובע את זמן ה-Dead', 'קובע את מספר ה-DR', 'מוחק LSA'], a: 0, why: 'ללא אישור – שולחים שוב אחרי 5 שניות.' },
    { q: 'איך מסומן ניתוב שהוזרק מבחוץ ב-OSPF (ברירת מחדל)?', opts: ['O', 'O IA', 'O E2', 'C'], a: 2, why: 'External Type 2.' },
    { q: 'איזה פקודה על קו Ethernet בין שני נתבים מבטלת בחירת DR/BDR?', opts: ['ip ospf network point-to-point', 'ip ospf priority 0', 'passive-interface', 'ip ospf cost 1'], a: 0, why: 'מגדירה את הממשק כ-Point-to-Point.' }
  ];
})(window.OG);
