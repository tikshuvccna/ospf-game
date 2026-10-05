/* OSPF City – service buildings: arms dealer, car dealer, garage, police HQ, hospital, bank, dock, profile */
(function (OG) {
  const { el } = OG;
  const PAINTS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#ec4899', '#111827', '#e5e7eb', '#14b8a6'];
  const S = () => OG.state.data;
  const spend = (n) => { if (S().cash < n) { OG.toast('אין מספיק מזומן 💵', 'warn'); OG.snd.play('bad'); return false; } OG.state.addCash(-n); OG.snd.play('coin'); return true; };

  function panel(title, build, w) {
    const root = el('div.screen'); document.getElementById('screens').append(root);
    const close = () => { root.remove(); OG.ui.refreshHud(); };
    const render = () => {
      root.innerHTML = ''; const p = el('div.panel', { style: { width: `min(${w || 760}px,96vw)` } });
      p.append(el('div.row', el('h2', { text: title }), el('div.grow'), el('span.chip', { html: `💵 <b>${S().cash}</b>` }), el('span.chip', { html: `🪙 <b>${S().coins}</b>` }), el('button.btn.small', { text: '✕', onclick: close })));
      build(p, render, close); root.append(p);
    }; render(); return { close, render };
  }
  const bar = (v, max, col) => el('div', { style: { height: '6px', borderRadius: '3px', background: '#16203f', overflow: 'hidden', margin: '2px 0' } }, el('i', { style: { display: 'block', height: '100%', width: Math.min(100, v / max * 100) + '%', background: col } }));

  const Svc = OG.Svc = {
    open(kind) { const f = Svc[kind]; if (f) { OG.snd.play('click'); f(); } },
    casino() { OG.Casino.open(); },
    jobs() { OG.Missions.open(); },

    arms() {
      panel('🔫 Packet Arms', (p, render) => {
        p.append(el('p.muted', { text: 'כל נשק נקרא על שם משהו מה-OSPF. אזורים בטוחים (🕊️) ליד הבניינים – אי אפשר לירות שם. גלגלת עכבר/1-6 מחליפות נשק.' }));
        const g = el('div.shop-grid');
        for (const k of OG.WEAPON_ORDER) {
          const w = OG.WEAPONS[k], have = S().weapons[k] !== undefined;
          const tl = `נזק ${w.pellets ? w.dmg + '×' + w.pellets : w.dmg}${w.explosive ? ' + פיצוץ' : ''} · קצב ${(1 / w.rate).toFixed(1)}/ש׳${w.freeze ? ' · מקפיא' : ''}`;
          g.append(el('div.item', el('div.ic', { text: w.icon }), el('div.nm', { text: w.name }), el('div.ds', { text: tl }), bar(w.dmg * (w.pellets || 1), 110, '#ef4444'),
            have ? el('div.ds', { text: `תחמושת: ${S().weapons[k]}` }) : '',
            have ? el('button.btn.small.warn', { text: `+${w.pack[0]} תחמושת · 💵 ${w.pack[1]}`, onclick() { if (spend(w.pack[1])) { S().weapons[k] += w.pack[0]; OG.Combat.hudWeapon(); OG.state.save(); render(); } } })
              : el('button.btn.small.warn', { text: `קנו · 💵 ${w.price}`, onclick() { if (spend(w.price)) { S().weapons[k] = w.pack[0]; S().wsel = k; OG.Combat.hudWeapon(); OG.Ach.check(); OG.state.save(); render(); } } })));
        }
        g.append(el('div.item', el('div.ic', { text: '🛡️' }), el('div.nm', { text: 'אפוד מגן' }), el('div.ds', { text: '+50 שריון' }), el('button.btn.small.warn', { text: '💵 60', onclick() { if (spend(60)) { OG.Combat.P.armor = Math.min(100, OG.Combat.P.armor + 50); render(); } } })));
        p.append(g);
      });
    },
    dealer(only) {
      panel(only === 'water' ? '⛵ סירות' : '🏎️ Speed Dealer', (p, render) => {
        p.append(el('p.muted', { text: 'כל רכב שקניתם מחכה בחניה ליד הסוכנות (סירות – ליד המזח). אפשר לבחור צבע בקנייה.' }));
        const g = el('div.shop-grid'); let paint = S().look.paint;
        const pr = el('div.row', { style: { margin: '6px 0' } }, el('b', { text: 'צבע:' }));
        const mk = () => { pr.querySelectorAll('button').forEach(b => b.remove()); PAINTS.forEach(c => pr.append(el('button', { style: { width: '26px', height: '26px', borderRadius: '50%', background: c, border: paint === c ? '3px solid #fff' : '2px solid #2b3a6e' }, onclick() { paint = c; mk(); } }))); }; mk();
        for (const k in OG.VEH) {
          const v = OG.VEH[k]; if (!v.price) continue; if (only === 'water' ? !v.water : v.water) continue;
          const have = S().ownedVeh.filter(o => o.type === k).length;
          g.append(el('div.item', el('div.ic', { text: v.icon }), el('div.nm', { text: v.name + (have ? ` ×${have}` : '') }), el('div.ds', { text: `מהירות ${Math.round(v.top * .22)} קמ״ש · חוזק ${v.hp}` }), bar(v.top, 850, '#22d3ee'), bar(v.hp, 700, '#34d399'),
            el('button.btn.small.warn', { text: `קנו · 💵 ${v.price}`, onclick() { if (spend(v.price)) { S().ownedVeh.push({ type: k, color: paint }); OG.World.spawnOwned(); OG.Ach.check(); OG.state.save(); OG.toast(`${v.icon} ${v.name} מחכה בחניה!`, 'good'); render(); } } })));
        }
        p.append(pr, g);
      });
    },
    dock() { Svc.dealer('water'); },
    garage() {
      panel('🔧 Pay\'n\'Spray', (p, render, close) => {
        const W = OG.World, c = W.P.car;
        p.append(el('p.muted', { text: c ? `אתם ב${c.spec.name}. תיקון, צבע חדש, או "מחיקת זהות" שמוריד את המשטרה מהגב.` : 'כנסו לרכב (E) והגיעו לכאן כדי לתקן, לצבוע או להעלים את המשטרה.' }));
        const row = el('div.row', { style: { margin: '8px 0', flexWrap: 'wrap' } });
        row.append(el('button.btn.warn', { text: '🔧 תיקון מלא · 💵 40', disabled: !c, onclick() { if (c && spend(40)) { c.hp = c.maxhp; c.burn = 0; OG.toast('🔧 הרכב כמו חדש', 'good'); render(); } } }));
        row.append(el('button.btn.warn', { text: '🕵️ הורדת מבוקש · 💵 250', disabled: !c || !OG.Combat.stars, onclick() { if (spend(250)) { OG.Combat.setStars(0); OG.toast('🎨 צבע חדש – אף אחד לא מזהה אתכם!', 'good'); render(); } } }));
        p.append(row, el('b', { text: 'צבע חדש · 💵 20' }));
        const pr = el('div.row', { style: { marginTop: '6px' } }); PAINTS.forEach(col => pr.append(el('button', { style: { width: '30px', height: '30px', borderRadius: '50%', background: col, border: '2px solid #2b3a6e' }, disabled: !c, onclick() { if (c && spend(20)) { c.color = col; if (c.owned) c.owned.color = col; if (c === W.playerCar) S().look.paint = col; OG.state.save(); render(); } } })));
        p.append(pr);
      }, 640);
    },
    police() {
      panel('🚓 תחנת משטרה', (p, render, close) => {
        const st = OG.Combat.stars;
        p.append(el('p', { html: st ? `יש לכם <b>${st} ★</b> מבוקש. השריף מוכן לשכוח מהכול… תמורת תשלום.` : 'אתם נקיים. תמשיכו ככה (או שלא 😏). שימו לב: בתחנה ובקרבתה אי אפשר לירות.' }));
        p.append(el('button.btn.warn', { text: `💵 שלמו קנס ${120 * st}`, disabled: !st, onclick() { if (spend(120 * st)) { OG.Combat.setStars(0); OG.toast('🚓 הקנס שולם. אתם חופשיים.', 'good'); close(); } } }));
        p.append(el('div.muted', { style: { marginTop: '10px' }, html: '<b>טיפים:</b> התרחקו מהמשטרה ובצעו מסתור כדי שהכוכבים ייעלמו · 👻 רוח רפאים מבטל מבוקש · עצירה ליד 2 שוטרים = מעצר.' }));
      }, 560);
    },
    hospital() {
      panel('🏥 בית החולים', (p, render) => {
        const P = OG.Combat.P;
        p.append(el('p', { html: `בריאות: <b>${Math.ceil(P.hp)}/${P.maxHp}</b> · שריון: <b>${Math.ceil(P.armor)}</b>` }));
        p.append(el('div.row', el('button.btn.warn', { text: '❤️ ריפוי מלא · 💵 30', disabled: P.hp >= P.maxHp, onclick() { if (spend(30)) { P.hp = P.maxHp; render(); } } }), el('button.btn.warn', { text: '🛡️ שריון מלא · 💵 70', disabled: P.armor >= 100, onclick() { if (spend(70)) { P.armor = 100; render(); } } })));
        p.append(el('div.muted', { style: { marginTop: '10px' }, text: 'כשאתם נופלים – מתעוררים כאן, אבל מאבדים 20% מהמזומן. כסף בבנק בטוח!' }));
      }, 560);
    },
    bank() {
      const d = S(); const ticks = Math.min(20, Math.floor((d.playtime - (d.bankT || d.playtime)) / 60)); if (ticks > 0 && d.bank > 0) { const gain = Math.floor(d.bank * .01 * ticks); d.bank += gain; OG.toast(`🏦 ריבית: +💵 ${gain}`, 'good'); } d.bankT = d.playtime;
      panel('🏦 Route Reserve Bank', (p, render) => {
        p.append(el('div.callout.good', { html: `💰 בחשבון: <b>💵 ${d.bank}</b> · ריבית 1% לדקה של משחק (עד 20 דקות). הכסף בבנק <b>לא הולך לאיבוד</b> כשנופלים או נעצרים.` }));
        const dep = [50, 200, 1000], row = el('div.row', { style: { flexWrap: 'wrap', margin: '8px 0' } }, el('b', { text: 'הפקדה:' }));
        for (const v of dep) row.append(el('button.btn.small', { text: v, onclick() { if (d.cash >= v) { d.cash -= v; d.bank += v; OG.snd.play('coin'); OG.state.save(); render(); } else OG.toast('אין מספיק מזומן', 'warn'); } }));
        row.append(el('button.btn.small.warn', { text: 'הכול', onclick() { d.bank += d.cash; d.cash = 0; OG.state.save(); render(); } }));
        const wr = el('div.row', { style: { flexWrap: 'wrap' } }, el('b', { text: 'משיכה:' }));
        for (const v of dep) wr.append(el('button.btn.small', { text: v, onclick() { if (d.bank >= v) { d.bank -= v; d.cash += v; OG.snd.play('coin'); OG.state.save(); render(); } else OG.toast('אין מספיק בחשבון', 'warn'); } }));
        wr.append(el('button.btn.small.warn', { text: 'הכול', onclick() { d.cash += d.bank; d.bank = 0; OG.state.save(); render(); } }));
        p.append(row, wr);
      }, 600);
    },

    /* ---------------- profile / powers ---------------- */
    profile() {
      panel('👤 פרופיל וכוחות', (p) => {
        const d = S(), C = OG.Combat, pw = OG.state.power();
        p.append(el('div.row', el('span.chip', { html: `💪 כוח <b>${pw}</b>` }), el('span.chip', { html: `❤️ בריאות מקס׳ <b>${C.perk('maxhp')}</b>` }), el('span.chip', { html: `⚔️ בונוס נזק <b>+${Math.round(C.perk('dmg') * 100)}%</b>` }), el('span.chip', { html: `🎖️ ${OG.state.rank()}` })));
        p.append(el('p.muted', { text: 'כוח = פרקים שהושלמו + משימות/3. כל פרק פותח יכולת קבועה – ככה שחקן שלמד יותר חזק יותר גם ב-PvP.' }));
        const PK = [['ch1', '💨', 'Dash (Q)', 'דאש מהיר בלתי פגיע'], ['ch2', '🌊', 'Pulse (R)', 'גל הדף שפוגע ודוחף אויבים'], ['ch3', '📡', 'Hello Ping (C)', 'מסמן אויבים ושחקנים'], ['ch4', '💰', 'ריבית', '+25% מזומן משלל'], ['ch5', '🎯', 'Wildcard', '+15% נזק'], ['ch6', '🛟', 'BDR', 'החייאה אחת (דקתיים צינון)'], ['ch7', '🖥️', 'Show Run', 'קריטי 12% + פס חיים לאויבים'], ['ch8', '🧱', 'Firewall (X)', 'חומת אש + 20 בריאות'], ['e1', '🤜', 'Full State', 'תחמושת מוגדלת ×1.5'], ['e2', '📮', 'LSA Magnet', 'מגנט איסוף קבוע'], ['e3', '🔭', 'SPF Aim', 'סיוע כיוון קל'], ['e4', '🛃', 'Customs', 'שיקום שריון'], ['e5', '✈️', 'Turbo', '+10% מהירות הליכה, +5% רכב']];
        const g = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: '6px' } });
        for (const [id, ic, nm, ds] of PK) { const on = C.has(id), ch = OG.chById(id); g.append(el('div', { style: { padding: '8px', borderRadius: '10px', border: '1px solid ' + (on ? '#34d399' : '#2b3a6e'), opacity: on ? 1 : .45, background: 'rgba(10,16,36,.6)' } }, el('b', { text: `${ic} ${nm}` }), el('div.muted', { style: { fontSize: '12px' }, text: on ? ds : `🔒 פרק ${ch.num} – ${ch.title}` }))); }
        p.append(g);
        p.append(el('h3', { text: '🏅 הישגים', style: { marginTop: '12px' } }));
        const a = el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } }); for (const [id, ic, nm, ds] of OG.Ach.list) a.append(el('span.chip', { style: { opacity: d.ach[id] ? 1 : .35 }, title: ds, text: `${ic} ${nm}` })); p.append(a);
        p.append(el('div.muted', { style: { marginTop: '10px' }, html: `💎 שברי LSA: <b>${Object.keys(d.shards).length}/25</b> · חיסולים: <b>${d.stats.kills}</b> · נפילות: <b>${d.stats.deaths}</b> · משימות: <b>${d.missions.done}</b> · ⚔️ PvP: <b>${d.stats.mpKills}</b>` }));
      }, 860);
    }
  };
})(window.OG);
