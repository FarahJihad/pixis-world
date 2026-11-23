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
      '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
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
  await surpriseLink.click();
  await page.locator('#surprise-title').waitFor();
  await requestLink.click();
  assert.equal(await requestLink.getAttribute('aria-current'), 'page');
  assert.equal(await surpriseLink.getAttribute('aria-current'), null);

  const sound = page.locator('#sound');
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

  await next.click();
  await page.locator('#surprise-title').waitFor();
  assert.equal(new URL(page.url()).hash, '#surprise');
  assert.equal(await page.locator('#saved-requests li').count(), 3);
  await page.locator('#maze-canvas canvas').waitFor();
  const maze = page.locator('#maze-card');
  const gates = page.locator('#maze-progress strong');
  const answers = page.locator('[data-maze-choice]');
  const step = page.locator('#maze-step');
  const restart = page.locator('#maze-restart');
  await page.locator('#maze-options').waitFor();
  assert.match(await step.textContent(), /١.*الرياضيات/);
  await answers.nth(0).click();
  assert.equal(await gates.textContent(), '٠ / ٣');
  assert.equal(await answers.nth(0).getAttribute('data-wrong'), '');
  assert.match(await page.locator('#maze-feedback').textContent(), /مرة تانية/);
  if (image) await page.screenshot({ path: image.replace('.png', '-maze.png') });
  await answers.nth(1).click();
  assert.equal(await gates.textContent(), '١ / ٣');
  await page.getByRole('heading', { name: 'أي جزء من النبات يمتصّ الماء من التربة؟' }).waitFor();
  await page.keyboard.press('3');
  assert.equal(await gates.textContent(), '٢ / ٣');
  await page.getByRole('button', { name: 'إظهار الأفكار المكتملة' }).waitFor();
  await answers.nth(0).click();
  assert.equal(await gates.textContent(), '٣ / ٣');
  await page.locator('#maze-card[data-phase="escaped"]').waitFor();
  assert.match(await page.locator('#maze-prompt').textContent(), /طلعت بيكسي/);
  assert.ok(await page.locator('#request-summary').isVisible());
  if (image) {
    await page.screenshot({ path: image.replace('.png', '-surprise.png') });
  }
  await page.goBack();
  await page.locator('#emotions-title').waitFor();

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
  assert.equal(await maze.getAttribute('data-phase'), 'escaped');
  await restart.click();
  await page.locator('#maze-options').waitFor();
  assert.equal(await gates.textContent(), '٠ / ٣');
  assert.match(await step.textContent(), /١.*الرياضيات/);
  if (image) await page.screenshot({ path: image.replace('.png', '-maze-mobile.png') });
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
  assert.deepEqual(errors, []);
  console.log('Chrome verified automatic entry, sound state with autoplay ' + (autoplay ? 'allowed' : 'blocked') +
    ', effects-only audio, requirements, three maze gates, retry, keyboard answers, escape, and replay.');
} finally {
  await browser.close();
}
