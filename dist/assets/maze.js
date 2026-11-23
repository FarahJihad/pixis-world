export const route = [
  [0, 4], [1, 4], [2, 4], [2, 3], [2, 2], [3, 2], [4, 2],
  [5, 2], [5, 3], [5, 4], [6, 4], [7, 4], [8, 4],
  [8, 3], [8, 2], [9, 2], [10, 2], [11, 2], [11, 3], [11, 4], [12, 4], [13, 4]
];

export const branches = [
  [0, 5], [0, 6], [1, 6], [3, 1], [3, 0], [4, 0], [5, 5],
  [5, 6], [6, 6], [7, 6], [8, 1], [8, 0], [7, 0], [12, 2], [12, 1], [12, 0]
];

export const gates = [
  {
    at: 6, color: 0xe5a3c2, topic: 'الرياضيات',
    question: 'مع بيكسي ٣ مفاتيح، ولقت مفتاحين كمان. كم مفتاح صار معها؟',
    choices: ['٤ مفاتيح', '٥ مفاتيح', '٦ مفاتيح'],
    correct: 1, hint: 'ابدؤوا من ٣ وعدّوا مفتاحين زيادة.'
  },
  {
    at: 11, color: 0xb3d7c6, topic: 'العلوم',
    question: 'أي جزء من النبات يمتصّ الماء من التربة؟',
    choices: ['الأوراق', 'الساق', 'الجذور'],
    correct: 2, hint: 'فكّروا بالجزء اللي ينمو تحت التربة.'
  },
  {
    at: 16, color: 0xf4d88e, topic: 'هندسة البرمجيات',
    question: 'إذا قالت بيكسي «بدي أشوف الأفكار اللي خلّصتها»، شو المتطلّب؟',
    choices: ['إظهار الأفكار المكتملة', 'تغيير لون الدفتر', 'حذف الأفكار القديمة'],
    correct: 0, hint: 'المتطلّب يصف الشي اللي بدها تشوفه في الدفتر.'
  }
];

const digits = '٠١٢٣';
const last = route.length - 1;

export function createMazeGame(sound) {
  const card = document.querySelector('#maze-card');
  const prompt = document.querySelector('#maze-prompt');
  const step = document.querySelector('#maze-step');
  const progress = document.querySelector('#maze-progress strong');
  const list = document.querySelector('#maze-options');
  const feedback = document.querySelector('#maze-feedback');
  const restart = document.querySelector('#maze-restart');
  const choices = [...list.querySelectorAll('button')];
  const markers = [...document.querySelectorAll('[data-maze-gate]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { phase: 'idle', position: 0, gate: 0, clocks: 0, escapedAt: 0, opened: [] };
  let active = false, frame = 0, previous = 0, advanceAt = 0;

  function effect(name) {
    if (sound.canPlayAutomatically()) sound.play(name);
  }

  function refresh() {
    const phase = state.phase;
    const done = phase === 'escaped';
    const questioning = phase === 'question';
    const gate = gates[state.gate];
    card.dataset.phase = phase;
    list.hidden = !questioning;
    feedback.hidden = true;
    restart.hidden = !done;
    progress.textContent = digits[state.opened.filter(Boolean).length] + ' / ٣';
    for (const [i, marker] of markers.entries()) marker.toggleAttribute('data-open', !!state.opened[i]);
    if (done) {
      step.textContent = 'البوابات الثلاث مفتوحة';
      prompt.textContent = 'طلعت بيكسي من المتاهة!';
      feedback.textContent = 'أجبتوا صح عند البوابات الثلاث وساعدتوها تلاقي المخرج.';
      feedback.hidden = false;
      prompt.focus({ preventScroll: true });
    } else if (questioning || phase === 'opening') {
      step.textContent = 'البوابة ' + digits[state.gate + 1] + ' · ' + gate.topic;
      prompt.textContent = questioning ? gate.question : 'صح! انفتحت البوابة.';
      if (questioning) {
        for (const [i, button] of choices.entries()) {
          button.querySelector('span').textContent = gate.choices[i];
          button.removeAttribute('data-wrong');
        }
      }
      prompt.focus({ preventScroll: true });
    } else {
      step.textContent = state.gate < gates.length ? (state.gate === 0 ? 'البداية' : 'الطريق مفتوح') : 'آخر خطوة';
      prompt.textContent = state.gate < gates.length ? 'بيكسي بطريقها للبوابة ' + digits[state.gate + 1] + '…' : 'بيكسي قربت توصل للمخرج!';
    }
  }

  function answer(index) {
    if (!active || state.phase !== 'question') return;
    const gate = gates[state.gate];
    if (index !== gate.correct) {
      for (const [i, button] of choices.entries()) button.toggleAttribute('data-wrong', i === index);
      feedback.textContent = 'جرّبوا مرة تانية. ' + gate.hint;
      feedback.hidden = false;
      sound.play('retry');
      return;
    }
    state.opened[state.gate] = true;
    state.phase = 'opening';
    advanceAt = state.clocks + (reduced.matches ? .24 : .72);
    refresh();
    sound.play('accept');
  }

  function tick(now) {
    if (!active) return;
    const delta = Math.min(.07, (now - previous) / 1000);
    previous = now;
    state.clocks += delta;
    if (state.phase === 'travel') {
      const stop = gates[state.gate]?.at ?? last;
      state.position = reduced.matches ? stop : Math.min(stop, state.position + delta * 2.75);
      if (state.position === stop) {
        if (stop === last) {
          state.phase = 'escaped';
          state.escapedAt = state.clocks;
          effect('gift');
        } else {
          state.phase = 'question';
          effect('nav');
        }
        refresh();
      }
    } else if (state.phase === 'opening' && state.clocks >= advanceAt) {
      state.gate += 1;
      state.phase = 'travel';
      refresh();
    }
    frame = requestAnimationFrame(tick);
  }

  function reset() {
    Object.assign(state, { phase: 'travel', position: 0, gate: 0, clocks: 0, escapedAt: 0, opened: [] });
    refresh();
  }

  choices.forEach((button, index) => button.addEventListener('click', () => answer(index)));
  restart.addEventListener('click', () => { reset(); effect('nav'); prompt.focus({ preventScroll: true }); });
  document.addEventListener('keydown', (event) => {
    if (!active || state.phase !== 'question' || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const key = '123'.indexOf(event.key);
    const index = key >= 0 ? key : '١٢٣'.indexOf(event.key);
    if (index < 0) return;
    event.preventDefault();
    answer(index);
  });

  return {
    state,
    enter() {
      if (active) return;
      active = true;
      if (state.phase === 'idle') reset();
      previous = performance.now();
      frame = requestAnimationFrame(tick);
    },
    leave() {
      active = false;
      cancelAnimationFrame(frame);
    }
  };
}

