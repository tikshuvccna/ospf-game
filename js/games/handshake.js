/* EXTRA 1 minigame – Handshake Express: order the neighbor states / packets and diagnose stuck states */
(function (OG) {
  const { el, pick, shuffle } = OG;
  const STATES = [['Down', 'OSPF לא פועל / אין Hello'], ['Init', 'שמענו Hello מהשכן, אבל הוא עוד לא ראה אותנו'], ['2-Way', 'שני הצדדים ראו זה את זה – דו-כיווני (ושם נבחר DR/BDR)'], ['ExStart', 'בחירת Master ו-Slave'], ['Exchange', 'החלפת תקצירי DBD'], ['Loading', 'מבקשים (LSR) ומקבלים (LSU) LSA חסרים'], ['Full', 'שכנות מלאה (Adjacency)']];
  const PKTS = [['Hello', 'יוצר ומתחזק שכנות'], ['DBD', 'תקציר של ה-LSDB'], ['LSR', 'בקשה ל-LSA חסרים'], ['LSU', 'נושא את ה-LSA עצמם'], ['LSAck', 'אישור קבלת LSA']];
  const STUCK = [
    ['הנתב רואה את השכן במצב <b>Init</b> לאורך זמן, והשכן לא רואה אותו. מה סביר?', 'Hello יוצא בכיוון אחד בלבד / נחסם בצד השני (ACL, אימות)', ['MTU שונה', 'Router-ID כפול', 'Priority 0'], 'Init = שמענו אותו אבל הוא לא שמע אותנו – תקשורת חד-כיוונית.'],
    ['השכנות נתקעת ב-<b>ExStart</b>. הסיבה השכיחה ביותר?', 'MTU לא תואם בין שני הצדדים', ['Area שונה', 'Hello שונה', 'מסכה שונה'], 'הבדלי Area/Hello/מסכה עוצרים כבר לפני 2-Way. תקיעה ב-DBD = MTU.'],
    ['כל הנתבים על המתג נשארים ב-<b>2-Way</b> ואין FULL. מה קרה?', 'כולם עם Priority 0 – אף אחד לא נבחר DR/BDR', ['MTU לא תואם', 'Router-ID כפול', 'הטיימרים שונים'], 'בלי DR/BDR ברשת Multi-Access אין FULL.'],
    ['נתב לא מקבל Hello מהשכן 40 שניות. לאיזה מצב ייכנס השכן?', 'Down – ה-Dead Timer פג', ['Init', '2-Way', 'Loading'], 'Dead interval = 40 שניות כברירת מחדל.'],
    ['שני DROTHER-ים על אותו מתג ראו זה את זה כ-<b>2-Way</b>. האם זו בעיה?', 'לא – זה המצב הנורמלי ביניהם (FULL רק מול DR/BDR)', ['כן – חייב להיות FULL', 'כן – Router-ID כפול', 'כן – ה-DR נפל'], 'שכנות חלקית בין DROTHER-ים: Hello בלבד.'],
    ['ב-ExStart מי יהיה ה-Master אם R1=1.1.1.1 ו-R2=2.2.2.2?', 'R2 – ה-Router-ID הגבוה', ['R1 – הנמוך', 'ה-DR', 'אקראי'], 'ה-Router-ID הגבוה הוא Master.']
  ];

  OG.games.e1 = {
    title: 'רכבת הלחיצות', story: 'רכבת השכנות יוצאת! הקרונות מעורבבים – סדרו אותם בסדר הנכון: שלבי השכנות, חבילות ה-OSPF – ואבחנו מתי הרכבת נתקעת.',
    how: { 1: 'לחצו על הקלפים לפי הסדר הנכון (מהראשון לאחרון). טעות עולה בחיים.', 2: 'הקלפים מתוארים במילים (מה קורה בשלב) – לא בשם! סדרו נכון.', 3: 'עוד: שאלות אבחון על שכנות שנתקעה, ומסדרים במהירות.' },
    cfg: { 1: { tasks: 5, lives: 4, time: 150 }, 2: { tasks: 6, lives: 4, time: 170 }, 3: { tasks: 8, lives: 4, time: 190 } },
    help: 'לחצו על הקלפים לפי הסדר',
    start(stage, level, sh) {
      const root = el('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', overflow: 'auto' } }); stage.append(root);
      const card = el('div.panel', { style: { width: 'min(900px,98%)', textAlign: 'center' } }); root.append(card);
      let mist = 0; let locked = false;
      function seqRound() {
        locked = false; mist = 0; const useStates = level === 1 ? Math.random() < .5 : Math.random() < .6; const desc = level >= 2 && Math.random() < (level === 2 ? .6 : .85);
        let list = useStates ? STATES : PKTS; if (useStates && level === 1) { const s = Math.floor(Math.random() * 3); list = STATES.slice(s, s + 5); }
        const items = list.map((x, i) => ({ i, name: x[0], desc: x[1] })); const bank = shuffle(items.slice()); const placed = [];
        card.innerHTML = '';
        card.append(el('div', { style: { fontSize: '21px', fontWeight: 800, marginBottom: '10px' }, html: useStates ? '🚂 סדרו את <b>שלבי השכנות</b> מהראשון לאחרון' : '📬 סדרו את <b>חבילות ה-OSPF</b> לפי סדר ההופעה בתהליך השכנות' }));
        const track = el('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', minHeight: '56px', padding: '8px', border: '2px dashed #2b3a6e', borderRadius: '14px', marginBottom: '14px' } });
        items.forEach((_, k) => track.append(el('div', { style: { minWidth: '60px', height: '44px', borderRadius: '10px', background: '#0b1230', border: '1px solid #2b3a6e', display: 'grid', placeItems: 'center', color: '#6f7ea8', fontWeight: 800 }, text: String(k + 1) })));
        const hand = el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' } });
        const fb = el('div.fb', { style: { display: 'none', marginTop: '10px' } });
        bank.forEach(it => {
          const b = el('button.opt', { style: { maxWidth: desc ? '210px' : '140px', margin: 0, textAlign: 'center', minHeight: '56px' }, html: desc ? `<span style="font-size:13px">${it.desc}</span>` : `<b>${it.name}</b>` });
          b.onclick = () => {
            if (locked) return; OG.snd.init();
            const expect = placed.length;
            if (it.i === items[expect].i) { placed.push(it); b.classList.add('ok', 'off'); track.children[expect].textContent = it.name; track.children[expect].style.background = 'rgba(52,211,153,.3)'; track.children[expect].style.color = '#fff'; OG.snd.play('pop'); if (placed.length === items.length) { locked = true; fb.style.display = ''; fb.className = 'fb ok'; fb.textContent = '✅ מסלול מושלם: ' + items.map(x => x.name).join(' ➜ '); sh.correct({ speed: mist ? .2 : 1, x: 400, y: 100 }); setTimeout(() => { if (!sh.ended) next(); }, 1500); } }
            else { mist++; b.classList.add('no'); setTimeout(() => b.classList.remove('no'), 400); sh.wrong({ x: 400, y: 100, msg: '✖ ' + (desc ? '' : it.name) }); }
          };
          hand.append(b);
        });
        card.append(track, hand, fb);
      }
      function stuckRound() {
        locked = false; const [q, a, ws, why] = pick(STUCK); card.innerHTML = '';
        card.append(el('div', { style: { fontSize: '21px', fontWeight: 800, margin: '4px 0 12px', lineHeight: 1.6 }, html: '🔧 ' + q }));
        const opts = shuffle([a, ...ws]); const fb = el('div.fb', { style: { display: 'none' } });
        opts.forEach(o => card.append(el('button.opt', { text: o, onclick(e) { if (locked) return; locked = true; const ok = o === a; e.target.classList.add(ok ? 'ok' : 'no'); fb.style.display = ''; fb.className = 'fb ' + (ok ? 'ok' : 'no'); fb.innerHTML = (ok ? '✅ ' : '❌ התשובה: ' + a + '.<br>') + why; if (ok) sh.correct({ x: 400, y: 100 }); else sh.wrong({ advance: true, x: 400, y: 100 }); setTimeout(() => { if (!sh.ended) next(); }, ok ? 1600 : 3200); } })));
        card.append(fb);
      }
      function next() { if (level === 3 && Math.random() < .4) stuckRound(); else seqRound(); }
      next();
      return { destroy() { root.remove(); } };
    }
  };
})(window.OG);
