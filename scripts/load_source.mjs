import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const esbuild = createRequire(require.resolve('vite'))('esbuild');

// Compile application data/helpers without running another test as a side effect.
export async function loadModule(filename) {
  const compiled = await esbuild.build({
    entryPoints: [filename], bundle: true, write: false,
    platform: 'node', format: 'cjs', external: ['three'],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
}
