/* Chapter 4 – OSPF cost, reference bandwidth, bandwidth cmd, ip ospf cost, path cost, ECMP */
(function (OG) {
  const { el } = OG;
  const costOf = (ref, bw) => Math.max(1, Math.floor(ref / bw));
  const spd = m => m >= 1000 ? (m / 1000) + 'G' : m + 'M';

  function costCalc(host) {
    const st = { ref: 100, bw: 100 }; const out = el('div.wbox'), tbl = el('div.wbox');
    const selRef = el('select', { onchange() { st.ref = +selRef.value; render(); } }, [100, 1000, 10000, 100000].map(v => el('option', { value: v, text: v + ' Mb/s' + (v === 100 ? ' (ברירת מחדל)' : '') })));
    const selBw = el('select', { onchange() { st.bw = +selBw.value; render(); } }, [10, 100, 1000, 10000].map(v => el('option', { value: v, text: spd(v) + 'b/s' })));
    selBw.value = '100';
    function render() {
      const c = costOf(st.ref, st.bw);
      out.innerHTML = `<div class="wlabel">Cost = Reference BW ÷ Interface BW</div><div class="bigval" style="font-size:28px">${st.ref} ÷ ${st.bw} = ${(st.ref / st.bw).toFixed(st.ref / st.bw < 1 ? 2 : 0)} ⟶ <span style="color:#fbbf24">${c}</span></div><div class="muted">${st.ref / st.bw < 1 ? 'התוצאה קטנה מ-1 – ב-OSPF העלות המינימלית היא <b>1</b>.' : 'מעוגל כלפי מטה למספר שלם.'}</div>`;
      const speeds = [10, 100, 1000, 10000]; const costs = speeds.map(s => costOf(st.ref, s));
      const dup = costs.some((c, i) => i && c === costs[i - 1]);
      tbl.innerHTML = `<b>כל המהירויות עם Reference = ${st.ref}:</b><table style="width:100%;margin-top:6px;border-collapse:collapse;text-align:center">${'<tr>' + speeds.map(s => `<th style="border:1px solid #2b3a6e;padding:4px">${spd(s)}</th>`).join('') + '</tr><tr>' + costs.map((c, i) => `<td style="border:1px solid #2b3a6e;padding:6px;font-size:20px;font-family:var(--mono);${i && c === costs[i - 1] ? 'background:rgba(251,113,133,.25)' : 'background:rgba(52,211,153,.18)'}">${c}</td>`).join('') + '</tr>'}</table><div class="fb ${dup ? 'no' : 'ok'}" style="margin-top:8px">${dup ? '⚠️ יש מהירויות שונות עם <b>אותה עלות</b> – OSPF לא מבחין ביניהן!' : '✅ לכל מהירות עלות שונה – OSPF "מבין" את ההבדלים.'}</div>`;
    }
    host.append(el('div.wbox', el('h3', { text: '🧮 מחשבון העלות' }), el('div.wrow', el('span.wlabel', { text: 'Reference Bandwidth:' }), selRef, el('span.wlabel', { text: 'מהירות הממשק:' }), selBw)), out, tbl); render();
  }

  function costTopo(S, o = {}) {
    S.node('R1', 150, 190, { label: 'R1' }); S.node('R2', 650, 190, { label: 'R2' });
    S.link('R1', 'R2', { id: 'fe', label: 'FastEthernet 100M', bend: -120 }); S.link('R1', 'R2', { id: 'ge', label: 'Gigabit 1000M', bend: 120 });
  }

  OG.lessons.ch4 = {
    steps: [
      {
        title: 'Cost – המחיר של כל כביש',
        html: `<div class="callout story">📈 "בבורסה כל כביש מקבל מחיר", אומר הסוחר. "וכמו בכל בורסה – <b>זול = טוב</b>."</div>
          <p>OSPF משתמש ב<b>עלות (Cost)</b> כדי לדרג מסלולים. העלות נגזרת ממהירות הפורט (רוחב הפס). <b>ככל שה-Cost נמוך יותר – הנתיב שווה יותר.</b></p>
          <p>אלו העלויות כברירת מחדל. ראו מה מוזר בטבלה 🤔</p>`,
        scene(S) {
          S.table('t', 100, 50, { w: 600, fs: 16, head: ['סוג הממשק', 'המהירות', 'עלות (Cost)'], rows: [['Ethernet', '10 Mb/s', '10'], ['FastEthernet', '100 Mb/s', '1'], ['GigabitEthernet', '1000 Mb/s', '1'], ['10Gig', '10000 Mb/s', '1']] });
          S.at(1.5, S => { S.rowCls('t', 1, 'bad'); S.rowCls('t', 2, 'bad'); S.rowCls('t', 3, 'bad'); S.note('w', 100, 280, '⚠️ מ-FastEthernet והלאה – העלות <b>זהה (1)</b>! הפרוטוקול ישן ונוצר בזמן שהמהירות הגבוהה ביותר הייתה 100Mb/s.', { w: 600, cls: 'y' }); });
        }
      },
      {
        title: 'איך מחשבים Cost?',
        html: `<p>העלות מחושבת כ-<b>"ייחוס רוחב הפס" (Reference Bandwidth) חלקי מהירות הפורט</b>. ברירת המחדל: Reference = <code>100 Mb/s</code>.</p>
          <ul><li>100 ÷ 100 = <b>1</b></li><li>100 ÷ 10 = <b>10</b></li></ul>
          <p>שנו את ה-Reference ותראו איך העלויות משתנות. אפשר <b>לשלוט ברמת הרגישות למהירויות</b>.</p>`,
        widget: costCalc
      },
      {
        title: 'שינוי ה-Reference Bandwidth',
        html: `<p>כדי ש-OSPF יבחין בין FastEthernet ל-Gigabit, מגדילים את ה-Reference:</p>
          <div class="cli"><span class="pr">Router(config)#</span> router ospf 1\n<span class="pr">Router(config-router)#</span> <span class="hl">auto-cost reference-bandwidth 1000</span></div>
          <p>כך נקבע Reference = 1000Mb/s: FastEthernet יקבל <b>10</b>, ו-Gigabit <b>1</b>.</p>
          <div class="callout warn">⚠️ מומלץ להגדיר <b>אותו ערך בכל הנתבים</b> – אחרת כל נתב מחשב אחרת.</div>`,
        scene(S) {
          costTopo(S);
          S.note('cmd', 20, 372, '<div class="cli" style="margin:0;font-size:11.5px">R1(config-router)# auto-cost reference-bandwidth 1000</div>', { w: 330, cls: 'c', hidden: true });
          S.note('c1', 330, 78, '<b>cost 1</b>', { w: 140, cls: 'y', align: 'center' }); S.note('c2', 330, 262, '<b>cost 1</b>', { w: 140, cls: 'y', align: 'center' });
          S.note('warn', 340, 372, '⚠️ שני הקווים באותה עלות – OSPF לא יעדיף את ה-Gigabit', { w: 350, cls: 'r' });
          S.at(2.5, S => { S.show('warn', false); S.show('cmd', true); });
          S.at(4, S => { S.setNote('c1', '<b>cost 10</b>'); S.setNote('c2', '<b>cost 1</b>'); S.items.c1.d.className = 'fo fo-note g'; S.items.c2.d.className = 'fo fo-note g'; S.links.ge.line.setAttribute('stroke', '#34d399'); S.links.ge.line.setAttribute('stroke-width', 7); S.note('ok', 340, 372, '✅ עכשיו OSPF מעדיף את ה-Gigabit (1 < 10)', { w: 350, cls: 'g' }); S.packet('R1', 'R2', { label: 'OSPF', color: '#34d399', dur: 2, lift: 60 }); });
        }
      },
      {
        title: 'שינוי רוחב הפס של ממשק (bandwidth)',
        html: `<p>אפשר לשנות את ה"רוחב פס" של הממשק – <b>אבל זה לא משנה את המהירות האמיתית!</b> המהירות תלויה בכבל ובחשמל. מה שמשתנה הוא <b>ההתייחסות של פרוטוקול הניתוב</b>.</p>
          <div class="cli"><span class="pr">Router(config)#</span> interface fa0/0\n<span class="pr">Router(config-if)#</span> <span class="hl">bandwidth 1000000</span></div>
          <div class="callout warn">⚠️ ביחידות של <b>Kb/s</b> ולא Mb/s! 1000Mb/s = <code>1000000</code> Kb/s.</div>`,
        scene(S) {
          S.node('R1', 150, 160, { label: 'R1', sub: 'fa0/0' }); S.node('R2', 650, 160, { label: 'R2' }); S.link('R1', 'R2', { label: 'כבל אמיתי: 100 Mb/s', lo: -20 });
          S.note('real', 270, 250, '<div class="tt">⚡ המהירות האמיתית</div><div class="bigval" style="font-size:26px">100 Mb/s</div>', { w: 240, cls: 'c' });
          S.note('ospf', 270, 340, '<div class="tt">🧠 מה OSPF חושב</div><div class="bigval" style="font-size:26px;color:#fbbf24" id="bwv">100 Mb/s</div>', { w: 240, cls: 'y' });
          S.note('cmd', 20, 250, '<div class="cli" style="margin:0;font-size:12px">R1(config-if)# bandwidth 1000000</div>', { w: 245, hidden: true });
          S.at(2, S => { S.show('cmd', true); });
          S.at(3.2, S => { S.items.ospf.d.querySelector('#bwv').textContent = '1000 Mb/s'; S.say('R1', 'OSPF חושב שיש 1Gb – אבל הכבל עדיין 100!', { w: 220, dy: 100, cls: 'y', dur: 4 }); });
        }
      },
      {
        title: 'שינוי ה-Cost ישירות',
        html: `<p>אפשר גם לקבוע את העלות <b>ידנית</b>, לערך שאנחנו רוצים:</p>
          <div class="cli"><span class="pr">Router(config)#</span> interface gi0/0/0\n<span class="pr">Router(config-if)#</span> <span class="hl">ip ospf cost 20</span></div>
          <p>זה עוקף כל חישוב. שימושי כדי "לכוון" תנועה למסלול מסוים.</p>
          <div class="callout tip">💡 סיכום – שלוש דרכים להשפיע על Cost: <b>reference-bandwidth</b>, <b>bandwidth</b> של ממשק, ו-<b>ip ospf cost</b>.</div>`,
        scene(S) {
          costTopo(S);
          S.note('c1', 330, 78, '<b>cost 10</b>', { w: 140, cls: 'y', align: 'center' }); S.note('c2', 330, 262, '<b>cost 1</b>', { w: 140, cls: 'g', align: 'center' });
          S.note('cmd', 20, 372, '<div class="cli" style="margin:0;font-size:11.5px">R1(config)# interface gi0/0/0\nR1(config-if)# ip ospf cost 20</div>', { w: 310, hidden: true });
          S.at(1.5, S => S.show('cmd', true));
          S.at(3, S => { S.setNote('c2', '<b>cost 20</b>'); S.items.c2.d.className = 'fo fo-note r'; S.note('res', 340, 372, '🔀 עכשיו ה-FastEthernet (10) זול יותר מה-Gigabit (20)', { w: 340, cls: 'c' }); S.links.fe.line.setAttribute('stroke', '#fbbf24'); S.links.fe.line.setAttribute('stroke-width', 7); });
        }
      },
      {
        title: 'בדיקת הבנה #1',
        html: '<p>תרגיל יחידות – מלכודת נפוצה!</p>',
        check: { q: 'אתם רוצים לגרום ל-OSPF להתייחס לפורט כאל Gigabit (1000Mb/s) באמצעות הפקודה <code>bandwidth</code>. איזה ערך תכתבו?', opts: ['bandwidth 1000', 'bandwidth 1000000', 'bandwidth 1', 'bandwidth 1000000000'], a: 1, why: 'הפקודה bandwidth ביחידות של Kb/s: 1000Mb/s = 1,000,000Kb/s.', fb: { 0: 'זה 1Mb/s (1000Kb/s). היחידות הן Kb/s.' } }
      },
      {
        title: 'עלות נתיב – מחברים את פורטי היציאה',
        html: `<p>כדי לחשב את העלות הכוללת לרשת יעד – <b>מחברים את העלויות של פורטי היציאה</b> עד שמגיעים לרשת.</p>
          <p>דוגמה מהחומר: R2 רוצה להגיע לרשת <code>192.168.13.0</code>.</p><ul><li>דרך R3: Fa1/0 (1) + Fa של R3 (1) = <b>2</b></li><li>דרך R1: E0/0 (10) + Fa של R1 (1) = <b>11</b></li></ul>
          <p>הנתיב הזול (2) נכנס לטבלת הניתוב.</p>`,
        scene(S) {
          S.node('R2', 400, 80, { label: 'R2' }); S.node('R1', 150, 230, { label: 'R1' }); S.node('R3', 650, 230, { label: 'R3' }); S.node('N', 400, 355, { type: 'lan', label: '192.168.13.0', ly: 4 });
          S.link('R2', 'R3', { ea: 'Fa1/0', ebt: .9, eb: 'cost 1', eat: .2 }); S.link('R2', 'R1', { ea: 'E0/0', eat: .2, eb: 'cost 10', ebt: .8 });
          S.link('R1', 'N', { label: 'cost 1', lt: .5 }); S.link('R3', 'N', { label: 'cost 1', lt: .5 });
          S.note('sum', 20, 20, '<div class="tt">🧮 סכום עלויות</div><div class="bigval" id="sv" style="font-size:28px">0</div>', { w: 170, cls: 'c' });
          const setSum = (v) => { S.items.sum.d.querySelector('#sv').textContent = v; };
          S.at(1, S => { S.mark('R2', '#fbbf24'); S.trace(['R2', 'R1', 'N'], { color: '#fb7185', dur: 2.2 }); S.packet(['R2', 'R1', 'N'], null, { label: '10+1', color: '#fb7185', dur: 3 }); setTimeout(() => setSum(10), 800); S.tween(3, p => { const v = p < .55 ? 10 : 11; setSum(v); }); });
          S.at(5, S => { S.clearTraces(); S.trace(['R2', 'R3', 'N'], { color: '#34d399', dur: 2.2 }); S.packet(['R2', 'R3', 'N'], null, { label: '1+1', color: '#34d399', dur: 3 }); S.tween(3, p => setSum(p < .55 ? 1 : 2)); });
          S.at(8.8, S => { S.note('res', 440, 20, '✅ <b>2 &lt; 11</b> – המסלול דרך R3 נכנס לטבלה', { w: 330, cls: 'g' }); S.badge('R3', '✔', { bg: '#059669' }); });
        }
      },
      {
        title: 'בדיקת הבנה #2',
        html: '<p>חשבו את עלות כל מסלול.</p>',
        check: { q: 'ל-R2 שני מסלולים לרשת 192.168.100.0: דרך R1 – יציאה מ-E0/0 (10), אחר כך 1, ואז 1. דרך R3 – יציאה 1 ואז 1. מה בוחר OSPF?', opts: ['דרך R1 – עלות 12', 'דרך R3 – עלות 2', 'שניהם – איזון עומסים', 'דרך R1 כי יש בו פחות קפיצות'], a: 1, why: '10+1+1 = 12 לעומת 1+1 = 2. הנמוך מנצח. OSPF לא סופר קפיצות אלא Cost.', fb: { 0: 'זו העלות של המסלול היקר.', 2: 'איזון עומסים רק כשהעלויות זהות.' } }
      },
      {
        title: 'איזון עומסים (Load Balancing)',
        html: `<p>כשיש כמה מסלולים עם <b>אותה עלות בדיוק</b> – OSPF מכניס את כולם לטבלת הניתוב ומחלק ביניהם את התנועה. כברירת מחדל <b>עד 4</b> מסלולים שווים.</p>
          <div class="cli"><span class="pr">Router(config)#</span> router ospf 1\n<span class="pr">Router(config-router)#</span> <span class="hl">maximum-paths 7</span></div>
          <p>אפשר להגדיר בין <b>1 ל-32</b>.</p>`,
        scene(S) {
          S.node('R1', 120, 190, { label: 'R1' }); S.node('A', 400, 80, { label: 'R2' }); S.node('B', 400, 300, { label: 'R3' }); S.node('R4', 680, 190, { label: 'R4' });
          S.link('R1', 'A', { label: 'cost 1', lo: -18 }); S.link('A', 'R4', { label: 'cost 1', lo: -18 }); S.link('R1', 'B', { label: 'cost 1', lo: 18 }); S.link('B', 'R4', { label: 'cost 1', lo: 18 });
          S.table('rt', 250, 355, { w: 300, title: 'R1: טבלת הניתוב', ltr: true, head: ['Net', 'Via', 'Cost'], rows: [{ c: ['LAN', 'R2', '2'], hidden: true }, { c: ['LAN', 'R3', '2'], hidden: true }] });
          S.at(1, S => { S.rowShow('rt', 0); S.rowShow('rt', 1); S.rowCls('rt', 0, 'win'); S.rowCls('rt', 1, 'win'); S.show('rt', true); });
          for (let i = 0; i < 4; i++) S.at(1.5 + i * 1.6, S => { S.packet(['R1', i % 2 ? 'B' : 'A', 'R4'], null, { label: 'P' + (i + 1), color: i % 2 ? '#a78bfa' : '#22d3ee', dur: 2.4 }); });
        }
      },
      {
        title: 'בדיקת הבנה #3',
        html: '<p>איזון עומסים הוא "שווה בדיוק".</p>',
        check: { q: 'מתי OSPF יכניס כמה מסלולים לאותה רשת בטבלת הניתוב (איזון עומסים)?', opts: ['כשהם עם אותו מספר קפיצות', 'כשהעלות הכוללת שלהם זהה', 'תמיד', 'כשה-AD שלהם שונה'], a: 1, why: 'רק עלות כוללת זהה. ברירת מחדל עד 4 מסלולים, ואפשר לשנות עם maximum-paths (1–32).', fb: { 0: 'OSPF לא סופר קפיצות.' } }
      },
      {
        title: 'סיכום הפרק',
        html: `<div class="callout story">📈 הסוחר: "עכשיו אתם יודעים לתמחר כל כביש. בואו למרוץ: מי ימצא את המסלול הזול ביותר?"</div>
          <ul><li>Cost = Reference BW ÷ Interface BW (ברירת מחדל Ref=100). מינימום 1.</li><li>שינוי: <code>auto-cost reference-bandwidth</code> (Mb/s), <code>bandwidth</code> (Kb/s, לא משנה מהירות אמיתית), <code>ip ospf cost</code>.</li><li>עלות נתיב = סכום עלויות פורטי היציאה.</li><li>עלות שווה → איזון עומסים (עד 4 כברירת מחדל, <code>maximum-paths</code> 1–32).</li></ul>`,
        scene(S) { costTopo(S); S.links.ge.line.setAttribute('stroke', '#34d399'); S.links.ge.line.setAttribute('stroke-width', 7); }
      }
    ]
  };

  OG.quizzes.ch4 = [
    { q: 'כברירת מחדל, מה ה-Reference Bandwidth של OSPF?', opts: ['10 Mb/s', '100 Mb/s', '1000 Mb/s', '10000 Mb/s'], a: 1, why: 'ברירת המחדל 100Mb/s.' },
    { q: 'מה העלות של פורט 10Mb/s אם Reference=100?', opts: ['1', '10', '100', '0'], a: 1, why: '100 ÷ 10 = 10.' },
    { q: 'מה העלות של פורט 1000Mb/s עם Reference ברירת מחדל (100)?', opts: ['0.1', '1', '10', '0'], a: 1, why: 'התוצאה 0.1 מעוגלת ל-1 – העלות המינימלית. לכן FastEthernet ו-Gigabit זהים.' },
    { q: 'איזו פקודה משנה את ה-Reference Bandwidth?', opts: ['bandwidth 1000', 'ip ospf cost 1000', 'auto-cost reference-bandwidth 1000', 'maximum-paths 1000'], a: 2, why: 'auto-cost reference-bandwidth בתוך router ospf.' },
    { q: 'הפקודה <code>bandwidth</code> בממשק משנה…', opts: ['את המהירות הפיזית האמיתית', 'רק את ההתייחסות של פרוטוקול הניתוב למהירות', 'את ה-Router-ID', 'את מספר האזור'], a: 1, why: 'המהירות האמיתית נקבעת בכבל/חשמל. הפקודה משפיעה רק על חישוב העלות.' },
    { q: 'כמה Mb/s הם <code>bandwidth 100000</code>?', opts: ['100,000', '100', '10', '1000'], a: 1, why: 'היחידות בפקודה הן Kb/s: 100,000Kb/s = 100Mb/s.' },
    { q: 'כמה מסלולים שווים נכנסים לטבלת הניתוב כברירת מחדל?', opts: ['1', '2', '4', '16'], a: 2, why: 'עד 4. מגדירים עם maximum-paths (1–32).' },
    { q: 'איך מחושבת העלות הכוללת של מסלול?', opts: ['לוקחים את העלות הגבוהה ביותר', 'מחברים את העלויות של פורטי היציאה', 'מכפילים', 'סופרים קפיצות'], a: 1, why: 'סכום עלויות פורטי היציאה לאורך הדרך.' }
  ];
})(window.OG);
