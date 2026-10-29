import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zipSync } from 'fflate';
import { inspectPack, resolveReference, safePath, assetURLs } from '../src/catalog.js';
import { preflightZip, importZip } from '../src/importer.js';
import { PetRuntime, normalizeNotification } from '../src/runtime.js';
import { keyCandidates } from '../src/adapters/keys.js';

const blob = text => new Blob([text]);
test('browser physical codes map to BongoCat digit, modifier and F-key aliases', () => {
  assert.ok(keyCandidates('ControlLeft').includes('Control'));
  assert.ok(keyCandidates('ShiftRight').includes('Shift'));
  assert.ok(keyCandidates('Digit3').includes('Num3'));
  assert.ok(keyCandidates('F12').includes('Fn'));
});
test('nested model references and resources retain their original paths', async () => {
  const pack = await inspectPack([
    { path: '角色/model/cat.model3.json', blob: blob(JSON.stringify({ FileReferences: { Moc: 'cat.moc3', Textures: ['../textures/cat.png'], Motions: { Tap: [{ File: '../motion/a.motion3.json', Sound: '../voice/a.wav' }] } } })) },
    ...['角色/model/cat.moc3', '角色/textures/cat.png', '角色/motion/a.motion3.json', '角色/voice/a.wav'].map(path => ({ path, blob: blob('test') })),
  ], '角色');
  assert.equal(pack.entries[0].adapter, 'bongocat-live2d');
  assert.equal(pack.files.length, 5);
});
test('missing optional declared resources are reported before runtime', async () => {
  await assert.rejects(inspectPack([{ path: 'cat.model3.json', blob: blob('{FileReferences:{Moc:"cat.moc3"}}') }]), /cat.moc3/);
});
test('external paths and traversal are rejected; in-pack parent references work', () => {
  for (const p of ['../a', '/a', 'C:\\a', 'https://a', 'a\u0000']) assert.throws(() => safePath(p));
  for (const p of ['../../a', 'https://a', 'file:///x']) assert.throws(() => resolveReference('folder/a.json', p));
  assert.equal(resolveReference('folder/a.json', '../texture.png'), 'texture.png');
});
test('case-colliding paths cannot shadow assets on Windows', async () => {
  await assert.rejects(inspectPack([{ path: 'a.png', blob: blob('1') }, { path: 'A.png', blob: blob('2') }]), /大小写/);
});
test('ZIP preflight rejects inflated declared size and encrypted archives', () => {
  const input = zipSync({ 'pet.png': new Uint8Array([1, 2, 3]) });
  const view = new DataView(input.buffer);
  const end = input.length - 22, central = view.getUint32(end + 16, true);
  assert.equal(preflightZip(input).count, 1);
  const oversized = input.slice(); new DataView(oversized.buffer).setUint32(central + 24, 200 * 1024 ** 2, true);
  assert.throws(() => preflightZip(oversized), /体积/);
  const encrypted = input.slice(); new DataView(encrypted.buffer).setUint16(central + 8, 1, true);
  assert.throws(() => preflightZip(encrypted), /加密/);
});
test('ZIP import preserves unicode names and has an explicit image adapter', async () => {
  const file = new File([zipSync({ '少女猫猫/角色.png': new Uint8Array([1]) })], '角色.zip');
  const pack = await importZip(file);
  assert.equal(pack.entries[0].path, '少女猫猫/角色.png'); assert.equal(pack.entries[0].adapter, 'image');
});
test('Blob URLs are released exactly once', async () => {
  const oldCreate = URL.createObjectURL, oldRevoke = URL.revokeObjectURL;
  const revoked = [];
  URL.createObjectURL = () => 'blob:test'; URL.revokeObjectURL = url => revoked.push(url);
  try { const urls = assetURLs({ files: [{ path: 'a.png', blob: blob('a') }] }); assert.equal(urls.get('a.png'), 'blob:test'); urls.dispose(); urls.dispose(); assert.deepEqual(revoked, ['blob:test']); }
  finally { URL.createObjectURL = oldCreate; URL.revokeObjectURL = oldRevoke; }
});
test('runtime switch preserves previous pet on failure and discards late candidates', async () => {
  const priorDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ style: {}, remove() { this.removed = true; } }) };
  const host = { append() {} }, pack = {}, instances = [];
  const instance = name => { const i = { name, disposed: false, dispose() { this.disposed = true; } }; instances.push(i); return i; };
  let resolveSlow;
  const runtime = new PetRuntime();
  runtime.register({ id: 'test', mount: ({ entry }) => entry.path === 'bad' ? Promise.reject(new Error('bad')) : entry.path === 'slow' ? new Promise(resolve => { resolveSlow = resolve; }) : Promise.resolve(instance(entry.path)) });
  try {
    const first = await runtime.select(pack, { adapter: 'test', path: 'first' }, host);
    await assert.rejects(runtime.select(pack, { adapter: 'test', path: 'bad' }, host));
    assert.equal(runtime.active.instance, first); assert.equal(first.disposed, false);
    const slow = runtime.select(pack, { adapter: 'test', path: 'slow' }, host);
    const last = await runtime.select(pack, { adapter: 'test', path: 'last' }, host);
    const stale = instance('stale'); resolveSlow(stale); await slow;
    assert.equal(runtime.active.instance, last); assert.equal(stale.disposed, true); assert.equal(first.disposed, true);
    runtime.dispose(); assert.equal(last.disposed, true);
  } finally { globalThis.document = priorDocument; }
});
test('extension notifications require version and are bounded', () => {
  assert.equal(normalizeNotification({ text: 'x' }), null);
  assert.equal(normalizeNotification({ version: 1, text: 'x'.repeat(1000), duration: 999999 }).text.length, 400);
  assert.equal(normalizeNotification({ version: 1, text: 'x', duration: 999999 }).duration, 30000);
});
