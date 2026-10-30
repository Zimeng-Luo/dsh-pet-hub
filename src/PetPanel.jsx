import React, { useEffect, useRef, useState } from 'react';
import { zip } from 'fflate';
import { storage } from './storage.js';
import { importZip, importDirectory } from './importer.js';
import { PetRuntime, normalizeNotification } from './runtime.js';
import { imageAdapter } from './adapters/image.js';
import { bongoAdapter } from './adapters/bongocat.js';
import { ensureCore } from './adapters/core.js';
import { startWhaleBridge } from './whale.js';
import { inspectPack } from './catalog.js';
import { attachFooterLayout } from './footer-layout.js';

const defaults = { height: 240, mirror: false, visible: true, whale: false, pack: null, entry: null };

export function PetPanel({ wide = true, publishPet, clearPet }) {
  const stage = useRef(null), bubbleTimer = useRef(), alive = useRef(true), configRef = useRef(defaults), saveQueue = useRef(Promise.resolve());
  const [runtime] = useState(() => { const r = new PetRuntime(); r.register(imageAdapter); r.register(bongoAdapter); return r; });
  const [packs, setPacks] = useState([]), [config, setConfig] = useState(defaults);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [bubble, setBubble] = useState(null), [active, setActive] = useState(null);
  const [coreReady, setCoreReady] = useState(false), [bridgeStatus, setBridgeStatus] = useState('');
  const [initialized, setInitialized] = useState(false);
  const updateConfig = patch => {
    const next = { ...configRef.current, ...patch }; configRef.current = next; setConfig(next);
    // Serialize writes: rapid slider changes must not restore an older value.
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => storage.save(next));
    saveQueue.current.catch(e => { if (alive.current) setError(`设置保存失败：${e.message}`); });
    return saveQueue.current;
  };
  const notify = event => {
    if (!alive.current) return;
    clearTimeout(bubbleTimer.current); setBubble(event);
    Promise.resolve(runtime.send(event)).catch(e => setError(e.message));
    bubbleTimer.current = setTimeout(() => { if (alive.current) setBubble(null); }, event.duration || 6000);
  };
  const activate = async (pack, entry, persist = true) => {
    setBusy(true); setError('');
    try {
      const instance = await runtime.select(pack, entry, stage.current);
      if (!instance || !alive.current) return;
      setActive({ pack, entry, instance });
      runtime.visible(!document.hidden && configRef.current.visible && wide);
      if (persist) await updateConfig({ pack: pack.id, entry: entry.path });
    } catch (e) { if (alive.current) setError(e.message); }
    finally { if (alive.current) setBusy(false); }
  };
  useEffect(() => {
    alive.current = true;
    const onNotify = e => { const n = normalizeNotification(e.detail); if (n) notify(n); };
    window.addEventListener('dsh-pet:notify', onNotify);
    void (async () => {
      try {
        const [stored, saved, core] = await Promise.all([storage.list(), storage.settings(), storage.core()]);
        const library = [];
        for (const pack of stored) {
          if (pack.catalogVersion >= 2) { library.push(pack); continue; }
          try {
            const updated = { ...await inspectPack(pack.files, pack.name), id: pack.id, createdAt: pack.createdAt };
            await storage.put(updated); library.push(updated);
          } catch (error) { library.push(pack); if (alive.current) setError(`资源索引更新失败：${error.message}`); }
        }
        if (!alive.current) return;
        const next = { ...defaults, ...saved, height: Math.max(120, Math.min(420, Number(saved.height) || 240)) };
        configRef.current = next; setConfig(next); setPacks(library); setCoreReady(!!core || !!globalThis.Live2DCubismCore);
        const pack = library.find(p => p.id === next.pack), entry = pack?.entries.find(e => e.path === next.entry);
        if (pack && entry) await activate(pack, entry, false);
      } catch (e) { if (alive.current) setError(`资源库加载失败：${e.message}`); }
      finally { if (alive.current) setInitialized(true); }
    })();
    return () => { alive.current = false; clearTimeout(bubbleTimer.current); window.removeEventListener('dsh-pet:notify', onNotify); runtime.dispose(); };
  }, []);
  useEffect(() => {
    const update = () => runtime.visible(!document.hidden && config.visible && wide);
    update(); document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, [config.visible, wide, active]);
  useEffect(() => {
    if (!config.whale) return;
    return startWhaleBridge(notify, message => { if (alive.current) setBridgeStatus(message); });
  }, [config.whale]);

  const importFiles = async (list, directory) => {
    if (!list?.length) return;
    setBusy(true); setError('');
    try {
      const pack = await (directory ? importDirectory(list) : importZip(list[0]));
      await storage.put(pack);
      if (!alive.current) return;
      setPacks(previous => [...previous, pack]);
      await activate(pack, pack.entries[0]);
    } catch (e) { if (alive.current) setError(`导入失败：${e.message}`); }
    finally { if (alive.current) setBusy(false); }
  };
  const importCore = async file => {
    if (!file) return;
    setBusy(true); setError('');
    try {
      if (!/^live2dcubismcore(?:\.min)?\.js$/i.test(file.name) || file.size > 10 * 1024 ** 2) throw new Error('请选择官方 SDK 中的 live2dcubismcore.js（或 .min.js）');
      await ensureCore(file);
      await storage.saveCore(file); setCoreReady(true);
      // Retry the current/last requested Live2D model after first-time setup.
      const candidate = packs.find(p => p.id === configRef.current.pack) || packs.find(p => p.entries.some(e => e.adapter === 'bongocat-live2d'));
      const entry = candidate?.entries.find(e => e.adapter === 'bongocat-live2d');
      if (candidate && entry) await activate(candidate, entry);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const remove = async pack => {
    setError('');
    try {
      await storage.remove(pack.id);
      if (active?.pack.id === pack.id || configRef.current.pack === pack.id) {
        runtime.clear(); setActive(null); await updateConfig({ pack: null, entry: null });
      }
      setPacks(previous => previous.filter(p => p.id !== pack.id));
    } catch (e) { setError(`删除失败：${e.message}`); }
  };
  const exportPack = async pack => {
    setBusy(true); setError('');
    try {
      const files = Object.fromEntries(await Promise.all(pack.files.map(async f => [f.path, new Uint8Array(await f.blob.arrayBuffer())])));
      const data = await new Promise((resolve, reject) => zip(files, { level: 0 }, (e, bytes) => e ? reject(e) : resolve(bytes)));
      const url = URL.createObjectURL(new Blob([data], { type: 'application/zip' })), a = document.createElement('a');
      a.href = url; a.download = `${pack.name.replace(/[\\/:*?"<>|]/g, '_')}.zip`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(`导出失败：${e.message}`); }
    finally { setBusy(false); }
  };
  const shown = wide && config.visible && !!active;
  const root = useRef(null);
  useEffect(() => shown ? attachFooterLayout(root.current) : undefined, [shown]);
  useEffect(() => {
    publishPet({
      ready: initialized, busy, error, config, coreReady, bridgeStatus,
      packs: packs.map(({ id, name, entries }) => ({ id, name, entries })),
      active: active ? { packId: active.pack.id, entry: active.entry, motions: active.instance.motions, expressions: active.instance.expressions, canResetExpression: !!active.instance.resetExpression } : null,
      commands: {
        importFiles, importCore, updateConfig, notify,
        select: (id, path) => { const p = packs.find(p => p.id === id); const e = p?.entries.find(e => e.path === path); if (e) return activate(p, e); },
        remove: id => { const p = packs.find(p => p.id === id); if (p) return remove(p); },
        exportPack: id => { const p = packs.find(p => p.id === id); if (p) return exportPack(p); },
        motion: motion => Promise.resolve(active?.instance.motion(motion)).catch(e => setError(e.message)),
        expression: index => { try { active?.instance.expression(index); } catch (e) { setError(e.message); } },
        resetExpression: () => active?.instance.resetExpression?.(),
      },
    });
  }, [initialized, busy, error, config, coreReady, bridgeStatus, packs, active, wide, publishPet]);
  useEffect(() => () => clearPet(), [clearPet]);
  return <section ref={root} className="dph-root" aria-label="桌宠" data-pet-name={active?.entry.label || ''} style={{ display: shown ? undefined : 'none', '--dph-height': `${config.height}px`, '--dph-mirror': config.mirror ? -1 : 1 }}>
    <div className="dph-stage">
      <div ref={stage} className="dph-host" />
      {bubble && <button className="dph-bubble" onClick={() => setBubble(null)} aria-label="关闭提示">{bubble.text}</button>}
    </div>
  </section>;
}
