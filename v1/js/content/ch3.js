/* Chapter 3 – Hello packets, adjacency conditions, Router-ID */
(function (OG) {
  const { el } = OG;

  function helloAnatomy(host) {
    const F = [
      ['Router ID', '1.1.1.1', 'המזהה של הנתב ב-OSPF. נקבע ידנית, או לפי כתובת ה-IP הגבוהה של ה-Loopback, או של ממשק פיזי פעיל.'],
      ['Hello / Dead', '10 / 40', 'זמני הטיימרים. ברירת מחדל Hello = 10 שניות, Dead = 40. חייבים להיות זהים בין שכנים.'],
      ['Neighbors', '2.2.2.2', 'רשימת השכנים שהנתב כבר שמע מהם. כשנתב רואה את עצמו ברשימה של שכנו – יש תקשורת דו-כיוונית.'],
      ['Area ID', '0', 'באיזה אזור נמצא הממשק. חייב להיות זהה.'],
      ['Router Priority', '1', 'קדימות לבחירת DR/BDR. הגבוה ביותר הוא ה-DR. 0 = לעולם לא DR. אין צורך שיהיה זהה.'],
      ['DR IP Address', '192.168.1.2', 'כתובת ה-IP של ה-DR ברשת.'],
      ['BDR IP Address', '192.168.1.3', 'כתובת ה-IP של ה-BDR ברשת.'],
      ['Authentication', 'Type 2 (MD5)', 'סוג האימות: 0 = ללא, 1 = סיסמה פשוטה, 2 = MD5.'],
      ['Password', '********', 'הסיסמה של האימות. חייבת להיות זהה.'],
      ['Stub Area Flag', 'No', 'סוג אזור ה-Stub. חייב להיות זהה.'],
      ['Network Mask', '255.255.255.0', 'מסכת הרשת של הממשק. חייבת להיות זהה (אותה רשת).']
    ];
    const info = el('div.callout.info', { text: 'לחצו על שדה כדי לראות מה הוא אומר.' });
    const box = el('div.wbox', el('h3', { text: '👋 הודעת Hello – שדה אחר שדה' }), el('div.muted', { html: 'נשלחת ל-<code>224.0.0.5</code> (כל נתבי ה-OSPF) כל 10 שניות.' }));
    const grid = el('div.field-grid', { style: { gridTemplateColumns: '1fr 1fr' } });
    F.forEach(([n, v, d]) => { const b = el('button.opt', { html: `<b>${n}</b> <span class="ltr muted">${v}</span>`, onclick() { OG.$$('.opt', grid).forEach(x => x.classList.remove('ok')); b.classList.add('ok'); info.innerHTML = `<b>${n}:</b> ${d}`; OG.snd.play('pop'); } }); grid.append(b); });
    host.append(box, grid, info);
  }

  function helloMatcher(host) {
    const fields = [
      { k: 'area', n: 'Area ID', a: '0', opts: ['0', '1'], must: 'same' },
      { k: 'hello', n: 'Hello / Dead', a: '10 / 40', opts: ['10 / 40', '5 / 20'], must: 'same' },
      { k: 'net', n: 'רשת + מסכה', a: '192.168.1.0 /24', opts: ['192.168.1.0 /24', '192.168.1.0 /25', '192.168.2.0 /24'], must: 'same' },
      { k: 'auth', n: 'אימות (סיסמה)', a: 'cisco', opts: ['cisco', 'אין', 'hacker'], must: 'same' },
      { k: 'stub', n: 'סוג Stub', a: 'רגיל', opts: ['רגיל', 'Stub'], must: 'same' },
      { k: 'ip', n: 'כתובת IP', a: '192.168.1.1', opts: ['192.168.1.2', '192.168.1.1'], must: 'diff' },
      { k: 'rid', n: 'Router-ID', a: '1.1.1.1', opts: ['2.2.2.2', '1.1.1.1'], must: 'diff' },
      { k: 'prio', n: 'Priority', a: '1', opts: ['1', '0', '100'], must: 'free' }
    ];
    const val = {}; fields.forEach(f => val[f.k] = f.opts[0]);
    const grid = el('div.field-grid'); const res = el('div.fb');
    const rows = {};
    grid.append(el('div.fh', { text: 'שדה' }), el('div.fh', { text: 'נתב A (קבוע)' }), el('div.fh', { text: 'נתב B (שנו!)' }));
    fields.forEach(f => {
      const sel = el('select', { onchange() { val[f.k] = sel.value; eval1(); OG.snd.play('click'); } }, f.opts.map(o => el('option', { value: o, text: o })));
      const ca = el('div.fcell', { text: f.a }), cb = el('div.fcell'); cb.append(sel);
      rows[f.k] = { ca, cb }; grid.append(el('div', { html: `<b>${f.n}</b><div class="muted" style="font-size:11px">${f.must === 'same' ? 'חייב להיות זהה' : f.must === 'diff' ? 'חייב להיות שונה' : 'לא חייב להתאים'}</div>` }), ca, cb);
    });
    function eval1() {
      const bad = [];
      fields.forEach(f => { const b = val[f.k]; let ok = true; if (f.must === 'same') ok = b === f.a; else if (f.must === 'diff') ok = b !== f.a; rows[f.k].cb.classList.toggle('diff', !ok); rows[f.k].ca.classList.toggle('diff', !ok); if (!ok) bad.push(f); });
      if (!bad.length) { res.className = 'fb ok'; res.innerHTML = '✅ <b>נוצרת שכנות (Adjacency)!</b> כל התנאים התקיימו.'; if (val.prio !== '1') res.innerHTML += ' שימו לב: ה-Priority שונה – וזה בסדר גמור.'; }
      else { res.className = 'fb no'; res.innerHTML = '❌ <b>לא תהיה שכנות.</b><ul style="margin:4px 0">' + bad.map(f => `<li><b>${f.n}</b>: ${f.must === 'same' ? 'חייב להיות זהה בשני הצדדים' : 'חייב להיות שונה בין השכנים'}</li>`).join('') + '</ul>'; }
    }
    host.append(el('div.wbox', el('h3', { text: '🧪 מעבדת השכנות' }), el('div.muted', { text: 'שנו את הערכים של נתב B ובדקו מתי נוצרת שכנות.' })), el('div.wbox', grid), res); eval1();
  }

  function ridWidget(host) {
    const st = { man: '', lo: true, ifs: [{ n: 'Fa0/0', ip: '192.168.1.1', up: true }, { n: 'Gi0/1', ip: '172.16.5.9', up: true }, { n: 'Se1/0', ip: '10.0.0.200', up: false }], loIp: '1.1.1.1' };
    const out = el('div.wbox'), list = el('div'); const man = el('input', { type: 'text', placeholder: 'למשל 9.9.9.9', style: { width: '130px' } });
    function calc() {
      let rid, why;
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(st.man.trim())) { rid = st.man.trim(); why = '1️⃣ הוגדר <b>ידנית</b> (router-id) – יש לו עדיפות על הכול.'; }
      else if (st.lo) { rid = st.loIp; why = '2️⃣ אין הגדרה ידנית → נבחרת הכתובת <b>הגבוהה ביותר של Loopback</b> (גם אם היא נמוכה משל ממשקים פיזיים).'; }
      else { const act = st.ifs.filter(i => i.up).sort((a, b) => OG.ip2n(b.ip) - OG.ip2n(a.ip)); rid = act.length ? act[0].ip : '0.0.0.0'; why = '3️⃣ אין Loopback → הכתובת <b>הגבוהה ביותר מבין הממשקים הפיזיים הפעילים</b>.'; }
      out.innerHTML = `<div class="wlabel">Router-ID שנבחר:</div><div class="bigval">${rid}</div><div>${why}</div>`;
    }
    const render = () => {
      list.innerHTML = '';
      st.ifs.forEach(i => list.append(el('div.wrow', el('button.btn.small' + (i.up ? '.good' : '.danger'), { text: i.up ? 'UP' : 'DOWN', onclick() { i.up = !i.up; render(); } }), el('code', { text: i.n }), el('code', { text: i.ip }))));
      list.append(el('div.wrow', el('button.btn.small' + (st.lo ? '.good' : ''), { text: st.lo ? 'קיים' : 'אין', onclick() { st.lo = !st.lo; render(); } }), el('code', { text: 'Loopback0' }), el('code', { text: st.loIp })));
      calc();
    };
    man.oninput = () => { st.man = man.value; calc(); };
    host.append(el('div.wbox', el('h3', { text: '🆔 איך נבחר ה-Router-ID?' }), el('div.muted', { html: 'הפעילו/כבו ממשקים ו-Loopback, והוסיפו Router-ID ידני – ותראו מה נבחר. סדר קדימות: <b>ידני › Loopback גבוה › IP פיזי פעיל גבוה</b>.' })), el('div.wbox', list, el('div.wrow', { style: { marginTop: '8px' } }, el('span.wlabel', { text: 'router-id ידני:' }), man)), out); render();
  }

  OG.lessons.ch3 = {
    steps: [
      {
        title: 'הודעות Hello – "אני חי!"',
        html: `<div class="callout story">⚓ ברוכים הבאים לנמל ה-Hello. קפטן Hello: "כל ספינה אומרת שלום כל 10 שניות. 40 שניות בלי שלום – אנחנו מצהירים שהיא טבעה."</div>
          <p>הודעות <b>Hello</b> אומרות לשכן: "אני עדיין חי וקיים ופעיל". ב-OSPF הן גם נושאות <b>זהות</b> – פרטים על הנתב. בעזרתן נוצרות <b>יחסי שכנות</b> (Adjacency) והן נשלחות ל-Multicast <code>224.0.0.5</code>.</p>
          <p>ברירת מחדל: <b>Hello = 10 שניות, Dead = 40 שניות</b>.</p>`,
        scene(S) {
          S.node('R1', 150, 200, { label: 'R1' }); S.node('R2', 650, 200, { label: 'R2' }); S.link('R1', 'R2', { label: '224.0.0.5', lo: -22 });
          S.note('cnt', 260, 290, '<div class="tt">⏱️ זמן מאז ה-Hello האחרון של R2</div><div class="bigval" id="c1" style="font-size:30px">0s</div><div style="height:12px;background:#0b1230;border-radius:6px;overflow:hidden"><i id="b1" style="display:block;height:100%;width:0;background:linear-gradient(90deg,#34d399,#fbbf24,#ef4444)"></i></div><div id="m1" class="muted" style="margin-top:4px">Dead interval = 40s</div>', { w: 280, cls: 'c' });
          const upd = (s) => { const c = S.items.cnt.d.querySelector('#c1'), b = S.items.cnt.d.querySelector('#b1'); if (c) { c.textContent = Math.round(s) + 's'; b.style.width = Math.min(100, s / 40 * 100) + '%'; } };
          S.at(.4, S => { S.packet('R2', 'R1', { label: 'Hello', color: '#34d399', dur: 1.3 }); S.packet('R1', 'R2', { label: 'Hello', color: '#22d3ee', dur: 1.3 }); });
          S.at(2.2, S => S.tween(1.6, p => upd(p * 10), 'lin'));
          S.at(3.8, S => { S.packet('R2', 'R1', { label: 'Hello', color: '#34d399', dur: 1.3 }); S.tween(.3, p => upd(10 * (1 - p)), 'lin'); });
          S.at(5.6, S => { S.linkDown('R1', 'R2'); S.mark('R2', '#fb7185'); S.say('R1', 'לא שומע Hello מ-R2…', { w: 150, dy: 90, cls: 'y', dur: 2 }); });
          S.at(6, S => S.tween(4, p => upd(p * 40), 'lin'));
          S.at(10.2, S => { S.down('R2'); S.say('R1', 'Dead timer נגמר ➜ R2 נחשב מת ✖', { w: 190, dy: 90, cls: 'r', dur: 3 }); });
        }
      },
      {
        title: 'מה יש בתוך הודעת Hello?',
        html: `<p>הודעת Hello היא ממש "תעודת זהות" של הנתב. לחצו על כל שדה כדי להבין מה הוא עושה.</p>
          <div class="callout tip">💡 חלק מהשדות חייבים להיות <b>זהים</b> בין שני השכנים, וחלק – כמו Priority – לא.</div>`,
        widget: helloAnatomy
      },
      {
        title: 'תנאים ליצירת שכנות',
        html: `<p>כדי שיווצרו יחסי שכנות בין שני פורטים, <b>אלה חייבים להיות זהים</b>:</p>
          <ul><li>⏱️ זמני Hello / Dead</li><li>🌐 הרשת ומסכת הרשת</li><li>🏷️ Area ID</li><li>🔑 סיסמת האימות (אם יש)</li><li>🧩 סוג ה-Stub</li></ul>
          <p>ו<b>אלה חייבים להיות שונים</b>: <b>כתובת ה-IP</b> ו-<b>Router-ID</b>.</p>
          <p>נסו בעצמכם בנתב B – גלו מה שובר את השכנות.</p>`,
        widget: helloMatcher
      },
      {
        title: 'בדיקת הבנה #1',
        html: '<p>איזה פרט אינו חייב להתאים?</p>',
        check: { q: 'איזה מהשדות הבאים <b>לא</b> חייב להיות זהה בין שני נתבים כדי שיווצרו ביניהם יחסי שכנות?', opts: ['Area ID', 'Hello / Dead interval', 'Router Priority', 'מסכת הרשת'], a: 2, why: 'Priority משמש רק לבחירת DR/BDR, ומותר שיהיה שונה. כל השאר חייבים להתאים.', fb: { 0: 'Area ID חייב להתאים.', 1: 'הטיימרים חייבים להתאים.', 3: 'שני הצדדים חייבים להיות באותה רשת ובאותה מסכה.' } }
      },
      {
        title: 'Router-ID – תעודת הזהות',
        html: `<p>ב-OSPF כל נתב מזוהה במספר ייחודי: <b>Router-ID</b>. הוא נראה כמו כתובת IPv4, ומשמש לזיהוי, לבחירת DR/BDR ולשמירת מידע בטבלאות.</p>
          <p>סדר הקדימות:</p><ol><li>הגדרה ידנית <code>router-id 1.1.1.1</code></li><li>כתובת ה-IP הגבוהה ביותר של ממשק <b>Loopback</b></li><li>כתובת ה-IP הגבוהה ביותר של ממשק <b>פיזי פעיל</b></li></ol>
          <div class="callout warn">⚠️ Router-ID חייב להיות שונה בין שני שכנים (נתבים שאינם שכנים יכולים אפילו להיות בעלי אותו ID).</div>`,
        widget: ridWidget
      },
      {
        title: 'בדיקת הבנה #2',
        html: '<p>חישבו על סדר הקדימות.</p>',
        check: { q: 'לנתב יש Fa0/0 = 192.168.1.1, Gi0/1 = 172.16.5.9, ו-Loopback0 = 1.1.1.1, ולא הוגדר router-id. מה ה-Router-ID?', opts: ['192.168.1.1 (הגבוה ביותר)', '172.16.5.9', '1.1.1.1 – ה-Loopback', 'אין Router-ID'], a: 2, why: 'Loopback קודם לכתובות פיזיות, גם אם הוא נמוך יותר מספרית.', fb: { 0: 'IP פיזי נבחר רק אם אין Loopback.' } }
      },
      {
        title: 'תרגיל: הגדרת Router-ID בפועל',
        html: '<p>עכשיו אתם על הנתב. הקלידו את הפקודות. אפשר לקצר פקודות כרגיל. 💡 לחצו "רמז" אם נתקעתם.</p>',
        widget(host, ctx) {
          OG.W.cliTask(host, { title: '⌨️ הגדרת Router-ID', intro: 'הגדירו תהליך OSPF מספר 1 ובו Router-ID ידני.', tasks: [
            { prompt: 'R1(config)#', ask: 'הפעילו תהליך OSPF עם מספר תהליך 1', ok: [/^router ospf 1$/, /^rou(ter)? os(pf)? 1$/], hint: 'router ospf 1', show: 'router ospf 1' },
            { prompt: 'R1(config-router)#', ask: 'הגדירו Router-ID ידני: 1.1.1.1', ok: [/^router-id 1\.1\.1\.1$/, /^router-i(d)? 1\.1\.1\.1$/], hint: 'router-id 1.1.1.1', show: 'router-id 1.1.1.1' },
            { prompt: 'R1#', ask: 'הציגו את טבלת השכנים של OSPF', ok: [/^sh(ow)? ip ospf nei(ghbor)?s?$/, /^sh ip ospf neigh(bor)?$/], hint: 'show ip ospf neighbor', show: 'show ip ospf neighbor', echo: 'Neighbor ID     Pri   State           Dead Time   Address         Interface\n2.2.2.2           1   FULL/BDR        00:00:32    192.168.12.2    FastEthernet0/0' }
          ] }, ctx);
        }
      },
      {
        title: 'בדיקת הבנה #3',
        html: '<p>מה נדרש כדי שהשכנות תיווצר?</p>',
        check: { q: 'שני נתבים מחוברים ישירות. אצל אחד Hello=10 ואצל השני Hello=5 (Dead=20). מה יקרה?', opts: ['הם יהפכו לשכנים כי ה-Dead גדול מה-Hello', 'לא תיווצר שכנות – הטיימרים חייבים להיות זהים', 'השכנות תיווצר אבל תתנתק תוך שניות', 'ייבחר הטיימר הנמוך יותר אוטומטית'], a: 1, why: 'Hello ו-Dead חייבים להיות זהים. בעיית טיימרים היא סיבה קלאסית ל"אין שכנות".' }
      },
      {
        title: 'סיכום הפרק',
        html: `<div class="callout story">⚓ הקפטן: "מצוין! עכשיו אתם יודעים מי נכנס לנמל. בואו נבדוק את זה בקבלת הפנים – <b>בקרת הגבולות</b>!"</div>
          <ul><li>Hello כל 10ש׳, Dead 40ש׳, ל-<code>224.0.0.5</code>.</li><li>חייבים להתאים: Hello/Dead, רשת+מסכה, Area ID, סיסמת אימות, סוג Stub.</li><li>חייבים להיות שונים: IP ו-Router-ID.</li><li>Router-ID: ידני › Loopback גבוה › IP פיזי פעיל גבוה.</li></ul>`,
        scene(S) { S.node('R1', 200, 200, { label: 'R1', sub: 'RID 1.1.1.1' }); S.node('R2', 600, 200, { label: 'R2', sub: 'RID 2.2.2.2' }); S.link('R1', 'R2', { label: 'FULL ✔', lo: -20 }); S.at(.5, S => { S.packet('R1', 'R2', { label: 'Hello', color: '#22d3ee' }); S.packet('R2', 'R1', { label: 'Hello', color: '#34d399' }); }); }
      }
    ]
  };

  OG.quizzes.ch3 = [
    { q: 'כל כמה זמן נשלחות הודעות Hello וכמה זמן הוא ה-Dead ב-Ethernet כברירת מחדל?', opts: ['Hello 30 / Dead 120', 'Hello 10 / Dead 40', 'Hello 5 / Dead 10', 'Hello 40 / Dead 10'], a: 1, why: 'ברירת המחדל ב-Broadcast ו-Point-to-Point: 10 ו-40.' },
    { q: 'לאיזו כתובת Multicast נשלחות הודעות Hello?', opts: ['224.0.0.5', '224.0.0.6', '255.255.255.255', '224.0.0.9'], a: 0, why: '224.0.0.5 – כל נתבי ה-OSPF (224.0.0.6 הוא לנתבי DR/BDR).' },
    { q: 'איזה תנאי <b>חייב להיות שונה</b> בין שני שכנים?', opts: ['Area ID', 'Router-ID', 'מסכת רשת', 'Hello interval'], a: 1, why: 'Router-ID (וכתובת ה-IP) חייבים להיות שונים.' },
    { q: 'ב-OSPF Router-ID נקבע לפי הסדר הבא:', opts: ['IP פיזי › Loopback › ידני', 'ידני › Loopback › IP פיזי גבוה פעיל', 'Loopback › ידני › IP נמוך', 'תמיד 0.0.0.0'], a: 1, why: 'ידני, אחר כך Loopback גבוה, ואז IP פיזי פעיל גבוה.' },
    { q: 'שני נתבים מחוברים: אצל אחד Area 0 ואצל השני Area 1 על אותו קו. מה יקרה?', opts: ['שכנות רגילה', 'לא תיווצר שכנות – Area ID חייב להיות זהה', 'הם יהפכו ל-ABR', 'ייווצר DR'], a: 1, why: 'Area ID הוא אחד מהשדות שחייבים להתאים.' },
    { q: 'מה תפקיד שדה ה-Neighbors בהודעת Hello?', opts: ['מציג את השכנים שהנתב שמע מהם – כך יודעים שיש תקשורת דו-כיוונית', 'מציג את ה-DR', 'מציין את מהירות הממשק', 'אין לו תפקיד'], a: 0, why: 'כשנתב רואה את ה-Router-ID שלו ברשימת השכנים של השני – יש קשר דו-כיווני.' },
    { q: 'איזו בעיה תמנע שכנות?', opts: ['Priority שונה', 'מסכת רשת שונה', 'שמות נתבים שונים', 'Process ID שונה'], a: 1, why: 'מסכה (רשת) חייבת להתאים. Priority ו-Process ID יכולים להיות שונים.' },
    { q: 'ה-Dead interval הוא…', opts: ['הזמן שאחריו נתב נחשב מת אם לא התקבל ממנו Hello', 'הזמן בין שני Hello', 'מספר ה-LSA המקסימלי', 'זמן בחירת DR'], a: 0, why: 'ברירת מחדל 40 שניות – פי 4 מה-Hello.' }
  ];
})(window.OG);
