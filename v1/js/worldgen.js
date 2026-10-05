/* OSPF City – procedural city generator + static (tiled) renderer, top-down GTA2 style */
(function (OG) {
  const M = 300, PX = 840, PY = 660, RW = 150, COLS = 5, ROWS = 4, RIVER = 110, TS = 512;
  const gx = i => M + i * PX, gy = j => M + j * PY;
  const W = 2 * M + 5 * PX, H = 2 * M + 4 * PY;
  const SIDE = 28;          // sidewalk thickness inside a block
  const palette = {
    ground: '#0b1424', pave: '#3b4561', paveLine: '#343d57', road: '#212737', roadEdge: '#c8d0ec', roadMid: '#e8b830', grass: '#1d4a3a', grass2: '#245a45',
    water: '#0a3a5c', water2: '#0e4a74', roofs: ['#56658a', '#667699', '#4b5a7e', '#7a6a90', '#8a6666', '#58867a', '#7a7f96', '#6f5d86', '#5d7a96']
  };
  const EAST_START = 3;

  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } return `rgb(${r | 0},${g | 0},${b | 0})`; }

  const BLOCKS = {
    '0,0': { theme: 'home', shop: true }, '1,0': { ch: 'ch1' }, '2,0': { ch: 'ch2' },
    '0,1': { ch: 'ch3' }, '1,1': { ch: 'ch8', hub: true }, '2,1': { ch: 'ch4' },
    '0,2': { ch: 'ch5' }, '1,2': { ch: 'ch6' }, '2,2': { ch: 'ch7' },
    '0,3': { theme: 'park' }, '1,3': { theme: 'stadium' }, '2,3': { theme: 'industrial' },
    '3,0': { ch: 'e1' }, '4,0': { ch: 'e2' }, '3,1': { ch: 'e3' }, '4,1': { ch: 'e4' }, '3,2': { ch: 'e5' },
    '4,2': { theme: 'park' }, '3,3': { theme: 'industrial' }, '4,3': { theme: 'harbor' }
  };
  const SIGNS = ['OSPF', 'AREA 0', 'LSA', 'HELLO', 'ROUTER', 'COST', 'DR', 'BDR', 'SPF', 'LSDB', 'ABR', 'NET'];

  function blockRect(i, j) {
    const x0 = i === 3 ? gx(3) + RIVER : gx(i) + RW / 2, x1 = i === 2 ? gx(3) - RIVER : gx(i + 1) - RW / 2;
    return { x: x0, y: gy(j) + RW / 2, w: x1 - x0, h: PY - RW };
  }

  OG.Gen = {
    M, PX, PY, RW, COLS, ROWS, W, H, gx, gy, TS, RIVER, palette, BLOCKS, blockRect,
    build() {
      const rng = OG.rng(2024);
      const R = (a, b) => a + rng() * (b - a);
      const world = { W, H, solids: [], statics: [], doors: [], npcs: [], coins: [], blocks: [], nodes: [], parks: [], props: [], water: null, bridge: null, gate: null, lamps: [] };
      const add = (z, bb, draw) => world.statics.push({ z, x0: bb[0], y0: bb[1], x1: bb[2], y1: bb[3], draw });
      const solid = (x, y, w, h, kind) => world.solids.push({ x, y, w, h, kind });
      world.add = add;

      /* ---------- ground, boundary ---------- */
      const bx0 = gx(0) - RW / 2 - 50, bx1 = gx(5) + RW / 2 + 50, by0 = gy(0) - RW / 2 - 50, by1 = gy(4) + RW / 2 + 50;
      world.bounds = { x0: bx0, y0: by0, x1: bx1, y1: by1 };
      add(0, [0, 0, W, H], c => {
        c.fillStyle = palette.ground; c.fillRect(0, 0, W, H);
      });
      solid(-500, -500, W + 1000, by0 + 500, 'wall'); solid(-500, by1, W + 1000, 600, 'wall'); solid(-500, -500, bx0 + 500, H + 1000, 'wall'); solid(bx1, -500, 600, H + 1000, 'wall');
      // outer forest (decor)
      for (let k = 0; k < 520; k++) {
        const side = k % 4; let x, y;
        if (side === 0) { x = R(0, W); y = R(10, by0 - 24); } else if (side === 1) { x = R(0, W); y = R(by1 + 24, H - 10); } else if (side === 2) { x = R(10, bx0 - 24); y = R(0, H); } else { x = R(bx1 + 24, W - 10); y = R(0, H); }
        const r = R(14, 30), g = R(0, 1) > .5 ? '#10351f' : '#143f27';
        add(6, [x - r, y - r, x + r, y + r], c => { c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.arc(x + 6, y + 8, r, 0, 7); c.fill(); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.fillStyle = 'rgba(80,200,120,.12)'; c.beginPath(); c.arc(x - r * .3, y - r * .3, r * .55, 0, 7); c.fill(); });
      }
      // boundary hedge / fence
      add(5, [bx0 - 12, by0 - 12, bx1 + 12, by1 + 12], c => {
        c.strokeStyle = '#26324f'; c.lineWidth = 8; c.strokeRect(bx0, by0, bx1 - bx0, by1 - by0);
        c.strokeStyle = '#4a5c8c'; c.lineWidth = 2; c.setLineDash([14, 10]); c.strokeRect(bx0, by0, bx1 - bx0, by1 - by0); c.setLineDash([]);
      });

      /* ---------- roads ---------- */
      const vroads = [0, 1, 2, 4, 5];
      const rx0 = gx(0) - RW / 2, rx1 = gx(5) + RW / 2, ry0 = gy(0) - RW / 2, ry1 = gy(4) + RW / 2;
      // blocks pavement
      for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) {
        const b = blockRect(i, j); const spec = BLOCKS[i + ',' + j] || {};
        add(0, [b.x, b.y, b.x + b.w, b.y + b.h], c => {
          c.fillStyle = palette.pave; c.fillRect(b.x, b.y, b.w, b.h);
          c.strokeStyle = palette.paveLine; c.lineWidth = 1.5; c.beginPath();
          for (let x = Math.ceil(b.x / 40) * 40; x < b.x + b.w; x += 40) { c.moveTo(x, b.y); c.lineTo(x, b.y + b.h); }
          for (let y = Math.ceil(b.y / 40) * 40; y < b.y + b.h; y += 40) { c.moveTo(b.x, y); c.lineTo(b.x + b.w, y); }
          c.stroke();
          c.strokeStyle = '#6a7699'; c.lineWidth = 3; c.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
        });
        world.blocks.push({ i, j, x: b.x, y: b.y, w: b.w, h: b.h, spec });
      }
      // asphalt: horizontal
      for (let j = 0; j < 5; j++) {
        const y = gy(j) - RW / 2;
        add(0, [rx0, y, rx1, y + RW], c => { c.fillStyle = palette.road; c.fillRect(rx0, y, rx1 - rx0, RW); });
      }
      for (const i of vroads) {
        const x = gx(i) - RW / 2;
        add(0, [x, ry0, x + RW, ry1], c => { c.fillStyle = palette.road; c.fillRect(x, ry0, RW, ry1 - ry0); });
      }
      // river
      const rvx = gx(3) - RIVER, rvw = RIVER * 2;
      world.water = { x: rvx, y: ry0 - 30, w: rvw, h: ry1 - ry0 + 60 };
      add(1, [rvx - 16, ry0 - 30, rvx + rvw + 16, ry1 + 30], c => {
        const g = c.createLinearGradient(rvx, 0, rvx + rvw, 0); g.addColorStop(0, palette.water2); g.addColorStop(.5, palette.water); g.addColorStop(1, palette.water2);
        c.fillStyle = g; c.fillRect(rvx, ry0 - 30, rvw, ry1 - ry0 + 60);
        c.fillStyle = '#5a6a8e'; c.fillRect(rvx - 14, ry0 - 30, 14, ry1 - ry0 + 60); c.fillRect(rvx + rvw, ry0 - 30, 14, ry1 - ry0 + 60);
        c.fillStyle = '#7a8cb8'; c.fillRect(rvx - 4, ry0 - 30, 4, ry1 - ry0 + 60); c.fillRect(rvx + rvw, ry0 - 30, 4, ry1 - ry0 + 60);
      });
      // bridge (row j=1)
      const brY = gy(1) - RW / 2;
      world.bridge = { x: rvx - 14, y: brY, w: rvw + 28, h: RW };
      add(2, [rvx - 14, brY - 14, rvx + rvw + 14, brY + RW + 14], c => {
        c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(rvx - 14, brY + 10, rvw + 28, RW + 8);
        c.fillStyle = '#2b3350'; c.fillRect(rvx - 14, brY, rvw + 28, RW);
        c.fillStyle = palette.road; c.fillRect(rvx - 14, brY + 10, rvw + 28, RW - 20);
        c.fillStyle = '#9aa8d4'; c.fillRect(rvx - 14, brY, rvw + 28, 10); c.fillRect(rvx - 14, brY + RW - 10, rvw + 28, 10);
        c.fillStyle = '#d9e0ff'; for (let x = rvx; x < rvx + rvw; x += 32) { c.fillRect(x, brY - 2, 5, 14); c.fillRect(x, brY + RW - 12, 5, 14); }
        c.strokeStyle = palette.roadMid; c.lineWidth = 3; c.setLineDash([26, 22]); c.beginPath(); c.moveTo(rvx - 14, brY + RW / 2); c.lineTo(rvx + rvw + 14, brY + RW / 2); c.stroke(); c.setLineDash([]);
      });
      solid(rvx, ry0 - 40, rvw, brY - (ry0 - 40), 'water'); solid(rvx, brY + RW, rvw, ry1 + 40 - (brY + RW), 'water');
      // road markings
      const mark = (c, x0, y0, x1, y1) => { c.strokeStyle = palette.roadMid; c.lineWidth = 3; c.setLineDash([28, 22]); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.setLineDash([]); };
      for (let j = 0; j < 5; j++) {
        const y = gy(j);
        const segs = [[rx0, gx(3) - RIVER - 14]]; if (true) segs.push([gx(3) + RIVER + 14, rx1]);
        for (const [a, b] of segs) add(1, [a, y - 6, b, y + 6], c => { mark(c, a, y, b, y); c.strokeStyle = 'rgba(200,208,236,.55)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(a, y - RW / 2 + 5); c.lineTo(b, y - RW / 2 + 5); c.moveTo(a, y + RW / 2 - 5); c.lineTo(b, y + RW / 2 - 5); c.stroke(); });
      }
      for (const i of vroads) {
        const x = gx(i); add(1, [x - 6, ry0, x + 6, ry1], c => { mark(c, x, ry0, x, ry1); c.strokeStyle = 'rgba(200,208,236,.55)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - RW / 2 + 5, ry0); c.lineTo(x - RW / 2 + 5, ry1); c.moveTo(x + RW / 2 - 5, ry0); c.lineTo(x + RW / 2 - 5, ry1); c.stroke(); });
      }
      // intersections: clear center markings + crosswalks
      for (const i of vroads) for (let j = 0; j < 5; j++) {
        const x = gx(i), y = gy(j);
        add(1, [x - RW / 2 - 40, y - RW / 2 - 40, x + RW / 2 + 40, y + RW / 2 + 40], c => {
          c.fillStyle = palette.road; c.fillRect(x - RW / 2 + 2, y - RW / 2 + 2, RW - 4, RW - 4);
          c.fillStyle = 'rgba(235,240,255,.78)';
          for (let k = -RW / 2 + 10; k < RW / 2 - 6; k += 14) { c.fillRect(x + k, y - RW / 2 - 30, 8, 22); c.fillRect(x + k, y + RW / 2 + 8, 8, 22); c.fillRect(x - RW / 2 - 30, y + k, 22, 8); c.fillRect(x + RW / 2 + 8, y + k, 22, 8); }
        });
        world.nodes.push({ i, j, x, y, side: i < EAST_START ? 0 : 1 });
      }

      /* ---------- helpers for buildings & props ---------- */
      const buildings = [];
      function building(x, y, w, h, o = {}) {
        const seed = Math.floor(rng() * 1e9), br = OG.rng(seed);
        const col = o.color || palette.roofs[Math.floor(br() * palette.roofs.length)];
        const ht = o.height || 10 + br() * 22;
        const b = { x, y, w, h, col, ht, seed, o };
        buildings.push(b); solid(x, y, w, h, 'building');
        // shadow
        add(3, [x, y, x + w + ht, y + h + ht], c => {
          c.fillStyle = 'rgba(0,0,12,.38)'; c.beginPath(); c.moveTo(x, y + h); c.lineTo(x + ht * .8, y + h + ht); c.lineTo(x + w + ht * .8, y + h + ht); c.lineTo(x + w + ht * .8, y + ht); c.lineTo(x + w, y); c.lineTo(x + w, y + h); c.closePath(); c.fill();
        });
        add(4, [x - 6, y - 6, x + w + 6, y + h + 12], c => {
          const r = OG.rng(seed);
          // south wall
          c.fillStyle = shade(col, -.55); rr(c, x, y + 6, w, h, 5); c.fill();
          c.fillStyle = col; rr(c, x, y, w, h, 5); c.fill();
          c.strokeStyle = shade(col, -.35); c.lineWidth = 3; rr(c, x + 1.5, y + 1.5, w - 3, h - 3, 4); c.stroke();
          c.strokeStyle = shade(col, .22); c.lineWidth = 2; c.beginPath(); c.moveTo(x + 6, y + 4); c.lineTo(x + w - 6, y + 4); c.stroke();
          // roof panels
          c.strokeStyle = shade(col, -.22); c.lineWidth = 1.2;
          const px = Math.max(40, w / (2 + Math.floor(r() * 3)));
          for (let xx = x + px; xx < x + w - 10; xx += px) { c.beginPath(); c.moveTo(xx, y + 8); c.lineTo(xx, y + h - 8); c.stroke(); }
          if (r() > .5) { const yy = y + h * (.35 + r() * .3); c.beginPath(); c.moveTo(x + 8, yy); c.lineTo(x + w - 8, yy); c.stroke(); }
          // details
          const nd = Math.floor(r() * 4);
          for (let k = 0; k < nd; k++) {
            const t = r(), dx = x + 14 + r() * Math.max(1, w - 50), dy = y + 14 + r() * Math.max(1, h - 50);
            if (w < 60 || h < 50) break;
            if (t < .4) { c.fillStyle = shade(col, -.3); rr(c, dx, dy, 26, 20, 3); c.fill(); c.strokeStyle = shade(col, .3); c.lineWidth = 1; c.beginPath(); c.arc(dx + 13, dy + 10, 7, 0, 7); c.stroke(); c.beginPath(); c.moveTo(dx + 13, dy + 3); c.lineTo(dx + 13, dy + 17); c.moveTo(dx + 6, dy + 10); c.lineTo(dx + 20, dy + 10); c.stroke(); }
            else if (t < .7) { c.fillStyle = '#0b1230'; c.fillRect(dx, dy, 22, 14); c.fillStyle = '#2a5fa8'; c.fillRect(dx + 2, dy + 2, 8, 10); c.fillRect(dx + 12, dy + 2, 8, 10); }
            else { c.fillStyle = shade(col, .3); c.beginPath(); c.arc(dx + 8, dy + 8, 5, 0, 7); c.fill(); c.fillStyle = '#f87171'; c.beginPath(); c.arc(dx + 8, dy + 8, 2, 0, 7); c.fill(); }
          }
          if (o.sign && w > 90 && h > 70) {
            c.save(); c.font = '900 22px Heebo, Arial'; c.textAlign = 'center'; c.fillStyle = o.signColor || '#22d3ee'; c.shadowColor = o.signColor || '#22d3ee'; c.shadowBlur = 14; c.fillText(o.sign, x + w / 2, y + h / 2 + 8); c.restore();
          }
          if (o.draw) o.draw(c, b);
        });
        return b;
      }
      function tree(x, y, r = 16) {
        solid(x - 5, y - 5, 10, 10, 'tree');
        add(3, [x - r, y - r, x + r + 10, y + r + 12], c => { c.fillStyle = 'rgba(0,0,10,.35)'; c.beginPath(); c.ellipse(x + 8, y + 10, r, r * .85, 0, 0, 7); c.fill(); });
        add(6, [x - r, y - r, x + r, y + r], c => {
          c.fillStyle = '#16452c'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
          c.fillStyle = '#1f6a3f'; c.beginPath(); c.arc(x - r * .2, y - r * .25, r * .72, 0, 7); c.fill();
          c.fillStyle = 'rgba(160,255,180,.22)'; c.beginPath(); c.arc(x - r * .35, y - r * .4, r * .35, 0, 7); c.fill();
        });
      }
      function lamp(x, y) {
        world.lamps.push({ x, y });
        add(5, [x - 60, y - 60, x + 60, y + 60], c => {
          const g = c.createRadialGradient(x, y, 2, x, y, 58); g.addColorStop(0, 'rgba(255,214,120,.38)'); g.addColorStop(1, 'rgba(255,214,120,0)');
          c.fillStyle = g; c.beginPath(); c.arc(x, y, 58, 0, 7); c.fill();
          c.fillStyle = '#d9c28a'; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill();
        });
      }
      function bench(x, y, horiz = true) {
        add(5, [x - 20, y - 10, x + 20, y + 10], c => { c.fillStyle = '#6b4a2e'; if (horiz) { c.fillRect(x - 16, y - 5, 32, 10); c.fillStyle = '#8a643d'; c.fillRect(x - 16, y - 5, 32, 3); } else { c.fillRect(x - 5, y - 16, 10, 32); c.fillStyle = '#8a643d'; c.fillRect(x - 5, y - 16, 3, 32); } });
        solid(horiz ? x - 16 : x - 5, horiz ? y - 5 : y - 16, horiz ? 32 : 10, horiz ? 10 : 32, 'bench');
      }
      function fillLots(r, theme) {
        const lots = []; (function split(x, y, w, h, d) {
          const minW = 150, minH = 130;
          if ((w > 270 && d < 4) || (w > minW * 1.6 && rng() > .55 && d < 3)) { const s = w * R(.4, .6); split(x, y, s, h, d + 1); split(x + s, y, w - s, h, d + 1); return; }
          if ((h > 240 && d < 4) || (h > minH * 1.6 && rng() > .55 && d < 3)) { const s = h * R(.4, .6); split(x, y, w, s, d + 1); split(x, y + s, w, h - s, d + 1); return; }
          lots.push({ x, y, w, h });
        })(r.x, r.y, r.w, r.h, 0);
        for (const l of lots) {
          const ins = 9 + rng() * 8;
          if (l.w < 70 || l.h < 60) { tree(l.x + l.w / 2, l.y + l.h / 2); continue; }
          if (theme === 'industrial') {
            if (rng() > .5) {
              building(l.x + ins, l.y + ins, l.w - 2 * ins, l.h - 2 * ins, { color: OG.pick(['#6a6f7d', '#7a7466', '#5f6a6a']), height: 18 });
            } else {
              const cols = ['#c2410c', '#1d4ed8', '#15803d', '#a16207', '#7e22ce', '#be123c'];
              for (let yy = l.y + ins; yy < l.y + l.h - ins - 26; yy += 32) for (let xx = l.x + ins; xx < l.x + l.w - ins - 56; xx += 62) { const cc = OG.pick(cols); const bb = { x: xx, y: yy, w: 54, h: 26 }; solid(xx, yy, 54, 26, 'crate'); add(4, [xx, yy, xx + 60, yy + 30], c => { c.fillStyle = 'rgba(0,0,12,.35)'; c.fillRect(xx + 5, yy + 6, 54, 26); c.fillStyle = cc; c.fillRect(xx, yy, 54, 26); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5; for (let k = 8; k < 54; k += 9) { c.beginPath(); c.moveTo(xx + k, yy); c.lineTo(xx + k, yy + 26); c.stroke(); } }); }
            }
          } else {
            const sign = rng() > .7 ? OG.pick(SIGNS) : null;
            building(l.x + ins, l.y + ins, l.w - 2 * ins, l.h - 2 * ins, { sign, signColor: OG.pick(['#22d3ee', '#ff4fa3', '#fbbf24', '#34d399', '#a78bfa']) });
          }
        }
      }
      function plazaDisc(cx, cy, rx, ry, col) {
        add(2, [cx - rx, cy - ry, cx + rx, cy + ry], c => {
          const g = c.createRadialGradient(cx, cy, 10, cx, cy, Math.max(rx, ry)); g.addColorStop(0, col + '88'); g.addColorStop(1, col + '10');
          c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, 7); c.fill();
          c.strokeStyle = col + '99'; c.lineWidth = 3; c.setLineDash([12, 10]); c.beginPath(); c.ellipse(cx, cy, rx * .92, ry * .92, 0, 0, 7); c.stroke(); c.setLineDash([]);
        });
      }
      function fountain(cx, cy) {
        solid(cx - 52, cy - 52, 104, 104, 'fountain');
        add(2, [cx - 70, cy - 70, cx + 70, cy + 70], c => {
          c.fillStyle = '#7a8cb8'; c.beginPath(); c.arc(cx, cy, 62, 0, 7); c.fill(); c.fillStyle = '#1b6ea8'; c.beginPath(); c.arc(cx, cy, 54, 0, 7); c.fill();
          c.fillStyle = '#7a8cb8'; c.beginPath(); c.arc(cx, cy, 20, 0, 7); c.fill(); c.fillStyle = '#4fb3ee'; c.beginPath(); c.arc(cx, cy, 14, 0, 7); c.fill();
        });
        world.props.push({ type: 'fountain', x: cx, y: cy });
      }

      /* ---------- blocks ---------- */
      for (const blk of world.blocks) {
        const { i, j, spec } = blk; const inner = { x: blk.x + SIDE, y: blk.y + SIDE, w: blk.w - 2 * SIDE, h: blk.h - 2 * SIDE };
        blk.inner = inner; const ch = spec.ch ? OG.chById(spec.ch) : null; const cx = blk.x + blk.w / 2;
        // street trees + lamps along block edge
        for (let x = blk.x + 60; x < blk.x + blk.w - 40; x += 120) { if (rng() > .45) tree(x, blk.y + 14, 11); else lamp(x, blk.y + 12); if (rng() > .45) tree(x + 40, blk.y + blk.h - 14, 11); else lamp(x + 40, blk.y + blk.h - 12); }
        for (let y = blk.y + 80; y < blk.y + blk.h - 40; y += 140) { if (i !== 3) { if (rng() > .6) lamp(blk.x + 12, y); } if (i !== 2) { if (rng() > .6) lamp(blk.x + blk.w - 12, y); } }
        if (ch) {
          const bw = 340, bh = 190, bxx = cx - bw / 2, byy = inner.y + 24;
          const color = ch.color;
          plazaDisc(cx, byy + bh + 90, 230, 130, color);
          const b = building(bxx, byy, bw, bh, {
            color: shade(color, -.45), height: 34, draw(c) {
              c.save(); c.strokeStyle = color; c.lineWidth = 4; c.shadowColor = color; c.shadowBlur = 18; rr(c, bxx + 10, byy + 10, bw - 20, bh - 20, 10); c.stroke(); c.restore();
              c.save(); c.textAlign = 'center'; c.font = '900 76px Heebo, Arial'; c.fillStyle = color; c.shadowColor = color; c.shadowBlur = 24; c.fillText(ch.boss ? '★' : String(ch.num), bxx + 70, byy + 100);
              c.shadowBlur = 0; c.font = '64px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; c.fillText(ch.icon, bxx + bw - 70, byy + 98);
              c.font = '800 24px Heebo, Arial'; c.fillStyle = '#fff'; c.shadowColor = color; c.shadowBlur = 10; c.fillText(ch.en.toUpperCase(), bxx + bw / 2, byy + bh - 26);
              c.restore();
              // entrance awning
              c.fillStyle = color; c.fillRect(bxx + bw / 2 - 44, byy + bh - 6, 88, 12); c.fillStyle = 'rgba(255,255,255,.35)'; for (let k = 0; k < 88; k += 16) c.fillRect(bxx + bw / 2 - 44 + k, byy + bh - 6, 8, 12);
            }
          });
          world.doors.push({ ch: ch.id, x: cx, y: byy + bh + 44, r: 54, bx: bxx, by: byy, bw, bh });
          // side strips filled with lots
          const sideW = (inner.w - 420) / 2;
          fillLots({ x: inner.x, y: inner.y, w: sideW, h: inner.h }, 'city');
          fillLots({ x: inner.x + inner.w - sideW, y: inner.y, w: sideW, h: inner.h }, 'city');
          // plaza props
          bench(cx - 150, byy + bh + 150); bench(cx + 150, byy + bh + 150); tree(cx - 205, byy + bh + 70, 14); tree(cx + 205, byy + bh + 70, 14); tree(cx - 205, byy + bh + 140, 14); tree(cx + 205, byy + bh + 140, 14);
          // chapter-specific flavour
          if (spec.hub) { fountain(cx, byy + bh + 140); world.hub = { x: cx, y: byy + bh + 140 }; }
          else { lamp(cx - 90, byy + bh + 30); lamp(cx + 90, byy + bh + 30); }
          // NPC slot
          blk.npcSlot = { x: cx + (spec.hub ? 110 : 90), y: byy + bh + 100 };
        } else if (spec.shop) {
          const bw = 300, bh = 170, bxx = cx - bw / 2 - 90, byy = inner.y + 24;
          plazaDisc(cx - 90, byy + bh + 90, 220, 120, '#22d3ee');
          building(bxx, byy, bw, bh, { color: '#7c3aed', height: 30, draw(c) { c.save(); c.textAlign = 'center'; c.font = '800 28px Heebo, Arial'; c.fillStyle = '#fff'; c.shadowColor = '#c4b5fd'; c.shadowBlur = 14; c.fillText('NET-MART', bxx + bw / 2, byy + 70); c.font = '58px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; c.shadowBlur = 0; c.fillText('🛒', bxx + bw / 2, byy + 135); c.restore(); c.fillStyle = '#c4b5fd'; c.fillRect(bxx + bw / 2 - 44, byy + bh - 6, 88, 12); } });
          world.doors.push({ shop: true, x: cx - 90, y: byy + bh + 44, r: 54 });
          // home building
          const hx = cx + 90; building(hx + 40, inner.y + 24, 190, 150, { color: '#475569', height: 20, sign: 'HOME', signColor: '#34d399' });
          fillLots({ x: inner.x, y: inner.y + 24 + 170 + 220, w: inner.w, h: inner.h - 24 - 170 - 220 }, 'city');
          bench(cx - 250, byy + bh + 120); tree(cx + 150, byy + bh + 150, 15); tree(cx - 300, byy + bh + 40, 15);
          world.spawn = { x: cx - 90, y: byy + bh + 150 };
          blk.npcSlot = { x: cx - 10, y: byy + bh + 120 };
        } else if (spec.theme === 'park') {
          add(0, [inner.x, inner.y, inner.x + inner.w, inner.y + inner.h], c => {
            c.fillStyle = palette.grass; rr(c, inner.x, inner.y, inner.w, inner.h, 24); c.fill();
            c.fillStyle = palette.grass2; for (let k = 0; k < 40; k++) { const rg = OG.rng(i * 100 + j * 10 + k); c.beginPath(); c.arc(inner.x + rg() * inner.w, inner.y + rg() * inner.h, 18 + rg() * 30, 0, 7); c.fill(); }
            c.strokeStyle = '#9aa58a'; c.lineWidth = 22; c.lineCap = 'round'; c.beginPath(); c.moveTo(inner.x + 30, inner.y + inner.h / 2); c.bezierCurveTo(cx - 120, inner.y + 40, cx + 120, inner.y + inner.h - 40, inner.x + inner.w - 30, inner.y + inner.h / 2); c.stroke();
            c.strokeStyle = '#b5bfa0'; c.lineWidth = 16; c.stroke();
          });
          const px = cx + 130, py = inner.y + inner.h * .3;
          add(2, [px - 110, py - 70, px + 110, py + 70], c => { c.fillStyle = '#7a8cb8'; c.beginPath(); c.ellipse(px, py, 108, 66, 0, 0, 7); c.fill(); c.fillStyle = '#0e5f93'; c.beginPath(); c.ellipse(px, py, 98, 57, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.ellipse(px - 20, py - 14, 40, 14, -.2, 0, 7); c.fill(); });
          solid(px - 98, py - 50, 196, 100, 'water'); world.parks.push({ x: px, y: py });
          for (let k = 0; k < 22; k++) { const tx = inner.x + 30 + rng() * (inner.w - 60), ty = inner.y + 30 + rng() * (inner.h - 60); if (Math.hypot(tx - px, (ty - py) * 1.5) > 120 && Math.abs(ty - (inner.y + inner.h / 2)) > 50) tree(tx, ty, 16 + rng() * 6); }
          bench(cx - 100, inner.y + inner.h / 2 - 40); bench(cx + 60, inner.y + inner.h / 2 + 50, true);
          blk.npcSlot = { x: cx - 40, y: inner.y + inner.h / 2 };
        } else if (spec.theme === 'stadium') {
          const sx = cx, sy = blk.y + blk.h / 2;
          add(2, [sx - 300, sy - 200, sx + 300, sy + 200], c => {
            c.fillStyle = '#3b2a22'; rr(c, sx - 290, sy - 190, 580, 380, 190); c.fill(); c.fillStyle = '#b4532a'; rr(c, sx - 270, sy - 170, 540, 340, 170); c.fill();
            c.fillStyle = '#2f7a46'; rr(c, sx - 215, sy - 115, 430, 230, 100); c.fill();
            c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.strokeRect(sx - 190, sy - 90, 380, 180); c.beginPath(); c.moveTo(sx, sy - 90); c.lineTo(sx, sy + 90); c.stroke(); c.beginPath(); c.arc(sx, sy, 34, 0, 7); c.stroke();
            c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2; for (let k = 1; k < 5; k++) { rr(c, sx - 270 + k * 8, sy - 170 + k * 8, 540 - k * 16, 340 - k * 16, 170 - k * 8); c.stroke(); }
          });
          solid(sx - 300, sy - 205, 600, 30, 'wall'); solid(sx - 300, sy + 175, 600, 30, 'wall');
          for (const [tx, ty] of [[inner.x + 40, inner.y + 40], [inner.x + inner.w - 40, inner.y + 40], [inner.x + 40, inner.y + inner.h - 40], [inner.x + inner.w - 40, inner.y + inner.h - 40]]) tree(tx, ty, 18);
          blk.npcSlot = { x: sx, y: sy };
        } else if (spec.theme === 'harbor') {
          add(0, [inner.x, inner.y, inner.x + inner.w, inner.y + inner.h], c => { c.fillStyle = '#243049'; c.fillRect(inner.x, inner.y, inner.w, inner.h); c.strokeStyle = '#33405f'; c.lineWidth = 2; for (let k = 0; k < inner.w; k += 60) { c.beginPath(); c.moveTo(inner.x + k, inner.y); c.lineTo(inner.x + k, inner.y + inner.h); c.stroke(); } });
          fillLots({ x: inner.x, y: inner.y, w: inner.w, h: inner.h }, 'industrial');
        } else if (spec.theme === 'industrial') {
          add(0, [inner.x, inner.y, inner.x + inner.w, inner.y + inner.h], c => { c.fillStyle = '#2a3043'; c.fillRect(inner.x, inner.y, inner.w, inner.h); });
          fillLots(inner, 'industrial');
        } else if (spec.theme === 'home') { /* handled above */ }
        else fillLots(inner, 'city');
      }

      /* ---------- gate (bridge) ---------- */
      world.gate = { x: rvx - 44, y: brY + 4, w: 14, h: RW - 8, open: false };
      solid(world.gate.x, world.gate.y, world.gate.w, world.gate.h, 'gate');
      /* ---------- coins ---------- */
      const sol = world.solids; const blocked = (x, y, r) => sol.some(s => x > s.x - r && x < s.x + s.w + r && y > s.y - r && y < s.y + s.h + r);
      let cid = 0;
      for (const blk of world.blocks) {
        const pts = []; const o = 16;
        for (let x = blk.x + 70; x < blk.x + blk.w - 40; x += 150) { pts.push([x, blk.y + o + 10]); pts.push([x + 75, blk.y + blk.h - o - 10]); }
        for (let y = blk.y + 100; y < blk.y + blk.h - 60; y += 160) { pts.push([blk.x + o + 8, y]); pts.push([blk.x + blk.w - o - 8, y + 60]); }
        for (const [x, y] of pts) { if (!blocked(x, y, 10) && rng() > .2) world.coins.push({ id: 'c' + (cid++), x, y, v: 1 }); }
        const d = world.doors.find(dd => blk.spec.ch && dd.ch === blk.spec.ch);
        if (d) for (let k = -2; k <= 2; k++) if (k) world.coins.push({ id: 'c' + (cid++), x: d.x + k * 46, y: d.y + 60 + Math.abs(k) * 6, v: 2 });
        const gx2 = blk.x + blk.w / 2, gy2 = blk.y + blk.h / 2;
        if (!blocked(gx2 + 30, gy2 + 30, 12)) world.coins.push({ id: 'c' + (cid++), x: gx2 + 30, y: gy2 + 30, v: 5, gold: true });
      }
      // power-ups (turbo) on streets
      world.powerups = [];
      for (let k = 0; k < 12; k++) { const n = world.nodes[Math.floor(rng() * world.nodes.length)]; world.powerups.push({ id: 'p' + k, x: n.x + (rng() > .5 ? 1 : -1) * (RW / 2 + 36), y: n.y + (rng() > .5 ? 1 : -1) * (RW / 2 + 36), t: 0 }); }

      /* ---------- npcs ---------- */
      const blkAt = (i, j) => world.blocks.find(b => b.i === i && b.j === j);
      const slot = (i, j, dx = 0, dy = 0) => { const b = blkAt(i, j); const s = b.npcSlot || { x: b.x + b.w / 2, y: b.y + b.h / 2 }; return { x: s.x + dx, y: s.y + dy }; };
      const N = (id, name, face, color, i, j, dx, dy) => { const p = slot(i, j, dx, dy); world.npcs.push({ id, name, face, color, x: p.x, y: p.y }); };
      N('mentor', 'ד״ר דייקסטרה', '🧙‍♂️', '#a78bfa', 0, 0, 40, -20);
      N('shop', 'מוכרת החנות', '🛍️', '#f472b6', 0, 0, -160, -100);
      N('stan', 'סטטי סטן', '🧓', '#fb923c', 1, 0, 0, 0);
      N('lior', 'ליאור הכתב', '📨', '#60a5fa', 2, 0, 0, 0);
      N('captain', 'קפטן Hello', '⚓', '#34d399', 0, 1, 0, 0);
      N('broker', 'סוחר העלויות', '🕴️', '#fbbf24', 2, 1, 0, 0);
      N('safe', 'שומרת הכספת', '💂‍♀️', '#22d3ee', 0, 2, 0, 0);
      N('dana', 'דנה DR', '👩‍💼', '#a78bfa', 1, 2, -10, 0);
      N('bob', 'בוב BDR', '🧑‍💼', '#c4b5fd', 1, 2, 60, 30);
      N('detective', 'הבלשית טרמינל', '🕵️‍♀️', '#f472b6', 2, 2, 0, 0);
      N('chief', 'מפקדת ה-NOC', '👩‍✈️', '#ef4444', 1, 1, 0, 0);
      N('guard', 'שומר הגשר', '💂', '#e879f9', 2, 1, 0, 0);
      { const g = world.npcs.find(n => n.id === 'guard'), b2 = blkAt(2, 1); g.x = b2.x + b2.w - 50; g.y = b2.y - 20 + 0; g.y = b2.y + 22; }
      N('e1npc', 'ד״ר Handshake', '🤝', '#2dd4bf', 3, 0, 0, 0);
      N('e2npc', 'הדוור הראשי', '📮', '#f59e0b', 4, 0, 0, 0);
      N('e3npc', 'האסטרונום', '🔭', '#818cf8', 3, 1, 0, 0);
      N('e4npc', 'קצין המכס', '🛃', '#fb7185', 4, 1, 0, 0);
      N('e5npc', 'הקברניט', '👨‍✈️', '#e879f9', 3, 2, 0, 0);
      N('park', 'ג׳וגר בפארק', '🏃', '#34d399', 0, 3, 0, 0);
      world.spawn = world.spawn || { x: gx(0) + 300, y: gy(0) + 300 };
      return world;
    }
  };
  OG.Gen.rr = rr; OG.Gen.shade = shade;
})(window.OG);
