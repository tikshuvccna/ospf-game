/* OSPF City – boot */
(function (OG) {
  const boot = () => {
    OG.state.load();
    const s = OG.state.data.settings; OG.snd.enabled = s.sound; OG.snd.music = s.music;
    OG.World.init(document.getElementById('world'));
    OG.World.playerCar.color = OG.state.data.look.paint;
    OG.ui.init();
    const d = OG.state.data;
    if (d.pos) OG.World.teleport(d.pos.x, d.pos.y);
    OG.ui.showTitle(() => { OG.ui.refreshHud(); OG.ui.updateObjective(); });
    // autosave position
    setInterval(() => { if (!OG.World.paused && !OG.World.attract) { const f = OG.World.P.car || OG.World.P; if (!OG.World.P.car) OG.state.data.pos = { x: Math.round(f.x), y: Math.round(f.y) }; OG.state.save(); } }, 5000);
    setInterval(() => { if (!OG.World.paused) OG.ui.updateObjective(); }, 1000);
    document.addEventListener('pointerdown', () => OG.snd.init(), { once: true });
    window.OG = OG;
  };
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', boot); else boot();
})(window.OG);
