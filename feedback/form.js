/* Generic wizard renderer for window.FORM (see config.js). No dependencies. */
(function () {
  const F = window.FORM, $ = (s, r = document) => r.querySelector(s);
  const el = (tag, attrs, ...kids) => { const e = document.createElement(tag); for (const k in (attrs || {})) { const v = attrs[k]; if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); } for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); return e; };
  const KEY = 'fb-draft-' + F.formId;
  const params = new URLSearchParams(location.search), onlyStage = params.get('stage');
  let A = {}, cur = 0, stagesOpen = {};
  try { A = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(A)); } catch (e) { } progress(); };
  const get = (id, d) => (A[id] === undefined ? d : A[id]);
  const set = (id, v) => { if (v === '' || v == null || (Array.isArray(v) && !v.length)) delete A[id]; else A[id] = v; save(); };

  /* ---------- question widgets ---------- */
  const field = (q, body) => el('div', { class: 'q' }, el('div', { class: 'ql', text: q.q }), q.hint ? el('div', { class: 'qh', text: q.hint }) : null, body);
  const chips = (q, store, multi, max) => {
    const wrap = el('div', { class: 'chips' }); const sel = () => store.get(q.id) || (multi ? [] : null);
    q.opts.forEach(o => { const b = el('button', { type: 'button', class: 'chip', dir: 'auto', text: o, onclick() { let v = sel(); if (multi) { v = v.slice(); const i = v.indexOf(o); if (i >= 0) v.splice(i, 1); else { if (max && v.length >= max) { toast('אפשר לבחור עד ' + max); return; } v.push(o); } } else v = v === o ? null : o; store.set(q.id, v); paint(); } }); wrap.append(b); });
    const paint = () => { const v = sel(); [...wrap.children].forEach(b => b.classList.toggle('on', multi ? v.includes(b.textContent) : v === b.textContent)); }; paint(); return wrap;
  };
  const stars = (q, store) => { const wrap = el('div', { class: 'stars' }); const paint = () => { const v = store.get(q.id) || 0; [...wrap.children].forEach((b, i) => b.classList.toggle('on', i < v)); }; for (let i = 1; i <= 5; i++) wrap.append(el('button', { type: 'button', class: 'star', 'aria-label': i, text: '★', onclick() { store.set(q.id, store.get(q.id) === i ? 0 : i); paint(); pop(wrap.children[i - 1]); } })); paint(); return wrap; };
  const scale = (q, store) => { const wrap = el('div', { class: 'scale' }); const row = el('div', { class: 'srow' }); const paint = () => { const v = store.get(q.id); [...row.children].forEach((b, i) => b.classList.toggle('on', v === i + 1)); }; for (let i = 1; i <= 5; i++) row.append(el('button', { type: 'button', class: 'dot', text: i, onclick() { store.set(q.id, store.get(q.id) === i ? 0 : i); paint(); } })); wrap.append(el('span', { class: 'end', text: q.lo }), row, el('span', { class: 'end', text: q.hi })); paint(); return wrap; };
  const nps = (q, store) => { const wrap = el('div', { class: 'nps' }); const row = el('div', { class: 'nrow' }); const paint = () => { const v = store.get(q.id); [...row.children].forEach((b, i) => b.classList.toggle('on', v === i)); }; for (let i = 0; i <= 10; i++) row.append(el('button', { type: 'button', class: 'dot sm', text: i, onclick() { store.set(q.id, store.get(q.id) === i ? -1 : i); paint(); } })); wrap.append(row, el('div', { class: 'ends' }, el('span', { text: q.lo }), el('span', { text: q.hi }))); paint(); return wrap; };
  const text = (q, store, short) => { const i = el(short ? 'input' : 'textarea', { class: 'inp', placeholder: q.ph || '', maxlength: short ? 80 : 900, rows: 3 }); i.value = store.get(q.id) || ''; i.addEventListener('input', () => { store.set(q.id, i.value.trim()); if (!short) { i.style.height = 'auto'; i.style.height = Math.min(220, i.scrollHeight) + 'px'; } }); return i; };
  const matrix = (q, store) => { const val = () => store.get(q.id) || {}; const wrap = el('div', { class: 'matrix' }); q.rows.forEach(r => { const row = el('div', { class: 'mrow' }, el('div', { class: 'mlabel', text: r })); const cs = el('div', { class: 'chips tight' }); q.opts.forEach(o => cs.append(el('button', { type: 'button', class: 'chip sm', dir: 'auto', text: o, onclick() { const v = Object.assign({}, val()); if (v[r] === o) delete v[r]; else v[r] = o; store.set(q.id, Object.keys(v).length ? v : null); paint(); } }))); row.append(cs); wrap.append(row); }); const paint = () => { const v = val(); [...wrap.children].forEach((row, i) => [...row.lastChild.children].forEach(b => b.classList.toggle('on', v[q.rows[i]] === b.textContent))); }; paint(); return wrap; };
  const bugs = (q, store) => {
    const wrap = el('div', { class: 'bugs' }); const list = () => store.get(q.id) || [];
    const render = () => { wrap.innerHTML = ''; list().forEach((b, i) => { const sev = ['קטן', 'מפריע', 'חוסם']; const card = el('div', { class: 'bug' },
      el('div', { class: 'bugh' }, el('b', { text: '🐞 באג ' + (i + 1) }), el('button', { type: 'button', class: 'x', text: '✕', onclick() { const l = list().slice(); l.splice(i, 1); store.set(q.id, l.length ? l : null); render(); } })),
      el('div', { class: 'chips tight' }, ...q.where.map(w => el('button', { type: 'button', class: 'chip sm' + (b.where === w ? ' on' : ''), text: w, onclick() { upd(i, 'where', w); render(); } }))),
      el('div', { class: 'chips tight' }, ...sev.map(w => el('button', { type: 'button', class: 'chip sm' + (b.sev === w ? ' on' : ''), text: 'חומרה: ' + w, onclick() { upd(i, 'sev', w); render(); } }))),
      (() => { const t = el('textarea', { class: 'inp', rows: 2, placeholder: 'מה קרה? מה עשיתם רגע לפני? (שלב, כפתור, מקש…)' }); t.value = b.desc || ''; t.addEventListener('input', () => upd(i, 'desc', t.value.trim())); return t; })()); wrap.append(card); });
      wrap.append(el('button', { type: 'button', class: 'btn ghost', text: '➕ הוסיפו באג', onclick() { const l = list().slice(); l.push({}); store.set(q.id, l); render(); } })); };
    const upd = (i, k, v) => { const l = JSON.parse(JSON.stringify(list())); l[i][k] = v; store.set(q.id, l); }; render(); return wrap;
  };
  const rootStore = { get: id => get(id), set: (id, v) => set(id, v) };
  const build = (q, store) => { const t = q.type; const body = t === 'chips' ? chips(q, store, false) : t === 'multi' ? chips(q, store, true, q.max) : t === 'stars' ? stars(q, store) : t === 'scale' ? scale(q, store) : t === 'nps' ? nps(q, store) : t === 'text' ? text(q, store, false) : t === 'short' ? text(q, store, true) : t === 'matrix' ? matrix(q, store) : t === 'bugs' ? bugs(q, store) : el('div'); return field(q, body); };

  /* ---------- stages ---------- */
  const stageStore = id => ({ get: k => (A.stages && A.stages[id] ? A.stages[id][k] : undefined), set: (k, v) => { A.stages = A.stages || {}; const s = A.stages[id] = A.stages[id] || {}; if (v === '' || v == null || v === 0) delete s[k]; else s[k] = v; if (!Object.keys(s).length) delete A.stages[id]; if (!Object.keys(A.stages).length) delete A.stages; save(); } });
  const stageCard = st => {
    const store = stageStore(st.id); const open = onlyStage || stagesOpen[st.id]; const done = A.stages && A.stages[st.id] && Object.keys(A.stages[st.id]).length;
    const card = el('div', { class: 'stage' + (open ? ' open' : '') + (done ? ' done' : '') });
    card.append(el('button', { type: 'button', class: 'sh', onclick() { stagesOpen[st.id] = !stagesOpen[st.id]; renderStep(); } }, el('span', { class: 'si', text: st.icon }), el('span', { class: 'stt' }, el('b', { text: `שלב ${st.n} · ${st.title}` }), el('small', { text: '🎮 ' + st.game })), el('span', { class: 'sd', text: done ? '✔ ' + Object.keys(A.stages[st.id]).length : '▾' })));
    if (open) { const body = el('div', { class: 'sb' }); F.stageQuestions.forEach(q => { const skip = q.id !== 'played' && store.get('played') === 'לא שיחקתי'; if (!skip) body.append(build(q, store)); }); card.append(body); }
    return card;
  };

  /* ---------- media ---------- */
  const media = (key, cls, fallbackEmoji, fallbackText, kind) => {
    const src = F.media && F.media[key]; const box = el('div', { class: 'media ' + (cls || '') });
    const fb = () => { box.innerHTML = ''; box.append(el('div', { class: 'ph' }, el('div', { class: 'phe', text: fallbackEmoji }), el('div', { text: fallbackText }))); };
    if (!src) { fb(); return box; }
    if (kind === 'video') { const v = el('video', { src, controls: '', playsinline: '', preload: 'metadata' }); v.addEventListener('error', fb); box.append(v); }
    else { const i = el('img', { src, alt: '', loading: 'lazy' }); i.addEventListener('error', fb); box.append(i); }
    return box;
  };

  /* ---------- shell ---------- */
  const steps = onlyStage ? [{ id: 'stage', icon: '🧩', title: 'משוב על שלב בודד', sub: 'דקה אחת – ממש אחרי שסיימתם לשחק', stages: true, only: onlyStage }] : [{ id: 'welcome', welcome: true }].concat(F.steps).concat([{ id: 'done', done: true }]);
  const stepsEl = $('#step'), dots = $('#dots'), xpBar = $('#xpfill'), xpText = $('#xptext'), cheer = $('#cheer');
  const countAnswered = () => { let n = 0; const add = v => { if (v !== undefined && v !== null && v !== -1 && !(Array.isArray(v) && !v.length)) n++; }; for (const k in A) { if (k === 'stages') { for (const s in A.stages) n += Object.keys(A.stages[s]).length; } else if (k === 'bugs') n += (A.bugs || []).length; else add(A[k]); } return n; };
  const TOTAL = onlyStage ? 6 : 28; let lastCheer = -1;
  function progress() {
    const n = countAnswered(); const pct = Math.min(100, Math.round(n / TOTAL * 100)); xpBar.style.width = pct + '%';
    const lvls = ['מתחיל', 'חוקר', 'מעצב', 'אדריכל', 'אגדה']; const li = Math.min(4, Math.floor(pct / 25)); xpText.textContent = `${lvls[li]} · ${n} תשובות · ${pct}% XP`;
    const ch = (F.cheers || []).filter(c => pct >= c.at).pop(); if (ch && ch.at > lastCheer) { lastCheer = ch.at; showCheer(ch); }
  }
  function showCheer(c) { cheer.innerHTML = ''; cheer.classList.add('show'); const g = media(c.gif, 'gifm', '🎉', 'כאן יופיע GIF מעודד', 'img'); cheer.append(g, el('div', { class: 'ct', text: c.t })); clearTimeout(showCheer.t); showCheer.t = setTimeout(() => cheer.classList.remove('show'), 4200); if (c.at === 100) burst(); }
  function toast(t) { const d = el('div', { class: 'toast', text: t }); document.body.append(d); setTimeout(() => d.remove(), 1800); }
  function pop(e) { e.classList.add('pop'); setTimeout(() => e.classList.remove('pop'), 300); }
  function burst() { const c = $('#confetti'), x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight; const P = Array.from({ length: 140 }, () => ({ x: innerWidth / 2, y: innerHeight * .4, vx: (Math.random() - .5) * 16, vy: Math.random() * -14 - 4, c: ['#22d3ee', '#ff4fa3', '#fbbf24', '#34d399', '#a78bfa'][Math.floor(Math.random() * 5)], r: Math.random() * 6 + 3, t: 0 })); let f = 0; (function a() { x.clearRect(0, 0, c.width, c.height); P.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; x.fillStyle = p.c; x.fillRect(p.x, p.y, p.r, p.r * 1.6); }); if (++f < 140) requestAnimationFrame(a); else x.clearRect(0, 0, c.width, c.height); })(); }

  function renderDots() { dots.innerHTML = ''; steps.forEach((s, i) => dots.append(el('button', { type: 'button', class: 'dt' + (i === cur ? ' on' : '') + (i < cur ? ' past' : ''), title: s.title || '', onclick() { go(i); } }, s.icon || (s.welcome ? '🚀' : '🏁')))); }
  function go(i) { cur = Math.max(0, Math.min(steps.length - 1, i)); renderStep(); scrollTo({ top: 0, behavior: 'smooth' }); }
  function renderStep() {
    const s = steps[cur]; stepsEl.innerHTML = ''; renderDots();
    if (s.welcome) return welcome();
    if (s.done) return finish();
    const card = el('section', { class: 'card' }, el('div', { class: 'ch' }, el('span', { class: 'cicon', text: s.icon }), el('div', {}, el('h2', { text: s.title }), el('p', { class: 'sub', text: s.sub }))));
    if (s.stages) { const list = el('div', { class: 'stages' }); F.stages.filter(st => !s.only || st.id === s.only).forEach(st => list.append(stageCard(st))); card.append(list); } else s.q.forEach(q => card.append(build(q, rootStore)));
    if (s.id === 'learn' || s.id === 'play') card.append(media('mid', 'midm', F.mascot.emoji, 'כאן תופיע תמונת עידוד של ' + F.mascot.name));
    stepsEl.append(card, nav(s));
    if (s.id === 'fit') toast('💪 מעולה, עוד קצת ואתם באמצע!');
  }
  function nav(s) { return el('div', { class: 'nav' }, cur > 0 ? el('button', { type: 'button', class: 'btn ghost', text: '→ הקודם', onclick: () => go(cur - 1) }) : el('span'), el('span', { class: 'skip', text: 'אפשר לדלג על כל שאלה' }), onlyStage ? el('button', { type: 'button', class: 'btn primary', text: 'שליחה 🚀', onclick: submit }) : el('button', { type: 'button', class: 'btn primary', text: cur === steps.length - 2 ? 'לסיום ←' : 'הבא ←', onclick: () => go(cur + 1) })); }
  function welcome() {
    const h = el('section', { class: 'card hero' }, media('hero', 'herom', F.mascot.emoji, 'כאן תופיע תמונת הפתיחה (פרומפט בקובץ MEDIA_PROMPTS)'),
      el('h1', { html: `ברוכים הבאים <span class="grad">לצוות הבטא</span>` }),
      el('p', { class: 'lead', html: `אתם מהראשונים שמשחקים ב-<b>${F.game}</b>. כל תשובה שלכם משנה את המשחק – ואחרי כל גרסה נעדכן אתכם מה תיקנו בזכותכם.` }),
      media('welcomeVideo', 'vid', '🎬', 'כאן יופיע סרטון קצר (15 שנ׳) – ברכה מ' + F.mascot.name, 'video'),
      el('div', { class: 'perks' }, ...[['⏱️', '8–10 דקות'], ['🧩', 'מלאו רק מה ששיחקתם'], ['💾', 'נשמר אוטומטית'], ['🏅', 'דרגות XP']].map(p => el('div', { class: 'perk' }, el('b', { text: p[0] }), el('span', { text: p[1] })))),
      el('div', { class: 'row c' }, el('button', { type: 'button', class: 'btn primary big', text: Object.keys(A).length ? 'המשך מאיפה שעצרתי ←' : 'מתחילים ←', onclick: () => go(1) }), el('a', { class: 'btn ghost', href: F.backTo, text: '🎮 למשחק' })));
    stepsEl.append(h);
  }
  const meta = () => ({ ua: navigator.userAgent, screen: innerWidth + 'x' + innerHeight, dpr: devicePixelRatio, touch: 'ontouchstart' in window, lang: navigator.language, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, url: location.href, ref: document.referrer });
  function payload() { return { formId: F.formId, game: F.game, version: F.version, ts: new Date().toISOString(), only: onlyStage || null, meta: meta(), answers: A }; }
  function finish() {
    const card = el('section', { class: 'card hero done' }, media('end', 'herom', '🏆', 'כאן תופיע תמונת הסיום'), el('h1', { html: 'כמעט סיימנו – <span class="grad">שלחו ותהיו אגדה</span>' }), el('p', { class: 'lead', text: 'הנתונים נשלחים אלינו ישירות. אפשר גם לשלוח שוב בעתיד – כל גרסה חדשה מקבלת עוד משוב.' }));
    const status = el('div', { class: 'status' });
    card.append(el('div', { class: 'row c' }, el('button', { type: 'button', class: 'btn primary big', text: 'שליחה 🚀', onclick: () => submit(status) }), el('button', { type: 'button', class: 'btn ghost', text: '← חזרה', onclick: () => go(cur - 1) })), status);
    stepsEl.append(card);
  }
  function summaryText() { const p = payload(); return 'משוב ' + F.game + ' (' + F.version + ')\n' + JSON.stringify(p.answers); }
  async function submit(statusEl) {
    const st = statusEl && statusEl.nodeType ? statusEl : $('#status2'); const box = st || el('div', { class: 'status' }); if (!st) stepsEl.append(box);
    box.className = 'status'; box.textContent = '⏳ שולח…'; const url = (window.OG_FIREBASE || {}).databaseURL;
    try {
      if (!url) throw new Error('no database');
      const r = await fetch(url.replace(/\/$/, '') + '/feedback/' + encodeURIComponent(F.formId) + '.json', { method: 'POST', body: JSON.stringify(payload()) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      try { localStorage.removeItem(KEY); } catch (e) { } box.className = 'status ok'; box.innerHTML = '✅ <b>נשלח! תודה ענקית 🎉</b><br>אתם חלק מהצוות שמעצב את המשחק.'; burst(); showCheer({ at: 100, t: F.cheers[F.cheers.length - 1].t, gif: 'gif1' });
    } catch (e) {
      box.className = 'status err'; box.innerHTML = '⚠️ השליחה האוטומטית לא הצליחה (' + (e.message || e) + '). <b>אל תדאגו – התשובות לא אבדו.</b><br>לחצו להעתקה ושלחו בוואטסאפ לקבוצה:';
      box.append(el('div', { class: 'row c' }, el('button', { type: 'button', class: 'btn primary', text: '📋 העתק תשובות', onclick() { navigator.clipboard.writeText(summaryText()).then(() => toast('הועתק ✔')); } }), el('button', { type: 'button', class: 'btn ghost', text: '⬇️ הורד קובץ', onclick() { const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(payload(), null, 1)], { type: 'application/json' })), download: 'feedback-' + F.formId + '.json' }); a.click(); } })));
    }
  }
  $('#gname').textContent = F.game; document.title = 'משוב בטא · ' + F.game; $('#back').href = F.backTo;
  if (onlyStage) $('#mode').textContent = 'משוב על שלב ' + onlyStage;
  renderStep(); progress(); lastCheer = Math.max(lastCheer, (F.cheers || []).filter(c => Object.keys(A).length && 0).length);
})();
