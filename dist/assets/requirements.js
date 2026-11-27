const art = {
  lavender: '<path fill="#b98ade" d="M32 5C23 18 9 30 9 43a23 19 0 0 0 46 0C55 30 41 18 32 5Z"/><path fill="#e8ccf7" d="M32 8C21 23 13 34 13 41c0 11 11 14 19 12 10-2 18-10 13-23Z"/><ellipse fill="#fff9ff" opacity=".8" cx="24" cy="32" rx="5" ry="8" transform="rotate(28 24 32)"/>',
  blush: '<path fill="#d384a9" d="M32 5C23 18 9 30 9 43a23 19 0 0 0 46 0C55 30 41 18 32 5Z"/><path fill="#f4bdd3" d="M32 8C21 23 13 34 13 41c0 11 11 14 19 12 10-2 18-10 13-23Z"/><ellipse fill="#fff9ff" opacity=".8" cx="24" cy="32" rx="5" ry="8" transform="rotate(28 24 32)"/>',
  mint: '<path fill="#82baa5" d="M32 5C23 18 9 30 9 43a23 19 0 0 0 46 0C55 30 41 18 32 5Z"/><path fill="#bce8d4" d="M32 8C21 23 13 34 13 41c0 11 11 14 19 12 10-2 18-10 13-23Z"/><ellipse fill="#fff9ff" opacity=".8" cx="24" cy="32" rx="5" ry="8" transform="rotate(28 24 32)"/>',
  flower: '<path d="M32 44V24m0 16q-11 0-12-8 11 0 12 8" stroke="#729981" stroke-width="3" fill="none"/><path fill="#f1b6ce" d="M32 8c8-9 15 1 12 7 10 2 8 14-2 14-5 10-15 8-16 1-10 0-13-12-4-15-1-7 5-11 10-7Z"/><circle cx="33" cy="21" r="6" fill="#ffe4a1"/><path fill="#d4b7e6" d="M22 42h20l-2 14q-8 7-16 0Z"/><path d="M24 43h16" stroke="#f5e6fd" stroke-width="3" stroke-linecap="round"/>',
  star: '<path fill="#b694cd" d="M27 43h10v10h-10z"/><ellipse cx="32" cy="55" rx="15" ry="4" fill="#d6bce5"/><path fill="#d7a85f" d="m32 5 7 14 15 2-11 11 3 15-14-7-14 7 3-15-11-11 15-2Z"/><path fill="#ffdf96" d="m31 7 6 14 14 1-11 9 2 12-12-7-10 6 3-13-11-7 14-2Z"/>',
  plant: '<path fill="#74a68d" d="M32 44C9 41 10 21 18 19c8-3 13 11 14 25Zm1 0c21 0 25-21 16-23-8-2-14 8-16 23Z"/><path fill="#a9ccb0" d="M32 42C16 22 24 5 33 7c10 2 8 22-1 35Z"/><path fill="#eab6a6" d="M20 40h25l-3 15q-10 8-19 0Z"/><path d="M21 41h23" stroke="#ffdcce" stroke-width="4" stroke-linecap="round"/>',
  morning: '<path fill="#a9d5e5" d="M8 50V31a24 24 0 0 1 48 0v19Z"/><circle fill="#ffe49f" cx="32" cy="30" r="10"/><path fill="#e8f1e4" d="M8 48q12-15 26-4 12-7 22-2v9H8Z"/>',
  sunset: '<path fill="#d9add4" d="M8 50V31a24 24 0 0 1 48 0v19Z"/><path fill="#f4b599" d="M8 37h48v13H8Z"/><path fill="#ffe1a3" d="M22 42a10 10 0 0 1 20 0Z"/><path fill="#ba91b4" d="M8 46q14-8 26-2 12-5 22 1v6H8Z"/>',
  night: '<path fill="#787eaf" d="M8 50V31a24 24 0 0 1 48 0v19Z"/><path fill="#fff0be" d="M34 16a13 13 0 1 0 10 19 13 13 0 0 1-10-19Z"/><path fill="#fff7dc" d="m45 19 2 4 4 2-4 1-2 4-1-4-4-1 4-2Z"/><path fill="#a7a6c4" d="M8 47q11-9 27-3 12-7 21 0v7H8Z"/>'
};
const icon = (key) => '<svg viewBox="0 0 64 64" aria-hidden="true">' + art[key] + '</svg>';

const rooms = [
  {
    id: 'theme', title: 'ألوان لطيفة',
    line: 'خلّونا نختار لون حلو لموقعي. أي لون يناسب عالمي؟',
    requirement: 'موقعي يحتاج ألوان لطيفة تناسب عالمي.',
    options: [['lavender', 'بنفسجي'], ['blush', 'وردي'], ['mint', 'نعناعي']]
  },
  {
    id: 'decor', title: 'ديكور جميل',
    line: 'أحس إن عالمي ناقصه شي حلو. أي زينة نضيف؟',
    requirement: 'نضيف زينة تخلّي عالمي أحلى.',
    options: [['flower', 'وردة'], ['star', 'نجمة'], ['plant', 'نبتة']]
  },
  {
    id: 'sky', title: 'أجواء مميزة',
    line: 'خلّونا نغيّر أجواء عالمي. نختار صباح هادي، غروب دافي، أو ليل؟',
    requirement: 'أقدر أغيّر أجواء عالمي.',
    options: [['morning', 'صباح'], ['sunset', 'غروب'], ['night', 'ليل']]
  }
];

const reactions = {
  lavender: ['excited', 'واو! البنفسجي يناسب عالمي!'],
  blush: ['curious', 'الوردي ناعم وحلو… ممكن نعتمده!'],
  mint: ['displeased', 'ممم… النعناعي حلو، بس ما أحس إنه يناسبني.'],
  flower: ['excited', 'الوردة خلّت عالمي أحلى!'],
  star: ['happy', 'النجمة أضافت لمعة حلوة للرف!'],
  plant: ['displeased', 'عندي نباتات كثيرة. خلّونا نجرّب شي مختلف!'],
  morning: ['happy', 'صباح هادي! أحس عالمي صار منعش.'],
  sunset: ['excited', 'واو! منظر الغروب من نافذتي حلو!'],
  night: ['displeased', 'الليل حلو، بس عالمي صار أغمق من اللازم.']
};
const documentRows = [
  ['الألوان', 'لوحة ألوان % تناسب عالم بيكسي.', {
    lavender: 'بنفسجية', blush: 'وردية'
  }, '<rect x="4" y="7" width="15" height="11" rx="3" transform="rotate(-12 11 12)"/><path d="M9 12h1m3 0h1"/>'],
  ['الديكور', 'إضافة % تزيّن رف بيكسي.', {
    flower: 'وردة', star: 'نجمة'
  }, '<path d="M12 13v7m0-3q5 0 5-3M12 5c3-4 7 1 4 3 5 1 2 7-2 4-1 4-6 4-6 0-4 1-5-5-1-5 0-4 5-5 5-2Z"/>'],
  ['الأجواء', 'تغيير أجواء العالم، مع % في المعاينة.', {
    morning: 'صباح هادئ', sunset: 'غروب دافئ'
  }, '<path d="M4 16h16M7 15a5 5 0 0 1 10 0M12 5v2M5 8l2 2m10 0 2-2M8 20h8"/>']
];

export function createRequests(actions) {
  const section = document.querySelector('#emotions');
  const find = (selector) => section.querySelector(selector);
  const line = find('#request-line');
  const feedback = find('#request-feedback');
  const requirement = find('#request-comparison');
  const summary = find('.room-summary');
  const summaryRows = summary.querySelector('ol');
  const fileTitle = summary.querySelector('h2');
  const next = find('#next');
  const previous = find('#request-previous');
  const decoration = find('.room-decoration');
  const particles = find('.room-particles');
  const spots = [...section.querySelectorAll('.room-spot')];
  const saved = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const timers = new Set();
  let scene = -1;
  let phase = 'opening';
  let preview;

  const say = (words) => {
    line.textContent = words ? '«' + words + '»' : '';
    line.hidden = !words;
  };
  const focus = (node) => node.focus({ preventScroll: true });
  const setPhase = (value) => { section.dataset.phase = phase = value; };
  const objects = (i = scene) => spots[i].querySelector('.room-objects');

  function later(run, delay) {
    const timer = setTimeout(() => {
      timers.delete(timer);
      run();
    }, reduced.matches ? Math.min(delay, 300) : delay);
    timers.add(timer);
  }

  function forward(label) {
    next.hidden = !label;
    next.textContent = label || '';
  }

  function effect(kind, parent = particles) {
    const marks = { happy: '♥✦✧', confused: '؟؟', sleep: 'Zzz', magic: '✦✧✦♥✧' };
    const group = document.createElement('span');
    group.className = 'room-effect';
    group.dataset.effect = kind;
    group.setAttribute('aria-hidden', 'true');
    group.replaceChildren(...Array.from(marks[kind], (mark, i) => {
      const item = document.createElement('i');
      item.style.setProperty('--i', i);
      item.textContent = mark;
      return item;
    }));
    parent.append(group);
    later(() => group.remove(), 1750);
  }

  function object(key, label, activate) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'room-object';
    button.dataset.idea = key;
    button.innerHTML = icon(key) + '<span>' + label + '</span>';
    button.addEventListener('click', activate);
    return button;
  }

  function markers() {
    spots.forEach((spot, i) => {
      const marker = spot.querySelector('.room-marker');
      if (i === scene && phase !== 'saved') {
        marker.hidden = true;
      } else if (saved.has(i)) {
        const key = saved.get(i);
        marker.innerHTML = icon(key) + '<span aria-hidden="true">✓</span>';
        marker.title = rooms[i].title;
        marker.hidden = false;
        marker.dataset.confirmed = '';
      } else {
        marker.innerHTML = '<i></i>';
        marker.removeAttribute('title');
        marker.hidden = false;
        delete marker.dataset.confirmed;
      }
    });
  }

  function leave() {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    actions.clear();
    for (const item of section.querySelectorAll('.room-effect')) item.remove();
    find('.room-flight')?.remove();
    section.querySelectorAll('.room-file-flight').forEach((flight) => flight.remove());
  }

  function render() {
    leave();
    preview = undefined;
    applyRoom();
    spots.forEach((spot, i) => {
      delete objects(i).dataset.exit;
      objects(i).replaceChildren();
      spot.toggleAttribute('data-current', i === scene);
    });
    summary.hidden = requirement.hidden = feedback.hidden = true;
    previous.disabled = scene < 0;
    next.onclick = advance;
    forward();
    if (scene < 0) {
      setPhase('opening');
      say('أهلًا يا بنات! عندي أفكار كثيرة لموقعي، ومحتاجة مساعدتكم عشان أرتّبها.');
      actions.pose('curious');
      forward('نبدأ نفهم أفكار بيكسي');
      next.onclick = () => {
        say('قبل ما نصمّم أو نبرمج، خلّونا نحدّد مع بعض اللي أحتاجه في موقعي.');
        forward('نختار الألوان');
        next.onclick = advance;
      };
    } else if (scene === rooms.length) {
      finale();
    } else {
      setPhase('ideas');
      say(rooms[scene].line);
      actions.pose(scene === 0 ? 'confused' : 'curious');
      showIdeas();
    }
    markers();
  }

  function applyRoom() {
    for (const [i, { id }] of rooms.entries()) {
      const choice = (i === scene && preview !== undefined) ? preview : saved.get(i);
      if (choice) section.dataset[id] = choice;
      else delete section.dataset[id];
    }
    const key = section.dataset.decor;
    if (key !== decoration.dataset.item) {
      if (key) decoration.dataset.item = key;
      else delete decoration.dataset.item;
      decoration.innerHTML = key ? icon(key) : '';
    }
    decoration.hidden = !key;
  }

  function showIdeas() {
    const options = rooms[scene].options.map(([key, label]) => object(key, label, () => choose(key)));
    for (const option of options) option.setAttribute('aria-pressed', 'false');
    objects().replaceChildren(...options);
  }

  function choose(key) {
    leave();
    preview = key;
    applyRoom();
    requirement.hidden = true;
    forward();
    for (const button of objects().querySelectorAll('[data-idea]')) {
      button.setAttribute('aria-pressed', String(button.dataset.idea === key));
    }
    const [mood, words] = reactions[key];
    setPhase('preview');
    actions.pose('curious');
    later(() => {
      if (mood === 'displeased') {
        setPhase('ideas');
        actions.pose('displeased');
        actions.perform('displeased');
        say(words);
        return;
      }
      actions.pose(mood === 'happy' ? '' : mood);
      if (mood === 'excited') {
        actions.perform('surprised');
        effect('magic');
        later(() => actions.perform('happy'), 480);
      } else if (mood === 'happy') {
        actions.perform('happy');
        effect('happy');
      }
      clarify(key, words);
    }, 390);
  }

  function clarify(key, words) {
    setPhase('clarified');
    say(words);
    requirement.textContent = rooms[scene].requirement;
    requirement.hidden = false;
    next.onclick = () => confirm(key);
    forward('نثبت الفكرة');
  }

  function confirm(key) {
    saved.set(scene, key);
    preview = undefined;
    applyRoom();
    setPhase('saved');
    markers();
    const marker = spots[scene].querySelector('.room-marker');
    if (!reduced.matches) {
      const from = requirement.getBoundingClientRect();
      const to = marker.getBoundingClientRect();
      const card = requirement.cloneNode(true);
      card.removeAttribute('id');
      card.removeAttribute('aria-live');
      card.removeAttribute('tabindex');
      card.className = 'room-flight';
      card.setAttribute('aria-hidden', 'true');
      Object.assign(card.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px' });
      section.append(card);
      card.animate([
        { transform: 'none' },
        { transform: 'translate(' + (to.x + to.width / 2 - from.x - from.width / 2) + 'px,' +
            (to.y - from.y) + 'px) scale(.12)', opacity: 0 }
      ], { duration: 520, easing: 'cubic-bezier(.2,.75,.3,1)' }).onfinish = () => card.remove();
    }
    requirement.hidden = true;
    const tray = objects();
    tray.dataset.exit = '';
    for (const button of tray.querySelectorAll('button')) button.disabled = true;
    later(() => tray.replaceChildren(), 230);
    actions.pose('');
    next.onclick = advance;
    forward(scene === rooms.length - 1 ? 'نشوف الغرفة' : 'نكمل');
    focus(next);
  }

  function fillDocument() {
    summaryRows.replaceChildren(...documentRows.map(([title, template, terms, symbol], i) => {
      const item = document.createElement('li');
      item.style.setProperty('--row', i);
      const number = document.createElement('span');
      number.className = 'room-file-number';
      number.dir = 'ltr';
      number.textContent = '0' + (i + 1);
      const content = document.createElement('div');
      const heading = document.createElement('h3');
      heading.textContent = title;
      const detail = document.createElement('p');
      const key = saved.get(i);
      const label = terms[key] ?? rooms[i].options.find(([value]) => value === key)[1];
      detail.textContent = template.replace('%', label);
      const glyph = document.createElement('span');
      glyph.className = 'room-file-symbol';
      glyph.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + symbol + '</svg>';
      content.append(heading, detail);
      item.append(number, content, glyph);
      return item;
    }));
  }

  function flyIntoDocument() {
    if (reduced.matches) return;
    for (const [i, spot] of spots.entries()) {
      const marker = spot.querySelector('.room-marker');
      const stamp = summaryRows.children[i].querySelector('.room-file-number');
      const from = marker.getBoundingClientRect();
      const to = stamp.getBoundingClientRect();
      const x = to.x + (to.width - from.width) / 2 - from.x;
      const y = to.y + (to.height - from.height) / 2 - from.y;
      const flight = marker.cloneNode(true);
      flight.className = 'room-file-flight';
      flight.setAttribute('aria-hidden', 'true');
      Object.assign(flight.style, { left: from.x + 'px', top: from.y + 'px' });
      section.append(flight);
      flight.animate([
        { transform: 'none', opacity: 1 },
        { transform: 'translate(' + x * .48 + 'px,' + (y * .46 - 30) + 'px) rotate(-8deg)', opacity: 1 },
        { transform: 'translate(' + x + 'px,' + y + 'px) scale(.65)', opacity: 0 }
      ], { duration: 910 + i * 145, easing: 'cubic-bezier(.34,.1,.2,1)', fill: 'both' }).onfinish = () => flight.remove();
    }
  }

  function finale() {
    setPhase('gather');
    say('');
    actions.pose('looking');
    later(() => {
      fillDocument();
      summary.hidden = false;
      setPhase('summary');
      flyIntoDocument();
      later(() => {
        actions.pose('excited');
        actions.perform('happy');
        effect('happy');
        say('رائع! صرت أعرف بالضبط اللي أحتاجه في موقعي.');
        next.onclick = () => actions.done(next);
        forward('يلا نصمم');
        fileTitle.focus({ preventScroll: true });
      }, 1930);
    }, 680);
  }

  function advance() {
    scene += 1;
    render();
    if (scene < rooms.length) focus(line);
  }

  next.onclick = advance;
  previous.addEventListener('click', () => { scene -= 1; render(); focus(line); });
  find('#request-replay').addEventListener('click', () => { render(); focus(line); });
  find('#request-reset').addEventListener('click', () => {
    scene = -1;
    saved.clear();
    render();
    focus(line);
  });

  const mazeSummary = document.querySelector('#request-summary');
  const mazeItems = document.querySelector('#saved-requests');
  return {
    enter: render,
    leave,
    updateSummary() {
      mazeItems.replaceChildren(...rooms.flatMap(({ requirement }, i) => {
        if (!saved.has(i)) return [];
        const item = document.createElement('li');
        item.textContent = requirement;
        return [item];
      }));
      mazeSummary.hidden = saved.size === 0;
    }
  };
}
