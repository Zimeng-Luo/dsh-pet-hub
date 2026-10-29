import { build } from 'esbuild';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { patchLive2D } from './patch-live2d.mjs';
const runtimePatch = {
  name: 'pet-hub-live2d-lifecycle',
  setup(build) {
    build.onLoad({ filter: /easy-live2d[\\/]dist[\\/]index\.js$/ }, async args => ({ contents: patchLive2D(await readFile(args.path, 'utf8')), loader: 'js' }));
  },
};
await mkdir('lib', { recursive: true });
await copyFile('src/index.js', 'lib/index.js');
const result = await build({
  entryPoints: ['src/client.jsx'], outfile: 'lib/client.js', bundle: true, platform: 'browser', format: 'cjs', target: 'es2022',
  jsx: 'automatic', external: ['react', 'react/jsx-runtime', 'react-dom'], loader: { '.css': 'text' },
  plugins: [runtimePatch],
  define: { 'process.env.NODE_ENV': '"production"' }, minify: true, legalComments: 'eof', metafile: true,
  banner: { js: 'window.__ModuleLoader__.load({id:"dsh-pet-hub",factory:(require)=>{var module={exports:{}};var exports=module.exports;' },
  footer: { js: 'return module.exports;}});' },
});
await mkdir('lib/licenses', { recursive: true });
const packages = new Set();
for (const input of Object.keys(result.metafile.inputs)) {
  const match = input.match(/^node_modules\/((?:@[^/]+\/)?[^/]+)/);
  if (match) packages.add(match[1]);
}
const inventory = [];
for (const name of [...packages].sort()) {
  const root = `node_modules/${name}`;
  const pkg = JSON.parse(await readFile(`${root}/package.json`, 'utf8'));
  const license = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'License', 'LICENSE-MIT', 'license', 'README.md'].find(file => existsSync(`${root}/${file}`));
  if (license) await copyFile(`${root}/${license}`, `lib/licenses/${name.replaceAll('/', '__')}.txt`);
  inventory.push({ name, version: pkg.version, license: pkg.license, source: `https://registry.npmjs.org/${name}/-/${name.split('/').at(-1)}-${pkg.version}.tgz`, licenseFile: license ? `${name.replaceAll('/', '__')}.txt` : null });
}
await writeFile('lib/licenses/inventory.json', JSON.stringify(inventory, null, 2));
await build({ entryPoints: ['preview/main.jsx'], outfile: 'preview/bundle.js', bundle: true, platform: 'browser', format: 'iife', target: 'es2022', jsx: 'automatic', loader: { '.css': 'text' }, plugins: [runtimePatch], define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'eof' });
console.error('Built DSH client factory and standalone verification preview.');
