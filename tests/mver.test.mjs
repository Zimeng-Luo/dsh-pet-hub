import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectPack } from '../src/catalog.js';
import { virtualKeys, chordDown, installMverInput, mverProfile } from '../src/adapters/mver.js';

const file = (path, text) => ({ path, blob: new Blob([text]) });
const entry = mode => `我的角色/img/${mode}/cat_model/cat.model3.json`;
const config = { mode: 2, decoration: { window_size: [1400, 1600], l2d_horizontal_flip: true }, standard: { hand: [[65]], l2d_expression: [[222], [32, 49]] }, keyboard: { lefthand: [[65]], righthand: [[74]] }, gamepad: {} };
test('Mver import discovers each mode, honors configured mode, and retains cross-mode expressions', async () => {
  const pack = await inspectPack([
    file('我的角色/config.json', JSON.stringify(config)),
    ...['gamepad', 'standard', 'keyboard'].flatMap(mode => [file(entry(mode), JSON.stringify({ FileReferences: { Moc: 'cat.moc3', ...(mode === 'keyboard' ? { Expressions: [{ Name: 'glasses', File: '../../standard/cat_model/glasses.exp3.json' }] } : {}) } })), file(`我的角色/img/${mode}/cat_model/cat.moc3`, 'fixture')]),
    file('我的角色/img/standard/cat_model/glasses.exp3.json', '{}'),
    file('我的角色/img/standard/hand/0.png', 'fixture'),
  ], '我的模型');
  assert.equal(pack.entries.length, 3);
  assert.equal(pack.entries[0].mver.mode, 'keyboard');
  assert.match(pack.entries[0].label, /键盘模式/);
  const standard = pack.entries.find(e => e.mver.mode === 'standard');
  const profile = await mverProfile(pack, standard);
  assert.equal(profile.layers[0].path, '我的角色/img/standard/hand/0.png');
  assert.equal(profile.flip, true);
});
test('Mver VK chords honor physical digits, generic modifiers, OEM and function keys', () => {
  const keys = virtualKeys(new Set(['Space', 'Digit1', 'ControlRight', 'Quote', 'F3', 'Numpad2']));
  for (const key of [32, 49, 17, 163, 222, 114, 98]) assert.ok(keys.has(key));
  assert.equal(chordDown([32, 49], keys), true);
  assert.equal(chordDown([32, 50], keys), false);
  assert.equal(chordDown([], keys), false);
});
test('Mver expression chord has an edge, toggles on second press, and clears on blur input reset', () => {
  const listeners = new Map(), calls = [], nodes = [];
  const oldDocument = globalThis.document, oldWindow = globalThis.window;
  globalThis.window = {};
  globalThis.document = { createElement: () => ({ dataset: {}, hidden: true }) };
  try {
    const input = installMverInput({
      sprite: { setExpression: x => calls.push(x.index), getMotions: () => [] },
      element: { append: n => nodes.push(n) },
      profile: { layers: [{ group: 'hand', index: 0, chord: [65], path: 'a.png' }], expressionChords: [[222], [32, 49]], motionChords: [], keepFace: false },
      urls: { get: p => p }, listen: (_, name, fn) => listeners.set(name, fn), param: () => {}, expressions: [{ name: 'default' }, { name: 'glasses' }], neutralIndex: 2,
    });
    const down = code => listeners.get('keydown')({ code, repeat: false });
    const up = code => listeners.get('keyup')({ code });
    down('Space'); down('Digit1');
    assert.deepEqual(calls, [1]);
    down('KeyA'); assert.equal(nodes[0].hidden, false); assert.deepEqual(calls, [1]);
    up('Digit1'); down('Digit1'); assert.deepEqual(calls, [1, 2]);
    input.reset(); assert.equal(nodes[0].hidden, true);
  } finally { globalThis.document = oldDocument; globalThis.window = oldWindow; }
});
