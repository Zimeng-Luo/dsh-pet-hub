// Optional read-only bridge. Credentials stay with the original whale plugin.
// Routes are relative to DSH's mount point, with existing session authentication.
export function startWhaleBridge(notify, report) {
  const controller = new AbortController();
  let timer, stopped = false, lastBalance, lastPending;
  const get = async path => {
    const response = await fetch(new URL(path, document.baseURI), { credentials: 'same-origin', signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`小鲸鱼接口 ${response.status}：请确认已安装并启用对应插件`);
    return response.json();
  };
  const tick = async () => {
    try {
      if (!document.hidden) {
        const [balanceResult, waitResult] = await Promise.allSettled([get('dsh-whale/balance.json'), get('dsh-whale/wait.json')]);
        const errors = [];
        if (balanceResult.status === 'fulfilled') {
          const b = balanceResult.value;
          if (b.ok && typeof b.totalBalance === 'number' && Number.isFinite(b.totalBalance)) {
            if (lastBalance !== b.totalBalance) notify({ kind: 'balance', text: `余额 ${b.currency || 'CNY'} ${b.totalBalance.toFixed(4)}`, duration: 6000 });
            lastBalance = b.totalBalance;
          } else errors.push('余额响应格式不受支持');
        } else errors.push(balanceResult.reason.message);
        if (waitResult.status === 'fulfilled') {
          const pending = waitResult.value.pending;
          const key = pending ? `${pending.kind}:${pending.id}` : null;
          if (key && key !== lastPending) notify({ kind: pending.kind === 'approval' ? 'approval' : 'question', text: pending.kind === 'approval' ? '有操作等待你的授权' : '有问题等待你的回答', duration: 15000 });
          lastPending = key;
        } else errors.push(waitResult.reason.message);
        if (!stopped) report(errors.length ? errors.join('；') : '已连接小鲸鱼（只读）');
      }
    } catch (e) { if (!stopped) report(e.message); }
    if (!stopped) timer = setTimeout(tick, 10000);
  };
  void tick();
  return () => { stopped = true; controller.abort(); clearTimeout(timer); };
}
