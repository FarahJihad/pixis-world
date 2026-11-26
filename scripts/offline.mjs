import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const output = process.argv[2] || 'PIXI-preview.html';
const dist = new URL('../dist/', import.meta.url);
const read = (file, encoding) => readFile(new URL(file, dist), encoding);
const [html, css, logo, glb, alarm, license, fontLicense] = await Promise.all([
  read('index.html', 'utf8'), read('style.css', 'utf8'),
  read('assets/pixi-icon.svg'), read('assets/pixi.glb'),
  read('assets/emergency-alarm-69780.mp3'),
  read('assets/vendor/LICENSE-three.txt', 'utf8'), read('assets/fonts/LICENSE-alexandria.txt', 'utf8')
]);
const fontFiles = [...css.matchAll(/url\("\.\/(assets\/fonts\/[^"]+\.woff2)"\)/g)].map((match) => match[1]);
const fonts = await Promise.all(fontFiles.map(async (file) => [file, (await read(file)).toString('base64')]));
const bundledCSS = fonts.reduce((source, [file, data]) =>
  source.replace('./' + file, 'data:font/woff2;base64,' + data), css);
const { outputFiles: [script] } = await build({
  entryPoints: [fileURLToPath(new URL('assets/world.js', dist))],
  bundle: true, minify: true, write: false,
  format: 'iife', target: 'es2022', legalComments: 'inline',
  define: {
    PIXI_OFFLINE_MODEL: JSON.stringify('data:model/gltf-binary;base64,' + glb.toString('base64')),
    PIXI_OFFLINE_ALARM: JSON.stringify('data:audio/mpeg;base64,' + alarm.toString('base64'))
  }
});
const logoUrl = 'data:image/svg+xml;base64,' + logo.toString('base64');
const standalone = html
  .replaceAll('./assets/pixi-icon.svg', logoUrl)
  .replace('  <link rel="modulepreload" href="./assets/world.js">\n', '')
  .replace('<link rel="stylesheet" href="./style.css">', () => '<style>\n' + bundledCSS + '</style>')
  .replace('<script type="module" src="./assets/world.js"></script>',
    () => '<script>\n' + script.text.replaceAll('</script', '<\\/script') + '\n</script>');
await writeFile(output, standalone + '\n<!-- Three.js licence\n' + license + '\nAlexandria licence\n' + fontLicense + '\n-->\n');

