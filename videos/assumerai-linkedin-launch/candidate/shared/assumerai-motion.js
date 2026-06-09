function introScene(tl, sceneSelector, start) {
  tl.from(`${sceneSelector} .eyebrow`, { y: 22, opacity: 0, duration: 0.38, ease: "power3.out" }, start + 0.18);
  tl.from(`${sceneSelector} .headline`, { y: 48, opacity: 0, duration: 0.58, ease: "expo.out" }, start + 0.3);
  tl.from(`${sceneSelector} .microcopy`, { x: -28, opacity: 0, duration: 0.42, ease: "power2.out" }, start + 0.64);
  tl.from(`${sceneSelector} .gradient-rail`, { scaleX: 0, duration: 0.5, ease: "power3.out" }, start + 0.78);
}

function introProduct(tl, selector, start, vars) {
  tl.from(selector, {
    y: vars && vars.y !== undefined ? vars.y : 42,
    x: vars && vars.x !== undefined ? vars.x : 0,
    scale: vars && vars.scale !== undefined ? vars.scale : 0.96,
    opacity: 0,
    duration: vars && vars.duration ? vars.duration : 0.62,
    ease: vars && vars.ease ? vars.ease : "power3.out",
  }, start);
}

function sweepToScene(tl, coverSelector, outgoingSelector, incomingSelector, start) {
  tl.fromTo(coverSelector, { xPercent: -110 }, { xPercent: 0, duration: 0.28, ease: "power3.inOut" }, start);
  tl.set(incomingSelector, { opacity: 1 }, start + 0.28);
  tl.set(outgoingSelector, { opacity: 0 }, start + 0.29);
  tl.fromTo(coverSelector, { xPercent: 0 }, { xPercent: 110, duration: 0.32, ease: "power3.inOut" }, start + 0.3);
}

function ambientFloat(tl, selector, start, duration, amount) {
  if (duration <= 0) {
    tl.set(selector, { y: 0 }, start);
    return;
  }

  var cycles = Math.max(1, Math.floor(duration / 3));
  var cycleDuration = duration / cycles;

  for (var i = 0; i < cycles; i += 1) {
    var cycleStart = start + (i * cycleDuration);
    tl.to(selector, {
      y: amount,
      duration: cycleDuration / 2,
      ease: "sine.inOut",
    }, cycleStart);
    tl.to(selector, {
      y: 0,
      duration: cycleDuration / 2,
      ease: "sine.inOut",
    }, cycleStart + (cycleDuration / 2));
  }
}

window.AssumerMotion = {
  introScene,
  introProduct,
  sweepToScene,
  ambientFloat,
};
