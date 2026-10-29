let loading;
export async function ensureCore(blob) {
  if (globalThis.Live2DCubismCore) return;
  if (!blob) throw new Error('首次使用 Live2D：请在管理面板导入官方 live2dcubismcore.js（只需一次）');
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([blob], { type: 'text/javascript' })), script = document.createElement('script');
    script.src = url;
    const done = error => { URL.revokeObjectURL(url); script.remove(); error ? reject(error) : resolve(); };
    script.onload = () => done(globalThis.Live2DCubismCore ? null : new Error('文件没有提供 Live2DCubismCore，请选择官方 SDK 的 Core 文件'));
    script.onerror = () => done(new Error('Cubism Core 加载失败，可能被宿主内容安全策略阻止'));
    document.head.append(script);
  }).catch(error => { loading = undefined; throw error; });
  return loading;
}
