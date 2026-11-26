import { createSound } from './sound.js';
import { createDialogue } from './dialogue.js';
import { createRequests } from './requirements.js';
import { createMazeGame } from './maze.js';
import { createHomeChapter } from './home.js';

const routes = { welcome: '', emotions: '#emotions', home: '#home', surprise: '#surprise' };

export function createChapters(world, status) {
  const sound = createSound();
  const maze = createMazeGame(sound, () => go('home'));
  const home = createHomeChapter(world);
  const dialogue = createDialogue(sound);
  const panel = {
    emotions: document.querySelector('#emotions'),
    home: document.querySelector('#home'),
    surprise: document.querySelector('#surprise')
  };
  const soundButton = document.querySelector('#sound');
  const requestEffect = document.querySelector('#listen-request');
  const begin = document.querySelector('#begin');
  const destinations = [...document.querySelectorAll('[data-destination]')];
  const state = { screen: 'welcome', emotion: '' };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let transitionEnd, transfer, perform, welcomeWave, homeEntry, ready = false;

  function setMood(mood) {
    state.emotion = mood;
    if (mood) world.dataset.emotion = mood;
    else delete world.dataset.emotion;
  }

  function playRequestEffect() {
    sound.play('concerned');
    if (requests.waiting) perform?.('concerned');
  }

  const requests = createRequests({
    effect: playRequestEffect,
    pose: setMood,
    accept() {
      sound.play('accept');
      perform?.('happy');
    },
    retry() { sound.play('retry'); perform?.('concerned'); },
    done() { transition(document.querySelector('#next'), 'surprise', 'next'); }
  });

  function playWelcome(audible = false) {
    dialogue.start({ audible });
    welcomeWave?.();
  }

  function show(screen, focus, playEffects) {
    if (screen === state.screen) return;
    state.screen = screen;
    world.dataset.screen = screen;
    panel.emotions.hidden = screen !== 'emotions';
    panel.home.hidden = screen !== 'home';
    panel.surprise.hidden = screen !== 'surprise';
    if (screen === 'home') home.enter(homeEntry !== undefined);
    else home.leave();
    for (const link of destinations) {
      if (link.dataset.destination === screen) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    if (screen === 'welcome' && ready) playWelcome(playEffects && sound.enabled);
    else dialogue.hide();
    setMood('');
    if (screen === 'emotions') {
      requests.enter();
      if (playEffects && requests.waiting) playRequestEffect();
    }
    if (screen === 'surprise') {
      requests.updateSummary();
      if (ready) maze.enter();
    } else maze.leave();
    if (focus) (panel[screen]?.querySelector('h1') ?? begin).focus({ preventScroll: true });
  }

  function navigate(screen, focus, playEffects) {
    if (screen === 'home' && screen !== state.screen && ready &&
        !reducedMotion.matches && !world.hasAttribute('data-fallback')) {
      if (homeEntry !== undefined) return;
      home.cover();
      homeEntry = setTimeout(() => {
        show(screen, focus, playEffects);
        homeEntry = undefined;
      }, 240);
      return;
    }
    if (homeEntry !== undefined) {
      clearTimeout(homeEntry);
      homeEntry = undefined;
      home.cancelReveal();
    }
    show(screen, focus, playEffects);
  }

  function fromLocation(focus) {
    const screen = Object.keys(routes).find((key) => routes[key] === location.hash) ?? 'welcome';
    if (screen !== state.screen) transitionEnd?.(false);
    navigate(screen, focus, false);
  }

  function go(screen) {
    if (location.hash !== routes[screen]) location.hash = routes[screen];
    navigate(screen, true, true);
  }

  function syncSound() {
    soundButton.setAttribute('aria-pressed', String(sound.enabled));
    soundButton.title = sound.enabled ? 'إيقاف الصوت' : 'تشغيل الصوت';
    requestEffect.disabled = !sound.enabled;
  }

  function transition(button, screen, cue) {
    if (transitionEnd) return;
    sound.play(cue);
    button.setAttribute('aria-disabled', 'true');
    transitionEnd = (advance = true) => {
      button.removeAttribute('aria-disabled');
      transitionEnd = undefined;
      if (advance) go(screen);
    };
    if (transfer) transfer();
    else transitionEnd();
  }

  destinations.forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const screen = link.dataset.destination;
      if (screen === state.screen && homeEntry === undefined) return;
      transitionEnd?.(false);
      go(screen);
    });
  });
  begin.addEventListener('click', () => transition(begin, 'emotions', 'begin'));
  soundButton.addEventListener('click', () => { sound.toggle(!world.inert); syncSound(); });
  window.addEventListener('hashchange', () => fromLocation(true));
  fromLocation(false);
  syncSound();

  return {
    state,
    sound,
    maze,
    home,
    ready() {
      ready = true;
      syncSound();
      if (state.screen === 'welcome') playWelcome(sound.canPlayAutomatically());
      else if (state.screen === 'emotions' && sound.canPlayAutomatically() && requests.waiting) playRequestEffect();
      else if (state.screen === 'surprise') maze.enter();
    },
    reactToRequest() {
      if (state.screen !== 'emotions' || !requests.waiting) return false;
      playRequestEffect();
      return true;
    },
    connect(onTransfer, onReaction, onWelcome) {
      transfer = onTransfer;
      perform = onReaction;
      welcomeWave = onWelcome;
    },
    finishTransition() { transitionEnd?.(); }
  };
}

