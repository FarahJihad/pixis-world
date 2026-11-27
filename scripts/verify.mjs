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
    window.pixiHomeRuns = [];
    window.pixiJumpRuns = [];
    const createBufferSource = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = createBufferSource.call(this);
      const start = source.start.bind(source);
      const stop = source.stop.bind(source);
      source.start = (...args) => {
        const runs = !source.loop ? window.pixiJumpRuns :
          source.loopEnd ? window.pixiFootstepRuns : window.pixiHomeRuns;
        const run = {
          loop: source.loop, loopLength: source.loopEnd - source.loopStart,
          duration: source.buffer.duration, startedAt: this.currentTime,
          offset: args[1], phase: document.querySelector('#home')?.dataset.homeAction,
          overlap: runs.some(({ stoppedAt }) => stoppedAt === undefined)
        };
        runs.push(run);
        source.addEventListener('ended', () => { run.stoppedAt ??= this.currentTime; });
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
  const mood = page.locator('.world');
  const line = page.locator('#request-line');
  const next = page.locator('#next');
  const compare = page.locator('#request-comparison');
  const savedCards = page.locator('#emotions .room-marker[data-confirmed]:visible');
  const requestLink = page.locator('[data-destination="emotions"]');
  const surpriseLink = page.locator('[data-destination="surprise"]');
  const idea = (key) => page.locator('#emotions button[data-idea="' + key + '"]');
  assert.equal(await mood.getAttribute('data-emotion'), 'curious');
  const story = page.locator('#emotions');
  const decoration = page.locator('.room-decoration');
  assert.match(await line.textContent(), /محتاجة مساعدتكم/);
  assert.equal(await page.locator('.room-marker:visible').count(), 3);
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

  await sound.click();
  assert.equal(await sound.getAttribute('aria-pressed'), 'false');
  const mutedCount = await page.evaluate(() => window.pixiOscillators);
  await page.evaluate(() => {
    window.storyReactions = [];
    addEventListener('pixi:reaction', ({ detail }) => window.storyReactions.push(detail.reaction));
  });

  await next.click();
  assert.match(await line.textContent(), /قبل ما نصمّم أو نبرمج/);
  await next.click();
  assert.equal(await mood.getAttribute('data-emotion'), 'confused');
  const messages = [];
  async function reactTo(key, attribute, message, accepted = true) {
    await idea(key).click();
    assert.equal(await story.getAttribute('data-' + attribute), key);
    await page.waitForFunction((expected) => document.querySelector('#request-line').textContent.includes(expected), message);
    messages.push(await line.textContent());
    if (accepted) await compare.waitFor();
    else {
      assert.equal(await mood.getAttribute('data-emotion'), 'displeased');
      assert.equal(await next.isVisible(), false);
    }
  }

  const palette = await page.locator('[data-spot="theme"] .room-objects').boundingBox();
  assert.ok(Math.abs(palette.x + palette.width / 2 - 800) < 8 && palette.y >= 690);
  await reactTo('blush', 'theme', 'الوردي ناعم');
  await reactTo('mint', 'theme', 'ما أحسّه يشبهني', false);
  await reactTo('lavender', 'theme', 'البنفسجي مرّة');
  if (image) await page.screenshot({ path: image.replace('.png', '-theme.png'), animations: 'disabled' });
  assert.match(await compare.textContent(), /بألوان لطيفة/);
  await next.click();
  assert.equal(await savedCards.count(), 1);
  await page.locator('#request-replay').click();
  await idea('lavender').click();
  await compare.waitFor();
  await next.click();
  assert.equal(await savedCards.count(), 1);
  await next.click();

  await reactTo('plant', 'decor', 'عندي نباتات كثير', false);
  await reactTo('flower', 'decor', 'الوردة خلت');
  await reactTo('star', 'decor', 'النجمة أضافت');
  assert.equal(await decoration.getAttribute('data-item'), 'star');
  const shelf = await decoration.boundingBox();
  const decorationChoices = await page.locator('[data-spot="decor"] .room-objects').boundingBox();
  assert.ok(decorationChoices.x >= shelf.x + shelf.width + 35);
  if (image) await page.screenshot({ path: image.replace('.png', '-decor.png'), animations: 'disabled' });
  await next.click();
  assert.equal(await savedCards.count(), 2);
  await next.click();
  await page.locator('#request-previous').click();
  assert.equal(await decoration.getAttribute('data-item'), 'star');
  await idea('flower').click();
  await compare.waitFor();
  await next.click();
  await next.click();

  const skyChoices = await page.locator('[data-spot="sky"] .room-objects').boundingBox();
  assert.ok(skyChoices.x < 100 && skyChoices.y >= 425);
  await reactTo('morning', 'sky', 'أحس عالمي صار منعش');
  await reactTo('night', 'sky', 'أغمق من اللي أبيه', false);
  if (image) await page.screenshot({ path: image.replace('.png', '-sky.png'), animations: 'disabled' });
  await reactTo('sunset', 'sky', 'الغروب مرّة جميل');
  assert.equal(new Set(messages).size, 9);
  await next.click();
  assert.equal(await savedCards.count(), 3);
  await next.click();
  assert.equal(await next.isVisible(), false);
  const file = page.locator('.room-summary');
  await file.waitFor();
  assert.equal(await file.locator('li').count(), 3);
  assert.equal(await file.locator('.room-file-symbol svg[aria-hidden="true"]').count(), 3);
  assert.doesNotMatch(await file.textContent(), /\p{Extended_Pictographic}|✓/u);
  for (const label of ['بنفسجية', 'وردة', 'غروب دافئ']) assert.ok((await file.textContent()).includes(label));
  assert.equal(await story.getAttribute('data-theme'), 'lavender');
  assert.equal(await decoration.getAttribute('data-item'), 'flower');
  assert.equal(await story.getAttribute('data-sky'), 'sunset');
  if (image) await page.screenshot({ path: image.replace('.png', '-file.png'), animations: 'disabled' });
  await line.waitFor();
  assert.equal(await next.isVisible(), true);
  assert.equal(await next.textContent(), 'يلا نصمم');
  assert.equal(await file.isVisible(), true);
  assert.equal(new URL(page.url()).hash, '#emotions');
  assert.equal(await page.evaluate(() => window.pixiOscillators), mutedCount);
  assert.deepEqual(await page.evaluate(() => [...new Set(window.storyReactions)].sort()), ['displeased', 'happy', 'surprised']);
  await next.click();
  await page.waitForURL('**/#design');
  await page.getByRole('button', { name: 'افتحي هدية بيكسي' }).waitFor();
  await page.goBack();
  await next.waitFor();
  assert.equal(await file.locator('li').count(), 3);
  await sound.click();
  assert.equal(await sound.getAttribute('aria-pressed'), 'true');

  await surpriseLink.click();
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

  await page.locator('#request-reset').click();
  assert.equal(await savedCards.count(), 0);
  assert.equal(await decoration.isVisible(), false);
  assert.equal(await story.getAttribute('data-theme'), null);
  assert.equal(await story.getAttribute('data-sky'), null);
  assert.equal(await page.locator('#request-previous').isDisabled(), true);

  for (const [width, height] of [[1920, 1080], [1280, 720], [390, 844]]) {
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
  assert.deepEqual(await navigation.locator('a').allTextContents(), ['البداية', 'المتطلبات', 'البيت', 'السر', 'التصميم']);
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
  const danceButton = home.locator('[data-home-action="dance"]');
  const sleepButton = home.locator('[data-home-action="sleep"]');
  const jumpButton = home.locator('[data-home-action="jump"]');
  const homePhase = (phase) => page.waitForFunction((value) =>
    document.querySelector('#home').dataset.homeAction === value, phase);
  const homeRuns = () => page.evaluate(() => window.pixiHomeRuns);
  async function homeAudio(cue) {
    const ranges = { dance: [32, 34], snore: [85, 87] };
    if (cue) {
      const [min, max] = ranges[cue];
      await page.waitForFunction(([lo, hi]) => window.pixiHomeRuns.some((run) =>
        run.stoppedAt === undefined && run.duration > lo && run.duration < hi), [min, max]);
    }
    const runs = await homeRuns();
    const playing = runs.filter(({ stoppedAt }) => stoppedAt === undefined);
    assert.equal(playing.length, cue ? 1 : 0);
    assert.ok(runs.every(({ loop, overlap }) => loop && !overlap));
    if (cue) assert.equal(playing[0].phase, cue === 'snore' ? 'asleep' : 'dance');
    return playing[0];
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await danceButton.click();
  await homePhase('dance');
  await homeAudio();
  await sound.click();
  await homeAudio('dance');
  assert.equal(await danceButton.textContent(), 'إيقاف الرقص');
  assert.equal(await danceButton.locator('use').getAttribute('href'), '#icon-stop');
  await page.waitForTimeout(5100);
  assert.equal(await home.getAttribute('data-home-action'), 'dance');
  await homeAudio('dance');
  await sound.click();
  await homeAudio();
  await sound.click();
  assert.ok((await homeAudio('dance')).offset > 0);
  await danceButton.click();
  await homePhase('idle');
  await homeAudio();
  assert.equal(await danceButton.textContent(), 'الرقص');
  assert.equal(await danceButton.locator('use').getAttribute('href'), '#icon-music');

  async function putPixiToSleep() {
    await sleepButton.click();
    await homePhase('asleep');
    await homeAudio('snore');
    assert.equal(await sleepButton.textContent(), 'الاستيقاظ');
    assert.equal(await sleepButton.locator('use').getAttribute('href'), '#icon-sun');
  }
  await danceButton.click();
  await homeAudio('dance');
  await sleepButton.click();
  await homePhase('sleep');
  await homeAudio();
  assert.equal(await danceButton.textContent(), 'الرقص');
  await homePhase('asleep');
  await homeAudio('snore');
  await sound.click();
  await homeAudio();
  await sound.click();
  await homeAudio('snore');
  await danceButton.click();
  await homePhase('wake');
  await homeAudio();
  await homePhase('dance');
  await homeAudio('dance');
  await jumpButton.click();
  await homePhase('jump');
  await homeAudio();
  await page.waitForFunction(() => window.pixiJumpRuns.length === 1);
  await homePhase('idle');
  assert.deepEqual(await page.evaluate(() => window.pixiJumpRuns.map(({ loop, phase, overlap }) =>
    ({ loop, phase, overlap }))), [{ loop: false, phase: 'jump', overlap: false }]);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await putPixiToSleep();
  await sleepButton.click();
  await homeAudio();
  await homePhase('idle');
  assert.equal(await sleepButton.textContent(), 'النوم');
  assert.equal(await sleepButton.locator('use').getAttribute('href'), '#icon-moon');
  await putPixiToSleep();
  await jumpButton.click();
  await homePhase('jump');
  await homeAudio();
  await homePhase('idle');
  assert.equal(await page.evaluate(() => window.pixiJumpRuns.length), 2);
  await putPixiToSleep();
  await requestLink.click();
  await homeAudio();
  await page.locator('#stage canvas').waitFor();
  await homeLink.click();
  await home.locator('canvas').waitFor();
  assert.equal(await home.getAttribute('data-home-action'), 'idle');
  assert.equal(await home.locator('button[aria-pressed="true"]').count(), 0);
  await danceButton.click();
  await homeAudio('dance');
  await requestLink.click();
  await homeAudio();
  assert.deepEqual(errors, []);
  await homeLink.click();
  await danceButton.click();
  await homeAudio('dance');
  await home.getByRole('link', { name: 'يلا نصمم' }).click();
  await homeAudio();
  const design = page.locator('#design');
  const lessonNext = design.locator('.design-next');
  const phone = design.locator('.design-phone');
  await design.locator('canvas').waitFor();
  assert.equal(new URL(page.url()).hash, '#design');
  assert.equal(await navigation.getByRole('link', { name: 'التصميم' }).getAttribute('aria-current'), 'page');
  assert.equal(await design.getAttribute('data-scene'), 'gift');
  assert.equal(await lessonNext.isVisible(), false);
  const gift = design.getByRole('button', { name: 'افتحي هدية بيكسي' });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await gift.evaluate((box) => box.addEventListener('click', () => {
    box.dataset.wasShaking = String(box.closest('#design').hasAttribute('data-opening-gift'));
  }, { once: true }));
  await gift.press('Enter');
  await page.waitForFunction(() => document.querySelector('#design').dataset.scene === 'mug');
  assert.equal(await design.locator('.design-gift').getAttribute('data-was-shaking'), 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const scene of ['mug', 'sip', 'compare', 'phone', 'clutter', 'teacher']) {
    assert.equal(await design.getAttribute('data-scene'), scene);
    if (scene === 'sip') {
      assert.equal(await design.locator('.design-mug').evaluate((mug) => getComputedStyle(mug).animationName), 'none');
    }
    if (scene === 'phone') {
      assert.equal(await phone.evaluate((element) => element.inert), true);
      assert.match(await design.locator('.design-heading').textContent(), /صورة الكوب/);
      assert.match(await design.locator('.design-line').textContent(), /المشكلة/);
    }
    if (scene === 'clutter') {
      assert.equal(await design.getAttribute('data-zoomed'), '');
      assert.equal(await phone.evaluate((element) => element.inert), false);
      assert.equal(await phone.locator('.design-app-tools span:visible').count(), 8);
      assert.equal(await phone.getByRole('img', { name: 'صورة الكوب' }).count(), 1);
    }
    await lessonNext.click();
  }
  const send = phone.getByRole('button', { name: 'إرسال' });
  const smallSend = await send.boundingBox();
  for (const [index, name] of ['Fitts’s Law', 'Hick’s Law', 'Jakob’s Law', 'Miller’s Law', 'Doherty Threshold'].entries()) {
    assert.equal(await design.locator('.design-heading').textContent(), name);
    assert.equal(await design.getAttribute('data-applied'), String(index));
    await lessonNext.click();
    assert.equal(await design.getAttribute('data-applied'), String(index + 1));
    assert.equal(await design.locator('.design-progress [data-complete]').count(), index + 1);
    assert.ok(await design.locator('.design-change').isVisible());
    if (index === 0) assert.ok((await send.boundingBox()).width > smallSend.width * 1.5);
    if (index === 1) assert.equal(await phone.locator('.design-app-tools span:visible').count(), 3);
    if (index === 2) assert.ok(await phone.locator('.design-app-nav').isVisible());
    if (index === 3) assert.ok(await phone.getByText('الدردشات الأخيرة').isVisible());
    if (index === 4) {
      await send.click();
      assert.equal(await phone.getByRole('status').textContent(), 'تم الإرسال للولو');
    }
    await lessonNext.click();
  }
  assert.equal(await design.getAttribute('data-scene'), 'done');
  assert.ok(await phone.getByText('خلّيك قريبة من صديقاتك').isVisible());
  const phoneBox = await phone.boundingBox();
  assert.ok(phoneBox.x >= 0 && phoneBox.x + phoneBox.width <= viewport.width);
  await design.getByRole('button', { name: 'إعادة الدرس' }).click();
  assert.equal(await design.getAttribute('data-scene'), 'gift');
  assert.equal(await design.getAttribute('data-applied'), '0');
  await gift.click();
  assert.equal(await design.getAttribute('data-scene'), 'mug');
  await page.goBack();
  await home.locator('canvas').waitFor();
  await surpriseLink.click();
  await emergency.waitFor();
  assert.equal(await maze.getAttribute('data-phase'), 'intro');
  assert.deepEqual(errors, []);
  console.log('Chrome verified automatic entry, sound state with autoplay ' + (autoplay ? 'allowed' : 'blocked') +
    ', requirements, maze, home, the design lesson, sound, and navigation.');
} finally {
  await browser.close();
}
