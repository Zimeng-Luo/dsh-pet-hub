import React, { useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { PetPanel } from '../src/PetPanel.jsx';
import { SettingsPage } from '../src/SettingsPage.jsx';
import { createPetBridge } from '../src/pet-bridge.js';
import css from '../src/style.css';
const bridge = createPetBridge();
const usePet = selector => selector(useSyncExternalStore(bridge.subscribe, bridge.getSnapshot));
const style = document.createElement('style'); style.textContent = css; document.head.append(style);
function Preview() {
  const [wide, setWide] = React.useState(true), [open, setOpen] = React.useState(false), [tab, setTab] = React.useState('general');
  const [sidebarWidth, setSidebarWidth] = React.useState(350);
  const [wallet, setWallet] = React.useState(true), [wrapped, setWrapped] = React.useState(true);
  const items = <><PetPanel wide={wide} publishPet={bridge.publish} clearPet={bridge.clear} />{wallet && <div className={`cm-footer-stack${wide ? '' : ' rail'}`} data-testid="balance-card">{wide ? <><div>今日 <strong>¥8.2046</strong>　15.1M tokens</div><div>余额 <span>¥15.2818</span></div><div>实验室额度 <span>173.914 Credits</span></div><div>GETRUN余额 <span>33.2018 Credits</span></div></> : '¥15'}</div>}</>;
  return <><aside style={{ width: wide ? sidebarWidth : 56 }}><header><button onClick={() => setWide(!wide)}>☰</button>{wide && <span>桌宠插件 · 验证页</span>}</header><div className="sessions" data-testid="session-list">{Array.from({length:60},(_,i)=><div className="session-row" key={i}>{wide ? `会话 ${i+1}` : '·'}</div>)}</div><div className="foot-area"><div className="footer">{wrapped ? <div data-slot="sidebar.footer.action" style={{display:'contents'}}>{items}</div> : items}</div><footer><span>{wide ? '用户入口' : '我'}</span><button aria-label="打开设置" onClick={()=>setOpen(true)}>设置</button></footer></div></aside>
    <main><h1>DSH 桌宠插件验证</h1><p>合成会话与余额数据，用于检查设置页、侧栏布局与资源运行。</p><label>侧栏测试宽度<input aria-label="侧栏测试宽度" type="range" min="220" max="480" value={sidebarWidth} onChange={e=>setSidebarWidth(Number(e.target.value))}/></label><button onClick={() => window.dispatchEvent(new CustomEvent('dsh-pet:notify', { detail: { version: 1, kind: 'completed', text: '来自功能扩展的任务完成提示' } }))}>发送扩展事件</button><label><input type="checkbox" checked={wallet} onChange={e=>setWallet(e.target.checked)}/>显示测试余额卡片</label><label><input type="checkbox" checked={wrapped} onChange={e=>setWrapped(e.target.checked)}/>SlotOutlet 包裹</label></main>
    {open && <div className="preview-settings-backdrop"><div role="dialog" aria-label="设置" className="preview-settings"><nav><button onClick={()=>setTab('general')}>通用</button><button onClick={()=>setTab('pet')}>桌宠</button></nav><div className="preview-settings-body"><button aria-label="关闭设置" onClick={()=>setOpen(false)}>关闭</button>{tab==='pet'?<SettingsPage usePet={usePet}/>:<h2>通用设置</h2>}</div></div></div>}
  </>;
}
createRoot(document.getElementById('app')).render(<Preview />);
