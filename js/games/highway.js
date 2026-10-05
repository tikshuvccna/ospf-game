/* EXTRA 5 minigame – Highway: drive into the lane with the correct answer */
(function (OG) {
  const { el, pick, shuffle } = OG;
  const Q = [
    ['אחרי 2-Way בתהליך השכנות מגיע שלב…', 'ExStart', ['Init', 'Loading'], 'הסדר: Down › Init › 2-Way › ExStart › Exchange › Loading › Full.', 1],
    ['איזו הודעה נושאת את ה-LSA עצמם?', 'LSU', ['DBD', 'LSR'], 'LSU = Link-State Update. DBD רק מתאר, LSR מבקש.', 1],
    ['שכנות נתקעת ב-ExStart. חשדו ב…', 'MTU לא תואם', ['Area שונה', 'Priority 0'], 'תקיעה בשלבי DBD = בדרך כלל MTU.', 1],
    ['בין שני DROTHER-ים המצב הסופי הוא…', '2-Way', ['Full', 'Down'], 'FULL רק מול DR/BDR.', 1],
    ['מי ה-Master ב-ExStart?', 'ה-Router-ID הגבוה', ['ה-Router-ID הנמוך', 'ה-DR'], 'ה-ID הגבוה = Master.', 1],
    ['איזה LSA יוצר ה-DR?', 'Type 2', ['Type 1', 'Type 3'], 'Network LSA.', 1],
    ['איזה LSA מסומן בטבלה כ-O IA?', 'Type 3', ['Type 5', 'Type 2'], 'Summary LSA של ה-ABR.', 1],
    ['איזה LSA מומר ל-Type 5 בגבול NSSA?', 'Type 7', ['Type 4', 'Type 3'], 'ה-ABR ממיר 7 ל-5.', 2],
    ['ב-E2 המטריקה בטבלה היא…', 'העלות החיצונית בלבד', ['חיצונית + פנימית', 'תמיד 1'], 'E1 מוסיף את הפנימית.', 2],
    ['איזה LSA מספר היכן ה-ASBR?', 'Type 4', ['Type 3', 'Type 7'], 'ASBR Summary של ה-ABR.', 2],
    ['Dijkstra בוחר בכל צעד…', 'את הלא-מבוקר הקרוב ביותר', ['את הרחוק ביותר', 'צומת אקראי'], 'הקרוב ביותר שעוד לא ביקרנו.', 1],
    ['SPF רץ מחדש כש…', 'הטופולוגיה השתנתה (LSA חדש)', ['כל Hello', 'אף פעם'], 'שינוי ב-LSDB מפעיל חישוב.', 2],
    ['אזור Stub חוסם…', 'Type 5', ['Type 1', 'Type 2'], 'ובנוסף Type 4.', 1],
    ['Totally Stub חוסם גם…', 'Type 3', ['Type 1', 'Type 2'], 'פרט לברירת המחדל.', 2],
    ['איזה אזור מתיר ASBR אך חוסם Type 5?', 'NSSA', ['Stub', 'Totally Stub'], 'ה-ASBR יוצר Type 7.', 1],
    ['ה-ABR מזריק לאזור Stub…', 'ניתוב ברירת מחדל', ['Type 5', 'כלום'], 'כדי שיהיה לאן לשלוח.', 2],
    ['הסיכום של 10.1.0.0/24 עד 10.1.3.0/24', '10.1.0.0/22', ['10.1.0.0/23', '10.1.0.0/16'], '4 רשתות /24 = /22.', 2],
    ['מספר הפרוטוקול של OSPF ב-IP', '89', ['6', '110'], '6=TCP, 17=UDP, 89=OSPF.', 1],
    ['OSPF רץ על…', 'IP ישירות (בלי TCP/UDP)', ['TCP', 'UDP'], 'פרוטוקול IP מספר 89.', 1],
    ['Aut:2 בהודעת OSPF הוא…', 'MD5', ['ללא אימות', 'סיסמה פשוטה'], 'Aut:0 ללא, 1 פשוטה, 2 MD5.', 1],
    ['איך מחברים אזור ל-Area 0 בלי חיבור פיזי?', 'Virtual-Link', ['passive-interface', 'bandwidth'], 'דרך אזור מתווך.', 1],
    ['Retransmit ברירת מחדל', '5 שניות', ['40 שניות', '10 שניות'], 'המתנה ל-LSAck.', 1],
    ['Wait ברירת מחדל', '40 שניות', ['5 שניות', '120 שניות'], 'כמו Dead.', 2],
    ['Process ID חייב להיות…', 'מקומי – לא חייב להתאים', ['זהה בין שכנים', 'שונה תמיד'], 'מקומי לנתב.', 2],
    ['ip ospf network point-to-point על Ethernet…', 'מבטל בחירת DR/BDR', ['מפעיל DR', 'משנה Cost'], 'מגדיר P2P.', 2],
    ['OSPFv3 משתמש ב-Multicast…', 'FF02::5', ['224.0.0.5', 'FF02::9'], 'הגרסה ל-IPv6.', 3],
    ['Hello / Dead ברירת מחדל ב-Ethernet', '10 / 40', ['30 / 120', '5 / 20'], 'Broadcast ו-P2P: 10/40.', 1],
    ['AD של OSPF', '110', ['120', '90'], 'RIP=120, EIGRP=90.', 1],
    ['תיקו ב-Priority – מי DR?', 'ה-Router-ID הגבוה', ['הנמוך', 'אקראי'], 'ID גבוה מנצח.', 1],
    ['Wildcard של /26', '0.0.0.63', ['0.0.0.31', '0.0.0.127'], '255−192=63.', 2],
    ['Router-ID: מה קודם?', 'router-id ידני', ['IP פיזי גבוה', 'Loopback נמוך'], 'ידני › Loopback › פיזי.', 1]
  ];

  OG.games.e5 = {
    title: 'כביש מהיר', story: 'הקברניט עבר לנהיגה! על הכביש מופיעה שאלה, ובאופק שלושה שערים עם תשובות. נהגו אל השער הנכון – לפני שהוא חולף!',
    how: { 1: 'הזיזו את הרכב בין 3 הנתיבים עם ⬅️➡️ (או A/D, או לחיצה בצד שמאל/ימין של המסך). רק נתיב אחד נכון.', 2: 'מהירות גבוהה יותר ושאלות מכל ה-EXTRA.', 3: 'מהיר מאוד, כולל שאלות מכל החומר. תגובה מהירה!' },
    cfg: { 1: { tasks: 8, lives: 3 }, 2: { tasks: 10, lives: 3 }, 3: { tasks: 12, lives: 3 } },
    help: '⬅️ ➡️ / A D / לחיצה בצדדים',
    start(stage, level, sh) {
      const v = [0, 120, 170, 230][level];
      const root = el('div', { style: { position: 'absolute', inset: 0, overflow: 'hidden', background: 'linear-gradient(#0a1020,#101a36)', touchAction: 'none' } }); stage.append(root);
      let W = 0, H = 0, roadW = 0, laneW = 0, carTop = 0;
      const road = el('div', { style: { position: 'absolute', top: 0, bottom: 0, background: '#1b2236', borderInline: '5px solid #aab4e0' } }); root.append(road);
      const marks = el('div', { style: { position: 'absolute', top: 0, bottom: 0, pointerEvents: 'none' } }); root.append(marks);
      const sc = []; for (let i = 0; i < 16; i++) { const e = el('div', { style: { position: 'absolute', fontSize: '28px' }, text: pick(['🌲', '🌲', '💡', '🌳']) }); sc.push({ e, y: (i % 8) * 120, side: i % 2 }); root.append(e); }
      const car = el('div', { style: { position: 'absolute', width: '44px', height: '78px', transition: 'transform .12s' } }); car.innerHTML = '<svg viewBox="0 0 44 78" width="44" height="78"><ellipse cx="22" cy="40" rx="20" ry="36" fill="rgba(0,0,0,.35)"/><rect x="4" y="4" width="36" height="68" rx="12" fill="#ef4444" stroke="#7f1d1d" stroke-width="2"/><rect x="9" y="22" width="26" height="18" rx="4" fill="#7dd3fc"/><rect x="9" y="48" width="26" height="12" rx="3" fill="#7dd3fc" opacity=".6"/><rect x="8" y="3" width="8" height="5" fill="#fff7c2"/><rect x="28" y="3" width="8" height="5" fill="#fff7c2"/><rect x="8" y="70" width="8" height="4" fill="#ff2a2a"/><rect x="28" y="70" width="8" height="4" fill="#ff2a2a"/></svg>'; root.append(car);
      const qBox = el('div', { style: { position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)', width: 'min(760px,94%)', zIndex: 4, textAlign: 'center', background: 'rgba(8,12,28,.92)', border: '2px solid #22d3ee', borderRadius: '16px', padding: '10px 14px', fontSize: '20px', fontWeight: 800, boxShadow: '0 0 24px rgba(34,211,238,.3)' } }); root.append(qBox);
      const fb = el('div.fb', { style: { position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', width: 'min(640px,92%)', zIndex: 4, display: 'none', background: 'rgba(8,12,28,.95)' } }); root.append(fb);
      let lane = 1, carX = 0, off = 0, gates = null, spawned = 0, qs = shuffle(Q.filter(q => level === 1 ? q[4] === 1 : level === 2 ? q[4] <= 2 : true)); if (qs.length < sh.total) qs = qs.concat(shuffle(Q));
      const laneX = i => (W - roadW) / 2 + laneW * (i + .5);
      function layout() {
        W = root.clientWidth; H = root.clientHeight; roadW = Math.min(540, W * .86); laneW = roadW / 3; carTop = H - 130;
        Object.assign(road.style, { left: (W - roadW) / 2 + 'px', width: roadW + 'px' }); Object.assign(marks.style, { left: (W - roadW) / 2 + 'px', width: roadW + 'px', background: `repeating-linear-gradient(to bottom, #e8b830 0 34px, transparent 34px 68px) ${laneW}px 0/4px 100% no-repeat, repeating-linear-gradient(to bottom, #e8b830 0 34px, transparent 34px 68px) ${laneW * 2}px 0/4px 100% no-repeat` });
      }
      layout(); carX = laneX(lane);
      const rs = () => layout(); window.addEventListener('resize', rs);
      const move = d => { lane = OG.clamp(lane + d, 0, 2); OG.snd.play('tick'); };
      const kd = e => { const k = e.key.toLowerCase(); if (k === 'arrowleft' || k === 'a') move(-1); else if (k === 'arrowright' || k === 'd') move(1); };
      document.addEventListener('keydown', kd);
      root.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; OG.snd.init(); const r = root.getBoundingClientRect(); move(e.clientX - r.left < r.width / 2 ? -1 : 1); });
      const GH = 76;
      function spawn() {
        if (spawned >= sh.total) return; const q = qs[spawned++]; const correctLane = Math.floor(Math.random() * 3); const wr = shuffle(q[2].slice()); let wi = 0;
        qBox.innerHTML = `❓ ${q[0]}`; fb.style.display = 'none';
        gates = { y: 100, q, correctLane, els: [], done: false };
        for (let i = 0; i < 3; i++) { const txt = i === correctLane ? q[1] : wr[wi++]; const g = el('div', { style: { position: 'absolute', height: GH + 'px', width: laneW - 14 + 'px', border: '3px solid #22d3ee', borderRadius: '14px', background: 'rgba(8,30,50,.88)', boxShadow: '0 0 20px rgba(34,211,238,.45)', display: 'grid', placeItems: 'center', textAlign: 'center', padding: '4px 8px', fontWeight: 800, fontSize: Math.max(13, Math.min(19, laneW / 9)) + 'px', zIndex: 3, lineHeight: 1.25 }, text: txt }); root.append(g); gates.els.push(g); }
      }
      function evaluate() {
        gates.done = true; const ok = lane === gates.correctLane;
        gates.els.forEach((g, i) => { g.style.borderColor = i === gates.correctLane ? '#34d399' : '#fb7185'; g.style.boxShadow = `0 0 26px ${i === gates.correctLane ? '#34d399' : '#fb7185'}`; });
        fb.style.display = ''; fb.className = 'fb ' + (ok ? 'ok' : 'no'); fb.innerHTML = (ok ? '✅ ' : '❌ התשובה: <b>' + gates.q[1] + '</b>. ') + gates.q[3];
        if (ok) { sh.correct({ x: carX, y: carTop - 40 }); car.style.filter = 'drop-shadow(0 0 14px #34d399)'; } else { sh.wrong({ advance: true, x: carX, y: carTop - 40 }); car.style.transform = 'rotate(540deg)'; OG.snd.play('stamp'); }
        setTimeout(() => { car.style.transform = ''; car.style.filter = ''; }, 700);
      }
      let idle = 1.2;
      const loop = sh.raf(dt => {
        if (root.clientWidth !== W || root.clientHeight !== H) { layout(); }
        off += v * dt; marks.style.backgroundPositionY = off + 'px';
        for (const s of sc) { s.y += v * dt; if (s.y > H + 40) { s.y = -40; s.e.textContent = pick(['🌲', '🌲', '💡', '🌳']); } s.e.style.top = s.y + 'px'; s.e.style.left = (s.side ? (W - roadW) / 2 + roadW + 14 + (s.y * 7 % 40) : (W - roadW) / 2 - 44 - (s.y * 7 % 40)) + 'px'; }
        carX += (laneX(lane) - carX) * Math.min(1, dt * 12); car.style.left = (carX - 22) + 'px'; car.style.top = carTop + 'px';
        if (!gates) { idle -= dt; if (idle <= 0) spawn(); return; }
        gates.y += v * dt; gates.els.forEach((g, i) => { g.style.top = gates.y + 'px'; g.style.left = ((W - roadW) / 2 + laneW * i + 7) + 'px'; });
        if (!gates.done && gates.y + GH >= carTop + 20) evaluate();
        if (gates.y > H + 20) { gates.els.forEach(g => g.remove()); gates = null; idle = .5; }
      });
      return { destroy() { loop.stop(); document.removeEventListener('keydown', kd); window.removeEventListener('resize', rs); root.remove(); } };
    }
  };
})(window.OG);
