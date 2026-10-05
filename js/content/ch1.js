/* Chapter 1 – Static vs Dynamic routing, DV vs LS, AD, longest prefix */
(function (OG) {
  const { el } = OG;

  function topo(S, o = {}) {
    S.node('PCA', 55, 225, { type: 'pc', label: 'PC-A', sub: '192.168.1.10' });
    S.node('R1', 185, 225, { label: 'R1' });
    S.node('R2', 385, 105, { label: 'R2' });
    S.node('R4', 385, 345, { label: 'R4' });
    S.node('R3', 585, 225, { label: 'R3' });
    S.node('PCC', 735, 225, { type: 'pc', label: 'PC-C', sub: '192.168.3.10' });
    S.link('PCA', 'R1'); S.link('R1', 'R2'); S.link('R2', 'R3'); S.link('R1', 'R4', o.dashB ? { dashed: true } : {}); S.link('R4', 'R3', o.dashB ? { dashed: true } : {});
  }

  function adWidget(host) {
    const SRC = [['C', 'ממשק מחובר (Connected)', 0, '#9ca3af'], ['S', 'ניתוב סטטי', 1, '#fb923c'], ['D', 'EIGRP פנימי', 90, '#a78bfa'], ['O', 'OSPF', 110, '#34d399'], ['R', 'RIP', 120, '#fbbf24']];
    const on = { C: false, S: false, D: false, O: true, R: true }; let staticAD = 1;
    const box = el('div.wbox', el('h3', { text: '⚔️ זירת ה-AD: מי מנצח?' }), el('div.muted', { html: 'כמה פרוטוקולים מלמדים את הנתב על אותה רשת <code>10.0.0.0/24</code>. סמנו מי "מדבר" ותראו מי נכנס לטבלת הניתוב. <b>ככל שה-AD נמוך יותר – כך ה"אמינות" גבוהה יותר.</b>' }));
    const list = el('div'); const res = el('div.cli'); const sl = el('input', { type: 'range', min: 1, max: 255, value: 1 }); const slv = el('b.ltr', { text: '1' });
    const kill = el('button.btn.small.danger', { text: '💥 הפילו את המנצח' });
    function render() {
      list.innerHTML = '';
      SRC.forEach(([k, n, ad, c]) => {
        const real = k === 'S' ? staticAD : ad;
        const b = el('button.opt', { html: `<span style="color:${c};font-weight:900">${k}</span> &nbsp; ${n} &nbsp; <span class="pill y ltr">AD ${real}</span> ${on[k] ? '✅' : ''}`, onclick() { on[k] = !on[k]; render(); } });
        if (on[k]) b.style.borderColor = c; list.append(b);
      });
      const act = SRC.filter(s => on[s[0]]).map(s => ({ k: s[0], ad: s[0] === 'S' ? staticAD : s[2], n: s[1] })).sort((a, b) => a.ad - b.ad);
      if (!act.length) res.innerHTML = '<span class="dim">אין מסלול לרשת 10.0.0.0/24 – הנתב לא יודע להגיע לשם (Network unreachable).</span>';
      else {
        const w = act[0];
        res.innerHTML = act.map((a, i) => i === 0 ? `<span class="hl">${a.k}  10.0.0.0/24 [${a.ad}/…] via 10.1.1.${i + 1}   ◀ נכנס לטבלת הניתוב</span>` : `<span class="dim">${a.k}  10.0.0.0/24 [${a.ad}/…]   (נדחה – AD גבוה יותר)</span>`).join('\n');
        kill.disabled = false; kill.onclick = () => { on[w.k] = false; OG.snd.play('bad'); render(); };
      }
      if (!act.length) kill.disabled = true;
    }
    sl.oninput = () => { staticAD = +sl.value; slv.textContent = sl.value; render(); };
    host.append(box, el('div.wbox', list), el('div.wbox', el('div.wrow', el('span.wlabel', { html: 'שנו את ה-AD של הסטטי (<b>Floating Static</b>):' }), sl, slv), el('div.muted', { html: 'מגדירים כך: <code>ip route 10.0.0.0 255.255.255.0 10.1.1.1 200</code> – הסטטי הופך לגיבוי שנכנס רק כשהכול נופל.' })), res, el('div.row', kill));
    render();
  }

  function lpmWidget(host) {
    const R = [['D', 'EIGRP', '192.168.32.0', 26, '[90/25789217]', '10.1.1.1'], ['R', 'RIP', '192.168.32.0', 24, '[120/4]', '10.1.1.2'], ['O', 'OSPF', '192.168.32.0', 19, '[110/229840]', '10.1.1.3']];
    const inp = el('input', { type: 'text', value: '192.168.32.1', style: { width: '170px' } }); const out = el('div.cli'); const ex = el('div.callout.info');
    function render() {
      const ip = inp.value.trim(); const ok = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && ip.split('.').every(x => +x < 256);
      if (!ok) { out.textContent = 'הקלידו כתובת IPv4 תקינה, למשל 192.168.32.77'; ex.innerHTML = ''; return; }
      const m = R.filter(r => OG.inNet(ip, r[2], r[3])); const best = m.sort((a, b) => b[3] - a[3])[0];
      out.innerHTML = R.map(r => { const hit = OG.inNet(ip, r[2], r[3]); const line = `${r[0]}   ${r[2]}/${r[3]} ${r[4]} via ${r[5]}`; return best && r === best ? `<span class="hl">${line}   ◀ נבחר</span>` : hit ? `${line}   ✔ תואם` : `<span class="dim">${line}   ✘ לא תואם</span>`; }).join('\n');
      const last = ip.split('.')[3];
      ex.innerHTML = best ? `הכתובת <b class="ltr">${ip}</b> תואמת ל-${m.length} מסלולים. הנתב בוחר את <b>התחילית הארוכה ביותר (/${best[3]})</b> – כלומר המסלול הספציפי ביותר – דרך ${best[1]}. <b>ה-AD בכלל לא משחק תפקיד</b> כי אלו רשתות שונות.` : `אף מסלול לא תואם – החבילה תיפול (Destination unreachable) אלא אם יש ברירת מחדל.`;
    }
    inp.oninput = render;
    const presets = ['192.168.32.1', '192.168.32.100', '192.168.40.5', '192.168.64.1'].map(p => el('button.btn.small', { text: p, onclick() { inp.value = p; render(); } }));
    host.append(el('div.wbox', el('h3', { text: '🎯 מלחמת התחיליות: Longest Prefix Match' }), el('div.muted', { text: 'כל שלושת המסלולים נמצאים בטבלה (תחיליות שונות = רשתות שונות). לאן תישלח החבילה?' }), el('div.wrow', el('span.wlabel', { text: 'כתובת יעד:' }), inp), el('div.row', presets)), out, ex);
    render();
  }

  OG.lessons.ch1 = {
    steps: [
      {
        title: 'ניתוב סטטי – המנהל כותב הכול בעצמו',
        html: `<div class="callout story">🏚️ ברוכים הבאים ל<b>העיר הסטטית</b>. כאן "סטטי סטן" מנהל הרשת כותב לכל נתב, ביד, איך להגיע לכל רשת.</div>
          <p>ב<b>ניתוב סטטי</b> מנהל הרשת מלמד בעצמו כל נתב כיצד להגיע לרשתות מרוחקות, בפקודות <code>ip route</code>.</p>
          <p>לחצו <b>▶</b> וראו מה קורה כשהכול עובד… ומה קורה כשלא.</p>`,
        scene(S) {
          topo(S, { dashB: true });
          S.node('ADM', 385, 225, { type: 'person', label: 'סטטי סטן', emoji: '🧓' });
          S.note('n1', 20, 20, '<b>🖊️ המנהל מגדיר ידנית בכל נתב:</b><br><code>ip route 192.168.3.0 … </code>', { w: 250, cls: 'y', hidden: true });
          S.at(.4, S => S.show('n1', true));
          const send = (t, ok = true) => S.at(t, S => S.packet(['PCA', 'R1', 'R2', 'R3', 'PCC'], null, { label: 'חבילה', color: '#34d399', dur: 3.4 }));
          send(1.2);
          S.at(4.8, S => S.say('PCC', 'הגעתי! ✅', { dur: 1.5, dy: 80 }));
          S.at(6.2, S => { S.linkDown('R2', 'R3'); S.show('n1', false); S.mark('R2', '#fb7185'); });
          S.at(6.8, S => S.packet(['PCA', 'R1', 'R2'], null, { label: 'חבילה', color: '#fb7185', dur: 2.2, then: S => { S.say('R2', 'הקו נפל! אין לי מסלול אחר ברשימה 😱', { w: 190, cls: 'r', dur: 3, dy: 90 }); } }));
          S.at(10, S => { S.note('n2', 20, 20, '🛠️ <b>התוצאה:</b> עד שהמנהל מגלה ומעדכן ידנית – הרשת מושבתת, גם אם קיים מסלול גיבוי דרך R4!', { w: 300, cls: 'r', hidden: true }); S.show('n2', true); S.mark('ADM', '#fbbf24'); });
        }
      },
      {
        title: 'ניתוב דינמי – הרשת מסתדרת לבד',
        html: `<p>ב<b>ניתוב דינמי</b> אנחנו רק <b>מפרסמים</b> את הרשתות שלנו, והפרוטוקול (RIP, OSPF, EIGRP…) מוצא לבד את הדרך לרשתות המרוחקות.</p>
          <p>עכשיו, כשהקו נופל – הנתבים <b>מגלים</b> זאת ו<b>מחשבים מחדש</b> אוטומטית. סטן יכול ללכת לשתות קפה ☕</p>`,
        scene(S) {
          topo(S);
          S.node('ADM', 385, 225, { type: 'person', label: 'סטן', emoji: '☕' });
          S.at(.3, S => { S.note('n1', 20, 20, '🔄 הנתבים מפרסמים אחד לשני את הרשתות שלהם', { w: 270, cls: 'g' }); });
          S.at(.6, S => { S.flood('R3', { label: 'Update', color: '#22d3ee', hop: 1 }); });
          S.at(4.5, S => S.packet(['PCA', 'R1', 'R2', 'R3', 'PCC'], null, { label: 'חבילה', color: '#34d399', dur: 3.2 }));
          S.at(8, S => { S.linkDown('R2', 'R3'); S.mark('R2', '#fb7185'); S.show('n1', false); S.note('n2', 20, 20, '⚡ הקו נפל – הנתבים מזהים ומחשבים מחדש…', { w: 290, cls: 'y' }); });
          S.at(9, S => S.flood('R2', { label: 'Update', color: '#fb7185', hop: .8 }));
          S.at(12, S => { S.mark('R2', null, false); S.trace(['R1', 'R4', 'R3'], { color: '#34d399' }); S.packet(['PCA', 'R1', 'R4', 'R3', 'PCC'], null, { label: 'חבילה', color: '#34d399', dur: 3.2 }); S.show('n2', false); S.note('n3', 20, 20, '✅ התאוששות אוטומטית דרך R4!', { w: 250, cls: 'g' }); });
        }
      },
      {
        title: 'סטטי מול דינמי – טבלת ההבדלים',
        html: `<p>כל גישה מתאימה למצב אחר. סטטי: פשוט וחסכוני (כמעט בלי עומס על הנתב). דינמי: חכם ומתאושש, אבל צורך זיכרון ומעבד.</p>
          <ul><li><b>רשת קטנה / קצה</b> – סטטי מספיק.</li><li><b>רשת גדולה עם כמה מסלולים</b> – דינמי.</li></ul>
          <div class="callout tip">💡 חכו שהשורות יופיעו אחת אחת – אפשר לעצור בכל רגע עם ⏸.</div>`,
        size: { w: 800, h: 430 },
        scene(S) {
          S.table('t', 20, 20, { w: 760, head: ['', '🏚️ ניתוב סטטי', '🔄 ניתוב דינמי'], fs: 15, rows: [
            { c: ['<b>הגדרה</b>', 'מוגדר ידנית ע"י מנהל הרשת', 'מפרסמים רשתות, והפרוטוקול מוצא לבד דרך לרשתות מרוחקות'], hidden: true },
            { c: ['<b>נפילה ברשת</b>', 'המנהל צריך להגדיר מחדש ולשקם בעצמו', 'מגלה את הנפילה ומשקם אוטומטית'], hidden: true },
            { c: ['<b>הנתיב הטוב ביותר</b>', 'המנהל מחשב ומגדיר בעצמו', 'הפרוטוקול מחשב לפי האלגוריתם שלו'], hidden: true },
            { c: ['<b>ניצול משאבים</b>', 'זיכרון נמוך, כמעט בלי מעבד', 'זיכרון ומעבד גבוהים יחסית: טבלאות ניתוב + טופולוגיה + חישובים'], hidden: true }] });
          for (let i = 0; i < 4; i++) S.at(.6 + i * 1.8, S => { S.rowShow('t', i, true); S.rowCls('t', i, 'hl'); if (i) S.rowCls('t', i - 1, ''); });
        }
      },
      {
        title: 'בדיקת הבנה #1',
        html: '<p>לפני שממשיכים – שאלה קטנה על מה שראיתם.</p>',
        check: { q: 'קו בין שני נתבים נפל, ויש מסלול גיבוי ברשת. מה יקרה בניתוב <b>סטטי</b> בלבד?', opts: ['הרשת תתאושש לבד תוך שניות', 'הנתבים ילמדו את המסלול החדש דרך הודעות Hello', 'התקשורת תישבר עד שמנהל הרשת יגדיר ידנית מסלול חלופי', 'הנתב יבחר אוטומטית את המסלול לפי AD'], a: 2, why: 'בניתוב סטטי אין "למידה" – מה שלא הוגדר ידנית לא קיים. לכן ברשתות גדולות משתמשים בדינמי.', fb: { 0: 'התאוששות אוטומטית היא יתרון של ניתוב <b>דינמי</b>.', 1: 'Hello שייכים לפרוטוקולי ניתוב דינמיים (כמו OSPF), לא לסטטי.' } }
      },
      {
        title: 'שתי משפחות: Distance Vector ו-Link-State',
        html: `<p>פרוטוקולי ניתוב דינמי מתחלקים לשני סוגים עיקריים:</p>
          <p>🗣️ <b>Distance Vector</b> – "שמועות": הנתב מקבל מהשכן <i>"אפשר להגיע לרשת X דרכי, במרחק 2 קפיצות"</i> ומאמין. אין לו מפה. דוגמה: <b>RIP</b>.</p>
          <p>🗺️ <b>Link-State</b> – "מפה": כל נתב מכיר את <b>כל הרשת</b>: נתבים, רשתות, קישורים ומהירויות. דוגמה: <b>OSPF</b>.</p>`,
        scene(S) {
          S.text('h1', 400, 28, 'Distance Vector – שמועות (RIP)', { color: '#fbbf24', fs: 18 });
          S.node('A1', 140, 120, { label: 'R1' }); S.node('A2', 400, 120, { label: 'R2' }); S.node('A3', 660, 120, { label: 'R3' });
          S.link('A1', 'A2'); S.link('A2', 'A3'); S.node('N3', 740, 120, { type: 'lan', label: '192.168.3.0', ly: 44 }); S.link('A3', 'N3');
          S.at(.6, S => S.packet('A3', 'A2', { label: '3.0 – 1 קפיצה', color: '#fbbf24', dur: 1.4, then: S => S.say('A2', '"שמעתי ש-R3 קרוב"', { dur: 1.5, w: 140, dy: 80, cls: 'y' }) }));
          S.at(2.8, S => S.packet('A2', 'A1', { label: '3.0 – 2 קפיצות', color: '#fbbf24', dur: 1.4, then: S => S.say('A1', 'אין לי מפה – רק שמועות!', { dur: 2.5, w: 150, dy: 80, cls: 'y' }) }));
          S.text('h2', 400, 250, 'Link-State – מפה מלאה (OSPF)', { color: '#34d399', fs: 18 });
          S.node('B1', 220, 340, { label: 'R1' }); S.node('B2', 400, 300, { label: 'R2' }); S.node('B3', 580, 340, { label: 'R3' }); S.node('B4', 400, 400, { label: 'R4' });
          S.link('B1', 'B2'); S.link('B2', 'B3'); S.link('B1', 'B4'); S.link('B4', 'B3');
          S.at(4.8, S => S.flood('B1', { shape: 'emoji', emoji: '🧩', label: 'LSA', color: '#34d399', hop: .9 }));
          S.at(7.8, S => { ['B1', 'B2', 'B3', 'B4'].forEach(id => S.badge(id, '🗺️', { bg: '#065f46', dx: 32, dy: -26 })); S.say('B3', 'לכולם יש מפה מלאה', { dur: 3, w: 140, dy: 80, cls: 'g' }); });
        }
      },
      {
        title: 'הבדלים בין Distance Vector ל-Link-State',
        html: `<p>RIP "סומך" על שמועות ומתחשב בעיקר ב<b>קפיצות</b>. OSPF בונה מפה ומתחשב ב<b>מהירות הקווים</b>, ולכן מתאושש טוב ומהר יותר.</p>
          <div class="callout info">ℹ️ <b>EIGRP</b> מכונה לפעמים "היברידי" – יש בו מאפיינים משני הסוגים. סיסקו מגדירה אותו כ-Distance Vector מתוחכם.</div>`,
        size: { w: 800, h: 430 },
        scene(S) {
          S.table('t', 20, 20, { w: 760, head: ['', '🗣️ Distance Vector', '🗺️ Link-State'], fs: 15, rows: [
            { c: ['<b>מה נשלח / נשמר</b>', 'רק מידע על רשתות יעד, בין שכנים', 'מידע על כל הרשת כולה'], hidden: true },
            { c: ['<b>שימוש במשאבים</b>', 'מינימלי: טבלת ניתוב + טופולוגיה קטנה', 'גדול יחסית: טבלת ניתוב + טופולוגיה מורחבת + חישובים'], hidden: true },
            { c: ['<b>יעילות</b>', 'סבירה – התאוששות איטית', 'גבוהה – התאוששות מהירה וטובה'], hidden: true },
            { c: ['<b>חישוב הנתיב</b>', 'בדרך כלל מספר קפיצות (hops)', 'שילוב מהירות הקווים (רוחב פס) ועוד גורמים'], hidden: true },
            { c: ['<b>דוגמה</b>', 'RIP', 'OSPF'], hidden: true }] });
          for (let i = 0; i < 5; i++) S.at(.6 + i * 1.6, S => { S.rowShow('t', i, true); S.rowCls('t', i, 'hl'); if (i) S.rowCls('t', i - 1, ''); });
        }
      },
      {
        title: 'בדיקת הבנה #2',
        html: '<p>איזה פרוטוקול בונה "מפה" של כל הרשת?</p>',
        check: { q: 'מה מייחד פרוטוקול <b>Link-State</b> כמו OSPF?', opts: ['הוא מקבל מהשכנים רק "שמועות" על מרחקים', 'כל נתב מחזיק מפה מלאה של הרשת ומחשב ממנה את הנתיב הטוב ביותר', 'הוא תמיד בוחר את המסלול עם מספר הקפיצות הנמוך ביותר', 'הוא לא צריך זיכרון ומעבד'], a: 1, why: 'המפה (LSDB) היא ליבת Link-State – ולכן הוא דורש יותר זיכרון ומעבד, אבל מתאושש מהר.', fb: { 0: 'זה בדיוק Distance Vector (למשל RIP).', 2: 'בחירה לפי קפיצות אופיינית ל-RIP. OSPF מתחשב במהירות (Cost).' } }
      },
      {
        title: 'Administrative Distance – מי נאמן יותר?',
        html: `<p>אם כמה שיטות ניתוב מלמדות על אותה רשת – למי הנתב מאמין? לכל שיטה יש <b>Administrative Distance (AD)</b>. <b>נמוך = אמין יותר = מנצח.</b></p>
          <p>ברירות מחדל: מחובר <code>0</code> · סטטי <code>1</code> · EIGRP <code>90</code> · OSPF <code>110</code> · RIP <code>120</code>.</p>
          <p>נסו בעצמכם: סמנו ובטלו שיטות, ושחקו עם ה-AD של הסטטי.</p>`,
        widget: adWidget
      },
      {
        title: 'Longest Prefix Match – הספציפי מנצח',
        html: `<p>ה-AD מכריע רק כשמדובר על <b>אותה רשת באותה תחילית</b>. אם התחיליות שונות – כל המסלולים נכנסים לטבלה.</p>
          <p>כשמגיעה חבילה, הנתב בוחר את המסלול עם <b>התחילית הארוכה ביותר</b> (המסכה הכי מדויקת) – גם אם ה-AD שלו גבוה יותר!</p>
          <div class="cli">D   192.168.32.0/26 [90/25789217] via 10.1.1.1
R   192.168.32.0/24 [120/4] via 10.1.1.2
O   192.168.32.0/19 [110/229840] via 10.1.1.3</div>`,
        widget: lpmWidget
      },
      {
        title: 'בדיקת הבנה #3',
        html: '<p>הטבלה מהשלב הקודם עדיין מולכם. נסו לענות בלי לגלול 🙂</p>',
        check: { q: 'בטבלה יש <code>192.168.32.0/26</code> (EIGRP), <code>/24</code> (RIP) ו-<code>/19</code> (OSPF). חבילה מגיעה ליעד <code>192.168.32.1</code>. לאן היא תישלח?', opts: ['דרך OSPF, כי ה-AD שלו (110) נמוך מ-RIP', 'דרך EIGRP, כי התחילית /26 היא הארוכה ביותר', 'דרך RIP, כי הוא באמצע', 'תיפול – יש התנגשות בין הפרוטוקולים'], a: 1, why: '/26 היא התחילית הספציפית ביותר שמכילה את 192.168.32.1 (טווח 0–63). AD מכריע רק על אותה תחילית.', fb: { 0: 'AD משמש רק כשהתחילית זהה. כאן התחיליות שונות.', 3: 'אין התנגשות – אלו רשתות שונות ולכן כולן בטבלה.' } }
      },
      {
        title: 'סיכום הפרק',
        html: `<div class="callout story">🏆 סטן הבין: ניתוב דינמי הציל את העיר. אבל איזה פרוטוקול דינמי הוא הכי טוב? לך אל <b>מעבדת Link-State</b> ותכירו את OSPF.</div>
          <ul><li>סטטי = ידני, פשוט, לא מתאושש. דינמי = אוטומטי, מתאושש, צורך משאבים.</li>
          <li>Distance Vector (RIP) = שמועות לפי קפיצות. Link-State (OSPF) = מפה מלאה לפי עלות.</li>
          <li>AD: Connected 0 · Static 1 · EIGRP 90 · OSPF 110 · RIP 120.</li>
          <li>Longest Prefix Match: התחילית הארוכה ביותר קודמת ל-AD.</li></ul>
          <p>המשיכו לחידון ולמשחקון של הפרק – ה<b>שער המיון</b> מחכה!</p>`,
        scene(S) {
          S.node('R', 400, 190, { type: 'emoji', emoji: '🏆', fs: 90 });
          S.text('t', 400, 330, 'פרק 1 הושלם ✔', { fs: 28, color: '#fbbf24' });
        }
      }
    ]
  };

  OG.quizzes.ch1 = [
    { q: 'מה ההבדל העיקרי בין ניתוב סטטי לדינמי?', opts: ['סטטי תמיד מהיר יותר', 'בדינמי הפרוטוקול מחשב ומתאושש לבד, בסטטי המנהל מגדיר ידנית', 'דינמי לא משתמש בטבלת ניתוב', 'סטטי עובד רק עם OSPF'], a: 1, why: 'דינמי = אוטומטי (גילוי, חישוב, התאוששות). סטטי = ידני.' },
    { q: 'איזה מהפרוטוקולים הבאים הוא מסוג Link-State?', opts: ['RIP', 'OSPF', 'ניתוב סטטי', 'כולם'], a: 1, why: 'OSPF הוא Link-State. RIP הוא Distance Vector.' },
    { q: 'בפרוטוקול Distance Vector הנתב יודע על הרשת…', opts: ['הכול – יש לו מפה מלאה', 'רק מה ששכניו מספרים לו (שמועות על מרחק)', 'רק את הממשקים המחוברים אליו', 'כלום'], a: 1, why: 'DV עובד על "שמועות" מהשכנים: דרך מי להגיע ומה המרחק.' },
    { q: 'סדרו לפי AD מהנמוך (המנצח) לגבוה: RIP, OSPF, Static, EIGRP', opts: ['Static, EIGRP, OSPF, RIP', 'Static, OSPF, EIGRP, RIP', 'RIP, OSPF, EIGRP, Static', 'EIGRP, Static, OSPF, RIP'], a: 0, why: 'Static=1, EIGRP=90, OSPF=110, RIP=120.' },
    { q: 'יש ניתוב סטטי (AD 1) ו-OSPF (AD 110) לאותה רשת ואותה תחילית. הסטטי נמחק. מה קורה?', opts: ['אין מסלול לרשת', 'OSPF נכנס לטבלת הניתוב', 'RIP נכנס אוטומטית', 'הנתב מאתחל'], a: 1, why: 'כשהמנצח נופל, המסלול הבא בדירוג (OSPF) נכנס לטבלה.' },
    { q: 'בטבלה: <code>192.168.32.0/24</code> ו-<code>192.168.32.0/19</code>. חבילה ל-<code>192.168.32.5</code>. בחירת הנתב:', opts: ['/19 כי הוא מכסה יותר כתובות', '/24 – התחילית הארוכה ביותר', 'לפי ה-AD בלבד', 'שניהם במקביל'], a: 1, why: 'Longest Prefix Match: /24 ארוך מ-/19 ולכן מדויק יותר.' },
    { q: 'איזה נתון מסביר למה OSPF צורך יותר זיכרון ומעבד מ-RIP?', opts: ['הוא שומר מפה מלאה (LSDB) ומריץ אלגוריתם חישוב', 'הוא שולח הרבה מייל', 'הוא עובד רק עם כבלי סיב', 'הוא סופר קפיצות'], a: 0, why: 'LSDB + חישוב SPF דורשים משאבים – בתמורה להתאוששות מהירה.' },
    { q: 'EIGRP מוגדר על ידי סיסקו כ…', opts: ['Link-State מובהק', 'Distance Vector מתוחכם (לפעמים "היברידי")', 'ניתוב סטטי', 'פרוטוקול L2'], a: 1, why: 'יש לו תכונות משני העולמות, וסיסקו מסווגת אותו כ-Distance Vector מתוחכם.' }
  ];
})(window.OG);
