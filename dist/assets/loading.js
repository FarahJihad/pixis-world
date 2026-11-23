export function createLoading(world, sound, revealWelcome) {
  const overlay = document.querySelector('#loading');
  const outline = overlay.querySelector('.loading-cut');
  const counter = overlay.querySelector('#loading-counter');
  const percentage = overlay.querySelector('#loading-value');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const started = performance.now();
  let lastFrame = started;
  let goal = .06;
  let shown = 0;
  let done = false;
  let playedLoading = false;
  let lastPercent = -1;

  function paint(progress) {
    overlay.style.setProperty('--progress', progress.toFixed(3));
    const percent = Math.floor(progress * 100);
    if (lastPercent === percent) return;
    lastPercent = percent;
    counter.setAttribute('aria-valuenow', String(percent));
    percentage.textContent = percent + '%';
  }

  function open() {
    document.removeEventListener('pointerup', activateAudio);
    document.removeEventListener('keydown', activateAudio);
    if (sound.canPlayAutomatically()) sound.play('openWorld');
    if (reduced.matches) {
      overlay.hidden = true;
      revealWelcome();
      world.inert = false;
      return;
    }

    function closeOverlay() {
      overlay.hidden = true;
      world.inert = false;
    }

    overlay.dataset.opening = '';
    const opening = performance.now();
    let welcomeShown = false;
    function expand(now) {
      const progress = Math.min(1, (now - opening) / 1040);
      const release = Math.max(0, (progress - .08) / .92);
      const scale = 3.05 * release ** 1.82;
      outline.setAttribute('transform', 'scale(' + scale + ')');
      if (!welcomeShown && progress >= .59) {
        welcomeShown = true;
        revealWelcome();
      }
      if (progress === 1) closeOverlay();
      else requestAnimationFrame(expand);
    }
    requestAnimationFrame(expand);
  }

  function step(now) {
    const age = now - started;
    const delta = Math.min(60, now - lastFrame);
    lastFrame = now;
    const target = done ? 1 : Math.max(goal, Math.min(.23, age / 2700));
    shown += (target - shown) * (1 - Math.exp(-delta / 125));
    if (!playedLoading && sound.canPlayAutomatically()) playedLoading = sound.play('loading');
    if (done && (reduced.matches || shown >= .98)) {
      paint(1);
      open();
      return;
    }
    paint(shown);
    requestAnimationFrame(step);
  }

  function activateAudio(event) {
    if (!event.isTrusted || playedLoading || event.target.closest?.('#sound')) return;
    playedLoading = sound.play('loading');
  }
  sound.prepareAutomatic();
  document.addEventListener('pointerup', activateAudio);
  document.addEventListener('keydown', activateAudio);
  requestAnimationFrame(step);
  return {
    transfer(event) {
      if (event.lengthComputable && event.total) {
        goal = Math.max(goal, .12 + .76 * event.loaded / event.total);
      }
    },
    complete() { done = true; }
  };
}

