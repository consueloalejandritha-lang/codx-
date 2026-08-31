import fs from 'node:fs/promises';
import path from 'node:path';

/** Remove only regenerated source copies from dist, never editable public originals. */
export function optimizedMediaBuild() {
  let outputRoot;
  let projectRoot;
  return {
    name: 'portfolio-optimized-media',
    apply: 'build',
    configResolved(config) {
      projectRoot = config.root;
      outputRoot = path.resolve(config.root, config.build.outDir);
      if (!outputRoot.startsWith(`${path.resolve(config.root)}${path.sep}`)) throw new Error('Build output must stay within project');
    },
    async closeBundle() {
      const manifest = JSON.parse(await fs.readFile(path.join(projectRoot, 'src/generated/media-manifest.json'), 'utf8'));
      for (const [source, entry] of Object.entries(manifest.entries)) {
        if (!source.startsWith('/portfolio-assets/')) throw new Error('Unexpected source root');
        // Verify every replacement before pruning even one copied source.
        const urls = [...entry.variants.map(v => v.url), ...(entry.motion ? [entry.motion.url, entry.motion.poster] : [])];
        for (const url of urls) {
          if (!url.startsWith('/optimized-assets/')) throw new Error('Unexpected generated asset');
          const generated = path.resolve(outputRoot, `.${url}`);
          if (!generated.startsWith(`${outputRoot}${path.sep}`)) throw new Error('Invalid output path');
          await fs.access(generated);
        }
      }
      for (const source of Object.keys(manifest.entries)) {
        const target = path.resolve(outputRoot, `.${source}`);
        if (!target.startsWith(`${outputRoot}${path.sep}portfolio-assets${path.sep}`)) throw new Error('Invalid source-copy target');
        await fs.unlink(target).catch(error => { if (error.code !== 'ENOENT') throw error; });
      }
    },
  };
}
