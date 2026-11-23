const requests = [
  {
    line: 'آخ، أفكاري بتضيع قبل ما ألحق أكتبها. بدي مكان أضيف فيه كل فكرة جديدة!',
    options: ['إضافة فكرة جديدة للدفتر', 'تغيير لون الصفحة'],
    correct: 0,
    hint: 'اقرئي جملة «أضيف فيه كل فكرة جديدة». شو لازم يعمل الدفتر؟'
  },
  {
    line: 'بتضايق لما أدوّر على فكرة وما ألاقيها. بدي أفكار الرسم لحال وأفكار الألعاب لحال!',
    options: ['تكبير حجم الخط', 'تصنيف الأفكار حسب الموضوع'],
    correct: 1,
    hint: 'بيكسي بدها تجمع الأفكار المتشابهة مع بعض.'
  },
  {
    line: 'بضيع بين الأفكار اللي خلّصتها واللي لسه! بدي أشوف علامة على الفكرة لما أخلصها.',
    options: ['وضع علامة «تم» على الفكرة', 'حذف كل الأفكار'],
    correct: 0,
    hint: 'بيكسي بدها تميّز الفكرة اللي خلصتها.'
  }
];
const arabicNumber = new Intl.NumberFormat('ar', { numberingSystem: 'arab' });

export function createRequests(actions) {
  const line = document.querySelector('#request-line');
  const step = document.querySelector('#request-step');
  const effectButton = document.querySelector('#listen-request');
  const choices = [...document.querySelectorAll('[data-choice]')];
  const feedback = document.querySelector('#request-feedback');
  const next = document.querySelector('#next');
  const summary = document.querySelector('#request-summary');
  const list = document.querySelector('#saved-requests');
  const saved = new Set();
  let index = 0;

  function render() {
    const current = requests[index];
    const answered = saved.has(index);
    step.textContent = 'طلب ' + arabicNumber.format(index + 1) + ' من ' + arabicNumber.format(requests.length);
    line.textContent = '«' + current.line + '»';
    for (const [choice, button] of choices.entries()) {
      button.textContent = current.options[choice];
      button.disabled = answered;
      button.toggleAttribute('data-right', answered && choice === current.correct);
      button.removeAttribute('data-retry');
    }
    feedback.hidden = !answered;
    if (answered) feedback.textContent = 'تمام! سجلتوا متطلّب من كلام بيكسي.';
    next.hidden = !answered;
    next.textContent = index === requests.length - 1 ? 'يلا للمفاجأة' : 'الطلب التالي';
    actions.pose(answered ? '' : 'concerned');
  }

  for (const [choice, button] of choices.entries()) {
    button.addEventListener('click', () => {
      if (saved.has(index)) return;
      const current = requests[index];
      if (choice === current.correct) {
        saved.add(index);
        render();
        actions.accept();
        next.focus({ preventScroll: true });
      } else {
        for (const item of choices) item.removeAttribute('data-retry');
        button.dataset.retry = '';
        feedback.hidden = false;
        feedback.textContent = current.hint;
        actions.retry();
      }
    });
  }
  effectButton.addEventListener('click', actions.effect);
  next.addEventListener('click', () => {
    if (!saved.has(index)) return;
    if (index === requests.length - 1) {
      actions.done();
      return;
    }
    index += 1;
    render();
    line.focus({ preventScroll: true });
    actions.effect();
  });

  return {
    get waiting() { return !saved.has(index); },
    enter: render,
    updateSummary() {
      const items = Array.from(saved, (i) => {
        const item = document.createElement('li');
        item.textContent = requests[i].options[requests[i].correct];
        return item;
      });
      list.replaceChildren(...items);
      summary.hidden = items.length === 0;
    }
  };
}

