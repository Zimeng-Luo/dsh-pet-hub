import React from 'react';

export function SettingsPage({ usePet }) {
  const state = usePet(s => s);
  if (!state.ready) return <section className="dph-settings"><h2>桌宠</h2><p>正在读取桌宠资源库…</p></section>;
  const { active, packs, config, error, busy, coreReady, bridgeStatus, commands } = state;
  const { importFiles, importCore, updateConfig, notify } = commands;
  const onInput = action => e => { const files = e.target.files; void action(files); e.target.value = ''; };
  return <section className="dph-settings" aria-label="桌宠设置">
        <h2>桌宠</h2>
        <p className="dph-selection">{active ? `当前：${active.entry.label}` : '尚未选择桌宠'}{busy && ' · 正在加载…'}</p>
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
        {packs.map(pack => <PackRow key={pack.id} pack={pack} active={active} busy={busy} onSelect={entry => commands.select(pack.id, entry.path)} onRemove={() => commands.remove(pack.id)} onExport={() => commands.exportPack(pack.id)} />)}
        <h3>显示</h3>
        <label><input type="checkbox" checked={config.visible} onChange={e => updateConfig({ visible: e.target.checked })} />在侧栏显示桌宠</label>
        <label>高度 {config.height}px <input aria-label="桌宠高度" type="range" min="120" max="420" step="10" value={config.height} onChange={e => updateConfig({ height: Number(e.target.value) })} /></label>
        <label><input type="checkbox" checked={config.mirror} onChange={e => updateConfig({ mirror: e.target.checked })} />水平镜像</label>
        <h3>动作与表情</h3>
        <div className="dph-actions">{active?.motions.map((motion, i) => <button key={i} onClick={() => commands.motion(motion)}>{motion.name || `${motion.group} ${motion.no + 1}`}</button>)}</div>
        <div className="dph-actions">{active?.expressions.map((expression, i) => <button key={i} onClick={() => commands.expression(i)}>{expression.name || `表情 ${i + 1}`}</button>)}</div>
        {active?.canResetExpression && <button onClick={() => commands.resetExpression()}>恢复默认表情</button>}
        {active?.entry.mver && <p className="dph-help">已读取 Mver 配置中的按键与表情组合键。相同表情再次触发可恢复；手柄模型当前仅显示，不采集手柄输入。</p>}
        {!active?.motions.length && !active?.expressions.length && <p className="dph-help">当前资源没有声明动作或表情。</p>}
        <h3>功能扩展</h3>
        <label><input type="checkbox" checked={config.whale} onChange={e => updateConfig({ whale: e.target.checked })} />接收小鲸鱼余额与等待提示（需已安装对应插件）</label>
        {config.whale && <p className="dph-help">{bridgeStatus || '正在连接…'}</p>}
        <button onClick={() => notify({ kind: 'completed', text: '任务完成提示已送达。更换桌宠后，这些能力会继续保留。', duration: 6000 })}>测试任务完成提示</button>
        <p className="dph-help">键鼠交互目前限于 DSH 窗口。小鲸鱼桥接为可选只读功能；完整记账、音效和任务事件迁移尚未包含。</p>
  </section>;
}

function PackRow({ pack, active, busy, onSelect, onRemove, onExport }) {
  const [path, setPath] = React.useState(pack.entries[0].path);
  const entry = pack.entries.find(e => e.path === path);
  return <div className="dph-row"><strong>{pack.name} {active?.packId === pack.id && <span className="dph-badge">当前</span>}</strong>
    <div className="dph-actions"><select aria-label={`${pack.name} 模型入口`} value={path} onChange={e => setPath(e.target.value)}>{pack.entries.map(e => <option key={e.path} value={e.path}>{e.label} · {e.adapter === 'image' ? '图片' : e.mver ? 'Mver' : 'BongoCat / Live2D'}</option>)}</select>
      <button disabled={busy} onClick={() => onSelect(entry)}>使用</button><button disabled={busy} onClick={onExport}>导出</button><button disabled={busy} onClick={onRemove}>删除</button></div>
  </div>;
}
