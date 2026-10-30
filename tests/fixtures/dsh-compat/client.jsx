import React from 'react';
const css = `
/* Reproduce the public dsh-cost-meter footer contract (order:-1 and SlotOutlet).
   https://github.com/Han-1413141/dsh-cost-meter/blob/master/src/client/01-open-styles-i18n.js
   Data below is synthetic; this fixture never queries a provider or account. */
:has(>.cm-footer-stack),:has(>[data-slot="sidebar.footer.action"]>.cm-footer-stack){flex-wrap:wrap;flex:0 0 auto;height:auto;min-height:0;align-content:flex-start}
.cm-footer-stack{display:flex;flex:none;order:-1;flex-direction:column;gap:6px;width:100%;min-width:0;max-width:100%;align-items:stretch;box-sizing:border-box;padding:10px;border:1px solid #50777b;border-radius:10px;background:#002b30;color:#e4eeee;font:12px/1.6 system-ui}
.cm-footer-stack span{float:right}.cm-footer-stack.rail{order:1;font-size:10px;padding:4px;align-items:center}
`;
function Card({ wide }) {
  return <div className={`cm-footer-stack${wide ? '' : ' rail'}`} data-testid="balance-card">{wide ? <><div>今日 <span>¥8.2046 · 15.1M tokens</span></div><div>余额 <span>¥15.2818</span></div><div>实验室额度 <span>173.914 Credits</span></div><div>GETRUN余额 <span>33.2018 Credits</span></div></> : '¥15'}</div>;
}
function Sessions({ wide }) {
  return <div data-testid="session-list" style={{ flex:'1 1 0', minHeight:0, overflow:'auto' }}>{Array.from({length:60},(_,i)=><div key={i} style={{ padding:'8px 12px' }}>{wide ? `测试会话 ${i+1}` : '·'}</div>)}</div>;
}
export const inject = ['slots'];
export function apply(ctx) {
  ctx.effect(()=>{const tag=document.createElement('style');tag.textContent=css;document.head.append(tag);return()=>tag.remove();});
  ctx.slots.inject('sidebar.footer.action',()=>ctx.slots.register({name:'sidebar.footer.action',id:'synthetic-balance',order:0},Card));
  ctx.slots.inject('sidebar.workspaces',()=>ctx.slots.register({name:'sidebar.workspaces',priority:-1000},Sessions));
}
