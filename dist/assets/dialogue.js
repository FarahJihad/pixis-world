const glyphs = 'WKPZXRMLHVANQYI';

export function createDialogue(sound) {
  const card = document.querySelector('#intro');
  const letters = [...document.querySelector('#pixi-name').children];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame;

  function resetLetters() {
    for (const letter of letters) {
      letter.classList.remove('scrambling');
      letter.lastElementChild.textContent = '';
    }
  }

  function start({ audible = false } = {}) {
    cancelAnimationFrame(frame);
    const blips = audible && sound.prepareTyping();
    card.hidden = false;
    delete card.dataset.complete;

    if (reduced.matches) {
      resetLetters();
      card.dataset.active = '';
      card.dataset.complete = '';
      if (blips) sound.play('wave');
      return;
    }

    const began = performance.now();
    let lastTick = -1;
    for (const letter of letters) letter.classList.add('scrambling');

    function update(now) {
      card.dataset.active = '';
      const age = now - began;
      const tick = Math.floor(age / 54);
      if (tick !== lastTick) {
        lastTick = tick;
        if (blips && tick % 3 === 0 && tick <= 12) sound.typingTick((tick / 3) * 2);
        for (const [index, letter] of letters.entries()) {
          const settled = age >= 275 + index * 142;
          letter.classList.toggle('scrambling', !settled);
          letter.lastElementChild.textContent = settled ? '' : glyphs[(index * 5 + tick * 3) % glyphs.length];
        }
      }
      if (age >= 770) {
        resetLetters();
        card.dataset.complete = '';
        return;
      }
      frame = requestAnimationFrame(update);
    }
    frame = requestAnimationFrame(update);
  }

  return {
    start,
    hide() {
      cancelAnimationFrame(frame);
      resetLetters();
      card.hidden = true;
      delete card.dataset.active;
    }
  };
}

