/* Chapter 6 – network types, DR/BDR, election, priority, timers */
(function (OG) {
  const { el, svg } = OG;

  function meshWidget(host) {
    let n = 5; const wrap = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } }); const cnt = el('div.wbox');
    const sl = el('input', { type: 'range', min: 3, max: 12, value: n, oninput() { n = +sl.value; draw(); } });
    function circle(mode) {
      const s = svg('svg', { viewBox: '0 0 300 300', style: 'width:100%;max-height:280px' }); const pts = []; const cx = 150, cy = 150, r = 105;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 - Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
      const lines = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { if (mode === 'mesh' || i < 2) lines.push([i, j]); }
      lines.forEach(([i, j]) => s.append(svg('line', { x1: pts[i][0], y1: pts[i][1], x2: pts[j][0], y2: pts[j][1], stroke: mode === 'mesh' ? '#fb7185' : '#34d399', 'stroke-width': 1.6, opacity: .7 })));
      pts.forEach((p, i) => { s.append(svg('circle', { cx: p[0], cy: p[1], r: 13, fill: '#1c2a58', stroke: mode === 'dr' ? (i === 0 ? '#fbbf24' : i === 1 ? '#a78bfa' : '#8bd0ff') : '#8bd0ff', 'stroke-width': 2.5 }), svg('text', { x: p[0], y: p[1] + 4, 'text-anchor': 'middle', style: 'font:800 10px Heebo;fill:#fff' }, mode === 'dr' ? (i === 0 ? 'DR' : i === 1 ? 'BDR' : 'R') : 'R')); });
      return s;
    }
    function draw() {
      wrap.innerHTML = ''; const full = n * (n - 1) / 2, drc = 2 * n - 3;
      wrap.append(el('div.wbox', el('b', { text: '😵 בלי DR – כולם מדברים עם כולם' }), circle('mesh'), el('div.bigval', { style: { color: '#fb7185' }, text: full + ' שכנויות' })), el('div.wbox', el('b', { text: '👑 עם DR ו-BDR' }), circle('dr'), el('div.bigval', { style: { color: '#34d399' }, text: drc + ' שכנויות מלאות' })));
      cnt.innerHTML = `ב-<b>${n}</b> נתבים: חיסכון של <b>${full - drc}</b> שכנויות מלאות! ככל שהרשת גדלה – ההבדל דרמטי.`;
    }
    host.append(el('div.wbox', el('h3', { text: '🏛️ למה צריך DR?' }), el('div.wrow', el('span.wlabel', { text: 'מספר נתבים על אותו מתג:' }), sl)), wrap, cnt); draw();
  }

  function electionWidget(host) {
    let seq = 0; const R = [{ n: 'A', rid: '1.1.1.1', pri: 1 }, { n: 'B', rid: '2.2.2.2', pri: 1 }, { n: 'C', rid: '3.3.3.3', pri: 1 }, { n: 'D', rid: '4.4.4.4', pri: 1 }].map(r => ({ ...r, alive: true, role: '' }));
    const board = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '10px' } }); const log = el('div.callout.info');
    const rank = list => list.filter(r => r.alive && r.pri > 0).sort((a, b) => b.pri - a.pri || OG.ip2n(b.rid) - OG.ip2n(a.rid));
    function elect(msg) { const e = rank(R); R.forEach(r => r.role = r.alive ? 'DROTHER' : 'DEAD'); if (e[0]) e[0].role = 'DR'; if (e[1]) e[1].role = 'BDR'; log.innerHTML = msg || 'בחירות! קודם Priority הגבוה ביותר, ובתיקו – Router-ID הגבוה ביותר. Priority 0 לעולם לא משתתף.'; draw(); }
    function draw() {
      board.innerHTML = '';
      R.forEach(r => {
        const col = r.role === 'DR' ? '#fbbf24' : r.role === 'BDR' ? '#a78bfa' : r.alive ? '#4b68c8' : '#475569';
        const pri = el('input', { type: 'number', min: 0, max: 255, value: r.pri, style: { width: '70px' }, disabled: !r.alive, onchange() { r.pri = OG.clamp(+pri.value || 0, 0, 255); } });
        board.append(el('div.wbox', { style: { border: `2px solid ${col}`, textAlign: 'center', opacity: r.alive ? 1 : .45 } }, el('div', { style: { fontSize: '30px' }, text: r.role === 'DR' ? '👑' : r.role === 'BDR' ? '🥈' : r.alive ? '🔀' : '💀' }), el('b', { text: 'R-' + r.n }), el('div.sub.ltr', { style: { color: '#9fb0e8', fontFamily: 'var(--mono)' }, text: 'RID ' + r.rid }), el('div.wrow', { style: { justifyContent: 'center', marginTop: '6px' } }, el('span.wlabel', { text: 'Priority' }), pri), el('div.pill.' + (r.role === 'DR' || r.role === 'BDR' ? 'y' : 'g'), { text: r.role || '—' })));
      });
    }
    const failDR = () => { const dr = R.find(r => r.role === 'DR'); if (!dr) return; dr.alive = false; dr.role = 'DEAD'; const bdr = R.find(r => r.role === 'BDR'); if (bdr) bdr.role = 'DR'; const e = rank(R.filter(r => r.role !== 'DR')); if (e[0]) e[0].role = 'BDR'; log.innerHTML = '💥 ה-DR נפל. ה-<b>BDR</b> הופך ל-DR מיד, ונבחר BDR חדש מבין הנותרים.'; draw(); };
    const failBDR = () => { const b = R.find(r => r.role === 'BDR'); if (!b) return; b.alive = false; b.role = 'DEAD'; const e = rank(R.filter(r => r.role !== 'DR')); if (e[0]) e[0].role = 'BDR'; log.innerHTML = '💥 ה-BDR נפל – נבחר BDR חדש.'; draw(); };
    const join = () => { if (R.length >= 7) return; seq++; const r = { n: String.fromCharCode(69 + seq - 1), rid: `${5 + seq}.${5 + seq}.${5 + seq}.${5 + seq}`, pri: 255, alive: true, role: 'DROTHER' }; R.push(r); log.innerHTML = '🆕 נתב חדש עם <b>Priority 255</b> הצטרף – אבל <b>אין Preemption</b>: ה-DR הנוכחי נשאר. רק בחירות חדשות (למשל אחרי נפילה/איפוס) ישנו את התפקידים.'; draw(); };
    const reset = () => { R.forEach(r => r.alive = true); elect('בחירות חדשות מאפס – כולם משתתפים.'); };
    host.append(el('div.wbox', el('h3', { text: '🗳️ סימולטור בחירות DR / BDR' }), el('div.muted', { html: 'שנו Priority לנתבים ולחצו "בחירות". נסו Priority 0, תיקו, נפילת DR, וגם נתב חדש חזק.' })), board, log, el('div.row', el('button.btn.primary.small', { text: '🗳️ בחירות', onclick: () => elect() }), el('button.btn.danger.small', { text: '💥 הפל DR', onclick: failDR }), el('button.btn.danger.small', { text: '💥 הפל BDR', onclick: failBDR }), el('button.btn.small', { text: '🆕 נתב חדש (255)', onclick: join }), el('button.btn.small', { text: '↺ איפוס', onclick: reset }))); elect();
  }

  OG.lessons.ch6 = {
    steps: [
      {
        title: 'Point-to-Point – שניים בלבד',
        html: `<div class="callout story">🏛️ ברוכים הבאים לבית הבחירות של עיר הנתבים.</div>
          <p>כשנתב מחובר לנתב אחר <b>ישירות ורק אליו</b> (פורט לפורט) – סוג החיבור נקרא <b>Point-to-Point (P2P)</b>.</p>
          <p>שני הנתבים שווים, שולחים Hello ועדכוני LSA ל-Multicast <code>224.0.0.5</code> (שכל נתבי ה-OSPF מאזינים לו). <b>אין בחירת DR/BDR</b> – שניהם <b>FULL</b>.</p>`,
        scene(S) {
          S.node('R1', 170, 190, { label: 'R1' }); S.node('R2', 630, 190, { label: 'R2' }); S.link('R1', 'R2', { label: 'Point-to-Point', lo: -22 });
          S.at(.5, S => { S.packet('R1', 'R2', { label: 'Hello 224.0.0.5', color: '#22d3ee', dur: 1.8 }); S.packet('R2', 'R1', { label: 'Hello', color: '#34d399', dur: 1.8 }); });
          S.at(3, S => { S.packet('R1', 'R2', { label: 'LSA', shape: 'emoji', emoji: '🧩', color: '#fbbf24', dur: 1.8 }); S.packet('R2', 'R1', { label: 'LSA', shape: 'emoji', emoji: '🧩', color: '#fbbf24', dur: 1.8 }); });
          S.at(5.2, S => { S.badge('R1', 'FULL', { bg: '#059669', dx: 0, dy: -45 }); S.badge('R2', 'FULL', { bg: '#059669', dx: 0, dy: -45 }); S.note('n', 250, 290, 'שני הצדדים שווים – אין DR ואין BDR', { w: 300, cls: 'g', align: 'center' }); });
        }
      },
      {
        title: 'Multi-Access – כולם על אותו מתג',
        html: `<p>כשכל הנתבים מחוברים ב<b>נקודה אחת</b> – למשל דרך מתג – כולם חולקים את אותה רשת. זה חיבור <b>Multi-Access / רב-נקודתי</b> (למשל כל ממשקי Ethernet).</p>
          <p>אם כל נתב ידבר עם כל נתב אחר – עומס אדיר. הפתרון: <b>DR ו-BDR</b>. הזיזו את הסליידר וראו כמה שכנויות חוסכים.</p>`,
        widget: meshWidget
      },
      {
        title: 'DR – מלך ה-OSPF; BDR – סגן',
        html: `<ul><li>👑 <b>DR</b> – Designated Router: הנתב שאליו כולם פונים.</li><li>🥈 <b>BDR</b> – Backup DR: מקבל גם את העדכונים, ואם ה-DR נופל – מיד הופך ל-DR.</li><li>🔀 <b>DROTHER</b> – כל השאר ("הפשוטים").</li></ul>
          <p>עדכוני ניתוב נשלחים <b>רק ל-DR ול-BDR</b> ב-Multicast <code>224.0.0.6</code> (רק הם מאזינים לו). ה-DR מפיץ הלאה לכולם ב-<code>224.0.0.5</code>.</p>`,
        scene(S) {
          S.node('SW', 400, 215, { type: 'switch', label: 'Switch' });
          const pos = { R1: [130, 90], DR: [400, 60], BDR: [670, 90], R4: [130, 340], R5: [670, 340] };
          S.node('DR', ...pos.DR, { label: '👑 DR', sub: 'R2' }); S.node('BDR', ...pos.BDR, { label: '🥈 BDR', sub: 'R3' });
          S.node('R1', ...pos.R1, { label: 'R1', sub: 'DROTHER' }); S.node('R4', ...pos.R4, { label: 'R4', sub: 'DROTHER' }); S.node('R5', ...pos.R5, { label: 'R5', sub: 'DROTHER' });
          ['R1', 'DR', 'BDR', 'R4', 'R5'].forEach(r => S.link('SW', r, { w: 3 }));
          S.at(1, S => { S.packet(['R1', 'SW', 'DR'], null, { label: '224.0.0.6', color: '#fbbf24', dur: 2.2 }); S.packet(['R1', 'SW', 'BDR'], null, { label: '224.0.0.6', color: '#a78bfa', dur: 2.4 }); });
          S.at(4, S => { ['R1', 'R4', 'R5'].forEach(r => S.packet(['DR', 'SW', r], null, { label: '224.0.0.5', color: '#34d399', dur: 2.4 })); });
          S.at(6.8, S => S.note('n', 250, 380, 'עדכון ← DR+BDR (224.0.0.6) ← DR מפיץ לכולם (224.0.0.5)', { w: 420, cls: 'c', align: 'center' }));
        }
      },
      {
        title: 'איך בוחרים DR ו-BDR?',
        html: `<p>הבחירה לפי <b>Priority</b> – מספר 0–255 שנקבע ידנית:</p>
          <ul><li>ה-Priority <b>הגבוה ביותר</b> = DR, השני = BDR.</li><li><b>0</b> = לעולם לא DR/BDR (למשל ב-Point-to-Point או בהגדרה ידנית). <b>255</b> = הגבוה ביותר.</li><li>ברירת מחדל: <b>1</b> לכולם. אז מי שה-<b>Router-ID</b> שלו הכי גבוה – DR.</li></ul>
          <div class="callout warn">⚠️ <b>אין Preemption</b>: נתב חזק שמצטרף אחרי שכבר יש DR לא "גוזל" את התפקיד. התפקיד מתחלף רק כשהבחירות מתקיימות מחדש.</div>`,
        widget: electionWidget
      },
      {
        title: 'בדיקת הבנה #1',
        html: '<p>ארבעה נתבים על מתג, כולם Priority ברירת מחדל.</p>',
        check: { q: 'ארבעה נתבים על אותו מתג עם Priority 1 בכולם. Router-IDs: 1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4. מי ה-DR ומי ה-BDR?', opts: ['DR=1.1.1.1, BDR=2.2.2.2', 'DR=4.4.4.4, BDR=3.3.3.3', 'DR=3.3.3.3, BDR=4.4.4.4', 'אין DR כי כולם שווים'], a: 1, why: 'בתיקו ב-Priority – ה-Router-ID הגבוה ביותר הוא DR והשני – BDR.', fb: { 0: 'ה-ID הגבוה מנצח, לא הנמוך.', 3: 'תיקו ב-Priority נפתר ע"י Router-ID.' } }
      },
      {
        title: 'DROTHER ושכנות FULL',
        html: `<p>ברשת Multi-Access נוצרת שכנות <b>FULL</b> רק מול ה-DR וה-BDR. כך זה נראה ב-<code>show ip ospf neighbor</code>:</p>
          <div class="cli">R1#show ip ospf neighbor
Neighbor ID     Pri   State        Dead Time   Address         Interface
192.168.123.2   1     <span class="hl">FULL/BDR</span>     00:00:32    192.168.123.2   FastEthernet0/0
192.168.123.3   1     <span class="hl">FULL/DR</span>      00:00:31    192.168.123.3   FastEthernet0/0</div>
          <p>State <b>FULL</b> אומר שיש שכנות מלאה; ובעמודה לידו – התפקיד של השכן. ב-P2P או Priority 0 במקום התפקיד יופיע <code>-</code>.</p>
          <div class="callout info">ℹ️ בין שני DROTHER-ים יש רק <b>2-WAY</b> (שכנות חלקית): מתחלפות הודעות Hello בלבד, בלי עדכוני ניתוב. נעמיק בחבילת ה-EXTRA.</div>`,
        scene(S) {
          S.node('SW', 400, 190, { type: 'switch', label: '' }); S.node('DR', 400, 60, { label: 'DR' }); S.node('BDR', 660, 190, { label: 'BDR' }); S.node('A', 140, 120, { label: 'DROTHER 1' }); S.node('B', 140, 290, { label: 'DROTHER 2' });
          ['DR', 'BDR', 'A', 'B'].forEach(r => S.link('SW', r)); S.mark('DR', '#fbbf24'); S.mark('BDR', '#a78bfa');
          S.at(1, S => { S.badge('A', 'FULL ⟷ DR/BDR', { bg: '#059669', dx: 0, dy: -50 }); S.badge('B', 'FULL ⟷ DR/BDR', { bg: '#059669', dx: 0, dy: -50 }); });
          S.at(3, S => { S.packet('A', 'B', { label: 'Hello', color: '#22d3ee', dur: 1.6 }); S.note('n', 190, 340, 'DROTHER ⟷ DROTHER = 2-WAY (Hello בלבד)', { w: 330, cls: 'y', align: 'center' }); });
        }
      },
      {
        title: 'שינוי Priority וטיימרים',
        html: `<p>משנים Priority בממשק:</p><div class="cli"><span class="pr">Router(config-if)#</span> <span class="hl">ip ospf priority 200</span></div>
          <p>טיימרי ברירת המחדל: <b>Hello 10, Dead 40</b> (ברשתות Broadcast ו-Point-to-Point). ברשתות Non-Broadcast – <b>Hello 30, Dead 120</b>. לשינוי:</p>
          <div class="cli"><span class="pr">Router(config-if)#</span> ip ospf hello-interval 5\n<span class="pr">Router(config-if)#</span> ip ospf dead-interval 15</div>
          <p>הציגו את הטיימרים וסוג הרשת עם <code>show ip ospf interface gi0/0</code>. נסו בעצמכם:</p>`,
        widget(host, ctx) {
          OG.W.cliTask(host, { title: '⌨️ מעבדת Priority וטיימרים', intro: 'אתם על ממשק gi0/0 של R1.', tasks: [
            { prompt: 'R1(config)#', ask: 'היכנסו לממשק gi0/0', ok: [/^int(erface)? (gi|gigabitethernet) ?0\/0$/], hint: 'interface gi0/0', show: 'interface gi0/0' },
            { prompt: 'R1(config-if)#', ask: 'קבעו Priority 200 כדי להיות DR', ok: [/^ip ospf priority 200$/], hint: 'ip ospf priority 200', show: 'ip ospf priority 200' },
            { prompt: 'R1(config-if)#', ask: 'שנו Hello interval ל-5 שניות', ok: [/^ip ospf hello-interval 5$/], hint: 'ip ospf hello-interval 5', show: 'ip ospf hello-interval 5' },
            { prompt: 'R1(config-if)#', ask: 'שנו Dead interval ל-15 שניות (תואם ל-Hello=5 בקירוב ×3)', ok: [/^ip ospf dead-interval 15$/], hint: 'ip ospf dead-interval 15', show: 'ip ospf dead-interval 15' },
            { prompt: 'R1#', ask: 'הציגו את פרטי OSPF של הממשק gi0/0', ok: [/^sh(ow)? ip ospf int(erface)? (gi|gigabitethernet) ?0\/0$/], hint: 'show ip ospf interface gi0/0', show: 'show ip ospf interface gi0/0', echo: 'GigabitEthernet0/0 is up, line protocol is up\n  Process ID 1, Router ID 1.1.1.1, Network Type BROADCAST, Cost: 1\n  Transmit Delay is 1 sec, State DR, Priority 200\n  Timer intervals configured, Hello 5, Dead 15, Wait 15, Retransmit 5' }
          ] }, ctx);
        }
      },
      {
        title: 'בדיקת הבנה #2',
        html: '<p>מה זה Priority 0?</p>',
        check: { q: 'נתב שה-Priority שלו הוגדר ל-0 ברשת Multi-Access:', opts: ['יהיה תמיד DR', 'לעולם לא ייבחר ל-DR/BDR', 'לא ייצור שכנות', 'יהיה BDR'], a: 1, why: 'Priority 0 = לא משתתף בבחירות. הוא יהיה DROTHER (או "-" בטבלת השכנים אצל השכן).', fb: { 2: 'הוא כן יוצר שכנות – רק לא יכול להיות DR/BDR.' } }
      },
      {
        title: 'סיכום הפרק',
        html: `<div class="callout story">🏛️ דנה ה-DR: "ברוכים הבאים לחגיגת הדמוקרטיה של הנתבים. עכשיו תנהלו אתם את הבחירות!"</div>
          <ul><li>P2P: שניים, שווים, בלי DR. Multi-Access: DR + BDR + DROTHER.</li><li>עדכון ← DR/BDR (224.0.0.6), DR מפיץ ל-224.0.0.5.</li><li>בחירה: Priority גבוה › Router-ID גבוה. 0 = אף פעם. אין Preemption.</li><li>טיימרים: 10/40 (Broadcast, P2P), 30/120 (Non-Broadcast).</li></ul>`,
        scene(S) { S.node('SW', 400, 200, { type: 'switch', label: '' }); S.node('DR', 280, 90, { label: '👑 DR' }); S.node('BDR', 520, 90, { label: '🥈 BDR' }); S.node('A', 280, 330, { label: 'R' }); S.node('B', 520, 330, { label: 'R' }); ['DR', 'BDR', 'A', 'B'].forEach(r => S.link('SW', r)); }
      }
    ]
  };

  OG.quizzes.ch6 = [
    { q: 'מתי יש בחירות DR/BDR?', opts: ['בכל חיבור', 'ברשתות Multi-Access (Broadcast) כמו Ethernet', 'רק ב-Serial', 'רק ב-Area 0'], a: 1, why: 'ברשת Broadcast/Multi-Access. ב-Point-to-Point אין DR/BDR.' },
    { q: 'לאיזו כתובת Multicast נשלחים עדכונים אל ה-DR וה-BDR?', opts: ['224.0.0.5', '224.0.0.6', '224.0.0.9', '255.255.255.255'], a: 1, why: '224.0.0.6 – נתבי DR/BDR. ה-DR מפיץ לכולם ב-224.0.0.5.' },
    { q: 'נתבים עם Priority 1 ו-Router-IDs 1.1.1.1 / 5.5.5.5 / 3.3.3.3. מי ה-DR?', opts: ['1.1.1.1', '3.3.3.3', '5.5.5.5', 'אין'], a: 2, why: 'בתיקו – ה-Router-ID הגבוה ביותר.' },
    { q: 'מה טווח ה-Priority?', opts: ['1–10', '0–255', '0–65535', '1–100'], a: 1, why: '0–255; 0 = לעולם לא DR, 255 = הגבוה ביותר.' },
    { q: 'כל נתב שאינו DR ואינו BDR נקרא…', opts: ['ABR', 'DROTHER', 'ASBR', 'Backbone'], a: 1, why: 'DROTHER – הנתבים ה"פשוטים".' },
    { q: 'נתב עם Priority 255 מצטרף לרשת שכבר יש בה DR. מה קורה?', opts: ['הוא הופך מיד ל-DR', 'הוא נשאר DROTHER עד בחירות חדשות (אין Preemption)', 'ה-DR נמחק', 'הוא לא מצליח להצטרף'], a: 1, why: 'ב-OSPF אין Preemption של DR.' },
    { q: 'ה-DR נופל. מה קורה?', opts: ['הרשת נעצרת', 'ה-BDR הופך מיד ל-DR ונבחר BDR חדש', 'נבחר DR חדש רק לפי Router-ID', 'כל הנתבים הופכים ל-DR'], a: 1, why: 'זה בדיוק תפקיד ה-BDR.' },
    { q: 'איזה פקודה משנה את ה-Priority של הממשק?', opts: ['ip ospf cost 200', 'ip ospf priority 200', 'router-id 200', 'ip ospf hello-interval 200'], a: 1, why: 'ip ospf priority [0-255].' },
    { q: 'כשאנחנו רואים "-" בעמודת התפקיד בטבלת השכנים, זה אומר:', opts: ['השכן מת', 'אין יחסי DR/BDR (Priority 0 או Point-to-Point)', 'השכן הוא ASBR', 'שגיאה'], a: 1, why: 'כשה-Priority הוא 0 או שהחיבור P2P – אין תפקיד.' }
  ];
})(window.OG);
