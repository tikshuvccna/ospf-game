/* OSPF City – persistent state */
(function (OG) {
  const KEY = 'ospf-city-v2', OLD = 'ospf-city-v1';
  const def = () => ({
    v: 1, name: '', started: false,
    coins: 0, cash: 150, bonusScore: 0, bank: 0,
    weapons: { pistol: 60 }, wsel: 'pistol', ownedVeh: [], missions: { done: 0, byType: {} }, stats: { kills: 0, deaths: 0, ko: 0, cashEarned: 0, wanted: 0, mpKills: 0 },
    shards: {}, ach: {}, casino: { won: 0, lost: 0, plays: 0 }, perk: {},
    items: { hint: 2, shield: 0, time: 0, boots: 0, radar: 0, sports: 0 },
    look: { jacket: '#22d3ee', paint: '#ef4444' },
    ownedLooks: ['#22d3ee', '#ef4444'],
    ch: {},                 // id -> {lesson:bool, quiz:{best,pts}, games:{1:{pts,pass},2:..}, checks:pts}
    collected: {},          // coin ids picked up
    npcSeen: {},
    pos: null,
    settings: { sound: true, music: true, free: false, rain: false, radio: 0 },
    playtime: 0
  });
  const S = OG.state = {
    data: def(),
    load() {
      try {
        let j = localStorage.getItem(KEY), migrated = false; if (!j) { j = localStorage.getItem(OLD); migrated = !!j; }
        if (j) {
          const d = JSON.parse(j), D = def(); S.data = Object.assign(D, d);
          for (const k of ['items', 'settings', 'stats', 'missions', 'casino', 'look']) S.data[k] = Object.assign(D[k], d[k]);
          if (migrated) { S.data.collected = {}; S.data.pos = null; }
        }
      } catch (e) { }
      return S.data;
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(S.data)); } catch (e) { } },
    reset() { try { localStorage.removeItem(KEY); } catch (e) { } S.data = def(); },
    ch(id) { const d = S.data; return d.ch[id] || (d.ch[id] = { lesson: false, quiz: null, games: {}, checks: 0 }); },
    // scoring
    chapterScore(id) {
      const c = S.data.ch[id]; if (!c) return 0;
      let s = (c.checks || 0) + (c.quiz ? c.quiz.pts : 0);
      for (const l in c.games) s += c.games[l].pts || 0;
      return s;
    },
    power() { let n = 0; for (const id in S.data.ch) if (S.isComplete(id)) n++; return n + Math.floor((S.data.missions.done || 0) / 3); },
    chaptersDone() { let n = 0; for (const id in S.data.ch) if (S.isComplete(id)) n++; return n; },
    addCash(n, why) { S.data.cash = Math.max(0, S.data.cash + Math.round(n)); if (n > 0) S.data.stats.cashEarned += n; OG.ui && OG.ui.refreshHud(); S.save(); },
    score() { let s = S.data.bonusScore || 0; for (const id in S.data.ch) s += S.chapterScore(id); return Math.round(s); },
    addCoins(n) { S.data.coins = Math.max(0, S.data.coins + n); OG.ui && OG.ui.refreshHud(); S.save(); },
    isComplete(id) {
      const c = S.data.ch[id]; if (!c) return false;
      if (!(c.quiz && c.quiz.passed)) return false;
      return Object.values(c.games).some(g => g.pass);
    },
    stars(id) { const c = S.data.ch[id]; if (!c) return 0; return Object.values(c.games).filter(g => g.pass).length; },
    rank() {
      const s = S.score();
      const ranks = [[0, 'מתלמד 🐣'], [300, 'טכנאי רשת 🔧'], [900, 'מהנדס Jr. 💻'], [1800, 'CCNA 🎓'], [3000, 'ארכיטקט רשת 🏗️'], [4500, 'אגדת OSPF 👑']];
      let r = ranks[0][1]; for (const [m, n] of ranks) if (s >= m) r = n; return r;
    }
  };
})(window.OG);
