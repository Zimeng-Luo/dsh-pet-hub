import JSON5 from 'json5';

const MODES = ['standard', 'keyboard', 'gamepad'];
const MODE_LABELS = { standard: '键鼠模式', keyboard: '键盘模式', gamepad: '手柄模型' };
const finite = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;

// Mver is recognized by both its layout and the adjacent config, never by an EXE.
// Keep the original relative paths: keyboard models may reference standard expressions.
export async function detectMver(byPath, path) {
  const parts = path.split('/'), mode = parts.at(-3)?.toLowerCase();
  if (parts.at(-2)?.toLowerCase() !== 'cat_model' || !MODES.includes(mode)) return null;
  const modeIndex = parts.length - 3;
  const configRoot = parts.slice(0, modeIndex - (parts[modeIndex - 1]?.toLowerCase() === 'img' ? 1 : 0));
  const config = [...configRoot, 'config.json'].join('/');
  const file = byPath.get(config);
  if (!file) return null;
  const data = JSON5.parse(await file.blob.text());
  if (!data?.[mode] || typeof data[mode] !== 'object') return null;
  const preferred = ({ 1: 'standard', 2: 'keyboard', 3: 'gamepad', 98: 'standard' })[data.mode] || 'standard';
  return { config, mode, root: parts.slice(0, modeIndex + 1).join('/'), preferred: mode === preferred, label: `${configRoot.at(-1) || 'BongoCat Mver'} · ${MODE_LABELS[mode]}` };
}

export function orderMverEntries(entries) {
  return entries.sort((a, b) => {
    if (!a.mver || !b.mver) return 0;
    return Number(b.mver.preferred) - Number(a.mver.preferred) || MODES.indexOf(a.mver.mode) - MODES.indexOf(b.mver.mode);
  });
}

// KeyboardEvent.code -> Windows VK. Codes are physical and no typed text is read.
export function virtualKeys(codes) {
  const out = new Set();
  const named = { Backspace: 8, Tab: 9, Enter: 13, NumpadEnter: 13, Pause: 19, CapsLock: 20, Escape: 27, Space: 32, PageUp: 33, PageDown: 34, End: 35, Home: 36, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, PrintScreen: 44, Insert: 45, Delete: 46, MetaLeft: 91, MetaRight: 92, ContextMenu: 93, NumLock: 144, ScrollLock: 145, Semicolon: 186, Equal: 187, Comma: 188, Minus: 189, Period: 190, Slash: 191, Backquote: 192, BracketLeft: 219, Backslash: 220, BracketRight: 221, Quote: 222, NumpadMultiply: 106, NumpadAdd: 107, NumpadSubtract: 109, NumpadDecimal: 110, NumpadDivide: 111 };
  for (const code of codes) {
    if (/^Key[A-Z]$/.test(code)) out.add(code.charCodeAt(3));
    else if (/^Digit\d$/.test(code)) out.add(code.charCodeAt(5));
    else if (/^Numpad\d$/.test(code)) out.add(96 + Number(code.at(-1)));
    else if (/^F(?:[1-9]|1\d|2[0-4])$/.test(code)) out.add(111 + Number(code.slice(1)));
    else if (/^(Shift|Control|Alt)(Left|Right)$/.test(code)) {
      const [, name, side] = code.match(/^(Shift|Control|Alt)(Left|Right)$/);
      out.add({ Shift: 16, Control: 17, Alt: 18 }[name]);
      out.add({ Shift: 160, Control: 162, Alt: 164 }[name] + (side === 'Right' ? 1 : 0));
    } else if (named[code] !== undefined) out.add(named[code]);
  }
  return out;
}

export function chordDown(chord, keys) {
  return Array.isArray(chord) && chord.length > 0 && chord.every(key => Number.isInteger(key) && keys.has(key));
}

export async function mverProfile(pack, entry) {
  if (!entry.mver) return null;
  const { config, mode, root } = entry.mver;
  const data = JSON5.parse(await pack.files.find(f => f.path === config).blob.text());
  const section = data[mode], decoration = data.decoration || {};
  const files = new Set(pack.files.map(f => f.path));
  const layers = [];
  const groups = mode === 'standard' ? ['keyboard', 'hand', 'face'] : mode === 'keyboard' ? ['keyboard', 'lefthand', 'righthand', 'face'] : [];
  for (const group of groups) {
    if (!Array.isArray(section[group])) continue;
    section[group].forEach((chord, index) => {
      const path = `${root}/${group}/${index}.png`;
      if (files.has(path) && Array.isArray(chord) && chord.length) layers.push({ group, chord, path, index });
    });
  }
  const background = `${root}/${mode === 'standard' ? 'mousebg.png' : 'bg.png'}`;
  return {
    mode, layers, background: files.has(background) ? background : null,
    width: finite(decoration.window_size?.[0], 1400, 100, 8192), height: finite(decoration.window_size?.[1], 1600, 100, 8192),
    offset: [finite(decoration.l2d_offset?.[0], 0, -2, 2), finite(decoration.l2d_offset?.[1], 0, -2, 2)],
    flip: decoration.l2d_horizontal_flip === true,
    fps: finite(decoration.framerateLimit, 30, 10, 60),
    expressionChords: Array.isArray(section.l2d_expression) ? section.l2d_expression : [],
    motionChords: Array.isArray(section.l2d_motion) ? section.l2d_motion : [],
    clearChord: decoration.emoticonClear,
    keepFace: decoration.emoticonKeep === true,
  };
}

export function installMverInput({ sprite, element, profile, urls, listen, param, expressions, neutralIndex }) {
  const pressed = new Set(), nodes = new Map(), faces = new Set();
  let previous = new Set(), activeExpression = -1;
  const setExpression = index => {
    activeExpression = index === activeExpression ? -1 : index;
    sprite.setExpression({ index: activeExpression < 0 ? neutralIndex : activeExpression });
  };
  const resetExpression = () => { activeExpression = -1; sprite.setExpression({ index: neutralIndex }); };
  for (const layer of profile.layers) {
    const img = document.createElement('img'); img.className = 'dph-layer dph-mver-key'; img.dataset.mverGroup = layer.group; img.dataset.mverIndex = String(layer.index); img.alt = ''; img.src = urls.get(layer.path); img.hidden = true; element.append(img); nodes.set(layer, img);
  }
  const update = () => {
    const keys = virtualKeys(pressed), active = new Set();
    let left = false, right = false;
    for (const layer of profile.layers) {
      const id = `${layer.group}:${layer.index}`, down = chordDown(layer.chord, keys);
      if (down) active.add(id);
      if (profile.keepFace && layer.group === 'face' && down && !previous.has(id)) faces.has(id) ? faces.delete(id) : faces.add(id);
      nodes.get(layer).hidden = !(layer.group === 'face' && profile.keepFace ? faces.has(id) : down);
      if (down && ['hand', 'lefthand'].includes(layer.group)) left = true;
      if (down && layer.group === 'righthand') right = true;
    }
    param('CatParamLeftHandDown', left); param('CatParamRightHandDown', right);
    profile.expressionChords.forEach((chord, index) => {
      const id = `expression:${index}`;
      if (!chordDown(chord, keys)) return;
      active.add(id);
      if (!previous.has(id)) {
        // Mver's config and model expression arrays use the SAME index.
        // The Furina package declares an empty expression at index zero;
        // do not shift the remaining indices after its clear binding.
        if (index === 0) resetExpression();
        else if (index < expressions.length) setExpression(index);
      }
    });
    if (chordDown(profile.clearChord, keys)) { resetExpression(); faces.clear(); for (const [layer, img] of nodes) if (layer.group === 'face') img.hidden = true; }
    profile.motionChords.forEach((chord, index) => {
      const id = `motion:${index}`;
      if (chordDown(chord, keys)) {
        active.add(id);
        const motion = sprite.getMotions()[index];
        if (!previous.has(id) && motion) void sprite.startMotion({ ...motion, priority: 2 }).catch(() => {});
      }
    });
    previous = active;
  };
  listen(window, 'keydown', e => { if (!e.repeat) { pressed.add(e.code); update(); } });
  listen(window, 'keyup', e => { pressed.delete(e.code); update(); });
  const reset = () => { pressed.clear(); previous.clear(); faces.clear(); for (const img of nodes.values()) img.hidden = true; param('CatParamLeftHandDown', 0); param('CatParamRightHandDown', 0); param('ParamMouseLeftDown', 0); param('ParamMouseRightDown', 0); };
  listen(window, 'blur', reset);
  return { reset, expression: setExpression, resetExpression };
}
