import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const packageRoot = dirname(dirname(require.resolve('three')));
const vendor = new URL('../dist/assets/vendor/', import.meta.url);
await mkdir(vendor, { recursive: true });
const files = {
  'three.module.js': 'build/three.module.js',
  'three.core.js': 'build/three.core.js',
  'GLTFLoader.js': 'examples/jsm/loaders/GLTFLoader.js',
  'BufferGeometryUtils.js': 'examples/jsm/utils/BufferGeometryUtils.js',
  'LICENSE-three.txt': 'LICENSE'
};
for (const [to, from] of Object.entries(files)) {
  let source = await readFile(join(packageRoot, from), 'utf8');
  source = source.replaceAll("from 'three'", "from './three.module.js'")
    .replaceAll("'../utils/BufferGeometryUtils.js'", "'./BufferGeometryUtils.js'");
  await writeFile(new URL(to, vendor), source);
}

