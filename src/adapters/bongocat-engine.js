// Adapted from ayangweb/BongoCat pre-refactor-tauri (MIT, copyright 2025 ayangweb).
// See THIRD_PARTY_NOTICES.md. Runtime dependencies are the original web stack.
import { Application, Ticker } from 'pixi.js';
import { Config, CubismSetting, Live2DSprite, Priority } from 'easy-live2d';
import { keyCandidates } from './keys.js';
import { installMverInput } from './mver.js';

export async function mountBongo({ pack, entry, element, modelJSON, urls, resolveReference, profile = null }) {
  Config.MouseFollow = false;
  Config.MotionSound = false; // Enabled only through an explicit user control.
  const app = new Application(), ticker = new Ticker();
  ticker.maxFPS = profile?.fps || 30;
  let sprite, timer, observer, disposed = false;
  const listeners = [], overlays = new Map(), held = new Map();
  const root = entry.path.split('/').slice(0, -1).join('/');
  const resource = suffix => `${root ? `${root}/` : ''}resources/${suffix}`;
  const files = new Map(pack.files.map(f => [f.path, f]));
  const extraURLs = [];
  const renderElement = profile ? document.createElement('div') : element;
  if (profile) { renderElement.className = 'dph-mver-viewport'; element.append(renderElement); }
  const viewport = () => {
    const width = Math.max(1, element.clientWidth), height = Math.max(1, element.clientHeight);
    if (!profile) return { width, height };
    const scale = Math.min(width / profile.width, height / profile.height);
    const w = profile.width * scale, h = profile.height * scale;
    Object.assign(renderElement.style, { width: `${w}px`, height: `${h}px`, left: `${(width - w) / 2}px`, top: `${(height - h) / 2}px` });
    return { width: w, height: h };
  };
  const listen = (target, name, fn) => { target.addEventListener(name, fn); listeners.push(() => target.removeEventListener(name, fn)); };
  const dispose = () => {
    if (disposed) return; disposed = true;
    clearTimeout(timer); observer?.disconnect(); listeners.forEach(off => off());
    ticker.stop(); app.stop();
    try { sprite?.destroy(); } finally {
      ticker.destroy();
      if (app.renderer) app.destroy(true, { children: true, texture: false, textureSource: false });
      element.replaceChildren(); urls.dispose(); extraURLs.forEach(url => URL.revokeObjectURL(url));
    }
  };
  try {
    const initial = viewport();
    await app.init({ backgroundAlpha: 0, autoDensity: true, resolution: Math.min(devicePixelRatio || 1, 2), preference: 'webgl', sharedTicker: false, width: initial.width, height: initial.height });
    app.ticker.maxFPS = profile?.fps || 30;
    const background = profile?.background || (files.has(resource('background.png')) ? resource('background.png') : null);
    if (background) {
      const bg = document.createElement('img'); bg.src = urls.get(background); bg.className = 'dph-layer'; bg.alt = ''; renderElement.append(bg);
    }
    renderElement.append(app.canvas);
    let neutralIndex = -1, neutralFile, neutralURL;
    if (profile) {
      modelJSON = structuredClone(modelJSON);
      const expressions = modelJSON.FileReferences.Expressions ||= [];
      neutralIndex = expressions.length;
      neutralFile = `__dph_neutral_${crypto.randomUUID()}.exp3.json`;
      expressions.push({ Name: '__dph_neutral__', File: neutralFile });
      neutralURL = URL.createObjectURL(new Blob([JSON.stringify({ Type: 'Live2D Expression', FadeInTime: 0.15, FadeOutTime: 0.15, Parameters: [] })], { type: 'application/json' }));
      extraURLs.push(neutralURL);
    }
    const setting = new CubismSetting({ modelJSON });
    setting.redirectPath(({ file }) => file === neutralFile ? neutralURL : urls.get(resolveReference(entry.path, file)));
    sprite = new Live2DSprite({ modelSetting: setting, ticker });
    app.stage.addChild(sprite);
    await Promise.race([sprite.ready, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('模型加载超时：请检查 moc3 版本、纹理和 Cubism Core 版本')), 30000); })]);
    clearTimeout(timer);
    const natural = { width: sprite.width, height: sprite.height };
    const resize = () => {
      const { width: w, height: h } = viewport();
      app.renderer.resize(w, h);
      const scale = Math.min(w / natural.width, h / natural.height);
      sprite.scale.set(scale * (profile?.flip ? -1 : 1), scale); sprite.anchor.set(0.5);
      sprite.position.set(w / 2 + (profile?.offset[0] || 0) * w / 2, h / 2 - (profile?.offset[1] || 0) * h / 2);
    };
    observer = new ResizeObserver(resize); observer.observe(element); resize();
    const param = (id, value) => {
      const range = sprite.getParameterValueRangeById(id);
      if (range) sprite.setParameterValueById(id, Math.max(range.min, Math.min(range.max, Number(value))));
    };
    const keys = new Map();
    for (const side of ['left', 'right']) {
      const prefix = resource(`${side}-keys/`);
      for (const f of pack.files) if (f.path.startsWith(prefix) && /\.(png|webp|jpe?g)$/i.test(f.path)) {
        keys.set(f.path.slice(prefix.length).replace(/\.[^.]+$/, ''), { side, path: f.path });
      }
    }
    const keyInfo = code => {
      return keyCandidates(code).map(c => keys.get(c)).find(Boolean);
    };
    const expressions = sprite.getExpressions().filter(e => e.name !== '__dph_neutral__');
    const mverInput = profile ? installMverInput({ sprite, element: renderElement, profile, urls, listen, param, expressions, neutralIndex }) : null;
    const refreshHands = () => {
      for (const side of ['left', 'right']) {
        const latest = [...held.values()].filter(k => k.side === side).at(-1);
        param(side === 'left' ? 'CatParamLeftHandDown' : 'CatParamRightHandDown', !!latest);
        let overlay = overlays.get(side);
        if (latest) {
          if (!overlay) { overlay = document.createElement('img'); overlay.className = 'dph-layer'; overlay.alt = ''; overlays.set(side, overlay); element.append(overlay); }
          overlay.src = urls.get(latest.path); overlay.hidden = false;
        } else if (overlay) overlay.hidden = true;
      }
    };
    const reset = () => { if (mverInput) return mverInput.reset(); held.clear(); refreshHands(); param('ParamMouseLeftDown', 0); param('ParamMouseRightDown', 0); };
    if (!profile) {
      listen(window, 'keydown', e => { if (!e.repeat) { const key = keyInfo(e.code); if (key) { held.set(e.code, key); refreshHands(); } } });
      listen(window, 'keyup', e => { held.delete(e.code); refreshHands(); });
      listen(window, 'blur', reset);
    }
    let destination = { x: 0.5, y: 0.5 }, position = { ...destination };
    listen(window, 'pointermove', e => { destination = { x: e.clientX / Math.max(innerWidth, 1), y: e.clientY / Math.max(innerHeight, 1) }; });
    const mouse = (e, down) => { if (e.button === 0 || e.button === 2) param(e.button === 0 ? 'ParamMouseLeftDown' : 'ParamMouseRightDown', down); };
    listen(window, 'pointerdown', e => mouse(e, 1)); listen(window, 'pointerup', e => mouse(e, 0));
    ticker.add(t => {
      const alpha = 1 - 0.75 ** (t.deltaMS / (1000 / 60));
      position.x += (destination.x - position.x) * alpha; position.y += (destination.y - position.y) * alpha;
      for (const id of ['ParamMouseX', 'ParamMouseY', 'ParamAngleX', 'ParamAngleY', 'ParamAngleZ', 'ParamEyeBallX', 'ParamEyeBallY']) {
        const range = sprite.getParameterValueRangeById(id); if (!range) continue;
        const value = id.endsWith('Z') ? (1 - 2 * position.x) * (1 - 2 * position.y) * range.min : range.max - (id.endsWith('X') ? position.x : position.y) * (range.max - range.min);
        param(id, value);
      }
    });
    ticker.start();
    return {
      motions: sprite.getMotions(), expressions,
      motion: motion => sprite.startMotion({ ...motion, priority: Priority.Normal }),
      expression: mverInput?.expression || (index => sprite.setExpression({ index })),
      ...(mverInput ? { resetExpression: mverInput.resetExpression } : {}),
      visible(value) { if (value) { ticker.start(); app.start(); } else { reset(); ticker.stop(); app.stop(); } },
      event(event) { if (event.motion) return sprite.startMotion({ ...event.motion, priority: Priority.Normal }); },
      dispose,
    };
  } catch (e) { dispose(); throw e; }
}
