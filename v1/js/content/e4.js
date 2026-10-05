/* EXTRA 4 – Stub, Totally Stub, NSSA, Totally NSSA, summarization */
(function (OG) {
  const { el } = OG;

  function areaTable(host) {
    const cols = ['LSA 1/2', 'Type 3', 'Type 4/5', 'Type 7', 'ברירת מחדל', 'ASBR באזור'];
    const rows = [
      ['אזור רגיל', ['✔', '✔', '✔', '✘', '—', '✔']], ['Stub', ['✔', '✔', '✘', '✘', '✔ (ABR)', '✘']], ['Totally Stub', ['✔', '✘ (פרט לברירת מחדל)', '✘', '✘', '✔ (ABR)', '✘']], ['NSSA', ['✔', '✔', '✘', '✔', 'אופציונלי', '✔']], ['Totally NSSA', ['✔', '✘ (פרט לברירת מחדל)', '✘', '✔', '✔ (ABR)', '✔']]
    ];
    const info = el('div.callout.info', { text: 'לחצו על שורה כדי לראות את פקודת ההגדרה והסבר.' });
    const cmd = { 'אזור רגיל': 'ברירת מחדל – אין צורך בהגדרה.', 'Stub': 'area 1 stub (על כל הנתבים באזור!). חוסם Type 5 וגם 4; ה-ABR מזריק ברירת מחדל.', 'Totally Stub': 'area 1 stub no-summary (על ה-ABR) ו-area 1 stub על שאר הנתבים באזור. חוסם גם Type 3 ומזריק ברירת מחדל.', 'NSSA': 'area 1 nssa. חוסם Type 5 אבל מאפשר ASBR באזור: הוא יוצר Type 7 וה-ABR ממיר ל-5.', 'Totally NSSA': 'area 1 nssa no-summary (על ה-ABR). כמו NSSA וגם חוסם Type 3.' };
    const t = el('table', { style: { width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '13px' } });
    t.append(el('tr', el('th', { style: { padding: '6px', background: '#1c2a58', border: '1px solid #2b3a6e' } }), cols.map(c => el('th', { text: c, style: { padding: '6px', background: '#1c2a58', border: '1px solid #2b3a6e' } }))));
    rows.forEach(([n, v]) => { const tr = el('tr', { style: { cursor: 'pointer' }, onclick() { OG.$$('tr', t).forEach(x => x.style.outline = ''); tr.style.outline = '2px solid #fbbf24'; info.innerHTML = `<b>${n}</b><br><code>${cmd[n]}</code>`; OG.snd.play('pop'); } }, el('td', { text: n, style: { padding: '8px', fontWeight: 800, border: '1px solid #2b3a6e', background: '#14204a' } }), v.map(x => el('td', { text: x, style: { border: '1px solid #2b3a6e', background: x.startsWith('✔') ? 'rgba(52,211,153,.15)' : x.startsWith('✘') ? 'rgba(251,113,133,.15)' : '', padding: '6px' } }))); t.append(tr); });
    host.append(el('div.wbox', el('h3', { text: '🛃 טבלת סוגי האזורים' }), el('div.muted', { text: 'מי עובר ומי נחסם בכל סוג אזור.' })), el('div.wbox', t), info);
  }

  function sumWidget(host) {
    const ta = el('textarea', { rows: 4, style: { width: '100%', background: '#0b1230', color: '#e8ecff', border: '1px solid #2b3a6e', borderRadius: '10px', padding: '8px', fontFamily: 'var(--mono)', direction: 'ltr', fontSize: '14px' } });
    ta.value = '192.168.0.0/24\n192.168.1.0/24\n192.168.2.0/24\n192.168.3.0/24'; const out = el('div.wbox');
    function render() {
      const nets = ta.value.split(/\n/).map(s => s.trim()).filter(Boolean).map(s => { const m = /^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/.exec(s); return m ? { ip: OG.ip2n(m[1]), p: +m[2], s } : null; });
      if (!nets.length || nets.some(n => !n)) { out.innerHTML = '<span class="muted">הקלידו רשתות בפורמט x.x.x.x/p, אחת בכל שורה.</span>'; return; }
      let p = Math.min(...nets.map(n => n.p)); const first = nets[0].ip;
      while (p > 0 && !nets.every(n => (n.ip >>> (32 - p)) === (first >>> (32 - p)))) p--;
      const base = p === 0 ? 0 : ((first >>> (32 - p)) << (32 - p)) >>> 0; const size = Math.pow(2, 32 - p); const covered = nets.reduce((a, n) => a + Math.pow(2, 32 - n.p), 0);
      out.innerHTML = `<div class="wlabel">הסיכום הקטן ביותר שמכסה את כולן:</div><div class="bigval">${OG.n2ip(base)}/${p}</div><div>מסכה: <code>${OG.prefix2mask(p)}</code> · Wildcard: <code>${OG.mask2wild(OG.prefix2mask(p))}</code></div><div class="muted" style="margin-top:6px">הסיכום מכסה ${size} כתובות, והרשתות שלכם מכסות ${covered}. ${covered === size ? '✅ התאמה מושלמת – אין "חורים".' : '⚠️ הסיכום כולל גם כתובות שלא ברשימה (חורים) – זהירות!'}</div><div class="cli" style="margin-top:8px">ABR(config-router)# <span class="hl">area 1 range ${OG.n2ip(base)} ${OG.prefix2mask(p)}</span></div>`;
    }
    ta.oninput = render;
    host.append(el('div.wbox', el('h3', { text: '🧮 מחשבון סיכום מסלולים' }), el('div.muted', { html: 'הקלידו רשתות (אחת בכל שורה) ותראו איזה סיכום אחד מכסה את כולן.' }), ta), out, el('div.callout.tip', { html: '💡 סיכום טוב מקטין את טבלאות הניתוב והעומס, ומסתיר "רעידות" (קו שנופל וחוזר) בתוך האזור.' })); render();
  }

  OG.lessons.e4 = {
    steps: [
      {
        title: 'למה אזורים מיוחדים?',
        html: `<div class="callout story">🛃 קצין המכס: "אזור קטן עם נתב קטן לא רוצה שייפלו עליו אלפי ניתובים מהעולם החיצון. אנחנו חוסמים."</div>
          <p>אזורי <b>STUB</b> הם אזורים שבהם <b>מונעים מעבר של הודעות LSA מסוגים מסוימים</b>. כך הנתבים הקטנים לא נדרשים לזכור ולחשב כל כך הרבה.</p>
          <div class="callout info">💡 זוכרים את שדה ה-<b>Stub Area Flag</b> בהודעת Hello? שני צידי הקו חייבים להסכים אם האזור Stub – אחרת אין שכנות.</div>`,
        scene(S) {
          S.node('CL', 60, 80, { type: 'cloud', label: 'עולם חיצוני' }); S.node('ASBR', 190, 80, { label: 'ASBR' }); S.node('ABR', 400, 190, { label: 'ABR' }); S.node('R', 640, 190, { label: 'R קטן' });
          S.area('a1', { cx: 640, cy: 190, rx: 130, ry: 100, color: '#fb7185', label: 'Area 1', lx: 640, ly: 110 });
          S.link('CL', 'ASBR'); S.link('ASBR', 'ABR'); S.link('ABR', 'R');
          for (let i = 0; i < 5; i++) S.at(.5 + i * .6, S => S.packet(['ASBR', 'ABR', 'R'], null, { label: 'Type 5', color: '#f472b6', dur: 2.2 }));
          S.at(4.5, S => S.note('n', 380, 300, '🔥 אלפי LSA חיצוניים מציפים את הנתב הקטן', { w: 340, cls: 'r' }));
        }
      },
      {
        title: 'Stub ו-Totally Stub',
        html: `<ul><li><b>Stub</b> – חוסם <b>Type 5</b> (ו-Type 4): אין ASBR באזור ולא מתקבלות הודעות מ-ASBR. ה-ABR מזריק <b>ניתוב ברירת מחדל</b>. הגדרה: <code>area 1 stub</code> – <b>בכל נתבי האזור</b>.</li>
          <li><b>Totally Stub</b> – כמו Stub, וגם חוסם <b>Type 3</b> (עדכונים על אזורים אחרים), פרט לברירת המחדל. הגדרה על ה-ABR: <code>area 1 stub no-summary</code>.</li></ul>`,
        scene(S) {
          S.node('ASBR', 80, 80, { label: 'ASBR' }); S.node('ABR', 300, 190, { label: 'ABR' }); S.node('R', 640, 190, { label: 'R' }); S.node('A2', 80, 300, { label: 'Area 2' });
          S.area('a1', { cx: 640, cy: 190, rx: 130, ry: 100, color: '#fb7185', label: 'Stub', lx: 640, ly: 110 });
          S.link('ASBR', 'ABR'); S.link('ABR', 'R'); S.link('A2', 'ABR');
          S.at(.6, S => S.packet(['ASBR', 'ABR'], null, { label: 'Type 5', color: '#f472b6', dur: 1.6, then: S => { S.say('ABR', '⛔ חסום', { cls: 'r', w: 90, dy: 80, dur: 2 }); } }));
          S.at(3, S => S.packet(['A2', 'ABR', 'R'], null, { label: 'Type 3', color: '#fbbf24', dur: 2.5 }));
          S.at(6, S => S.packet(['ABR', 'R'], null, { label: '0.0.0.0/0', color: '#34d399', dur: 1.8 }));
          S.at(8, S => S.note('n', 260, 330, 'ה-ABR מזריק ברירת מחדל – R יודע "לשלוח הכול לשם"', { w: 360, cls: 'g', align: 'center' }));
        }
      },
      {
        title: 'NSSA – Not So Stubby Area',
        html: `<p><b>NSSA</b> חוסם Type 5, אבל <b>מאפשר ASBR באזור</b>: הוא מוציא את הניתובים החיצוניים כ-<b>Type 7</b>, וכשהם מגיעים ל-ABR הוא <b>ממיר</b> אותם ל-Type 5 ומפיץ לשאר ה-AS.</p>
          <p><b>Totally NSSA</b> – כמו NSSA וגם חוסם Type 3 (<code>area 1 nssa no-summary</code>).</p>`,
        scene(S) {
          S.node('CL', 70, 190, { type: 'cloud', label: 'חיצוני' }); S.node('ASBR', 220, 190, { label: 'ASBR' }); S.node('ABR', 440, 190, { label: 'ABR' }); S.node('R0', 680, 190, { label: 'Area 0' });
          S.area('nssa', { x: 150, y: 80, w: 290, h: 220, rect: true, color: '#a78bfa', label: 'NSSA', lx: 295, ly: 105 });
          S.link('CL', 'ASBR'); S.link('ASBR', 'ABR'); S.link('ABR', 'R0');
          S.at(.6, S => S.packet('CL', 'ASBR', { label: 'חיצוני', color: '#f472b6', dur: 1.3 }));
          S.at(2, S => S.packet('ASBR', 'ABR', { label: 'Type 7', color: '#a78bfa', dur: 2 }));
          S.at(4.2, S => { S.say('ABR', 'ממיר 7 → 5', { cls: 'y', w: 110, dy: 80, dur: 2 }); S.mark('ABR', '#fbbf24'); });
          S.at(5, S => S.packet('ABR', 'R0', { label: 'Type 5', color: '#f472b6', dur: 2 }));
        }
      },
      {
        title: 'כל הסוגים בטבלה אחת',
        html: `<p>טבלת הסיכום: מי עובר ומי נחסם בכל סוג אזור. זה מה שתצטרכו להחליט במשחקון!</p>`,
        widget: areaTable
      },
      {
        title: 'בדיקת הבנה #1',
        html: '<p>חשבו על מי יוצר מה.</p>',
        check: { q: 'איזה סוג אזור מונע Type 5 אבל <b>מאפשר ASBR</b> באזור?', opts: ['Stub', 'Totally Stub', 'NSSA', 'Area 0'], a: 2, why: 'NSSA – ה-ASBR יוצר Type 7, וה-ABR ממיר ל-Type 5.', fb: { 0: 'ב-Stub אסור שיהיה ASBR.' } }
      },
      {
        title: 'בדיקת הבנה #2',
        html: '<p>מה ההבדל בין Stub ל-Totally Stub?</p>',
        check: { q: 'מה Totally Stub חוסם בנוסף ל-Type 5?', opts: ['Type 1', 'Type 2', 'Type 3 (פרט לברירת מחדל)', 'Type 7 בלבד'], a: 2, why: 'Totally Stub חוסם גם Type 3 – נשארת רק ברירת המחדל.' }
      },
      {
        title: 'בונוס: סיכום מסלולים (Summarization)',
        html: `<p>במקום לפרסם הרבה רשתות קטנות, <b>ABR</b> יכול לפרסם <b>סיכום אחד</b> מאזור אחד לאחרים: <code>area 1 range 192.168.0.0 255.255.252.0</code>. (ו-<b>ASBR</b> מסכם חיצוניים עם <code>summary-address</code>.)</p>
          <p>למשל 192.168.0.0/24 עד 192.168.3.0/24 מסתכמות ל-<code>192.168.0.0/22</code>. נסו!</p>`,
        widget: sumWidget
      },
      {
        title: 'בדיקת הבנה #3',
        html: '<p>סיכום קלאסי.</p>',
        check: { q: 'מהו הסיכום הקטן ביותר שמכסה את הרשתות 10.1.0.0/24 עד 10.1.3.0/24?', opts: ['10.1.0.0/24', '10.1.0.0/22', '10.1.0.0/16', '10.1.0.0/23'], a: 1, why: 'ארבע רשתות /24 רצופות = /22 (1024 כתובות). /23 מכסה רק שתיים.' }
      },
      {
        title: 'סיכום',
        html: `<div class="callout story">🛃 קצין המכס: "הדרכון שלכם בתוקף. לכו לבקר את הגבול!"</div>
          <ul><li>Stub: חוסם 5 (ו-4), ברירת מחדל מה-ABR. Totally Stub: חוסם גם 3.</li><li>NSSA: מתיר ASBR (Type 7 → 5 ב-ABR). Totally NSSA: חוסם גם 3.</li><li>הגדרת Stub/NSSA חייבת להיות זהה בכל נתבי האזור (שדה ב-Hello).</li><li>סיכום: <code>area X range</code> ב-ABR.</li></ul>`,
        scene(S) { S.node('N', 400, 190, { type: 'emoji', emoji: '🛃', fs: 110 }); }
      }
    ]
  };

  OG.quizzes.e4 = [
    { q: 'איזה סוג אזור חוסם Type 5 בלבד (ו-4), אך מתיר Type 3?', opts: ['Totally Stub', 'Stub', 'NSSA', 'Totally NSSA'], a: 1, why: 'Stub רגיל חוסם 5 (ו-4) ומתיר 3.' },
    { q: 'מה ה-ABR מזריק לאזור Stub?', opts: ['Type 5 רגילים', 'ניתוב ברירת מחדל', 'כלום', 'Type 7'], a: 1, why: 'ברירת מחדל, כדי שהנתבים הקטנים יידעו לאן לשלוח.' },
    { q: 'ב-NSSA ה-ASBR מוציא ניתובים חיצוניים בתור…', opts: ['Type 3', 'Type 5', 'Type 7', 'Type 2'], a: 2, why: 'Type 7, וה-ABR ממיר ל-5.' },
    { q: 'מה חוסם Totally NSSA?', opts: ['Type 5 ו-Type 3 (פרט לברירת מחדל)', 'רק Type 7', 'Type 1', 'כלום'], a: 0, why: 'Totally NSSA = NSSA + חסימת Type 3.' },
    { q: 'מה קורה אם בנתב אחד באזור הוגדר stub ובשני לא?', opts: ['הכול עובד', 'לא תיווצר שכנות – ה-Stub flag בהודעת Hello חייב להתאים', 'הם הופכים ל-ABR', 'נבחר DR'], a: 1, why: 'סוג האזור הוא אחד מהשדות שחייבים להתאים.' },
    { q: 'איזו פקודה על ה-ABR יוצרת Totally Stub?', opts: ['area 1 stub', 'area 1 stub no-summary', 'area 1 nssa', 'area 1 range'], a: 1, why: 'stub no-summary חוסם גם Type 3.' },
    { q: 'סיכום 172.16.8.0/24–172.16.15.0/24 הוא…', opts: ['172.16.8.0/21', '172.16.8.0/22', '172.16.0.0/16', '172.16.8.0/24'], a: 0, why: '8 רשתות /24 רצופות = /21.' }
  ];
})(window.OG);
