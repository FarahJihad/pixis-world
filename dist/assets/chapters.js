import { createSound } from './sound.js';
import { createDialogue } from './dialogue.js';
import { createRequests } from './requirements.js';
import { createMazeGame } from './maze.js';
import { createHomeChapter } from './home.js';
import { createDesignChapter } from './design.js';

const routes = { welcome: '', emotions: '#emotions', home: '#home', surprise: '#surprise', design: '#design' };

export function createChapters(world, status) {
  const sound = createSound();
  const maze = createMazeGame(sound, () => go('home'));
  const home = createHomeChapter(world, sound);
  const design = createDesignChapter(document.querySelector('#design'), sound, () => go('home'));
  const dialogue = createDialogue(sound);
  const panel = {
    emotions: document.querySelector('#emotions'),
    home: document.querySelector('#home'),
    surprise: document.querySelector('#surprise'),
    design: document.querySelector('#design')
  };
  const soundButton = document.querySelector('#sound');
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

  const requests = createRequests({
    pose: setMood,
    perform(mood) { perform?.(mood); },
    clear() { perform?.(''); }
  });

  function playWelcome(audible = false) {
    dialogue.start({ audible });
    welcomeWave?.();
  }

  function show(screen, focus, playEffects) {
    if (screen === state.screen) return;
    if (state.screen === 'emotions') requests.leave();
    state.screen = screen;
    world.dataset.screen = screen;
    for (const [name, section] of Object.entries(panel)) section.hidden = screen !== name;
    if (screen === 'home') home.enter(homeEntry !== undefined);
    else home.leave();
    if (screen === 'design') design.enter(playEffects);
    for (const link of destinations) {
      if (link.closest('nav') && link.dataset.destination === screen) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    if (screen === 'welcome' && ready) playWelcome(playEffects && sound.enabled);
    else dialogue.hide();
    setMood('');
    if (screen === 'emotions') requests.enter();
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
      else if (state.screen === 'surprise') maze.enter();
    },
    connect(onTransfer, onReaction, onWelcome) {
      transfer = onTransfer;
      perform = onReaction;
      welcomeWave = onWelcome;
    },
    finishTransition() { transitionEnd?.(); }
  };
}

