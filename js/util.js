/* OSPF City – utilities */
window.OG = window.OG || { games: {}, lessons: {}, quizzes: {} };
(function (OG) {
  const NS = 'http://www.w3.org/2000/svg';
  OG.$ = (s, r = document) => r.querySelector(s);
  OG.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  // el('div.cls#id', {attrs}, ...children)
  OG.el = function (spec, attrs, ...kids) {
    const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(spec) || [];
    const e = document.createElement(m[1] || 'div');
    (m[2] || '').replace(/([.#])([\w-]+)/g, (_, k, v) => { if (k === '.') e.classList.add(v); else e.id = v; });
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  };
  OG.svg = function (tag, attrs, ...kids) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) { if (attrs[k] != null) e.setAttribute(k, attrs[k]); }
    for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  };
  OG.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  OG.lerp = (a, b, t) => a + (b - a) * t;
  OG.rand = (a, b) => a + Math.random() * (b - a);
  OG.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  OG.pick = a => a[Math.floor(Math.random() * a.length)];
  OG.shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
  OG.sleep = ms => new Promise(r => setTimeout(r, ms));
  OG.dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  // seeded rng
  OG.rng = function (seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  OG.fmt = n => Math.round(n).toLocaleString('en-US');
  OG.toast = function (msg, kind = '') {
    const w = document.getElementById('toast-wrap'); if (!w) return;
    const t = OG.el('div.toast' + (kind ? '.' + kind : ''), { html: msg });
    w.append(t); setTimeout(() => t.remove(), 3300);
  };
  OG.pop = function (host, text, x, y, color) {
    const p = OG.el('div.pop', { text, style: { left: x + 'px', top: y + 'px', color: color || '#fbbf24' } });
    host.append(p); setTimeout(() => p.remove(), 1000);
  };
  // IP helpers
  OG.ip2n = s => s.split('.').reduce((a, o) => (a * 256 + (+o)) >>> 0, 0);
  OG.n2ip = n => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  OG.prefix2mask = p => p === 0 ? '0.0.0.0' : OG.n2ip((0xFFFFFFFF << (32 - p)) >>> 0);
  OG.mask2wild = m => OG.n2ip((~OG.ip2n(m)) >>> 0);
  OG.wild2mask = w => OG.n2ip((~OG.ip2n(w)) >>> 0);
  OG.inNet = (ip, net, p) => p === 0 || (OG.ip2n(ip) >>> (32 - p)) === (OG.ip2n(net) >>> (32 - p));
  OG.inWild = (ip, net, wild) => { const w = OG.ip2n(wild); return ((OG.ip2n(ip) & ~w) >>> 0) === ((OG.ip2n(net) & ~w) >>> 0); };
  // a fixed-step animation loop helper
  OG.loop = function (fn) {
    let id = 0, last = performance.now(), alive = true;
    const f = t => { if (!alive) return; const dt = Math.min(0.05, (t - last) / 1000); last = t; fn(dt, t); id = requestAnimationFrame(f); };
    id = requestAnimationFrame(f);
    return { stop() { alive = false; cancelAnimationFrame(id); } };
  };
  OG.esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  OG.ltr = s => `<span class="ltr">${s}</span>`;
})(window.OG);
