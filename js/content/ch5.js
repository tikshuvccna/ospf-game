/* Chapter 5 – Wildcard masks, router ospf, network, passive-interface, default route, loopback */
(function (OG) {
  const { el } = OG;
  const okIp = s => /^(\d{1,3}\.){3}\d{1,3}$/.test(s.trim()) && s.trim().split('.').every(x => +x < 256);

  function wildConverter(host) {
    const maskIn = el('input', { type: 'text', value: '255.255.255.192', style: { width: '170px' } });
    const wIn = el('input', { type: 'text', value: '0.0.0.7', style: { width: '170px' } });
    const out1 = el('div.wbox'), out2 = el('div.wbox');
    const octs = (a) => a.split('.').map(Number);
    function r1() {
      let v = maskIn.value.trim(); if (/^\/?\d{1,2}$/.test(v)) v = OG.prefix2mask(+v.replace('/', ''));
      if (!okIp(v)) { out1.innerHTML = '<span class="muted">הקלידו מסכה (למשל 255.255.255.192 או /26)</span>'; return; }
      const o = octs(v), w = o.map(x => 255 - x);
      out1.innerHTML = `<div class="ltr" style="font-family:var(--mono);line-height:1.9"><div>255 . 255 . 255 . 255</div><div style="border-bottom:2px solid #fff;display:inline-block">− ${o.join(' . ')}</div><div style="color:#fbbf24;font-size:22px;font-weight:900">= ${w.join(' . ')}</div></div>`;
    }
    function r2() {
      const v = wIn.value.trim(); if (!okIp(v)) { out2.innerHTML = '<span class="muted">הקלידו Wildcard (למשל 0.0.0.7)</span>'; return; }
      const o = octs(v), m = o.map(x => 255 - x);
      out2.innerHTML = `<div class="ltr" style="font-family:var(--mono);line-height:1.9"><div>255 . 255 . 255 . 255</div><div style="border-bottom:2px solid #fff;display:inline-block">− ${o.join(' . ')}</div><div style="color:#34d399;font-size:22px;font-weight:900">= ${m.join(' . ')}</div></div>`;
    }
    maskIn.oninput = r1; wIn.oninput = r2;
    host.append(el('div.wbox', el('h3', { text: '🔄 ממיר Mask ↔ Wildcard' }), el('div.muted', { html: 'שיטת ההמרה: <b>255.255.255.255 פחות</b> הערך – לא משנה אם מתחילים ממסכה או מ-Wildcard.' })),
      el('div.wbox', el('div.wrow', el('b', { text: 'מסכת רשת ➜ Wildcard' }), maskIn), out1), el('div.wbox', el('div.wrow', el('b', { text: 'Wildcard ➜ מסכת רשת' }), wIn), out2),
      el('div.callout.info', { html: 'כל <b>0</b> ב-Wildcard = "חייב להתאים", וכל <b>255</b> = "לא אכפת לי". לכן המסכה <code>255.255.255.0</code> הופכת ל-<code>0.0.0.255</code>.' })); r1(); r2();
  }

  function netMatcher(host) {
    const ifs = [['Fa0/0', '192.168.23.2'], ['Fa1/0', '192.168.23.200'], ['Gi0/1', '192.168.24.1'], ['Se2/0', '10.0.0.1']];
    const net = el('input', { type: 'text', value: '192.168.23.0', style: { width: '150px' } }), wc = el('input', { type: 'text', value: '0.0.0.255', style: { width: '150px' } });
    const list = el('div'), res = el('div.fb');
    const presets = [['192.168.23.0', '0.0.0.255', 'כל הרשת /24'], ['192.168.23.2', '0.0.0.0', 'ממשק ספציפי'], ['192.168.0.0', '0.0.255.255', 'כל 192.168.x.x'], ['0.0.0.0', '255.255.255.255', 'הכול']];
    function render() {
      list.innerHTML = ''; const n = net.value.trim(), w = wc.value.trim();
      if (!okIp(n) || !okIp(w)) { res.className = 'fb no'; res.textContent = 'הקלידו כתובת ו-Wildcard תקינים.'; return; }
      let cnt = 0;
      ifs.forEach(([nm, ip]) => { const hit = OG.inWild(ip, n, w); if (hit) cnt++; list.append(el('div.wrow', { style: { padding: '4px 0' } }, el('span.pill.' + (hit ? 'g' : 'r'), { text: hit ? 'OSPF פעיל ✔' : 'לא מופעל' }), el('code', { text: nm }), el('code', { text: ip }))); });
      res.className = 'fb ' + (cnt ? 'ok' : 'no'); res.innerHTML = cnt ? `הפקודה <code>network ${n} ${w} area 0</code> מפעילה OSPF על <b>${cnt}</b> ממשקים. הרשת שלהם תפורסם והם ישלחו Hello.` : 'אף ממשק לא תואם – OSPF לא יופעל באף פורט.';
    }
    net.oninput = render; wc.oninput = render;
    host.append(el('div.wbox', el('h3', { text: '🎯 פקודת network – מי נתפס ברשת?' }), el('div.muted', { text: 'הנתב מפעיל OSPF על כל ממשק שכתובת ה-IP שלו נמצאת בטווח שהוגדר.' }), el('div.wrow', { style: { marginTop: '8px' } }, el('code', { text: 'network' }), net, wc, el('code', { text: 'area 0' })), el('div.row', { style: { marginTop: '6px' } }, presets.map(([a, b, t]) => el('button.btn.small', { text: t, onclick() { net.value = a; wc.value = b; render(); } })))), el('div.wbox', list), res); render();
  }

  OG.lessons.ch5 = {
    steps: [
      {
        title: 'Wildcard Mask – ההפוך של המסכה',
        html: `<div class="callout story">🔐 שומרת הכספת: "הקוד נפתח רק עם Wildcard נכון. אל תתבלבלו – הוא הפוך מהמסכה."</div>
          <p>כדי לסמן <b>טווח כתובות</b> בפרוטוקולי ניתוב דינמי (OSPF, EIGRP) וגם ברשימות גישה, משתמשים ב-<b>Wildcard Bitmask</b>. זה דומה למסכת רשת – אבל <b>בדיוק הפוך</b>: 255 במסכה הופך ל-0, ו-0 הופך ל-255.</p>
          <ul><li><code>255.255.255.0</code> ➜ <code>0.0.0.255</code></li><li><code>255.255.0.0</code> ➜ <code>0.0.255.255</code></li><li><code>255.0.0.0</code> ➜ <code>0.255.255.255</code></li></ul>`,
        widget: wildConverter
      },
      {
        title: 'המרה ברשת מסובנטת',
        html: `<p>ברשת מסובנטת, למשל <code>255.255.255.192</code>: לוקחים <code>255.255.255.255</code> ו<b>מחסירים</b> את המסכה:</p>
          <div class="cli">255.255.255.255 − 255.255.255.192 = <span class="hl">0.0.0.63</span></div>
          <p>וגם בכיוון ההפוך: Wildcard <code>0.0.0.7</code> ➜ <code>255.255.255.255 − 0.0.0.7</code> = <code>255.255.255.248</code>.</p>
          <div class="callout tip">💡 קיצור: בכל אוקטט – <b>255 פחות הערך</b>. תרגלו בממיר שמשמאל, ואחר כך במשחקון!</div>`,
        scene(S) {
          S.table('t', 130, 40, { w: 540, fs: 16, ltr: true, head: ['Subnet mask', 'Wildcard', 'Prefix'], rows: [['255.255.255.0', '0.0.0.255', '/24'], ['255.255.255.128', '0.0.0.127', '/25'], ['255.255.255.192', '0.0.0.63', '/26'], ['255.255.255.224', '0.0.0.31', '/27'], ['255.255.255.240', '0.0.0.15', '/28'], ['255.255.255.248', '0.0.0.7', '/29'], ['255.255.255.252', '0.0.0.3', '/30']].map(r => ({ c: r, hidden: true })) });
          for (let i = 0; i < 7; i++) S.at(.4 + i * .9, S => { S.rowShow('t', i); S.rowCls('t', i, 'hl'); if (i) S.rowCls('t', i - 1, ''); });
        }
      },
      {
        title: 'router ospf ו-network – הפעלת OSPF',
        html: `<p>מפעילים את התהליך (מספר תהליך 1 – בדרך כלל):</p>
          <div class="cli"><span class="pr">R2(config)#</span> router ospf 1\n<span class="pr">R2(config-router)#</span> <span class="hl">network 192.168.23.0 0.0.0.255 area 0</span></div>
          <p>הפקודה <code>network</code> בעצם <b>מפעילה את הפורטים</b> ששייכים לטווח: הם ישלחו ויקבלו עדכוני OSPF ויפרסמו את הרשת שלהם. לחצו ▶.</p>`,
        scene(S) {
          S.node('R2', 400, 190, { label: 'R2', size: 1.2 });
          const P = [['Fa0/0', '192.168.23.2', 130, 80], ['Fa1/0', '192.168.12.1', 130, 300], ['Gi0/1', '10.0.0.1', 680, 190]];
          P.forEach(([n, ip, x, y], i) => { S.node('P' + i, x, y, { type: 'dot', label: n, size: .9 }); S.link('R2', 'P' + i, { ea: ip, eat: .78 }); });
          S.note('cmd', 20, 380, '<div class="cli" style="margin:0;font-size:12.5px">R2(config-router)# network 192.168.23.0 0.0.0.255 area 0</div>', { w: 470, hidden: true });
          S.at(1, S => S.show('cmd', true));
          S.at(2.5, S => { S.mark('P0', '#34d399'); S.note('m', 480, 380, '✅ 192.168.23.2 בטווח → Fa0/0 מופעל', { w: 300, cls: 'g' }); });
          S.at(3.5, S => { S.packet('R2', 'P0', { label: 'Hello', color: '#22d3ee', dur: 1.4 }); });
          S.at(4.2, S => { S.dim('P1'); S.dim('P2'); });
        }
      },
      {
        title: 'מי נתפס? שחקו עם הפקודה',
        html: `<p>הנתב בודק <b>כל ממשק</b>: האם כתובת ה-IP שלו מתאימה ל-Network + Wildcard? אם כן – הממשק משתתף ב-OSPF באזור שצוין.</p>
          <ul><li>אפשר להפעיל פורט ספציפי: <code>network 192.168.23.2 0.0.0.0 area 0</code></li><li>ב-Multi-Area רושמים בכל פקודה לאיזה אזור הרשת שייכת – כך ABR מחבר שני אזורים.</li><li><b>דרך שנייה (חדשה יותר):</b> להפעיל ישירות על הממשק: <code>interface gi0/1</code> ואז <code>ip ospf 1 area 0</code> – בלי פקודת network.</li></ul>`,
        widget: netMatcher
      },
      {
        title: 'בדיקת הבנה #1',
        html: '<p>חשבו על הטווח של ה-Wildcard.</p>',
        check: { q: 'מה תפעיל הפקודה <code>network 192.168.23.0 0.0.0.255 area 0</code>?', opts: ['רק הממשק 192.168.23.0', 'כל ממשק שכתובתו בטווח 192.168.23.0–192.168.23.255', 'כל הממשקים בנתב', 'רק ממשקים ב-Area 1'], a: 1, why: 'ה-Wildcard 0.0.0.255 משמעותו: שלושת האוקטטים הראשונים חייבים להתאים, האחרון חופשי.', fb: { 0: 'הכתובת 192.168.23.0 היא כתובת הרשת, והיא תופסת את כל הטווח.' } }
      },
      {
        title: 'הודעת השכנות',
        html: `<p>אחרי ששני הצדדים הפעילו את הפורטים, וה-Hello תואמים – תתקיים שכנות ותופיע הודעה כזאת בקונסול:</p>
          <div class="cli"><span class="hl">R2# %OSPF-5-ADJCHG: Process 1, Nbr 192.168.23.3 on FastEthernet1/0 from LOADING to FULL, Loading Done</span></div>
          <p>זה אומר שהשכנות הגיעה למצב <b>FULL</b>. ננתח את השלבים בחבילת ה-EXTRA 🙂</p>`,
        scene(S) {
          S.node('R2', 160, 160, { label: 'R2' }); S.node('R3', 640, 160, { label: 'R3' }); S.link('R2', 'R3', { label: '192.168.23.0/24', lo: -20 });
          S.note('log', 60, 290, '<div class="cli" style="margin:0;font-size:12px;white-space:normal">R2# %OSPF-5-ADJCHG: Process 1, Nbr 192.168.23.3 on FastEthernet1/0 from LOADING to FULL, Loading Done</div>', { w: 680, hidden: true });
          S.at(.5, S => { S.packet('R2', 'R3', { label: 'Hello', color: '#22d3ee', dur: 1.4 }); S.packet('R3', 'R2', { label: 'Hello', color: '#34d399', dur: 1.4 }); });
          S.at(3, S => { S.packet('R2', 'R3', { label: 'LSA', shape: 'emoji', emoji: '🧩', color: '#fbbf24', dur: 1.4 }); S.packet('R3', 'R2', { label: 'LSA', shape: 'emoji', emoji: '🧩', color: '#fbbf24', dur: 1.4 }); });
          S.at(5, S => { S.show('log', true); S.mark('R2', '#34d399'); S.mark('R3', '#34d399'); });
        }
      },
      {
        title: 'passive-interface – לא מדברים עם העובדים',
        html: `<p>ממשק שמחובר לרשת פנימית (עובדים, מחשבים) – <b>לא רוצים</b> ששם יצאו הודעות OSPF: הן מיותרות, ו<b>האקר</b> יכול להקשיב להן, ואפילו ליצור שכנות ולהשפיע על הניתובים.</p>
          <div class="cli"><span class="pr">Router(config-router)#</span> <span class="hl">passive-interface gi0/1</span></div>
          <p>הממשק הפסיבי <b>לא שולח Hello</b> – אין שכנות. אבל הרשת שלו עדיין <b>מפורסמת</b> לשאר הנתבים.</p>`,
        scene(S) {
          S.node('R1', 160, 190, { label: 'R1' }); S.node('R2', 160, 60, { label: 'R2' }); S.node('SW', 460, 190, { type: 'switch', label: 'LAN' }); S.node('H', 640, 100, { type: 'person', label: 'האקר', emoji: '🥷', stroke: '#fb7185' }); S.node('PC', 640, 290, { type: 'pc', label: 'עובד' });
          S.link('R1', 'R2', { label: 'Gi0/0', lo: -22 }); S.link('R1', 'SW', { label: 'Gi0/1' }); S.link('SW', 'H'); S.link('SW', 'PC');
          S.at(.5, S => { S.packet('R1', 'R2', { label: 'Hello', color: '#22d3ee', dur: 1.2 }); S.packet(['R1', 'SW', 'H'], null, { label: 'Hello', color: '#fb7185', dur: 2.4 }); });
          S.at(3.2, S => { S.say('H', 'קיבלתי עדכוני ניתוב! 😈', { cls: 'r', dy: 90, w: 170, dur: 2.5 }); });
          S.at(6, S => { S.note('cmd', 20, 330, '<div class="cli" style="margin:0;font-size:12px">R1(config-router)# passive-interface gi0/1</div>', { w: 360 }); S.badge('SW', '🔇', { bg: '#475569' }); });
          S.at(7, S => { S.packet('R1', 'R2', { label: 'Hello', color: '#22d3ee', dur: 1.2 }); S.packet(['R1', 'SW'], null, { label: 'Hello', color: '#fb7185', dur: 1.2, then: S => { S.say('SW', '✖ נחסם', { dy: 70, w: 90, cls: 'r', dur: 2 }); } }); });
        }
      },
      {
        title: 'passive-interface default – הגישה הבטוחה',
        html: `<p>להגברת אבטחה אפשר להפוך <b>את כל הממשקים</b> לפסיביים כברירת מחדל, ואז להפעיל באופן ספציפי רק את אלו שצריך:</p>
          <div class="cli"><span class="pr">Router(config-router)#</span> passive-interface default\n<span class="pr">Router(config-router)#</span> no passive-interface gi0/0</div>
          <p>וכדי לבדוק אילו ממשקים פסיביים: <code>show ip protocols</code>.</p>`,
        scene(S) {
          S.node('R', 400, 190, { label: 'R1', size: 1.2 });
          [['gi0/0', 130, 90, true], ['gi0/1', 130, 290, false], ['gi0/2', 670, 90, false], ['gi0/3', 670, 290, false]].forEach(([n, x, y, act], i) => { S.node('i' + i, x, y, { type: 'dot', label: n, size: .9 }); S.link('R', 'i' + i); });
          S.note('c1', 20, 360, '<div class="cli" style="margin:0;font-size:12px">R1(config-router)# passive-interface default</div>', { w: 330, hidden: true });
          S.at(1, S => { S.show('c1', true); [0, 1, 2, 3].forEach(i => { S.glow('i' + i, false); S.badge('i' + i, '🔇', { bg: '#475569', dx: 20, dy: -20 }); }); });
          S.at(3.5, S => { S.note('c2', 390, 360, '<div class="cli" style="margin:0;font-size:12px">R1(config-router)# no passive-interface gi0/0</div>', { w: 350 }); S.mark('i0', '#34d399'); S.packet('R', 'i0', { label: 'Hello', color: '#22d3ee', dur: 1.4 }); });
        }
      },
      {
        title: 'בדיקת הבנה #2',
        html: '<p>למה מגדירים פסיבי?</p>',
        check: { q: 'מה קורה לרשת המחוברת לממשק שהוגדר <code>passive-interface</code>?', opts: ['היא נעלמת מהפרסום', 'הממשק לא שולח Hello (אין שכנות), אבל הרשת עדיין מפורסמת', 'הממשק נכבה', 'הממשק הופך ל-DR'], a: 1, why: 'ב-OSPF passive חוסם Hello (ולכן לא נוצרת שכנות), אך הרשת עצמה ממשיכה להיות מפורסמת.', fb: { 0: 'הרשת עדיין מפורסמת – רק ה-Hello נעצרים.' } }
      },
      {
        title: 'הפצת ניתוב ברירת מחדל',
        html: `<p>הנתב שמוציא החוצה מהרשת (לאינטרנט) מקבל ניתוב ברירת מחדל סטטי, ואז <b>מפרסם</b> אותו לשאר הנתבים דרך OSPF:</p>
          <div class="cli"><span class="pr">Router(config)#</span> ip route 0.0.0.0 0.0.0.0 192.168.100.1\n<span class="pr">Router(config)#</span> router ospf 1\n<span class="pr">Router(config-router)#</span> <span class="hl">default-information originate</span></div>
          <p>מילת האופציה <code>always</code> מפרסמת את הנתיב גם אם עוד לא הוגדר סטטי. בטבלת הניתוב של השאר יופיע <code>O*E2</code> (נלמד מבחוץ – External). ויש גם <code>redistribute static</code> כהזרקה רגילה.</p>`,
        scene(S) {
          S.node('ISP', 700, 190, { type: 'cloud', label: 'אינטרנט' }); S.node('R1', 520, 190, { label: 'R1 (גבול)' }); S.node('R2', 320, 190, { label: 'R2' }); S.node('R3', 120, 190, { label: 'R3' });
          S.link('ISP', 'R1', { label: '192.168.100.1', lo: -20 }); S.link('R1', 'R2'); S.link('R2', 'R3');
          S.note('c1', 330, 300, '<div class="cli" style="margin:0;font-size:12px">R1(config)# ip route 0.0.0.0 0.0.0.0 192.168.100.1</div>', { w: 410, hidden: true });
          S.note('c2', 330, 350, '<div class="cli" style="margin:0;font-size:12px">R1(config-router)# default-information originate</div>', { w: 410, hidden: true });
          S.table('rt', 20, 270, { w: 290, ltr: true, title: 'R3: show ip route', head: ['', 'Route'], rows: [{ c: ['O*E2', '0.0.0.0/0 via R2'], hidden: true }] });
          S.at(.8, S => S.show('c1', true)); S.at(2.2, S => S.show('c2', true));
          S.at(3.5, S => S.flood('R1', { label: '0.0.0.0/0', color: '#f472b6', hop: 1.1, skip: n => n === 'ISP' }));
          S.at(6.5, S => { S.rowShow('rt', 0); S.rowCls('rt', 0, 'win'); });
        }
      },
      {
        title: 'ממשק Loopback – ממשק וירטואלי',
        html: `<p><b>Loopback</b> הוא ממשק לוגי בלבד – לא קשור לפורט פיזי. שימושים:</p>
          <ul><li>🏙️ <b>יצירת רשתות וכתובות מרובות</b> בלי לחבר ציוד: <code>interface loopback 0</code> + <code>ip address 1.1.1.1 255.255.255.0</code></li><li>🩺 <b>בדיקת תקינות</b>: פינג ללופבק מוכיח שהנתב עצמו חי גם אם ממשק פיזי נפל.</li><li>🆔 מקור ל-Router-ID יציב.</li></ul>
          <div class="callout tip">💡 אפשר להגדיר מסכה <code>255.255.255.255</code> (/32). בחרו כתובות קלות לזכירה: R1 ➜ 1.1.1.1.</div>`,
        scene(S) {
          S.node('R1', 250, 190, { label: 'R1' }); S.node('T', 640, 190, { type: 'pc', label: 'בודק' }); S.link('R1', 'T', { label: 'Gi0/0', lo: -20 });
          S.node('L0', 90, 90, { type: 'dot', label: 'Lo0 1.1.1.1', ly: 44, stroke: '#a78bfa', size: .9 }); S.node('L1', 90, 190, { type: 'dot', label: 'Lo1 2.2.2.2', ly: 44, stroke: '#a78bfa', size: .9 }); S.node('L2', 90, 290, { type: 'dot', label: 'Lo2 3.3.3.3', ly: 44, stroke: '#a78bfa', size: .9 });
          ['L0', 'L1', 'L2'].forEach(l => S.link('R1', l, { dashed: true, color: '#a78bfa' }));
          S.at(1, S => S.packet(['T', 'R1', 'L0'], null, { label: 'ping 1.1.1.1', color: '#a78bfa', dur: 2.6 }));
          S.at(4.5, S => { S.linkDown('R1', 'T'); S.say('R1', 'ממשק פיזי נפל', { cls: 'r', dy: 90, w: 130, dur: 2 }); });
          S.at(6.5, S => { S.say('L1', 'אבל הנתב עצמו חי – ה-Loopback עונה לפינג ✅', { cls: 'g', dy: 100, w: 220, dx: 90, dur: 3.5 }); S.mark('L1', '#34d399'); });
        }
      },
      {
        title: 'תרגיל: מגדירים OSPF מאפס',
        html: '<p>הגדירו OSPF על נתב R2 לפי הסדר. בכל משימה יש רמז.</p>',
        widget(host, ctx) {
          OG.W.cliTask(host, { title: '⌨️ מעבדת הגדרות OSPF', intro: 'הנתב R2 מחובר לרשת 192.168.23.0/24 (Area 0) ולרשת העובדים בממשק gi0/1.', tasks: [
            { prompt: 'R2(config)#', ask: 'הפעילו OSPF – תהליך 1', ok: [/^router ospf 1$/], hint: 'router ospf 1', show: 'router ospf 1' },
            { prompt: 'R2(config-router)#', ask: 'פרסמו את הרשת 192.168.23.0 עם Wildcard מתאים ל-/24 באזור 0', ok: [/^network 192\.168\.23\.0 0\.0\.0\.255 area 0$/], hint: 'network 192.168.23.0 0.0.0.255 area 0', show: 'network 192.168.23.0 0.0.0.255 area 0' },
            { prompt: 'R2(config-router)#', ask: 'ממשק gi0/1 פונה לעובדים – הפכו אותו לפסיבי', ok: [/^passive-interface (gi|gigabitethernet) ?0\/1$/], hint: 'passive-interface gi0/1', show: 'passive-interface gi0/1' },
            { prompt: 'R2(config-router)#', ask: 'פרסמו ברירת מחדל לשאר הנתבים', ok: [/^default-information originate( always)?$/], hint: 'default-information originate', show: 'default-information originate' },
            { prompt: 'R2(config-if)#', ask: 'בדרך החלופית: על ממשק gi0/2 (אחרי interface gi0/2) הפעילו OSPF תהליך 1 באזור 0 ישירות', ok: [/^ip ospf 1 area 0$/], hint: 'ip ospf 1 area 0', show: 'ip ospf 1 area 0' },
            { prompt: 'R2(config)#', ask: 'צרו ממשק Loopback מספר 0', ok: [/^int(erface)? loopback ?0$/, /^int(erface)? lo ?0$/], hint: 'interface loopback 0', show: 'interface loopback 0' },
            { prompt: 'R2(config-if)#', ask: 'תנו לו כתובת 2.2.2.2 עם מסכה 255.255.255.255', ok: [/^ip address 2\.2\.2\.2 255\.255\.255\.255$/, /^ip add 2\.2\.2\.2 255\.255\.255\.255$/], hint: 'ip address 2.2.2.2 255.255.255.255', show: 'ip address 2.2.2.2 255.255.255.255' }
          ] }, ctx);
        }
      },
      {
        title: 'סיכום הפרק',
        html: `<div class="callout story">🔐 שומרת הכספת: "הכספת פתוחה. עכשיו – תפרצו אותה במשחקון!"</div>
          <ul><li>Wildcard = 255.255.255.255 פחות המסכה (0 = חייב להתאים).</li><li><code>router ospf 1</code> + <code>network [net] [wildcard] area [n]</code>.</li><li><code>passive-interface</code> חוסם Hello אך מפרסם את הרשת; <code>passive-interface default</code> + <code>no passive-interface</code>.</li><li>ברירת מחדל: <code>ip route 0.0.0.0 0.0.0.0 …</code> + <code>default-information originate</code>.</li><li>Loopback: ממשק לוגי לבדיקות, רשתות ו-Router-ID.</li></ul>`,
        scene(S) { S.node('V', 400, 190, { type: 'emoji', emoji: '🔐', fs: 100 }); }
      }
    ]
  };

  OG.quizzes.ch5 = [
    { q: 'מהו ה-Wildcard של מסכת הרשת 255.255.255.0?', opts: ['255.0.0.0', '0.0.0.255', '0.0.255.255', '0.255.255.255'], a: 1, why: '255.255.255.255 − 255.255.255.0 = 0.0.0.255.' },
    { q: 'מהו ה-Wildcard של 255.255.255.192?', opts: ['0.0.0.192', '0.0.0.63', '0.0.0.31', '0.0.0.64'], a: 1, why: '255 − 192 = 63.' },
    { q: 'איזה מסכת רשת מתאימה ל-Wildcard 0.0.0.7?', opts: ['255.255.255.240', '255.255.255.248', '255.255.255.252', '255.255.255.224'], a: 1, why: '255.255.255.255 − 0.0.0.7 = 255.255.255.248.' },
    { q: 'איזו פקודה מפעילה את OSPF על הממשקים בטווח 192.168.23.0/24?', opts: ['network 192.168.23.0 255.255.255.0 area 0', 'network 192.168.23.0 0.0.0.255 area 0', 'network 192.168.23.0/24 area 0', 'ip ospf 192.168.23.0'], a: 1, why: 'בפקודת network משתמשים ב-Wildcard ולא במסכת רשת.' },
    { q: 'מה עושה <code>passive-interface gi0/1</code>?', opts: ['חוסם Hello ביציאה מהממשק – אין שכנות דרכו', 'מכבה את הממשק', 'מחליף את ה-Router-ID', 'מפיל את כל ה-OSPF'], a: 0, why: 'הממשק לא שולח Hello ולכן לא נוצרת שכנות, אך הרשת שלו מפורסמת.' },
    { q: 'איזו פקודה מפיצה ניתוב ברירת מחדל סטטי לשאר הנתבים ב-OSPF?', opts: ['ip route 0.0.0.0 0.0.0.0', 'default-information originate', 'passive-interface default', 'redistribute connected'], a: 1, why: 'default-information originate (עם ip route 0.0.0.0 … על הנתב היוצא).' },
    { q: 'איך מסומן בטבלת הניתוב ניתוב ברירת מחדל שנלמד ב-OSPF?', opts: ['O*E2', 'C', 'S*', 'R'], a: 0, why: 'O*E2 – נלמד ב-OSPF כ-External, והכוכבית מסמנת ברירת מחדל.' },
    { q: 'מה היתרון של ממשק Loopback?', opts: ['הוא ממשק לוגי שתמיד "למעלה" – טוב לבדיקות, לרשתות וירטואליות ול-Router-ID', 'הוא מהיר יותר מפורט פיזי', 'הוא מחליף את ה-Wildcard', 'הוא חובה ל-OSPF'], a: 0, why: 'ממשק לוגי בלבד, אינו תלוי בפורט פיזי.' }
  ];
})(window.OG);
