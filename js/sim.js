/* OSPF City – SVG animated scene engine used by lessons */
(function (OG) {
  const { svg, el } = OG;
  const ease = {
    lin: t => t, out: t => 1 - Math.pow(1 - t, 3), inout: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  };

  class Scene {
    constructor(host, o = {}) {
      this.host = host; this.w = o.w || 800; this.h = o.h || 450;
      host.innerHTML = '';
      this.svg = svg('svg', { class: 'scene', viewBox: `0 0 ${this.w} ${this.h}`, preserveAspectRatio: 'xMidYMid meet' });
      host.append(this.svg);
      const defs = svg('defs');
      defs.innerHTML = `
        <radialGradient id="gRouter" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#4aa3e0"/><stop offset="1" stop-color="#0f3d66"/></radialGradient>
        <linearGradient id="gSwitch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ab0e8"/><stop offset="1" stop-color="#14456f"/></linearGradient>
        <linearGradient id="gPc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb4e8"/><stop offset="1" stop-color="#4a5f9a"/></linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#cbd5ff"/></marker>`;
      this.svg.append(defs);
      this.bg = svg('rect', { x: 0, y: 0, width: this.w, height: this.h, fill: o.bg || 'none' });
      this.svg.append(this.bg);
      // subtle grid
      const grid = svg('g', { opacity: .35 });
      for (let x = 0; x <= this.w; x += 40) grid.append(svg('line', { x1: x, y1: 0, x2: x, y2: this.h, stroke: '#16224a', 'stroke-width': 1 }));
      for (let y = 0; y <= this.h; y += 40) grid.append(svg('line', { x1: 0, y1: y, x2: this.w, y2: y, stroke: '#16224a', 'stroke-width': 1 }));
      this.svg.append(grid);
      this.gArea = svg('g'); this.gLink = svg('g'); this.gTrace = svg('g'); this.gNode = svg('g'); this.gPkt = svg('g'); this.gTop = svg('g');
      this.svg.append(this.gArea, this.gLink, this.gTrace, this.gNode, this.gPkt, this.gTop);
      this.nodes = {}; this.links = {}; this.items = {}; this.tables = {};
      this.t = 0; this.events = []; this.tweens = []; this.end = 0;
    }
    /* ------ scheduling ------ */
    at(t, fn) { this.events.push({ t, fn, done: false }); this.end = Math.max(this.end, t); return this; }
    tween(dur, fn, e = 'lin', done) { this.tweens.push({ t: 0, dur: Math.max(0.001, dur), fn, e: ease[e] || e, done }); }
    update(dt) {
      this.t += dt;
      for (const ev of this.events) if (!ev.done && this.t >= ev.t) { ev.done = true; try { ev.fn(this); } catch (e) { console.error(e); } }
      for (let i = this.tweens.length - 1; i >= 0; i--) {
        const w = this.tweens[i]; w.t += dt; const p = Math.min(1, w.t / w.dur);
        w.fn(w.e(p));
        if (p >= 1) { this.tweens.splice(i, 1); if (w.done) w.done(); }
      }
    }
    get finished() { return this.t > this.end + 1.2 && this.tweens.length === 0; }

    /* ------ static elements ------ */
    area(id, o) {
      const g = svg('g', { opacity: o.opacity ?? 1 });
      const shape = o.rect
        ? svg('rect', { x: o.x, y: o.y, width: o.w, height: o.h, rx: 24, fill: o.color || '#3b82f6', 'fill-opacity': o.fo ?? .16, stroke: o.color || '#3b82f6', 'stroke-width': 2, 'stroke-dasharray': o.dash || '' })
        : svg('ellipse', { cx: o.cx, cy: o.cy, rx: o.rx, ry: o.ry, fill: o.color || '#3b82f6', 'fill-opacity': o.fo ?? .16, stroke: o.color || '#3b82f6', 'stroke-width': 2, 'stroke-dasharray': o.dash || '' });
      g.append(shape);
      if (o.label) g.append(svg('text', { x: o.lx ?? (o.cx ?? o.x + o.w / 2), y: o.ly ?? ((o.cy ?? o.y) - (o.ry ?? 0) + 22), 'text-anchor': 'middle', fill: o.color, style: 'font-weight:800;font-size:17px;', class: 'albl' }, o.label));
      const lbl = g.querySelector('text'); if (lbl) lbl.style.fill = o.color || '#9fb4ff';
      this.gArea.append(g); this.items[id] = g; return g;
    }
    node(id, x, y, o = {}) {
      const type = o.type || 'router';
      const g = svg('g', { transform: `translate(${x},${y})`, style: 'transition:opacity .3s' });
      const sc = o.size || 1;
      const icon = svg('g', { transform: `scale(${sc})` });
      if (type === 'router') {
        icon.append(svg('circle', { r: 27, fill: 'url(#gRouter)', stroke: o.stroke || '#8bd0ff', 'stroke-width': 2.5 }));
        const a = (d) => svg('path', { d, stroke: '#fff', 'stroke-width': 3.2, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        icon.append(a('M-14 -6H10M5 -12L11 -6L5 0'), a('M14 8H-10M-5 2L-11 8L-5 14'));
      } else if (type === 'switch') {
        icon.append(svg('rect', { x: -34, y: -17, width: 68, height: 34, rx: 7, fill: 'url(#gSwitch)', stroke: o.stroke || '#8bd0ff', 'stroke-width': 2.5 }));
        const a = (d) => svg('path', { d, stroke: '#fff', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        icon.append(a('M-20 -4H20M14 -9L20 -4L14 1'), a('M20 7H-20M-14 2L-20 7L-14 12'));
      } else if (type === 'pc') {
        icon.append(svg('rect', { x: -22, y: -20, width: 44, height: 30, rx: 4, fill: 'url(#gPc)', stroke: '#c7d4ff', 'stroke-width': 2 }), svg('rect', { x: -17, y: -15, width: 34, height: 20, rx: 2, fill: '#0b1230' }), svg('rect', { x: -10, y: 14, width: 20, height: 4, rx: 1, fill: '#7f93d6' }), svg('rect', { x: -4, y: 10, width: 8, height: 5, fill: '#7f93d6' }));
      } else if (type === 'server') {
        for (let i = 0; i < 3; i++) icon.append(svg('rect', { x: -20, y: -26 + i * 18, width: 40, height: 15, rx: 3, fill: 'url(#gPc)', stroke: '#c7d4ff', 'stroke-width': 1.6 }), svg('circle', { cx: 12, cy: -18.5 + i * 18, r: 2.5, fill: '#34d399' }));
      } else if (type === 'cloud') {
        icon.append(svg('path', { d: 'M-34 14a16 16 0 0 1 4-31 22 22 0 0 1 42-4 18 18 0 0 1 20 20 14 14 0 0 1-4 15z', fill: 'rgba(148,163,255,.2)', stroke: '#a5b4ff', 'stroke-width': 2.2 }));
      } else if (type === 'lan') {
        icon.append(svg('ellipse', { rx: 44, ry: 22, fill: 'rgba(52,211,153,.12)', stroke: '#34d399', 'stroke-width': 2, 'stroke-dasharray': '5 4' }));
      } else if (type === 'person') {
        icon.append(svg('circle', { r: 25, fill: '#1c2a58', stroke: o.stroke || '#fbbf24', 'stroke-width': 2.5 }), svg('text', { y: 12, 'text-anchor': 'middle', style: 'font-size:32px' }, o.emoji || '🧑‍💻'));
      } else if (type === 'dot') {
        icon.append(svg('circle', { r: 17, fill: o.fill || '#1c2a58', stroke: o.stroke || '#60a5fa', 'stroke-width': 3 }));
      } else if (type === 'emoji') {
        icon.append(svg('text', { y: 12, 'text-anchor': 'middle', style: `font-size:${o.fs || 40}px` }, o.emoji || '🏢'));
      }
      g.append(icon);
      const ring = svg('circle', { r: 36 * sc, fill: 'none', stroke: o.color || '#fbbf24', 'stroke-width': 3, opacity: 0, class: 'ring' });
      g.insertBefore(ring, icon);
      const ly = o.ly ?? (type === 'dot' ? 0 : (type === 'lan' ? 4 : (type === 'server' ? 44 : 44 * Math.max(sc, .8))));
      if (o.label) {
        const t = svg('text', { y: ly + (type === 'dot' ? 6 : 0), class: 'lbl', style: type === 'lan' ? 'font-size:13px' : '' }, o.label);
        if (type === 'dot') { t.style.fill = '#fff'; t.style.fontSize = '14px'; }
        g.append(t);
      }
      if (o.sub) g.append(svg('text', { y: ly + 16, class: 'sub' }, o.sub));
      this.gNode.append(g);
      this.nodes[id] = { id, x, y, g, ring, icon, o };
      return this.nodes[id];
    }
    moveNode(id, x, y, dur = .6) {
      const n = this.nodes[id]; const x0 = n.x, y0 = n.y;
      this.tween(dur, p => { n.x = x0 + (x - x0) * p; n.y = y0 + (y - y0) * p; n.g.setAttribute('transform', `translate(${n.x},${n.y})`); this.relink(id); }, 'inout');
    }
    link(a, b, o = {}) {
      const A = this.nodes[a], B = this.nodes[b];
      const id = o.id || `${a}~${b}`;
      const g = svg('g');
      const bend = o.bend || 0;
      const line = bend ? svg('path', { d: this.curve(A, B, bend), fill: 'none', stroke: o.color || '#4b68c8', 'stroke-width': o.w || 3.5, 'stroke-linecap': 'round', 'stroke-dasharray': o.dashed ? '8 6' : '' })
        : svg('line', { x1: A.x, y1: A.y, x2: B.x, y2: B.y, stroke: o.color || '#4b68c8', 'stroke-width': o.w || 3.5, 'stroke-linecap': 'round', 'stroke-dasharray': o.dashed ? '8 6' : '' });
      g.append(line);
      const L = { id, a, b, g, line, o, up: true, extra: [] };
      // labels
      const mk = (txt, t, cls) => {
        const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
        const off = (o.lo ?? 0) + bend * 2 * t * (1 - t);
        const x = A.x + dx * t + nx * off, y = A.y + dy * t + ny * off;
        const tg = svg('g', { transform: `translate(${x},${y})` });
        const tx = svg('text', { 'text-anchor': 'middle', y: 5, style: 'font-size:13px;font-weight:700;font-family:var(--mono);', fill: cls || '#fff' }, txt);
        tg.append(tx); g.append(tg);
        // pill bg after attach
        this.gLink.append(g);
        let bb; try { bb = tx.getBBox(); } catch (e) { bb = { x: -txt.length * 4, width: txt.length * 8 }; }
        const pill = svg('rect', { x: bb.x - 6, y: -11, width: bb.width + 12, height: 22, rx: 11, fill: '#0b1230', stroke: '#2b3a6e', 'stroke-width': 1.2 });
        tg.insertBefore(pill, tx);
        return { tg, tx, pill };
      };
      this.gLink.append(g);
      if (o.label != null && o.label !== '') L.lbl = mk(o.label, o.lt ?? .5);
      if (o.ea) L.ea = mk(o.ea, o.eat ?? .2, '#9fe9ff');
      if (o.eb) L.eb = mk(o.eb, o.ebt ?? .8, '#9fe9ff');
      this.links[id] = L; return L;
    }
    curve(A, B, bend) { const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1; return `M${A.x} ${A.y} Q${mx - dy / len * bend} ${my + dx / len * bend} ${B.x} ${B.y}`; }
    L(a, b) { return this.links[`${a}~${b}`] || this.links[`${b}~${a}`]; }
    relink(nid) {
      for (const k in this.links) {
        const L = this.links[k]; if (L.a !== nid && L.b !== nid) continue;
        const A = this.nodes[L.a], B = this.nodes[L.b];
        if (L.o.bend) L.line.setAttribute('d', this.curve(A, B, L.o.bend));
        else { L.line.setAttribute('x1', A.x); L.line.setAttribute('y1', A.y); L.line.setAttribute('x2', B.x); L.line.setAttribute('y2', B.y); }
      }
    }
    linkColor(a, b, color, w) { const L = this.L(a, b); if (!L) return; L.line.setAttribute('stroke', color); if (w) L.line.setAttribute('stroke-width', w); }
    linkDown(a, b, on = true) {
      const L = this.L(a, b); if (!L) return; L.up = !on;
      L.line.setAttribute('stroke', on ? '#6b2a3a' : (L.o.color || '#4b68c8')); L.line.setAttribute('stroke-dasharray', on ? '4 8' : '');
      if (L.x) { L.x.remove(); L.x = null; }
      if (on) {
        const A = this.nodes[L.a], B = this.nodes[L.b], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
        L.x = svg('text', { x: mx, y: my + 12, 'text-anchor': 'middle', style: 'font-size:34px;fill:#fb7185;font-weight:900', filter: 'url(#glow)' }, '✖');
        this.gTop.append(L.x);
      }
    }
    setLinkLabel(a, b, txt) { const L = this.L(a, b); if (L && L.lbl) L.lbl.tx.textContent = txt; }

    /* ------ node states ------ */
    mark(id, color, on = true) { const n = this.nodes[id]; if (!n) return; n.ring.setAttribute('stroke', color || '#fbbf24'); n.ring.setAttribute('opacity', on ? 1 : 0); n.ring.classList.toggle('pulse-ring', on); }
    glow(id, on = true, color = '#fbbf24') { const n = this.nodes[id]; if (!n) return; n.icon.setAttribute('filter', on ? 'url(#glow)' : ''); if (on) n.icon.style.color = color; }
    dim(id, on = true) { const n = this.nodes[id]; if (n) n.g.style.opacity = on ? .3 : 1; }
    down(id, on = true) {
      const n = this.nodes[id]; if (!n) return; n.g.style.opacity = on ? .45 : 1;
      if (n.x$) { n.x$.remove(); n.x$ = null; }
      if (on) { n.x$ = svg('text', { y: 14, 'text-anchor': 'middle', style: 'font-size:46px;fill:#fb7185;font-weight:900' }, '✖'); n.g.append(n.x$); }
    }
    setLabel(id, txt) { const n = this.nodes[id]; const t = n && n.g.querySelector('.lbl'); if (t) t.textContent = txt; }
    setSub(id, txt) { const n = this.nodes[id]; const t = n && n.g.querySelector('.sub'); if (t) t.textContent = txt; }
    badge(id, txt, o = {}) {
      const n = this.nodes[id]; const g = svg('g', { transform: `translate(${o.dx ?? 30},${o.dy ?? -30})` });
      const tx = svg('text', { 'text-anchor': 'middle', y: 5, style: 'font-size:13px;font-weight:900' }, txt); g.append(tx); n.g.append(g);
      let bb; try { bb = tx.getBBox(); } catch (e) { bb = { x: -10, width: 20 }; }
      g.insertBefore(svg('rect', { x: bb.x - 7, y: -11, width: bb.width + 14, height: 22, rx: 11, fill: o.bg || '#be123c', stroke: '#fff', 'stroke-width': 1.5 }), tx);
      this.items[o.id || id + '_badge' + Math.random()] = g; return g;
    }

    /* ------ html boxes ------ */
    note(id, x, y, html, o = {}) {
      const w = o.w || 220;
      const fo = svg('foreignObject', { x, y, width: w, height: o.h || 200 });
      fo.style.pointerEvents = 'none';
      const d = el('div.fo.fo-note' + (o.cls ? '.' + o.cls : '') + (o.ltr ? '.ltr' : ''), { html, style: { width: w + 'px', opacity: o.hidden ? 0 : 1, transition: 'opacity .35s, transform .35s', transform: o.hidden ? 'translateY(6px)' : 'none', fontSize: (o.fs || 14) + 'px', textAlign: o.align || '' } });
      d.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      fo.append(d); this.gTop.append(fo); this.items[id] = { fo, d, x, y, w }; return this.items[id];
    }
    text(id, x, y, str, o = {}) {
      const t = svg('text', { x, y, 'text-anchor': o.anchor || 'middle', style: `font-size:${o.fs || 16}px;font-weight:${o.fw || 700};opacity:${o.hidden ? 0 : 1};transition:opacity .35s;` + (o.mono ? 'font-family:var(--mono);' : '') }, str);
      if (o.color) t.style.fill = o.color; this.gTop.append(t); this.items[id] = { t, el: t }; return t;
    }
    setNote(id, html) { const it = this.items[id]; if (it && it.d) it.d.innerHTML = html; else if (it && it.t) it.t.textContent = html; }
    show(id, on = true) { const it = this.items[id]; if (!it) return; const d = it.d || it.t; if (d) { d.style.opacity = on ? 1 : 0; if (it.d) d.style.transform = on ? 'none' : 'translateY(6px)'; } else if (it.setAttribute) it.setAttribute('opacity', on ? 1 : 0); }
    hide(id) { this.show(id, false); }
    table(id, x, y, o) {
      const w = o.w || 260;
      const rows = o.rows || [];
      const html = () => `<div class="tt">${o.title || ''}</div><table class="${o.ltr ? 'ltr' : ''}"><thead><tr>${(o.head || []).map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr data-i="${i}" class="${r.cls || ''}" style="${r.hidden ? 'display:none' : ''}">${(r.c || r).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      const it = this.note(id, x, y, html(), { w, cls: o.cls || '', hidden: o.hidden, ltr: o.ltr, fs: o.fs });
      it.rows = rows; it.render = () => { it.d.innerHTML = html(); }; this.tables[id] = it; return it;
    }
    addRow(id, cells, cls) { const it = this.tables[id]; it.rows.push({ c: cells, cls }); it.render(); }
    rowCls(id, i, cls) { const tr = this.tables[id].d.querySelector(`tr[data-i="${i}"]`); if (tr) tr.className = cls || ''; }
    rowShow(id, i, on = true) { const tr = this.tables[id].d.querySelector(`tr[data-i="${i}"]`); if (tr) tr.style.display = on ? '' : 'none'; }
    setRow(id, i, cells) { const tr = this.tables[id].d.querySelector(`tr[data-i="${i}"]`); if (tr) tr.innerHTML = cells.map(c => `<td>${c}</td>`).join(''); }

    /* ------ packets ------ */
    packet(from, to, o = {}) {
      // from/to: node id, or array path of node ids
      const path = Array.isArray(from) ? from : [from, to];
      const pts = path.map(id => this.nodes[id]);
      const g = svg('g', { opacity: 0 });
      const shape = o.shape || 'env';
      const col = o.color || '#fbbf24';
      if (shape === 'dot') g.append(svg('circle', { r: o.r || 8, fill: col, stroke: '#fff', 'stroke-width': 1.5, filter: 'url(#glow)' }));
      else if (shape === 'emoji') g.append(svg('text', { y: 8, 'text-anchor': 'middle', style: `font-size:${o.fs || 24}px`, filter: 'url(#glow)' }, o.emoji || '📦'));
      else {
        g.append(svg('rect', { x: -16, y: -11, width: 32, height: 22, rx: 4, fill: col, stroke: '#fff', 'stroke-width': 1.5, filter: 'url(#glow)' }),
          svg('path', { d: 'M-16 -11L0 2L16 -11', fill: 'none', stroke: 'rgba(0,0,0,.45)', 'stroke-width': 1.5 }));
      }
      if (o.label) {
        const tx = svg('text', { y: -17, 'text-anchor': 'middle', style: 'font-size:12px;font-weight:800;paint-order:stroke;stroke:#050816;stroke-width:3.5px;' }, o.label); tx.setAttribute('fill', col); g.append(tx);
      }
      this.gPkt.append(g);
      const segs = []; let total = 0;
      for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y); segs.push(d); total += d; }
      const dur = o.dur || Math.max(.8, total / 260);
      this.tween(dur, p => {
        g.setAttribute('opacity', p < .04 || p > .98 ? 0 : 1);
        let d = p * total, i = 0; while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
        const t = segs[i] ? d / segs[i] : 1;
        const x = pts[i].x + (pts[i + 1].x - pts[i].x) * t, y = pts[i].y + (pts[i + 1].y - pts[i].y) * t + (o.lift || 0);
        g.setAttribute('transform', `translate(${x},${y})`);
      }, o.ease || 'lin', () => { g.remove(); if (o.then) o.then(this); });
      return g;
    }
    // flood from a node over all links; cb(nodeId) when a packet arrives at a new node
    flood(start, o = {}) {
      const seen = new Set([start]); let q = [[start, 0]]; const hop = o.hop || .9;
      const adj = id => Object.values(this.links).filter(L => L.up && (L.a === id || L.b === id)).map(L => L.a === id ? L.b : L.a);
      const visit = (id, delay) => {
        for (const nb of adj(id)) {
          if (o.skip && o.skip(nb, id)) continue;
          if (seen.has(nb)) continue; seen.add(nb);
          const t0 = this.t + delay;
          this.at(t0, S => { S.packet(id, nb, { label: o.label, color: o.color, shape: o.shape, emoji: o.emoji, dur: hop * .85, then: () => { if (o.onArrive) o.onArrive(nb, id, S); visit(nb, 0); } }); });
        }
      };
      visit(start, 0);
    }
    say(id, txt, o = {}) {
      const n = this.nodes[id]; const x = n.x - (o.w || 150) / 2 + (o.dx || 0), y = n.y - (o.dy ?? 100);
      const key = 'say_' + id + '_' + Math.random();
      const it = this.note(key, x, y, txt, { w: o.w || 150, cls: o.cls || 'c', hidden: true, align: 'center', fs: o.fs || 13 });
      requestAnimationFrame(() => this.show(key, true));
      if (o.dur) this.at(this.t + o.dur, S => S.show(key, false));
      return key;
    }
    trace(path, o = {}) {
      const d = 'M' + path.map(id => `${this.nodes[id].x} ${this.nodes[id].y}`).join('L');
      const p = svg('path', { d, fill: 'none', stroke: o.color || '#34d399', 'stroke-width': o.w || 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .85, filter: 'url(#glow)' });
      this.gTrace.append(p); const len = p.getTotalLength(); p.setAttribute('stroke-dasharray', len); p.setAttribute('stroke-dashoffset', len);
      this.tween(o.dur || 1.2, t => p.setAttribute('stroke-dashoffset', len * (1 - t)), 'inout');
      this.items['trace' + Math.random()] = p; return p;
    }
    clearTraces() { this.gTrace.innerHTML = ''; }
    arrow(x1, y1, x2, y2, o = {}) {
      const l = svg('line', { x1, y1, x2, y2, stroke: o.color || '#cbd5ff', 'stroke-width': o.w || 3, 'marker-end': 'url(#arr)', opacity: o.hidden ? 0 : 1, style: 'transition:opacity .3s' });
      this.gTop.append(l); if (o.id) this.items[o.id] = l; return l;
    }
    destroy() { this.events = []; this.tweens = []; this.host.innerHTML = ''; }
  }
  OG.Scene = Scene;
})(window.OG);
