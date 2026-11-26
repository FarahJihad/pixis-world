import { app, compare, controls, rules, story } from './design-copy.js';

const sequence = Object.keys(story).filter((scene) => scene !== 'done');
const zoomedScenes = ['clutter', 'teacher', 'rule', 'done'];
const arabic = new Intl.NumberFormat('ar', { numberingSystem: 'arab' });

function labels(names) {
  return names.map((name) => {
    const item = document.createElement('span');
    item.textContent = name;
    return item;
  });
}

function createApp(section, sound) {
  const phone = section.querySelector('.design-phone');
  const title = phone.querySelector('.design-app-title');
  const list = phone.querySelector('.design-app-threads ul');
  const draft = phone.querySelector('.design-app-compose span');
  const send = phone.querySelector('.design-send');
  const feedback = phone.querySelector('.design-app-feedback');

  phone.querySelector('.design-app-subtitle').textContent = app.subtitle;
  phone.querySelector('.design-app-alert').textContent = app.alert;
  phone.querySelector('.design-app-tools').append(...labels(app.tools));
  phone.querySelector('.design-app-nav').append(...labels(app.nav));
  phone.querySelector('.design-app-threads h3').textContent = app.threads;
  for (const contact of app.contacts) {
    const row = document.createElement('li');
    const avatar = document.createElement('span');
    const content = document.createElement('div');
    const name = document.createElement('strong');
    const message = document.createElement('span');
    const time = document.createElement('span');
    time.className = 'design-contact-time';
    avatar.className = 'design-contact-avatar';
    avatar.textContent = contact.name[0];
    avatar.setAttribute('aria-hidden', 'true');
    name.textContent = contact.name;
    message.textContent = contact.message;
    time.textContent = contact.time;
    content.append(name, message);
    row.append(avatar, content, time);
    list.append(row);
  }
  send.textContent = app.send;
  send.addEventListener('click', () => {
    if (send.getAttribute('aria-disabled') === 'true') return;
    draft.textContent = '';
    feedback.textContent = app.sent;
    send.setAttribute('aria-disabled', 'true');
    phone.dataset.sent = '';
    sound.play('accept');
  });

  return {
    render(scene, applied) {
      const zoomed = zoomedScenes.includes(scene);
      phone.inert = !zoomed;
      title.textContent = applied >= 3 ? app.title : app.clutterTitle;
      send.disabled = applied < rules.length;
    },
    resetMessage() {
      draft.textContent = app.draft;
      feedback.textContent = '';
      send.removeAttribute('aria-disabled');
      delete phone.dataset.sent;
    }
  };
}

export function createDesignChapter(section, sound, goHome) {
  const heading = section.querySelector('.design-heading');
  const line = section.querySelector('.design-line');
  const next = section.querySelector('.design-next');
  const replay = section.querySelector('.design-replay');
  const comparison = section.querySelector('.design-compare');
  const progress = section.querySelector('.design-progress');
  const change = section.querySelector('.design-change');
  const phone = createApp(section, sound);
  const steps = rules.map(({ name }, index) => {
    const item = document.createElement('li');
    item.textContent = arabic.format(index + 1);
    item.setAttribute('aria-label', name);
    progress.append(item);
    return item;
  });
  comparison.querySelectorAll('dd').forEach((item, index) => { item.textContent = compare[index]; });
  replay.textContent = controls.replay;

  let scene, rule, applied;

  function render(focus = false) {
    const isRule = scene === 'rule';
    const isDone = scene === 'done';
    const ruleApplied = isRule && applied > rule;
    const copy = isRule ? rules[rule] : story[scene];
    section.dataset.scene = scene;
    section.dataset.applied = applied;
    section.toggleAttribute('data-zoomed', zoomedScenes.includes(scene));
    heading.textContent = isRule ? copy.name : copy.title;
    heading.dir = isRule ? 'ltr' : 'rtl';
    heading.lang = isRule ? 'en' : 'ar';
    line.textContent = copy.line;
    comparison.hidden = scene !== 'compare';
    progress.hidden = !(isRule || isDone);
    steps.forEach((item, index) => {
      item.toggleAttribute('data-complete', index < applied);
      if (isRule && index === rule) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    change.hidden = !ruleApplied;
    change.textContent = ruleApplied ? copy.change : '';
    replay.hidden = !isDone;
    if (isDone) next.textContent = controls.back;
    else if (!isRule) next.textContent = copy.next;
    else if (!ruleApplied) next.textContent = controls.apply;
    else next.textContent = applied === rules.length ? controls.reveal : controls.next;
    phone.render(scene, applied);
    if (focus) heading.focus({ preventScroll: true });
  }

  function enter(audible) {
    scene = 'gift';
    rule = applied = 0;
    phone.resetMessage();
    render();
    if (audible) sound.play('next');
  }

  next.addEventListener('click', () => {
    if (scene === 'done') return goHome();
    if (scene === 'rule' && applied === rule) {
      applied += 1;
      sound.play('accept');
      render();
      return;
    }
    if (scene === 'teacher') scene = 'rule';
    else if (scene === 'rule') {
      if (applied === rules.length) {
        scene = 'done';
        phone.resetMessage();
      } else rule += 1;
    } else scene = sequence[sequence.indexOf(scene) + 1];
    const cue = { mug: 'gift', sip: 'shy', clutter: 'concerned', teacher: 'next', done: 'gift' };
    sound.play(cue[scene] ?? 'nav');
    render(true);
  });

  replay.addEventListener('click', () => {
    enter(true);
    heading.focus({ preventScroll: true });
  });
  return { enter };
}
