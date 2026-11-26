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
    at: 6, color: 0xe5a3c2, topic: 'المتطلبات',
    question: 'إذا طلبت منا بيكسي نسوي لها موقع، وش أول شيء المفروض نسويه؟',
    choices: ['نبدأ نبرمج الموقع', 'نفهم وش تحتاج بيكسي', 'نختار ألوان الموقع', 'ننشر الموقع'],
    correct: 1, hint: 'تذكروا أول خطوة سويناها لما طلبت بيكسي منا نسوي لها موقع.'
  },
  {
    at: 11, color: 0xb3d7c6, topic: 'التطوير',
    question: 'كيف يساعدنا الذكاء الاصطناعي في تطوير المواقع؟',
    choices: ['يساعدنا في كتابة الكود', 'يضمن أن الموقع خالي من الأخطاء', 'يلغي الحاجة إلى التصميم', 'يقرر كل شيء بدلًا عنّا'],
    correct: 0, hint: 'الذكاء الاصطناعي أداة تساعدنا، لكنه ما يغني عن دور مهندس البرمجيات.'
  },
  {
    at: 16, color: 0xf4d88e, topic: 'الاختبار',
    question: 'إذا اكتشفنا خطأ في الموقع بعد البرمجة، وش المفروض نسوي؟',
    choices: ['نحذف الموقع كله', 'نتجاهل الخطأ', 'نصلح الخطأ ونعيد الاختبار', 'نغير الألوان بس'],
    correct: 2, hint: 'تذكروا كيف صلحنا المشكلة في موقع بيكسي وجربناه مرة ثانية.'
  }
];

const digits = '٠١٢٣';
const last = route.length - 1;

export function createMazeGame(sound, onGoHome) {
  const chapter = document.querySelector('#surprise');
  const progress = document.querySelector('#maze-progress strong');
  const instruction = document.querySelector('#maze-instruction');
  const backdrop = document.querySelector('#maze-question-backdrop');
  const step = document.querySelector('#maze-step');
  const prompt = document.querySelector('#maze-prompt');
  const feedback = document.querySelector('#maze-feedback');
  const victory = document.querySelector('#maze-victory');
  const choices = [...document.querySelectorAll('[data-maze-choice]')];
  const begin = document.querySelector('#maze-begin');
  const emergencyScene = document.querySelector('#emergency-scene');
  const goHome = document.querySelector('#maze-go-home');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const state = {
    phase: 'intro', position: 0, gate: 0, clocks: 0, escapedAt: 0,
    opened: [], sceneBlend: 0, alarmGlow: 0
  };
  let active = false, frame = 0, previous = 0, advanceAt = 0;
  let answerLocked = false;

  function refresh() {
    const questioning = state.phase === 'question';
    const question = gates[state.gate];
    chapter.dataset.phase = state.phase;
    emergencyScene.setAttribute('aria-hidden', String(state.phase !== 'intro'));
    begin.disabled = state.phase !== 'intro';
    progress.textContent = digits[state.opened.filter(Boolean).length] + ' / ٣';
    instruction.hidden = state.phase !== 'waiting';
    if (state.phase === 'waiting') {
      instruction.textContent = state.gate === 0
        ? 'اضغطوا على بيكسي عشان تتحرك!'
        : state.gate < gates.length
          ? 'اضغطوا على بيكسي عشان تفتحوا البوابة التالية!'
          : 'اضغطوا على بيكسي عشان تهرب!';
    }
    backdrop.hidden = !questioning;
    victory.hidden = state.phase !== 'escaped';
    feedback.hidden = true;
    for (const button of choices) {
      button.removeAttribute('data-wrong');
      button.removeAttribute('data-correct');
    }
    answerLocked = false;
    if (questioning) {
      step.textContent = 'البوابة ' + digits[state.gate + 1] + ' · ' + question.topic;
      prompt.textContent = question.question;
      for (const [index, button] of choices.entries()) {
        button.querySelector('.maze-choice-text').textContent = question.choices[index];
      }
      prompt.focus({ preventScroll: true });
    } else if (state.phase === 'escaped') {
      goHome.focus({ preventScroll: true });
    }
  }

  function answer(index) {
    if (!active || state.phase !== 'question' || answerLocked) return;
    const question = gates[state.gate];
    const selected = choices[index];
    if (!selected) return;
    for (const button of choices) {
      button.removeAttribute('data-wrong');
      button.removeAttribute('data-correct');
    }
    if (index !== question.correct) {
      selected.setAttribute('data-wrong', '');
      feedback.textContent = 'قريبة! ' + question.hint + ' جرّبوا مرة ثانية.';
      feedback.hidden = false;
      sound.play('retry');
      return;
    }
    answerLocked = true;
    selected.setAttribute('data-correct', '');
    feedback.textContent = 'إجابة صحيحة!';
    feedback.hidden = false;
    state.opened[state.gate] = true;
    advanceAt = state.clocks + (reduced.matches ? .2 : .68);
    sound.play('accept');
  }

  function clickCharacter() {
    if (!active || state.phase !== 'waiting') return;
    state.phase = 'walking';
    if (!reduced.matches) sound.startMazeFootsteps();
    refresh();
  }

  function tick(now) {
    if (!active) return;
    const delta = Math.min(.07, (now - previous) / 1000);
    previous = now;
    state.clocks += delta;
    if (state.phase === 'intro' && !reduced.matches) {
      const target = Math.max(sound.emergencyLevel(), .26 + .15 * Math.sin(state.clocks * 2));
      state.alarmGlow += (target - state.alarmGlow) * (1 - Math.exp(-delta * 2.8));
      emergencyScene.style.setProperty('--alarm-glow', state.alarmGlow.toFixed(3));
    }
    if (state.phase !== 'intro' && state.sceneBlend < 1) {
      state.sceneBlend = Math.min(1, state.sceneBlend + delta / (reduced.matches ? .18 : .95));
    }
    if (state.phase === 'walking') {
      const stop = gates[state.gate]?.at ?? last;
      state.position = reduced.matches ? stop : Math.min(stop, state.position + delta * 2.75);
      if (state.position === stop) {
        sound.stopMazeFootsteps();
        if (stop === last) {
          state.phase = 'escaped';
          state.escapedAt = state.clocks;
          sound.play('gift');
        } else {
          state.phase = 'question';
          sound.play('nav');
        }
        refresh();
      }
    } else if (state.phase === 'question' && answerLocked && state.clocks >= advanceAt) {
      state.phase = 'opening';
      advanceAt = state.clocks + (reduced.matches ? .12 : .74);
      backdrop.hidden = true;
      refresh();
    } else if (state.phase === 'opening' && state.clocks >= advanceAt) {
      state.gate += 1;
      state.phase = 'waiting';
      refresh();
    }
    frame = requestAnimationFrame(tick);
  }

  function reset() {
    sound.stopEmergencyAlarm();
    sound.stopMazeFootsteps();
    Object.assign(state, {
      phase: 'intro', position: 0, gate: 0, clocks: 0, escapedAt: 0,
      opened: [], sceneBlend: 0, alarmGlow: 0
    });
    emergencyScene.style.removeProperty('--alarm-glow');
    refresh();
    if (active) sound.startEmergencyAlarm();
  }

  begin.addEventListener('click', () => {
    if (!active || state.phase !== 'intro') return;
    sound.stopEmergencyAlarm();
    state.phase = 'waiting';
    refresh();
  });
  choices.forEach((button, index) => button.addEventListener('click', () => answer(index)));
  goHome.addEventListener('click', () => {
    if (active && state.phase === 'escaped') onGoHome();
  });
  emergencyScene.addEventListener('pointerup', (event) => {
    if (active && state.phase === 'intro' && !begin.contains(event.target)) sound.playEmergencyAlarm();
  });
  document.addEventListener('keydown', (event) => {
    if (active && state.phase === 'intro' && !begin.contains(event.target)) sound.playEmergencyAlarm();
    if (!active || state.phase !== 'question' || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const key = '1234'.indexOf(event.key);
    const index = key >= 0 ? key : '١٢٣٤'.indexOf(event.key);
    if (index < 0) return;
    event.preventDefault();
    answer(index);
  });

  return {
    state,
    clickCharacter,
    enter() {
      if (active) return;
      active = true;
      reset();
      sound.prepareMazeFootsteps();
      previous = performance.now();
      frame = requestAnimationFrame(tick);
    },
    leave() {
      active = false;
      cancelAnimationFrame(frame);
      reset();
    }
  };
}

