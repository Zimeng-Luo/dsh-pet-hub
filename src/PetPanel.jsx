import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { zip } from 'fflate';
import { storage } from './storage.js';
import { importZip, importDirectory } from './importer.js';
import { PetRuntime, normalizeNotification } from './runtime.js';
import { imageAdapter } from './adapters/image.js';
import { bongoAdapter } from './adapters/bongocat.js';
import { ensureCore } from './adapters/core.js';
import { startWhaleBridge } from './whale.js';
import { inspectPack } from './catalog.js';

const defaults = { height: 240, mirror: false, visible: true, whale: false, pack: null, entry: null };

export function PetPanel({ wide = true }) {
  const stage = useRef(null), bubbleTimer = useRef(), alive = useRef(true), configRef = useRef(defaults), saveQueue = useRef(Promise.resolve());
  const [runtime] = useState(() => { const r = new PetRuntime(); r.register(imageAdapter); r.register(bongoAdapter); return r; });
  const [packs, setPacks] = useState([]), [config, setConfig] = useState(defaults), [open, setOpen] = useState(false);
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
  const closeButton = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    closeButton.current?.focus();
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); setOpen(false); }
      if (e.key === 'Tab') {
        const nodes = [...document.querySelectorAll('.dph-panel button,.dph-panel input,.dph-panel select,.dph-panel a')].filter(n => !n.disabled && n.getClientRects().length);
        const first = nodes[0], last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', key, true);
    return () => { window.removeEventListener('keydown', key, true); previous?.focus?.(); };
  }, [open]);

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
  const onInput = action => e => { const files = e.target.files; void action(files); e.target.value = ''; };
  return <section className={`dph-root${wide ? '' : ' dph-rail'}`} aria-label="桌宠" style={{ '--dph-height': `${config.height}px`, '--dph-mirror': config.mirror ? -1 : 1 }}>
    <div className="dph-stage" style={{ display: wide && config.visible ? undefined : 'none' }}>
      <div ref={stage} className="dph-host" />
      {!active && <div className="dph-empty"><span>{initialized ? '导入你的 BongoCat，让它住在这里' : '正在恢复桌宠…'}</span><button onClick={() => setOpen(true)}>导入桌宠</button></div>}
      {bubble && <button className="dph-bubble" onClick={() => setBubble(null)} aria-label="关闭提示">{bubble.text}</button>}
    </div>
    <div className="dph-toolbar">
      {wide && <span className="dph-label">{busy ? '正在加载…' : active ? active.entry.label : config.visible ? '桌宠常驻区域' : '桌宠已隐藏'}</span>}
      <button title="管理桌宠" aria-label="管理桌宠" onClick={() => setOpen(true)}>{wide ? '管理' : '宠'}</button>
      {wide && <button aria-label={config.visible ? '隐藏桌宠' : '显示桌宠'} onClick={() => updateConfig({ visible: !config.visible })}>{config.visible ? '收起' : '显示'}</button>}
    </div>
    {wide && error && !open && <div className="dph-status" role="alert">{error}</div>}
    {open && createPortal(<div className="dph-backdrop" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="dph-panel" role="dialog" aria-modal="true" aria-labelledby="dph-title">
        <button ref={closeButton} className="dph-close" onClick={() => setOpen(false)} aria-label="关闭管理面板">关闭</button>
        <h2 id="dph-title">桌宠管理</h2>
        <p>随 DSH 自动加载上次选择。资源与设置保存在当前客户端的本地资源库。</p>
        {error && <p className="dph-error" role="alert">{error}</p>}
        <h3>导入资源</h3>
        <label>ZIP <input aria-label="导入 ZIP" type="file" accept=".zip" disabled={busy} onChange={onInput(files => importFiles(files, false))} /></label>
        <label>文件夹 <input aria-label="导入文件夹" type="file" webkitdirectory="" multiple disabled={busy} onChange={onInput(files => importFiles(files, true))} /></label>
        <p className="dph-help">支持 BongoCat model3 资源和 Mver 整包（config.json + img）。请导入整个文件夹，保留跨模式表情引用；ZIP 上限 256 MiB。PNG / GIF / WebP 也可作为图片桌宠导入。</p>
        <h3>Live2D 运行支持 {coreReady ? '· 已配置' : '· 首次需配置'}</h3>
        <p className="dph-help">从 <a href="https://www.live2d.com/en/sdk/download/web/" target="_blank" rel="noreferrer">官方 Cubism SDK for Web</a> 的 Core 目录选择脚本。只选择可信的官方文件；它会在客户端执行。Core 不随本插件分发。</p>
        <input aria-label="导入 Cubism Core" type="file" accept=".js" disabled={busy || coreReady} onChange={onInput(files => importCore(files[0]))} />
        <h3>我的桌宠</h3>
        {!packs.length && <p>还没有资源。导入后可直接在这里切换。</p>}
        {packs.map(pack => <PackRow key={pack.id} pack={pack} active={active} busy={busy} onSelect={entry => activate(pack, entry)} onRemove={() => remove(pack)} onExport={() => exportPack(pack)} />)}
        <h3>显示</h3>
        <label>高度 {config.height}px <input aria-label="桌宠高度" type="range" min="120" max="420" step="10" value={config.height} onChange={e => updateConfig({ height: Number(e.target.value) })} /></label>
        <label><input type="checkbox" checked={config.mirror} onChange={e => updateConfig({ mirror: e.target.checked })} />水平镜像</label>
        <h3>动作与表情</h3>
        <div className="dph-actions">{active?.instance.motions.map((motion, i) => <button key={i} onClick={() => Promise.resolve(active.instance.motion(motion)).catch(e => setError(e.message))}>{motion.name || `${motion.group} ${motion.no + 1}`}</button>)}</div>
        <div className="dph-actions">{active?.instance.expressions.map((expression, i) => <button key={i} onClick={() => { try { active.instance.expression(i); } catch (e) { setError(e.message); } }}>{expression.name || `表情 ${i + 1}`}</button>)}</div>
        {active?.instance.resetExpression && <button onClick={() => active.instance.resetExpression()}>恢复默认表情</button>}
        {active?.entry.mver && <p className="dph-help">已读取 Mver 配置中的按键与表情组合键。相同表情再次触发可恢复；手柄模型当前仅显示，不采集手柄输入。</p>}
        {!active?.instance.motions.length && !active?.instance.expressions.length && <p className="dph-help">当前资源没有声明动作或表情。</p>}
        <h3>功能扩展</h3>
        <label><input type="checkbox" checked={config.whale} onChange={e => updateConfig({ whale: e.target.checked })} />接收小鲸鱼余额与等待提示（需已安装对应插件）</label>
        {config.whale && <p className="dph-help">{bridgeStatus || '正在连接…'}</p>}
        <button onClick={() => notify({ kind: 'completed', text: '任务完成提示已送达。更换桌宠后，这些能力会继续保留。', duration: 6000 })}>测试任务完成提示</button>
        <p className="dph-help">键鼠交互目前限于 DSH 窗口。小鲸鱼桥接为可选只读功能；完整记账、音效和任务事件迁移尚未包含。</p>
      </div>
    </div>, document.body)}
  </section>;
}

function PackRow({ pack, active, busy, onSelect, onRemove, onExport }) {
  const [path, setPath] = useState(pack.entries[0].path);
  const entry = pack.entries.find(e => e.path === path);
  return <div className="dph-row"><strong>{pack.name} {active?.pack.id === pack.id && <span className="dph-badge">当前</span>}</strong>
    <div className="dph-actions"><select aria-label={`${pack.name} 模型入口`} value={path} onChange={e => setPath(e.target.value)}>{pack.entries.map(e => <option key={e.path} value={e.path}>{e.label} · {e.adapter === 'image' ? '图片' : e.mver ? 'Mver' : 'BongoCat / Live2D'}</option>)}</select>
      <button disabled={busy} onClick={() => onSelect(entry)}>使用</button><button disabled={busy} onClick={onExport}>导出</button><button disabled={busy} onClick={onRemove}>删除</button></div>
  </div>;
}
