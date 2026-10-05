/* OSPF City – HUD, chapter hub, shop, menu, map, NPC dialogs, title/intro screens */
(function (OG) {
  const { el } = OG;
  const screens = () => document.getElementById('screens');
  const dlg = () => document.getElementById('dialog');

  const NPC = {
    mentor: { lines: ['ברוכים הבאים לעיר הנתבים! אני ד״ר דייקסטרה. פעם הרשת של העיר נכתבה ביד – נתב אחרי נתב – וכשגשר קרס, כל העיר נתקעה.', 'אתם המתלמד החדש שלי. תשוטטו ברחבי העיר, תאספו 🪙 Packets ו-⚡ טורבו, ותקחו כל רכב שתרצו עם <b>E</b>.', 'בכל בניין־פרק מחכים לכם שיעור מונפש עם שאלות, חידון, ומשחקון בשלוש רמות. לכו קודם אל <b>העיר הסטטית</b> – הבניין הכתום מימין לכאן.'], again: ['זכרו: <b>WASD/חצים</b> להליכה, <b>Shift</b> לריצה, <b>E</b> לאינטראקציה, <b>M</b> למפה, <b>Esc</b> לתפריט.', 'אם הלכתם לאיבוד – המפה (M) מאפשרת גם לקפוץ מיד אל כל בניין שנפתח.', 'חכמים אומרים: "Cost נמוך = דרך טובה". רשמו לעצמכם 😉'] },
    shop: { lines: ['ברוכים הבאים ל-Net-Mart! כאן מוציאים 🪙 על רמזים, מגנים, נעליים טורבו ועוד.'], shop: true },
    stan: { lines: ['אני סטטי סטן. פעם הייתי מנהל הרשת היחיד של העיר… כל מסלול כתבתי בעצמי, על דף.', 'אז הגשר קרס. ישבתי שלושה ימים ולילות ועדכנתי נתב אחרי נתב. מאז אני מאמין בניתוב דינמי. ☕'], q: 'ch1' },
    lior: { lines: ['ליאור, כתב ה-LSA! בעיר הזו כל נתב צועק לשכניו מי הוא ומה הוא רואה – וכולם בונים מפה זהה (LSDB).', 'בלי אזורים הנתבים טובעים בזיכרון. לכן יש Area 0 במרכז, וכל אזור אחר חייב להתחבר אליו.'], q: 'ch2' },
    captain: { lines: ['קפטן Hello! אצלי בנמל כל ספינה־נתב אומרת שלום כל 10 שניות. 40 שניות בלי שלום – הנתב נחשב מת.', 'ורק מי שהאזור, הטיימרים והמסכה שלו תואמים נכנס לנמל.'], q: 'ch3' },
    broker: { lines: ['הסוחר: מחיר = 100 חלקי המהירות. פשוט, נכון? חוץ מזה שמ-100 מגה והלאה הכול עולה 1…', 'לכן מעלים את ה-Reference Bandwidth – ואז רואים הבדל אמיתי בין Fast ל-Gigabit.'], q: 'ch4' },
    safe: { lines: ['שומרת הכספת: Wildcard הוא ההפוך של המסכה. 0 = חייב להתאים, 255 = לא אכפת לי.', 'אל תשכחו את <code>passive-interface</code> על הממשקים שפונים אל העובדים.'], q: 'ch5' },
    dana: { lines: ['אני דנה, ה-DR של העיר. כולם מדברים איתי ועם בוב, והאחרים מדברים איתנו. ככה לא יוצא רעש.'], q: 'ch6' },
    bob: { lines: ['ואני בוב, ה-BDR. כל עוד דנה בסדר אני רק מקשיב. נפלה? אני ה-DR החדש, ומיד מתקיימות בחירות לסגן חדש.'] },
    detective: { lines: ['הבלשית: אל תנחשו. תקראו. <code>show ip route</code> אומר לכם O, IA, E2 – וכל אות מספרת סיפור.'], q: 'ch7' },
    chief: { lines: ['מפקדת ה-NOC. כשכל העיר שחורה – אין זמן לפאניקה. בודקים: Hello, Area, מסכה, טיימרים, אימות, passive-interface.', 'סיימו את שבעת הפרקים הראשונים ואתם מוכנים לאפלה הגדולה.'], q: 'ch8' },
    guard: { lines: ['שומר הגשר: מעבר לנהר נמצא <b>אי ההרחבה</b> – חומר מתקדם מעבר ל-CCNA. הגשר ייפתח כשתנצחו באפלה הגדולה במרכז הבקרה.'], gate: true },
    e1npc: { lines: ['שבעה שלבים עד FULL: Down → Init → 2-Way → ExStart → Exchange → Loading → Full. תקבעו לזכור!'], q: 'e1' },
    e2npc: { lines: ['חבילות הדואר: Type 1 – נתב. Type 2 – רשת (DR). Type 3 – סיכום (ABR). Type 5 – חיצוני (ASBR). Type 7 – NSSA.'], q: 'e2' },
    e3npc: { lines: ['דייקסטרה: בכל צעד בוחרים את הצומת הקרוב ביותר שעוד לא ביקרנו בו. פשוט כמו שזה נשמע.'], q: 'e3' },
    e4npc: { lines: ['קצין המכס: Stub חוסם Type 5. Totally Stub חוסם גם Type 3. NSSA מתיר ASBR דרך Type 7. עברו לי בשקט.'], q: 'e4' },
    e5npc: { lines: ['הקברניט: OSPF רץ ישירות על IP פרוטוקול 89 – לא TCP ולא UDP. תזכרו את זה במבחן!'], q: 'e5' },
    croupier: { lines: ['ברוכים הבאים ל-Lucky Packets! כאן ממירים מטבעות 🪙 בהימורים: סלוטס, גבוה/נמוך, והימור על הידע שלכם ב-OSPF.', 'טיפ מהבית: הבית תמיד מנצח… חוץ מבשאלות OSPF, שם אתם יכולים לנצח אותי.'], again: ['הקלפים מחכים לכם. 🎴'], open: 'casino' },
    arms: { lines: ['סיכה, סוחר הנשק. כל נשק אצלי נקרא על שם פרוטוקול: ה-Burst, ה-Flood, ה-LSA… ואל תירו ליד הבניינים, יש שם שוטרים.'], again: ['תחמושת? תמיד יש. 💵'], open: 'arms' },
    cardealer: { lines: ['מהיר, מהיר יותר, ופורמולה OSPF. מה מעניין אתכם? אופנועים ל-Hello מהיר או משוריין לכנופיות?'], open: 'dealer' },
    mechanic: { lines: ['מכונאי הצבע. תן לי רכב ואני אשנה לו פנים – ואם המשטרה מחפשת אתכם, אפילו זהות. 😉'], open: 'garage' },
    jobsboss: { lines: ['מנהלת המשימות! שליחויות, מרוצים, ניקוי כנופיות. כל 3 משימות = +1 כוח (נזק ובריאות). כשתיכנסו לחדר רב־משתתפים – זה ההבדל בין חזק לחלש.'], again: ['יש לי משימה בשבילכם. 💼'], open: 'jobs' },
    sheriff: { lines: ['אני השריף. בעיר הזו אין אירוע שלא מגיעים אליו… תוך דקה. שמרו על חוק – או שלמו קנס.'], open: 'police' },
    doctor: { lines: ['ד״ר אור. אצלי מתעוררים כשנופלים, ומתרפאים בדקות. כסף בבנק לא הולך לאיבוד כשנופלים – תזכרו!'], open: 'hospital' },
    dockmaster: { lines: ['רב החובל! הים פתוח. סירה חינם תמיד מחכה בחוף – ואם רוצים מהירות, יש סירת מירוץ.'], again: ['הים קורא. 🌊'], open: 'dock' },
    banker: { lines: ['הבנקאית. מפקידים, מושכים, ומקבלים ריבית. כסף בחשבון בטוח מנפילות ומעצרים.'], open: 'bank' },
    park: { lines: ['ריצה בפארק! 🏃 טיפ: אפשר לאסוף 🪙 גם מהרכב. וה-⚡ מגביר מהירות ל-10 שניות.', 'שמעתי שיש מטבע זהב בכל בלוק…'] }
  };

  const SHOP = [
    { id: 'hint', ic: '💡', nm: 'רמז', ds: 'מסיר שתי תשובות שגויות בחידון ובשאלות ההבנה', price: 15, stack: true },
    { id: 'shield', ic: '🛡️', nm: 'מגן', ds: 'חיים נוספים אחד במשחקון (מפעילים לפני ההתחלה)', price: 30, stack: true },
    { id: 'time', ic: '⏱️', nm: 'עוד זמן', ds: '+15 שניות במשחקון עם טיימר', price: 25, stack: true },
    { id: 'boots', ic: '👟', nm: 'נעלי טורבו', ds: 'מהירות הליכה +20% לתמיד', price: 80, once: true },
    { id: 'radar', ic: '📡', nm: 'מכ״ם מטבעות', ds: 'מציג מטבעות ודמויות על המיני־מפה', price: 60, once: true },
    { id: 'medkit', ic: '💊', nm: 'ערכת עזרה ראשונה', ds: 'ריפוי מלא מיידי', price: 20, act() { OG.Combat.P.hp = OG.Combat.P.maxHp; } },
    { id: 'armorpack', ic: '🦺', nm: 'שריון קל', ds: '+50 שריון מיידי', price: 30, act() { OG.Combat.P.armor = Math.min(100, OG.Combat.P.armor + 50); } },
    { id: 'ammopack', ic: '📦', nm: 'ארגז תחמושת', ds: 'מילוי תחמושת לכל הנשקים שברשותכם', price: 40, act() { for (const w of OG.Combat.owned()) OG.state.data.weapons[w] += Math.round(OG.WEAPONS[w].pack[0] * .6); OG.Combat.hudWeapon(); } },
    { id: 'cashbag', ic: '💱', nm: 'החלפה למזומן', ds: '🪙 10 ← 💵 60', price: 10, act() { OG.state.addCash(60); } },
    { id: 'sports', ic: '🏎️', nm: 'מנוע ספורט', ds: 'כל רכב שתנהגו בו יהיה מהיר ומחוזק', price: 150, once: true }
  ];
  const JACKETS = ['#22d3ee', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#f87171', '#fb923c', '#e5e7eb'];
  const PAINTS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#ec4899', '#111827'];

  const ui = OG.ui = {
    pauseWorld() { ui.syncPause(); },
    syncPause() { OG.World.paused = screens().children.length > 0 || !dlg().classList.contains('hidden') || !!ui.titleOpen; if (OG.World.paused) document.getElementById('prompt').classList.add('hidden'); },
    init() {
      new MutationObserver(ui.syncPause).observe(screens(), { childList: true });
      document.getElementById('btn-menu').onclick = () => ui.openMenu();
      document.getElementById('btn-map').onclick = () => ui.openMap();
      document.getElementById('btn-mp').onclick = () => OG.MP.openLobby();
      document.getElementById('btn-prof').onclick = () => OG.Svc.profile();
      document.getElementById('btn-sound').onclick = () => { const s = OG.state.data.settings; s.sound = !s.sound; OG.snd.setEnabled(s.sound); OG.state.save(); ui.refreshHud(); };
      OG.World.onInteract = (kind, ref) => {
        if (kind === 'door') {
          const ch = OG.chById(ref.ch);
          if (!OG.isUnlocked(ch.id)) { OG.toast(`🔒 פרק ${ch.num} נעול. סיימו קודם את הפרק הקודם (חידון + משחקון).`, 'warn'); OG.snd.play('bad'); return; }
          OG.snd.play('click'); ui.openHub(ch.id);
        } else if (kind === 'shop') ui.openShop();
        else if (kind === 'svc') OG.Svc.open(ref.svc);
        else if (kind === 'npc') ui.talk(ref);
        else if (kind === 'gate') ui.talk(OG.World.npcs.find(n => n.id === 'guard'));
      };
      ui.refreshHud();
    },
    refreshHud() {
      const d = OG.state.data, $ = OG.$;
      $('#hud-score b').textContent = OG.fmt(OG.state.score()); $('#hud-coins b').textContent = OG.fmt(d.coins); $('#hud-cash b').textContent = OG.fmt(d.cash); $('#hud-power b').textContent = OG.state.power(); $('#hud-rank b').textContent = OG.state.rank();
      $('#btn-sound').textContent = d.settings.sound ? '🔊' : '🔇';
      ui.updateObjective();
    },
    questTarget() {
      const order = OG.CH.map(c => c.id);
      for (const id of order) { if (!OG.state.isComplete(id) && OG.isUnlocked(id)) return id; }
      return null;
    },
    updateObjective() {
      const o = document.getElementById('objective'); const id = ui.questTarget(); const W = OG.World;
      OG.World.gen && (OG.World.gen.gate.open = OG.isUnlocked('e1'));
      if (!id) { o.innerHTML = '🏆 <b>סיימתם את כל הפרקים!</b> חזרו לשפר שיאים, לאסוף 🪙 ולהשלים את המשחקונים ברמה קשה.'; W.target = null; return; }
      const ch = OG.chById(id), c = OG.state.data.ch[id] || {}; const door = W.doors.find(d => d.ch === id);
      let step = !c.lesson ? 'הכנסו ולמדו את השיעור' : !(c.quiz && c.quiz.passed) ? 'עברו את החידון' : 'נצחו במשחקון (70% ומעלה)';
      if (id === 'e1' && W.gen.gate && !W.gen.gate.open) step = 'חצו את הגשר';
      const dist = door ? Math.round(OG.dist((W.P.car || W.P).x, (W.P.car || W.P).y, door.x, door.y) / 10) : 0;
      o.innerHTML = `🎯 <b>${ch.icon} פרק ${ch.num}: ${ch.title}</b> – ${step}${dist > 8 ? ` <span class="muted">(${dist} מ׳)</span>` : ''}`;
      W.target = door ? { x: door.x, y: door.y, ch: id } : null;
    },
    /* ---------- title / intro ---------- */
    showTitle(onStart) {
      ui.titleOpen = true; OG.World.attract = true; OG.World.paused = false;
      document.getElementById('hud').classList.add('hidden');
      const d = OG.state.data;
      const root = el('div.screen'); const card = el('div.panel.title-card');
      card.append(el('div.logo', { html: 'OSPF CITY<small>עיר הנתבים</small>' }),
        el('p', { html: 'משחק למידה בסגנון GTA2 ממבט על. שוטטו בעיר, נהגו ברכבים, אספו 🪙, ולמדו <b>OSPF</b> דרך הנפשות, חידונים ומשחקונים – מהבסיס ועד חבילת EXTRA מתקדמת.' }));
      card.append(el('div.keys',
        el('div', { html: '<kbd>W A S D</kbd> / חצים – הליכה/נהיגה' }), el('div', { html: '<kbd>Shift</kbd> – ריצה · <kbd>רווח</kbd> – בלם יד' }),
        el('div', { html: '<kbd>E</kbd> – כניסה / שיחה / רכב' }), el('div', { html: '<kbd>M</kbd> – מפה · <kbd>Esc</kbd> – תפריט' }),
        el('div', { html: 'עכבר/מגע – לחיצה על הרצפה = הליכה' }), el('div', { html: '<kbd>H</kbd> – צופר 📯' })));
      const row = el('div.row', { style: { justifyContent: 'center', marginTop: '14px' } });
      row.append(el('button.btn.primary', { text: d.started ? '▶ המשך משחק' : '▶ התחל משחק חדש', onclick() { OG.snd.init(); root.remove(); ui.titleOpen = false; OG.World.attract = false; document.getElementById('hud').classList.remove('hidden'); if (!d.started) ui.intro(() => { d.started = true; OG.state.save(); onStart(); }); else onStart(); } }));
      if (d.started) row.append(el('button.btn.danger.small', { text: 'אפס התקדמות', onclick() { if (confirm('למחוק את כל ההתקדמות?')) { OG.state.reset(); location.reload(); } } }));
      card.append(row, el('p.muted', { style: { fontSize: '12px', marginTop: '14px' }, html: `${OG.state.score() ? 'ניקוד שמור: <b>' + OG.state.score() + '</b> · ' : ''}התקדמות נשמרת אוטומטית בדפדפן` }));
      root.append(card); screens().append(root);
      ui.syncPause(); OG.World.paused = false;
    },
    intro(done) {
      const slides = ['<b>שנת 2025.</b> עיר הנתבים – מטרופולין של אלפי נתבים – הייתה מנוהלת על ידי ניתוב סטטי. כל מסלול נכתב ביד.', 'יום אחד קרס הגשר המרכזי. נתב אחד נפל – וכל העיר נותקה. אף אחד לא ידע איך להגיע לאן.', 'ד״ר דייקסטרה שלף פרוטוקול חדש: <b>OSPF</b>. נתבים שמכירים את כל המפה, מחשבים מסלולים לבד, ומתאוששים תוך שניות.', 'אתם המתלמד החדש. התחילו לשוטט, ללמוד ולנצח במשחקונים. העיר מחכה לכם. 🚀'];
      let i = 0; const root = el('div.screen.solid'); screens().append(root);
      const show = () => {
        root.innerHTML = ''; const p = el('div.panel', { style: { maxWidth: '640px', textAlign: 'center', fontSize: '22px', lineHeight: 1.8 } });
        p.append(el('div', { style: { fontSize: '60px' }, text: ['🏚️', '💥', '💡', '🚀'][i] }), el('div', { html: slides[i] }), el('div.row', { style: { justifyContent: 'center', marginTop: '16px' } }, i ? el('button.btn.small', { text: '→', onclick() { i--; show(); } }) : '', el('button.btn.primary', { text: i < slides.length - 1 ? 'הבא ←' : 'יוצאים לדרך!', onclick() { i++; if (i >= slides.length) { root.remove(); done(); } else show(); } }), el('button.btn.small', { text: 'דלג', onclick() { root.remove(); done(); } })));
        root.append(p); OG.snd.play('click');
      }; show();
    },
    /* ---------- chapter hub ---------- */
    openHub(chId) {
      const ch = OG.chById(chId); const root = el('div.screen'); screens().append(root); OG.snd.duck(true);
      const free = OG.state.data.settings.free; const afterAction = id => ui.afterAction(id);
      const render = () => {
        root.innerHTML = ''; const c = OG.state.ch(chId); const lessonOk = c.lesson || free;
        const p = el('div.panel.hub', { style: { '--cc': ch.color, '--c': ch.color + '33' } });
        const sc = OG.state.chapterScore(chId);
        p.append(el('div.hub-head', el('div.hub-icon', { text: ch.icon }), el('div.grow', el('div.tag', { text: ch.pack === 'extra' ? '🌟 EXTRA – חבילת ההרחבה' : ch.boss ? '🚨 בוס' : 'פרק ' + ch.num }), el('h2', { text: ch.title }), el('div.hub-sub', { text: ch.topic })), el('div', { style: { textAlign: 'center' } }, el('div.stars', { text: '★'.repeat(OG.state.stars(chId)) + '☆'.repeat(3 - OG.state.stars(chId)) }), el('div.muted', { text: sc + ' נק׳' })), el('button.btn.small', { text: '✕', onclick() { root.remove(); OG.snd.duck(false); ui.refreshHud(); } })));
        p.append(el('div.hub-story', { html: ch.story }));
        const g = el('div.hub-grid');
        // lesson
        g.append(el('div.card', el('h3', { html: `📖 שיעור ${c.lesson ? '<span class="done">✔ הושלם</span>' : ''}` }), el('div.muted', { text: `${(OG.lessons[chId] || { steps: [] }).steps.length} שלבים עם הנפשות, סימולציות ושאלות הבנה. אפשר לעצור, להאיץ ולדלג.` }), el('div.grow'), el('button.btn.primary', { text: c.lesson ? '↻ ראו שוב' : '▶ התחל שיעור', onclick() { OG.Lesson.open(chId, () => { render(); afterAction(chId); }); } })));
        // quiz
        const q = c.quiz;
        g.append(el('div.card', el('h3', { html: `❓ חידון ${q && q.passed ? '<span class="done">✔ עברתם</span>' : ''}` }), el('div.muted', { text: '6 שאלות עם משוב מיידי. 10 נק׳ על תשובה נכונה בניסיון ראשון.' }), q ? el('div.progress', el('i', { style: { width: q.best + '%' } })) : '', q ? el('div.muted', { text: `שיא: ${q.best}% · ${q.pts} נק׳` }) : '', el('div.grow'), el('button.btn' + (lessonOk ? '.warn' : ''), { text: lessonOk ? '▶ לחידון' : '🔒 סיימו קודם את השיעור', disabled: !lessonOk, onclick() { OG.Quiz.run(chId, () => { render(); afterAction(chId); }); } })));
        // game
        const gc = el('div.card', el('h3', { html: '🎮 משחקון – 3 רמות' }), el('div.muted', { text: OG.games[chId] ? OG.games[chId].story || ch.game : ch.game }));
        const lv = el('div.levels');
        for (const l of [1, 2, 3]) {
          const gm = c.games[l]; const L = OG.GAME_LEVELS[l];
          lv.append(el('button.lvl.l' + l + (gm && gm.pass ? '.done' : ''), { disabled: !lessonOk, onclick() { OG.Game.launch(chId, l, () => { render(); afterAction(chId); }); } }, el('b', { text: L.name }), el('span', { text: `עד ${L.max}` }), el('div', { text: gm ? `${gm.pts} ${gm.pass ? '✔' : ''}` : '—' })));
        }
        gc.append(el('div.grow'), lv, !lessonOk ? el('div.muted', { text: '🔒 נפתח אחרי השיעור' }) : ''); g.append(gc);
        p.append(g);
        root.append(p);
      };
      render();
    },
    /* ---------- completion celebration ---------- */
    afterAction(chId) {
      const c = OG.state.ch(chId);
      if (OG.state.isComplete(chId) && !c.celebrated) {
        c.celebrated = true; OG.state.data.bonusScore += 50; OG.state.addCoins(40); OG.state.save();
        const ch = OG.chById(chId); const next = OG.CH[OG.chIndex(chId) + 1]; const unlocksExtra = chId === 'ch8';
        const root = el('div.screen'); const p = el('div.panel.result');
        p.append(el('div', { style: { fontSize: '70px' }, text: '🏆' }), el('div.grade', { text: `פרק ${ch.num} הושלם!` }), el('p', { html: `+50 נק׳ ו-40 🪙` }),
          el('div.callout.story', { html: unlocksExtra ? '🌉 <b>הגשר לאי ההרחבה נפתח!</b> חבילת ה-EXTRA מחכה מעבר לנהר.' : next ? `נפתח: <b>${next.icon} פרק ${next.num} – ${next.title}</b>. עקבו אחרי החץ הצהוב ➤` : '🎓 סיימתם את כל החומר! כל הכבוד – אתם מעבר ל-CCNA.' }),
          el('button.btn.primary', { text: 'חזרה לעיר', onclick() { root.remove(); ui.refreshHud(); OG.World.updateArrow(); } }));
        root.append(p); screens().append(root); OG.snd.play('win'); ui.confetti();
      }
      ui.refreshHud();
    },
    confetti() {
      const fx = document.getElementById('fx'); const cols = ['#22d3ee', '#ff4fa3', '#fbbf24', '#34d399', '#a78bfa'];
      for (let i = 0; i < 70; i++) { const e = el('i', { style: { position: 'fixed', left: Math.random() * 100 + 'vw', top: '-20px', width: '9px', height: '14px', background: OG.pick(cols), zIndex: 99, pointerEvents: 'none', transform: `rotate(${Math.random() * 360}deg)`, transition: `transform ${2 + Math.random() * 2}s linear, top ${2 + Math.random() * 2}s ease-in, opacity 3.5s` } }); fx.append(e); requestAnimationFrame(() => { e.style.top = '105vh'; e.style.transform = `rotate(${Math.random() * 900}deg) translateX(${(Math.random() - .5) * 200}px)`; e.style.opacity = 0; }); setTimeout(() => e.remove(), 4500); }
    },
    /* ---------- NPC dialog ---------- */
    talk(npc) {
      const data = NPC[npc.id]; if (!data) return; const d = OG.state.data; const first = !d.npcSeen[npc.id];
      let lines = first ? data.lines : (data.again ? [OG.pick(data.again)] : [data.lines[Math.floor(Math.random() * data.lines.length)]]);
      if (data.gate && OG.isUnlocked('e1')) lines = ['הגשר פתוח! סעו או רוצו – אי ההרחבה מחכה. בהצלחה!'];
      d.npcSeen[npc.id] = 1; OG.state.save(); OG.snd.play('click');
      let i = 0; const box = dlg(); box.classList.remove('hidden'); ui.syncPause();
      const finish = () => { box.classList.add('hidden'); box.innerHTML = ''; ui.syncPause(); };
      const close = () => { document.removeEventListener('keydown', keyH); finish(); };
      const showLine = () => {
        box.innerHTML = ''; const tx = el('div.tx'); const hint = el('div.hint', { text: 'E / לחיצה – המשך · Esc – סגירה' });
        box.append(el('div.face', { text: npc.face }), el('div.grow', el('div.nm', { text: npc.name }), tx, el('div.choices'), hint)); box.onclick = ev => { if (ev.target.closest('.choices,button')) return; adv(); };
        typeText(tx, lines[i]);
      };
      const adv = () => {
        if (typing.running) { typing.skip(); return; }
        i++; if (i < lines.length) { showLine(); return; }
        // end of lines
        if (data.shop) { close(); ui.openShop(); return; }
        if (data.open) { close(); OG.Svc.open(data.open); return; }
        if (data.q && !d.npcSeen[npc.id + '_q'] && OG.quizzes[data.q]) { ask(); return; }
        close();
      };
      const ask = () => {
        const item = OG.pick(OG.quizzes[data.q]); box.innerHTML = ''; box.onclick = null;
        const holder = el('div.grow'); holder.append(el('div.nm', { text: npc.name + ' · שאלה ל-8 🪙' }));
        box.append(el('div.face', { text: npc.face }), holder);
        OG.mcq(holder, item, { revealAfter: 1, onDone(r) { d.npcSeen[npc.id + '_q'] = 1; if (r.correct && r.attempts === 1) { OG.state.addCoins(8); OG.toast('+8 🪙 תשובה מושלמת!', 'good'); } OG.state.save(); holder.append(el('button.btn.small.primary', { text: 'סגור', onclick: close, style: { marginTop: '8px' } })); } });
      };
      const keyH = e => { if (/INPUT/.test(e.target.tagName)) return; if (e.key === 'e' || e.key === 'Enter' || e.key === ' ') { if (box.querySelector('.mcq')) return; e.preventDefault(); e.stopPropagation(); adv(); } else if (e.key === 'Escape') close(); };
      setTimeout(() => document.addEventListener('keydown', keyH), 50);
      showLine();
    },
    /* ---------- shop ---------- */
    openShop() {
      const root = el('div.screen'); screens().append(root); const d = OG.state.data;
      const render = () => {
        root.innerHTML = ''; const p = el('div.panel', { style: { width: 'min(900px,96vw)' } });
        p.append(el('div.row', el('h2', { text: '🛒 Net-Mart' }), el('div.grow'), el('span.chip', { html: '🪙 <b>' + d.coins + '</b>' }), el('button.btn.small', { text: '✕', onclick() { root.remove(); ui.refreshHud(); } })));
        const grid = el('div.shop-grid');
        for (const it of SHOP) {
          const have = d.items[it.id] || 0; const owned = it.once && have;
          grid.append(el('div.item', el('div.ic', { text: it.ic }), el('div.nm', { text: it.nm + (it.stack ? ` (${have})` : '') }), el('div.ds', { text: it.ds }), el('button.btn.small' + (owned ? '' : '.warn'), { text: owned ? '✔ ברשותכם' : `🪙 ${it.price}`, disabled: !!owned, onclick() { if (d.coins < it.price) { OG.toast('אין מספיק מטבעות 🪙', 'warn'); OG.snd.play('bad'); return; } d.coins -= it.price; if (it.act) it.act(); else d.items[it.id] = (d.items[it.id] || 0) + 1; OG.snd.play('coin'); OG.state.save(); ui.refreshHud(); render(); } })));
        }
        p.append(grid);
        const sw = (title, arr, key, car) => { const r = el('div.row', { style: { marginTop: '8px' } }, el('b', { text: title })); arr.forEach(col => { const owned = d.ownedLooks.includes(col); const b = el('button', { style: { width: '34px', height: '34px', borderRadius: '50%', border: d.look[key] === col ? '3px solid #fff' : '2px solid #2b3a6e', background: col, position: 'relative' }, title: owned ? 'בחרו' : '12 🪙', onclick() { if (!owned) { if (d.coins < 12) { OG.toast('אין מספיק מטבעות', 'warn'); return; } d.coins -= 12; d.ownedLooks.push(col); } d.look[key] = col; if (key === 'paint') OG.World.playerCar.color = col; OG.state.save(); ui.refreshHud(); render(); } }); if (!owned) b.textContent = '🔒'; r.append(b); }); return r; };
        p.append(el('h3', { text: '🎨 סגנון' }), sw('מעיל:', JACKETS, 'jacket'), sw('צבע רכב אישי:', PAINTS, 'paint'));
        root.append(p);
      };
      render();
    },
    /* ---------- menu / map ---------- */
    openMenu() {
      const root = el('div.screen'); screens().append(root); const d = OG.state.data;
      const render = () => {
        root.innerHTML = ''; const p = el('div.panel', { style: { width: 'min(640px,96vw)' } });
        p.append(el('div.row', el('h2', { text: '☰ תפריט' }), el('div.grow'), el('span.tag', { html: `⭐ ${OG.state.score()} · ${OG.state.rank()}` }), el('button.btn.small', { text: 'חזרה למשחק', onclick() { root.remove(); } })));
        const list = el('div.menu-list');
        list.append(toggle('🔊 צלילים', d.settings.sound, v => { d.settings.sound = v; OG.snd.setEnabled(v); }), toggle('🎵 מוזיקת רקע', d.settings.music, v => { d.settings.music = v; OG.snd.setMusic(v); }), toggle('🌧️ גשם', d.settings.rain, v => { d.settings.rain = v; }), toggle('🔓 מצב חופשי (פתיחת כל הפרקים)', d.settings.free, v => { d.settings.free = v; ui.refreshHud(); render(); }));
        p.append(el('div.row', { style: { margin: '8px 0', flexWrap: 'wrap' } }, el('button.btn.small.primary', { text: '👤 פרופיל וכוחות (P)', onclick() { root.remove(); OG.Svc.profile(); } }), el('button.btn.small.primary', { text: '🌐 רב־משתתפים (G)', onclick() { root.remove(); OG.MP.openLobby(); } }), el('button.btn.small', { text: '📻 רדיו (N)', onclick() { OG.Combat.radio(); } })));
        p.append(list, el('h3', { text: 'פרקים', style: { marginTop: '12px' } }));
        const chs = el('div.menu-list');
        for (const ch of OG.CH) {
          const un = OG.isUnlocked(ch.id), done = OG.state.isComplete(ch.id);
          chs.append(el('div.ch-row' + (un ? '' : '.locked'), { style: { '--cc': ch.color } }, el('div.n', { text: ch.boss ? '★' : ch.num }), el('div.grow', el('b', { text: ch.icon + ' ' + ch.title }), el('div.muted', { style: { fontSize: '12px' }, text: ch.pack === 'extra' ? 'EXTRA' : '' })), el('span.stars', { text: '★'.repeat(OG.state.stars(ch.id)) }), done ? '✅' : un ? '' : '🔒', un ? el('button.btn.small', { text: 'קפיצה', onclick() { const dr = OG.World.doors.find(x => x.ch === ch.id); if (ui.travel(dr.x, dr.y + 70)) root.remove(); } }) : ''));
        }
        p.append(chs, el('div.row', { style: { marginTop: '12px' } }, el('button.btn.danger.small', { text: 'איפוס התקדמות', onclick() { if (confirm('למחוק את כל ההתקדמות?')) { OG.state.reset(); location.reload(); } } })));
        root.append(p);
      };
      const toggle = (label, val, fn) => { const sw = el('button.sw' + (val ? '.on' : '')); sw.onclick = () => { val = !val; sw.classList.toggle('on', val); fn(val); OG.state.save(); }; return el('div.toggle', el('span', { text: label }), sw); };
      render();
    },
    travel(x, y) {
      const d = OG.state.data, C = OG.Combat; if (C.stars) { OG.toast('🚨 אי אפשר לנסוע במונית כשמחפשים אתכם!', 'warn'); return false; }
      const cost = d.settings.free ? 0 : 25; if (d.cash < cost) { OG.toast('מונית עולה 💵 25 – אין מספיק מזומן. אפשר לנסוע ברגל/ברכב!', 'warn'); OG.snd.play('bad'); return false; }
      if (OG.World.P.dead) return false; if (cost) OG.state.addCash(-cost); OG.World.teleport(x, y); OG.toast(cost ? '🚕 מונית! -💵 25' : '✨ קפיצה', 'good'); return true;
    },
    openMap() {
      const root = el('div.screen'); screens().append(root); const p = el('div.panel', { style: { textAlign: 'center' } });
      const cv = el('canvas', { width: 1100, height: 700 }); const wrap = el('div.bigmap', cv);
      p.append(el('div.row', el('h2', { text: '🗺️ מפת העיר' }), el('div.grow'), el('span.muted', { text: 'לחצו על בניין כדי לנסוע אליו במונית · 💵 25' }), el('button.btn.small', { text: 'סגור', onclick() { root.remove(); } })), wrap); root.append(p);
      const spots = OG.World.bigMap(cv);
      cv.onclick = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * cv.width / r.width, y = (e.clientY - r.top) * cv.height / r.height; const s = spots.find(s => OG.dist(s.x, s.y, x, y) < s.r + 6); if (s) { if (!s.un) { OG.toast('🔒 הפרק הזה עדיין נעול', 'warn'); return; } if (ui.travel(s.d.x, s.d.y + 70)) { root.remove(); OG.snd.play('whoosh'); } } };
    }
  };

  // typewriter
  const typing = { running: false, skip() { } };
  function typeText(node, html) {
    typing.running = true; const plain = html; let i = 0; node.innerHTML = '';
    // reveal by characters while keeping tags valid: render progressive substring of text, then final html
    const temp = document.createElement('div'); temp.innerHTML = html; const text = temp.textContent; const total = text.length;
    let id = setInterval(() => { i += 2; if (i >= total) { done(); return; } node.textContent = text.slice(0, i); if (i % 6 === 0) OG.snd.play('tick'); }, 22);
    const done = () => { clearInterval(id); node.innerHTML = html; typing.running = false; };
    typing.skip = done;
  }
})(window.OG);
