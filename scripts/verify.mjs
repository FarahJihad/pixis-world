import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const url = process.argv[2] || 'http://127.0.0.1:4173/';
const image = process.argv[3];
const autoplay = process.env.PIXI_VERIFY_AUTOPLAY === '1';
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--autoplay-policy=' + (autoplay ? 'no-user-gesture-required' : 'document-user-activation-required')]
});

try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.addInitScript(() => {
    window.pixiOscillators = 0;
    window.pixiAlarmTracks = [];
    const NativeAudio = window.Audio;
    window.Audio = class extends NativeAudio {
      constructor(src) {
        super(src);
        if (src.endsWith('/emergency-alarm-69780.mp3')) window.pixiAlarmTracks.push(this);
      }
    };
    const createAnalyser = AudioContext.prototype.createAnalyser;
    AudioContext.prototype.createAnalyser = function () {
      return window.pixiAlarmMeter = createAnalyser.call(this);
    };
    window.pixiFootstepRuns = [];
    const createBufferSource = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = createBufferSource.call(this);
      const start = source.start.bind(source);
      const stop = source.stop.bind(source);
      source.start = (...args) => {
        const run = {
          loop: source.loop, loopLength: source.loopEnd - source.loopStart,
          duration: source.buffer.duration, startedAt: this.currentTime,
          overlap: window.pixiFootstepRuns.some(({ stoppedAt }) => stoppedAt === undefined)
        };
        window.pixiFootstepRuns.push(run);
        source.stop = (...stopArgs) => {
          run.stoppedAt = this.currentTime;
          return stop(...stopArgs);
        };
        return start(...args);
      };
      return source;
    };
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (target, ...args) {
      if (target === this.context.destination && this instanceof GainNode) window.pixiMasterGain = this.gain;
      return connect.call(this, target, ...args);
    };
    window.pixiSpokenLines = 0;
    Object.defineProperty(window, 'speechSynthesis', { value: {
      getVoices: () => [{ localService: true, lang: 'ar' }],
      cancel() {},
      speak() { window.pixiSpokenLines++; }
    } });
    window.SpeechSynthesisUtterance = class {};
    window.pixiWelcomeWaves = 0;
    window.addEventListener('pixi:welcome-wave', () => window.pixiWelcomeWaves++);
    document.addEventListener('DOMContentLoaded', () => {
      const name = document.querySelector('#pixi-name');
      if (!name) return;
      const watch = new MutationObserver(() => {
        if (!name.querySelector('.scrambling')) return;
        window.pixiScrambled = true;
        watch.disconnect();
      });
      watch.observe(name, { subtree: true, attributes: true, attributeFilter: ['class'] });
    });
    const create = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () {
      window.pixiOscillators += 1;
      window.pixiAudio = this;
      return create.call(this);
    };
  });
  if (url === 'https://pixi.test/') {
    const root = fileURLToPath(new URL('../dist', import.meta.url));
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
      '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
    await page.route('https://pixi.test/**', async (route) => {
      const { pathname } = new URL(route.request().url());
      const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!path.startsWith(root + sep)) return route.abort();
      await route.fulfill({ body: await readFile(path), contentType: types[extname(path)] });
    });
  }
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  // Playwright evaluates expressions with a simulated gesture. Inspect startup through CDP
  // before making any Playwright locator or evaluation calls.
  async function inspect(expression) {
    const response = await cdp.send('Runtime.evaluate', {
      expression, awaitPromise: true, userGesture: false, returnByValue: true
    });
    assert.equal(response.exceptionDetails, undefined, response.exceptionDetails?.exception?.description);
    return response.result.value;
  }
  function waitForStartup(expression) {
    return inspect(`new Promise((resolve, reject) => {
      const began = performance.now();
      function check() {
        const result = (${expression});
        if (result) resolve(result);
        else if (performance.now() - began > 12000) reject(Error('Startup did not reach: ' + ${JSON.stringify(expression)}));
        else requestAnimationFrame(check);
      }
      check();
    })`);
  }
  async function captureStartup(suffix) {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(image.replace('.png', suffix + '.png'), Buffer.from(data, 'base64'));
  }
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  assert.deepEqual(await inspect(`({
    loading: !document.querySelector('#loading').hidden,
    inert: document.querySelector('.world').inert,
    controls: document.querySelectorAll('#loading button').length,
    sound: document.querySelector('#sound').getBoundingClientRect().width > 0
  })`), { loading: true, inert: true, controls: 0, sound: true });
  if (image) await captureStartup('-loading');
  await waitForStartup("document.querySelector('#loading').hasAttribute('data-opening')");
  assert.equal(await inspect("document.querySelector('#loading-counter').getAttribute('aria-valuenow')"), '100');
  if (image) {
    await waitForStartup("Number(document.querySelector('.loading-cut').getAttribute('transform').slice(6, -1)) >= .29");
    await captureStartup('-opening');
  }
  const startup = await waitForStartup(`document.querySelector('#loading').hidden &&
    document.querySelector('#intro').hasAttribute('data-complete') && {
      waves: window.pixiWelcomeWaves,
      scrambled: window.pixiScrambled,
      ready: document.querySelector('.world').hasAttribute('data-ready'),
      audio: window.pixiOscillators > 0 && window.pixiAudio?.state === 'running',
      oscillators: window.pixiOscillators
    }`);
  assert.ok(startup.ready, errors.join('\n'));
  assert.equal(startup.waves, 1);
  assert.equal(startup.scrambled, true);
  if (autoplay) {
    assert.equal(startup.audio, true);
  } else assert.equal(startup.oscillators, 0);
  const intro = page.locator('#intro');
  const name = page.locator('#pixi-name');
  async function clickPixiAt([column, row], expectHit = true) {
    const surface = page.locator('.maze-map #maze-canvas canvas');
    await surface.waitFor();
    const canvas = await surface.boundingBox();
    assert.ok(canvas, 'The 3D maze canvas should be visible');
    const aspect = canvas.width / canvas.height;
    const viewHeight = Math.max(7.45, 13.15 / aspect);
    const viewWidth = viewHeight * aspect;
    const x = (column - 6) * .88;
    const z = (row - 3) * .88;
    const screenX = canvas.x + (0.5 + x / viewWidth) * canvas.width;
    const screenY = canvas.y + (0.5 + z / viewHeight) * canvas.height;
    if (expectHit) {
      const deadline = Date.now() + 15000;
      let cursor;
      do {
        await page.mouse.move(screenX + 1, screenY);
        await page.mouse.move(screenX, screenY);
        cursor = await surface.evaluate((canvas) => canvas.style.cursor);
      } while (cursor !== 'pointer' && Date.now() < deadline);
      assert.equal(cursor, 'pointer', 'The visible PIXI model should be under the pointer');
      assert.equal(await surface.evaluate((canvas, [x, y]) => document.elementFromPoint(x, y) === canvas,
        [screenX, screenY]), true, 'The maze canvas should receive the click');
    }
    await page.mouse.click(screenX, screenY);
  }
  assert.equal(await name.textContent(), 'PIXI');
  assert.equal(await page.locator('#welcome-title').getAttribute('aria-label'), 'مرحبًا بكم، أنا PIXI');
  assert.equal(await page.evaluate(() => window.pixiWelcomeWaves), 1);
  assert.equal(await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('800 24px Alexandria', 'مرحبًا PIXI');
  }), true);
  assert.equal(await page.locator('#intro-repeat').count(), 0);
  assert.equal(await page.locator('button').evaluateAll((buttons) => buttons.some((button) =>
    /\p{Extended_Pictographic}/u.test(button.textContent))), false);
  if (image) await page.screenshot({ path: image });
  const stage = page.locator('#stage');
  const begin = page.locator('#begin');
  assert.equal(await begin.locator('.icon').count(), 0);
  await page.mouse.move(490, 428);
  assert.equal(await stage.getAttribute('data-hit'), '');
  for (const message of ['لوّحت بيكسي.', 'تفاجأت بيكسي.', 'قفزت بيكسي من الفرح.']) {
    await page.mouse.click(490, 428);
    await page.waitForFunction((text) => document.querySelector('#status').textContent === text, message);
  }
  await page.waitForTimeout(1600);
  await page.mouse.move(490, 428);
  await page.mouse.down();
  await page.mouse.move(690, 440, { steps: 12 });
  assert.equal(await stage.getAttribute('data-dragging'), '');
  await page.mouse.up();

  await stage.focus();
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#status').textContent(), 'لوّحت بيكسي.');
  await page.waitForFunction(() => window.pixiAudio?.state === 'running' && window.pixiOscillators > 0);
  await begin.click();
  assert.equal(await begin.getAttribute('aria-disabled'), 'true');
  await page.locator('#emotions-title').waitFor();
  assert.equal(await begin.getAttribute('aria-disabled'), null);
  assert.equal(new URL(page.url()).hash, '#emotions');
  assert.equal(await page.locator('.world').getAttribute('data-emotion'), 'concerned');
  assert.match(await page.locator('#request-line').textContent(), /أفكاري بتضيع/);
  const requestLink = page.locator('[data-destination="emotions"]');
  const surpriseLink = page.locator('[data-destination="surprise"]');
  assert.equal(await requestLink.textContent(), 'المتطلبات');
  assert.equal(await page.locator('#emotions-title').textContent(), 'المتطلبات');
  assert.equal(await requestLink.getAttribute('aria-current'), 'page');
  if (image) {
    await page.waitForTimeout(1050);
    await page.screenshot({ path: image.replace('.png', '-requests.png') });
  }
  const sound = page.locator('#sound');
  const beforeAlarm = await page.evaluate(() => window.pixiOscillators);
  await surpriseLink.click();
  const emergency = page.locator('#emergency-scene');
  await emergency.waitFor();
  await page.waitForFunction(() => window.pixiAlarmTracks[0]?.currentTime > .15);
  assert.deepEqual(await page.evaluate(() => {
    const [track] = window.pixiAlarmTracks;
    return [window.pixiAlarmTracks.length, track.loop, track.paused, track.muted, window.pixiOscillators];
  }), [1, true, false, false, beforeAlarm]);
  await page.waitForFunction(() => {
    const meter = window.pixiAlarmMeter;
    const samples = new Float32Array(meter.fftSize);
    meter.getFloatTimeDomainData(samples);
    return samples.some((sample) => Math.abs(sample) > .01);
  });
  const canSeekAlarm = await page.evaluate(() => {
    const [track] = window.pixiAlarmTracks;
    if (!Number.isFinite(track.duration)) return false;
    track.currentTime = track.duration - .2;
    return true;
  });
  if (url !== 'https://pixi.test/') assert.ok(canSeekAlarm, 'The browser should know the MP3 duration');
  if (canSeekAlarm) {
    await page.waitForFunction(() => {
      const [track] = window.pixiAlarmTracks;
      return !track.seeking && !track.paused && track.currentTime < track.duration / 2;
    });
  }
  assert.equal(await page.locator('#surprise').getAttribute('data-phase'), 'intro');
  assert.equal(await emergency.locator('.emergency-bubble span').textContent(),
    'انحبست في متاهة فيها ثلاثة بوابات مقفلة! ساعدوني!');
  assert.equal(await page.locator('#maze-instruction').isVisible(), false);
  assert.equal(await page.locator('#maze-question-backdrop').isVisible(), false);
  assert.equal(await page.locator('#maze-begin').textContent(), 'يلا ننقذ بيكسي!');
  assert.deepEqual(await emergency.evaluate((scene) => [
    getComputedStyle(scene.querySelector('.emergency-beacons')).animationName,
    getComputedStyle(scene.querySelector('.emergency-signal')).animationName,
    getComputedStyle(scene, '::after').animationName
  ]), ['alarm-turn', 'emergency-glitch', 'emergency-edge']);
  await page.waitForFunction(() => Number(document.querySelector('#emergency-scene').style.getPropertyValue('--alarm-glow')) > .1);
  const desktop = page.viewportSize();
  for (const [name, viewport] of [
    ['desktop', desktop],
    ['mobile', { width: 390, height: 844 }],
    ['short', { width: 800, height: 450 }]
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForFunction(() => {
      const frame = document.querySelector('.emergency-character');
      const canvas = frame.querySelector('canvas');
      return canvas?.width === frame.clientWidth && canvas.height === frame.clientHeight;
    });
    const items = await emergency.locator('.emergency-message > *').evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().toJSON()));
    for (const [index, box] of items.entries()) {
      assert.ok(box.height > 0 && box.top >= 0 && box.bottom <= viewport.height, name + ' emergency row ' + index);
      assert.ok(Math.abs(box.left + box.width / 2 - viewport.width / 2) < 1, name + ' horizontal centering');
      if (index > 0) assert.ok(items[index - 1].bottom < box.top, name + ' vertical separation');
    }
    assert.ok(items[2].height >= 120, name + ' space for the full character');
    if (image) await page.screenshot({ path: image.replace('.png', '-emergency-' + name + '.png') });
  }
  await page.setViewportSize(desktop);
  await sound.click();
  assert.equal(await page.evaluate(() => window.pixiAlarmTracks[0].muted), true);
  await sound.click();
  assert.equal(await page.evaluate(() => window.pixiAlarmTracks[0].muted), false);
  await requestLink.click();
  const alarmStopped = () => window.pixiAlarmTracks.every((track) => track.paused && track.currentTime === 0);
  assert.ok(await page.evaluate(alarmStopped));
  assert.equal(await requestLink.getAttribute('aria-current'), 'page');
  assert.equal(await surpriseLink.getAttribute('aria-current'), null);
  await surpriseLink.click();
  assert.equal(await page.locator('#surprise').getAttribute('data-phase'), 'intro');
  await page.waitForFunction(() => window.pixiAlarmTracks[0].currentTime > 0);
  assert.equal(await page.evaluate(() => window.pixiAlarmTracks.length), 1);
  await requestLink.click();

  const next = page.locator('#next');
  const choices = page.locator('[data-choice]');
  const requestEffect = page.getByRole('button', { name: 'تشغيل مؤثّر الطلب' });
  await sound.click();
  assert.equal(await sound.getAttribute('aria-pressed'), 'false');
  assert.equal(await requestEffect.isEnabled(), false);
  const mutedCount = await page.evaluate(() => window.pixiOscillators);
  await choices.nth(1).click();
  assert.equal(await choices.nth(1).getAttribute('data-retry'), '');
  assert.match(await page.locator('#request-feedback').textContent(), /شو لازم يعمل الدفتر/);
  assert.equal(await next.isVisible(), false);
  await choices.nth(0).click();
  assert.equal(await choices.nth(0).getAttribute('data-right'), '');
  assert.equal(await page.evaluate(() => window.pixiOscillators), mutedCount);
  await sound.click();
  assert.equal(await sound.getAttribute('aria-pressed'), 'true');
  for (const [choice, message] of [[1, /بتضايق/], [0, /بضيع بين الأفكار/]]) {
    await next.click();
    assert.match(await page.locator('#request-line').textContent(), message);
    assert.equal(await page.locator('.world').getAttribute('data-emotion'), 'concerned');
    await requestEffect.click();
    await choices.nth(choice).click();
    assert.equal(await choices.nth(choice).getAttribute('data-right'), '');
  }

  await page.setViewportSize({ width: 1280, height: 720 });
  await next.click();
  await page.locator('#surprise-title').waitFor();
  assert.equal(new URL(page.url()).hash, '#surprise');
  await page.locator('#maze-canvas canvas').waitFor();
  const maze = page.locator('#surprise');
  const gates = page.locator('#maze-progress strong');
  const answers = page.locator('[data-maze-choice]');
  const step = page.locator('#maze-step');
  const victoryHome = page.getByRole('button', { name: 'الى البيت', exact: true });
  const questionModal = page.locator('#maze-question-backdrop');
  async function footstepsPlaying(count) {
    await page.waitForFunction((count) =>
      window.pixiFootstepRuns.length === count && window.pixiFootstepRuns.at(-1).stoppedAt === undefined, count);
  }
  async function footstepsStopped(count, looped = true) {
    const runs = await page.evaluate(() => window.pixiFootstepRuns);
    assert.equal(runs.length, count);
    assert.ok(runs.every((run) => run.loop && run.duration > 40 && !run.overlap &&
      run.stoppedAt !== undefined && run.loopLength > 0));
    if (looped) {
      const last = runs.at(-1);
      assert.ok(last.stoppedAt - last.startedAt > last.loopLength);
    }
  }
  async function checkGate(question, options) {
    assert.equal(await page.locator('#maze-prompt').textContent(), question);
    assert.deepEqual(await answers.locator('.maze-choice-label').allTextContents(), ['A', 'B', 'C', 'D']);
    assert.deepEqual(await answers.locator('.maze-choice-text').allTextContents(), options);
    assert.ok(await answers.evaluateAll(([a, b, c, d]) =>
      getComputedStyle(a).direction === 'rtl' &&
      a.offsetLeft > b.offsetLeft && a.offsetLeft === c.offsetLeft && b.offsetLeft === d.offsetLeft &&
      a.offsetTop === b.offsetTop && c.offsetTop === d.offsetTop && a.offsetTop < c.offsetTop &&
      Math.abs(a.offsetWidth - b.offsetWidth) <= 1 && Math.abs(a.offsetHeight - c.offsetHeight) <= 1));
  }
  const gateFeedback = page.locator('#maze-feedback');
  async function checkRetry(index, hint) {
    assert.equal(await maze.getAttribute('data-phase'), 'question');
    assert.equal(await answers.nth(index).getAttribute('data-wrong'), '');
    assert.equal(await gateFeedback.textContent(), 'قريبة! ' + hint + ' جرّبوا مرة ثانية.');
  }
  await page.locator('#maze-begin').click();
  assert.ok(await page.evaluate(alarmStopped));
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#emergency-scene')).opacity === '0');
  assert.equal(await emergency.locator('.emergency-beacons').evaluate((beacons) => getComputedStyle(beacons).animationName), 'none');
  await page.waitForFunction(() => document.querySelector('#surprise').dataset.phase === 'waiting');
  assert.equal(await page.locator('#maze-instruction').textContent(), 'اضغطوا على بيكسي أو زر المسافة عشان تتحرك!');
  assert.equal(await gates.textContent(), '٠ / ٣');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.maze-shell')).opacity === '1');
  await footstepsStopped(0, false);
  if (image) {
    await page.screenshot({ path: image.replace('.png', '-maze.png') });
  }
  await page.keyboard.press('Space');
  await footstepsPlaying(1);
  await page.waitForFunction(() => document.querySelector('#surprise').dataset.phase === 'walking', undefined, { timeout: 3000 })
    .catch((error) => { throw new Error(errors.join('\n') || error.message, { cause: error }); });
  await page.waitForTimeout(280);
  await clickPixiAt([1, 4], false);
  assert.equal(await maze.getAttribute('data-phase'), 'walking');
  await questionModal.waitFor({ state: 'visible', timeout: 10000 });
  await page.keyboard.press('Space');
  assert.equal(await maze.getAttribute('data-phase'), 'question');
  await footstepsStopped(1);
  assert.equal(await step.textContent(), 'البوابة ١ · المتطلبات');
  await checkGate('إذا طلبت منا بيكسي نسوي لها موقع، وش أول شيء المفروض نسويه؟',
    ['نبدأ نبرمج الموقع', 'نفهم وش تحتاج بيكسي', 'نختار ألوان الموقع', 'ننشر الموقع']);
  await page.keyboard.press('4');
  await checkRetry(3, 'تذكروا أول خطوة سويناها لما طلبت بيكسي منا نسوي لها موقع.');
  assert.equal(await gates.textContent(), '٠ / ٣');
  await page.keyboard.press('2');
  assert.equal(await answers.nth(1).getAttribute('data-correct'), '');
  assert.equal(await gateFeedback.textContent(), 'إجابة صحيحة!');
  await page.waitForFunction(() => document.querySelector('#surprise').dataset.phase === 'waiting' &&
    document.querySelector('#maze-progress strong').textContent === '١ / ٣');
  await clickPixiAt([4, 2]);
  await footstepsPlaying(2);
  await page.waitForFunction(() => document.querySelector('#surprise').dataset.phase === 'walking');
  await sound.click();
  await page.waitForFunction(() => window.pixiMasterGain.value < .01);
  await sound.click();
  await page.waitForFunction(() => window.pixiMasterGain.value > .5);
  await footstepsPlaying(2);
  await questionModal.waitFor({ state: 'visible', timeout: 25000 });
  await footstepsStopped(2);
  assert.equal(await step.textContent(), 'البوابة ٢ · التطوير');
  await checkGate('كيف يساعدنا الذكاء الاصطناعي في تطوير المواقع؟',
    ['يساعدنا في كتابة الكود', 'يضمن أن الموقع خالي من الأخطاء', 'يلغي الحاجة إلى التصميم', 'يقرر كل شيء بدلًا عنّا']);
  await page.keyboard.press('3');
  await checkRetry(2, 'الذكاء الاصطناعي أداة تساعدنا، لكنه ما يغني عن دور مهندس البرمجيات.');
  assert.equal(await gates.textContent(), '١ / ٣');
  await page.keyboard.press('1');
  assert.equal(await gateFeedback.textContent(), 'إجابة صحيحة!');
  await page.waitForFunction(() => document.querySelector('#surprise').dataset.phase === 'waiting' &&
    document.querySelector('#maze-progress strong').textContent === '٢ / ٣');
  await clickPixiAt([7, 4]);
  await footstepsPlaying(3);
  await page.waitForFunction(() => document.querySelector('#surprise').dataset.phase === 'walking');
  await questionModal.waitFor({ state: 'visible', timeout: 25000 });
  await footstepsStopped(3);
  assert.equal(await step.textContent(), 'البوابة ٣ · الاختبار');
  await checkGate('إذا اكتشفنا خطأ في الموقع بعد البرمجة، وش المفروض نسوي؟',
    ['نحذف الموقع كله', 'نتجاهل الخطأ', 'نصلح الخطأ ونعيد الاختبار', 'نغير الألوان بس']);
  await answers.nth(3).click();
  await checkRetry(3, 'تذكروا كيف صلحنا المشكلة في موقع بيكسي وجربناه مرة ثانية.');
  assert.equal(await gates.textContent(), '٢ / ٣');
  await answers.nth(2).click();
  await page.waitForFunction(() => document.querySelector('#surprise').dataset.phase === 'waiting' &&
    document.querySelector('#maze-progress strong').textContent === '٣ / ٣');
  await page.keyboard.press('Space');
  await footstepsPlaying(4);
  await page.waitForFunction(() => document.querySelector('#surprise').dataset.phase === 'walking');
  await page.waitForFunction(() => document.querySelector('#surprise').dataset.phase === 'escaped', undefined, { timeout: 25000 });
  assert.ok(await page.locator('#maze-victory').isVisible());
  await footstepsStopped(4);
  assert.equal(await page.locator('.victory-card').evaluate((card) => getComputedStyle(card).animationName), 'modal-arrive');
  assert.equal(await page.locator('.victory-kicker').count(), 0);
  assert.equal(await page.locator('.victory-card h2').textContent(), 'انتهت المهمة!');
  assert.equal(await page.locator('.victory-dialogue').textContent(), 'شكراً يا مهندسات، أقدر أرجع لبيتي بسلام!');
  assert.equal(await page.locator('#saved-requests li').count(), 3);
  if (image) {
    await page.screenshot({ path: image.replace('.png', '-surprise.png') });
  }
  await victoryHome.click();
  await page.locator('#home-room canvas').waitFor();
  assert.equal(new URL(page.url()).hash, '#home');
  assert.equal(await page.locator('.world-nav [aria-current="page"]').textContent(), 'البيت');
  assert.equal(await page.locator('#maze-victory').isVisible(), false);
  await page.goBack();
  await emergency.waitFor();
  assert.equal(await maze.getAttribute('data-phase'), 'intro');
  assert.equal(await gates.textContent(), '٠ / ٣');
  assert.equal(await questionModal.isVisible(), false);
  await footstepsStopped(4);
  await page.locator('#maze-begin').click();
  await clickPixiAt([0, 4]);
  await footstepsPlaying(5);
  await page.goBack();
  await page.locator('#emotions-title').waitFor();
  await footstepsStopped(5, false);

  for (const [width, height] of [[1920, 1080], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(([w, h]) => {
      const { width, height } = document.querySelector('canvas').getBoundingClientRect();
      return width === w && height === h;
    }, [width, height]);
    const box = await page.locator('#next').boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= width && box.y + box.height <= height);
    if (image) await page.screenshot({ path: image.replace('.png', '-' + width + '.png') });
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await surpriseLink.click();
  await page.locator('#surprise-title').waitFor();
  assert.equal(await maze.getAttribute('data-phase'), 'intro');
  assert.equal(await emergency.locator('.emergency-beacons').evaluate((beacons) => getComputedStyle(beacons).animationName), 'none');
  if (image) await page.screenshot({ path: image.replace('.png', '-emergency-reduced-motion.png') });
  await page.locator('#maze-begin').click();
  await page.waitForFunction(() => document.querySelector('#surprise').dataset.phase === 'waiting');
  await clickPixiAt([0, 4]);
  await questionModal.waitFor({ state: 'visible', timeout: 10000 });
  await footstepsStopped(5, false);
  assert.equal(await maze.getAttribute('data-phase'), 'question');
  await page.locator('[data-destination="welcome"]').click();
  await intro.waitFor();
  await surpriseLink.click();
  assert.equal(await maze.getAttribute('data-phase'), 'intro');
  assert.equal(await gates.textContent(), '٠ / ٣');
  await page.locator('[data-destination="welcome"]').click();
  await begin.waitFor();
  await intro.waitFor();
  assert.equal(await name.textContent(), 'PIXI');
  if (image) {
    await page.waitForTimeout(180);
    await page.screenshot({ path: image.replace('.png', '-welcome-mobile.png') });
  }
  assert.equal(new URL(page.url()).hash, '');
  assert.equal(await page.evaluate(() => window.pixiSpokenLines), 0);
  await sound.click();
  assert.equal(await sound.getAttribute('aria-pressed'), 'false');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#loading').waitFor({ state: 'hidden' });
  assert.equal(await sound.getAttribute('aria-pressed'), 'false');
  assert.equal(await page.evaluate(() => window.pixiOscillators), 0);

  const navigation = page.locator('.world-nav');
  assert.deepEqual(await navigation.locator('a').allTextContents(), ['البداية', 'المتطلبات', 'البيت', 'السر']);
  const homeLink = navigation.getByRole('link', { name: 'البيت' });
  const home = page.locator('#home');
  await homeLink.click();
  await home.locator('canvas').waitFor();
  assert.equal(new URL(page.url()).hash, '#home');
  assert.equal(await homeLink.getAttribute('aria-current'), 'page');
  const viewport = page.viewportSize();
  assert.deepEqual(await home.locator('canvas').boundingBox(), { x: 0, y: 0, ...viewport });
  const controls = await home.locator('.home-actions').boundingBox();
  assert.ok(controls.y > viewport.height / 2 && controls.y + controls.height <= viewport.height);
  if (image) await page.screenshot({ path: image.replace('.png', '-home-mobile.png') });
  async function homeAction(label, action) {
    const button = home.getByRole('button', { name: label });
    await button.click();
    assert.equal(await home.getAttribute('data-home-action'), action);
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
    assert.equal(await home.locator('button[aria-pressed="true"]').count(), 1);
  }
  function homeIdle() {
    return page.waitForFunction(() => document.querySelector('#home').dataset.homeAction === 'idle');
  }
  await homeAction('الرقص', 'dance');
  await homeIdle();
  const sleepButton = home.locator('button[data-home-action="sleep"]');
  const wakeButton = home.getByRole('button', { name: 'الاستيقاظ' });
  async function putPixiToSleep() {
    await home.getByRole('button', { name: 'النوم', exact: true }).click();
    await wakeButton.waitFor();
    assert.equal(await home.getAttribute('data-home-action'), 'asleep');
    assert.equal(await wakeButton.locator('use').getAttribute('href'), '#icon-sun');
  }
  await putPixiToSleep();
  await wakeButton.click();
  await homeIdle();
  assert.equal(await sleepButton.textContent(), 'النوم');
  assert.equal(await sleepButton.locator('use').getAttribute('href'), '#icon-moon');
  await putPixiToSleep();
  await home.getByRole('button', { name: 'القفز' }).click();
  await page.waitForFunction(() => document.querySelector('#home').dataset.homeAction === 'jump');
  await homeIdle();
  await putPixiToSleep();
  await requestLink.click();
  await page.locator('#stage canvas').waitFor();
  await homeLink.click();
  await home.locator('canvas').waitFor();
  assert.equal(await home.getAttribute('data-home-action'), 'idle');
  assert.equal(await home.locator('button[aria-pressed="true"]').count(), 0);
  assert.deepEqual(errors, []);
  console.log('Chrome verified automatic entry, sound state with autoplay ' + (autoplay ? 'allowed' : 'blocked') +
    ', effects-only audio, requirements, emergency intro, click-to-move gate flow, retries, keyboard answers, victory, and home actions and re-entry.');
} finally {
  await browser.close();
}
