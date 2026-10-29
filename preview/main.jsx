import React from 'react';
import { createRoot } from 'react-dom/client';
import { PetPanel } from '../src/PetPanel.jsx';
import css from '../src/style.css';
const style = document.createElement('style'); style.textContent = css; document.head.append(style);
function Preview() {
  const [wide, setWide] = React.useState(true);
  return <><aside style={{ width: wide ? 350 : 56 }}><header><button onClick={() => setWide(!wide)}>☰</button>{wide && <span>桌宠插件 · 独立验证页</span>}</header><div className="sessions">{wide && '会话列表区域'}</div><div className="footer"><PetPanel wide={wide} />{wide && <div className="balance">余额卡片示意 · 不连接账户</div>}</div><footer>{wide ? '用户入口' : '我'}</footer></aside><main><h1>DSH 桌宠插件验证</h1><p>用于检查导入、切换、重启恢复、侧栏折叠和提示能力。此页不是 DSH 实机兼容性证明。</p><button onClick={() => window.dispatchEvent(new CustomEvent('dsh-pet:notify', { detail: { version: 1, kind: 'completed', text: '来自功能扩展的任务完成提示' } }))}>发送扩展事件</button></main></>;
}
createRoot(document.getElementById('app')).render(<Preview />);
