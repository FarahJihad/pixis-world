import { mkdir, writeFile } from 'node:fs/promises';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createPixi } from './model.mjs';

globalThis.FileReader ??= class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
};
const bytes = await new GLTFExporter().parseAsync(createPixi(), { binary: true });
await mkdir(new URL('../dist/assets/', import.meta.url), { recursive: true });
await writeFile(new URL('../dist/assets/pixi.glb', import.meta.url), Buffer.from(bytes));
console.log('Exported pixi.glb (' + bytes.byteLength + ' bytes)');

